/**
 * Identity Migration Script (HTTPS版)
 *
 * psql が使えない環境向けに、Supabase JS Client (HTTPS) 経由で
 * DB2025 → DB2026 の Identity データを移行する。
 *
 * Usage:
 *   npx tsx scripts/cutover/migrate-identity-https.ts
 *
 * 環境変数 (.env.migration に記載):
 *   DB2025_URL, DB2025_SERVICE_ROLE_KEY
 *   DB2026_URL, DB2026_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

// ─── 設定 ──────────────────────────────────────────

const DB2025_URL = process.env.DB2025_URL
const DB2025_SERVICE_ROLE_KEY = process.env.DB2025_SERVICE_ROLE_KEY
const DB2026_URL = process.env.DB2026_URL
const DB2026_SERVICE_ROLE_KEY = process.env.DB2026_SERVICE_ROLE_KEY

if (!DB2025_URL || !DB2025_SERVICE_ROLE_KEY || !DB2026_URL || !DB2026_SERVICE_ROLE_KEY) {
  console.error("必要な環境変数が不足しています。")
  console.error("  DB2025_URL, DB2025_SERVICE_ROLE_KEY")
  console.error("  DB2026_URL, DB2026_SERVICE_ROLE_KEY")
  console.error("")
  console.error("例: .env.migration ファイルを作成して:")
  console.error("  DB2025_URL=https://zlipaeanhcslhintxpej.supabase.co")
  console.error("  DB2025_SERVICE_ROLE_KEY=eyJ...")
  console.error("  DB2026_URL=https://maklmjcaweneykwagqbv.supabase.co")
  console.error("  DB2026_SERVICE_ROLE_KEY=eyJ...")
  process.exit(1)
}

const db2025 = createClient(DB2025_URL, DB2025_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const db2026 = createClient(DB2026_URL, DB2026_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── ユーティリティ ─────────────────────────────────

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function fetchAll(client: AnySupabaseClient, table: string) {
  const allRows: Record<string, unknown>[] = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data, error } = await client.from(table).select("*").order("id").range(offset, offset + pageSize - 1)
    if (error) throw new Error(`${table} の読み取りエラー: ${error.message}`)
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return allRows
}

async function countRows(client: AnySupabaseClient, table: string): Promise<number> {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true })
  if (error) throw new Error(`${table} のカウントエラー: ${error.message}`)
  return count || 0
}

async function deleteAll(client: AnySupabaseClient, table: string) {
  // supabase-js の delete() は filter が必要なので、gte を使って全件削除
  const { error } = await client.from(table).delete().gte("id", 0)
  if (error) throw new Error(`${table} の削除エラー: ${error.message}`)
}

async function deleteAllByUuid(client: AnySupabaseClient, table: string) {
  // UUID の id カラムを持つテーブル用
  const { error } = await client.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) throw new Error(`${table} の削除エラー: ${error.message}`)
}

async function insertBatch(
  client: AnySupabaseClient,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[],
  batchSize = 500
) {
  if (rows.length === 0) return 0
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await client.from(table).insert(batch)
    if (error) throw new Error(`${table} の挿入エラー (batch ${i}): ${error.message}`)
    inserted += batch.length
  }
  return inserted
}

// ─── メイン処理 ─────────────────────────────────────

async function main() {
  console.log("=============================================")
  console.log(" Identity Migration (HTTPS版)")
  console.log("=============================================")
  console.log(`  DB2025: ${DB2025_URL}`)
  console.log(`  DB2026: ${DB2026_URL}`)
  console.log("")

  // ─── Step 1: DB2025 現状確認 ─────────────────────
  console.log("[1/7] DB2025 の現状確認...")
  const tables = [
    "profiles",
    "students",
    "parents",
    "coaches",
    "admins",
    "invitation_codes",
    "parent_child_relations",
    "coach_student_relations",
  ]

  const db2025Counts: Record<string, number> = {}
  for (const t of tables) {
    db2025Counts[t] = await countRows(db2025, t)
    console.log(`  ${t}: ${db2025Counts[t]} 件`)
  }

  console.log("")

  // ─── Step 2: 確認 ────────────────────────────────
  const confirm = await ask("DB2025 → DB2026 に Identity を移行しますか？ (yes/no): ")
  if (confirm !== "yes") {
    console.log("中断しました。")
    process.exit(0)
  }

  // ─── Step 3: DB2025 からデータ取得 ───────────────
  console.log("")
  console.log("[2/7] DB2025 からデータを取得...")

  const exportData: Record<string, Record<string, unknown>[]> = {}
  for (const t of tables) {
    exportData[t] = await fetchAll(db2025, t)
    console.log(`  ${t}: ${exportData[t].length} 件取得`)
  }

  // auth.users を全件取得
  console.log("  auth.users を取得中...")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allAuthUsers: any[] = []
  let page = 1
  while (true) {
    const { data: usersPage, error: usersError } = await db2025.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (usersError) throw new Error(`auth.users 取得エラー: ${usersError.message}`)
    if (!usersPage.users || usersPage.users.length === 0) break
    allAuthUsers.push(...usersPage.users)
    if (usersPage.users.length < 1000) break
    page++
  }
  console.log(`  auth.users: ${allAuthUsers.length} 件取得`)

  // ─── Step 4: DB2026 クリーンアップ ───────────────
  console.log("")
  console.log("[3/7] DB2026 クリーンアップ...")

  // FK 逆順で削除
  const deleteOrder = [
    "coach_student_relations",
    "parent_child_relations",
    "invitation_codes",
    "admins",
    "coaches",
    "parents",
    "students",
    "profiles",
  ]

  for (const t of deleteOrder) {
    const count = await countRows(db2026, t)
    if (count > 0) {
      if (t === "profiles") {
        await deleteAllByUuid(db2026, t)
      } else {
        await deleteAll(db2026, t)
      }
      console.log(`  ${t}: ${count} 件削除`)
    }
  }

  // auth.users のクリーンアップ（ページング対応 + リトライ制限）
  let authDeletedTotal = 0
  const MAX_DELETE_ROUNDS = 50
  for (let round = 0; round < MAX_DELETE_ROUNDS; round++) {
    const { data: existing2026Users } = await db2026.auth.admin.listUsers({ perPage: 1000 })
    if (!existing2026Users?.users || existing2026Users.users.length === 0) break
    console.log(`  auth.users: ${existing2026Users.users.length} 件削除中... (round ${round + 1})`)
    let failCount = 0
    for (const user of existing2026Users.users) {
      const { error: delError } = await db2026.auth.admin.deleteUser(user.id)
      if (delError) {
        console.error(`  WARNING: auth.user ${user.id} 削除失敗: ${delError.message}`)
        failCount++
      } else {
        authDeletedTotal++
      }
    }
    if (failCount === existing2026Users.users.length) {
      throw new Error("auth.users 削除が全件失敗。中断します。")
    }
  }
  // ラウンド上限後の残存チェック
  const { data: remainingUsers } = await db2026.auth.admin.listUsers({ perPage: 1 })
  if (remainingUsers?.users && remainingUsers.users.length > 0) {
    throw new Error(`auth.users 削除が ${MAX_DELETE_ROUNDS} ラウンドで完了しませんでした。残存ユーザーあり。`)
  }
  if (authDeletedTotal > 0) {
    console.log(`  auth.users: ${authDeletedTotal} 件削除完了`)
  }

  console.log("  クリーンアップ完了")

  // ─── Step 5: auth.users インポート ───────────────
  console.log("")
  console.log("[4/7] auth.users をインポート...")

  let authImported = 0
  const authFailedIds: string[] = []
  for (const user of allAuthUsers) {
    const u = user as {
      id: string
      email?: string
      phone?: string
      email_confirmed_at?: string
      phone_confirmed_at?: string
      user_metadata?: Record<string, unknown>
      app_metadata?: Record<string, unknown>
      encrypted_password?: string
      created_at?: string
    }

    const { error: createError } = await db2026.auth.admin.createUser({
      id: u.id,
      email: u.email,
      phone: u.phone,
      email_confirm: !!u.email_confirmed_at,
      phone_confirm: !!u.phone_confirmed_at,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata,
      password: undefined, // パスワードは後で処理
    })

    if (createError) {
      console.error(`  WARNING: auth.user ${u.id} (${u.email}) のインポート失敗: ${createError.message}`)
      authFailedIds.push(u.id)
    } else {
      authImported++
    }
  }
  console.log(`  auth.users: ${authImported} 件インポート完了`)
  if (authFailedIds.length > 0) {
    console.error(`  FAILED: ${authFailedIds.length} 件のインポート失敗`)
    console.error(`  失敗ID: ${authFailedIds.join(", ")}`)
    console.error("")
    console.error("=============================================")
    console.error(" ABORT: auth.users インポート失敗のためテーブルインポートをスキップします。")
    console.error("=============================================")
    process.exit(1)
  }

  // auto-created profiles を削除
  const autoProfiles = await countRows(db2026, "profiles")
  if (autoProfiles > 0) {
    console.log(`  自動生成 profiles を削除 (${autoProfiles} 件)...`)
    await deleteAllByUuid(db2026, "profiles")
  }

  // ─── Step 6: テーブルインポート (FK順序) ─────────
  console.log("")
  console.log("[5/7] Identity テーブルをインポート...")

  // Phase A: profiles
  const profilesCount = await insertBatch(db2026, "profiles", exportData["profiles"])
  console.log(`  profiles: ${profilesCount} 件`)

  // Phase B: role テーブル
  for (const t of ["students", "parents", "coaches", "admins"]) {
    const count = await insertBatch(db2026, t, exportData[t])
    console.log(`  ${t}: ${count} 件`)
  }

  // Phase C: invitation_codes
  const codesCount = await insertBatch(db2026, "invitation_codes", exportData["invitation_codes"])
  console.log(`  invitation_codes: ${codesCount} 件`)

  // Phase D: リレーション
  for (const t of ["parent_child_relations", "coach_student_relations"]) {
    const count = await insertBatch(db2026, t, exportData[t])
    console.log(`  ${t}: ${count} 件`)
  }

  // ─── Step 7: 検証 ────────────────────────────────
  console.log("")
  console.log("[6/7] 整合性チェック...")

  let errors = 0
  for (const t of tables) {
    const srcCount = exportData[t].length
    const dstCount = await countRows(db2026, t)
    const status = srcCount === dstCount ? "OK" : "MISMATCH"
    if (status === "MISMATCH") errors++
    console.log(`  ${t}: DB2025=${srcCount} DB2026=${dstCount} [${status}]`)
  }

  // 整合性チェック失敗時は学年繰り上げに進まず即中断
  if (errors > 0) {
    console.error("")
    console.error("=============================================")
    console.error(` ABORT: ${errors} 件のミスマッチあり`)
    console.error(" 学年繰り上げをスキップして中断します。")
    console.error("=============================================")
    process.exit(1)
  }

  // ─── Step 8: 学年繰り上げ ────────────────────────
  console.log("")
  console.log("[7/7] 学年繰り上げ...")

  // 現在の学年分布
  const students2026 = await fetchAll(db2026, "students")
  const grade5 = students2026.filter((s) => s.grade === 5)
  const grade6 = students2026.filter((s) => s.grade === 6)
  console.log(`  現在: 5年生=${grade5.length}人, 6年生=${grade6.length}人`)

  if (grade5.length > 0) {
    // 5年生 → 6年生に繰り上げ
    const grade5Ids = grade5.map((s) => s.id as number)
    for (let i = 0; i < grade5Ids.length; i += 500) {
      const batch = grade5Ids.slice(i, i + 500)
      const { error: updateError } = await db2026
        .from("students")
        .update({ grade: 6 })
        .in("id", batch)
      if (updateError) throw new Error(`学年繰り上げエラー: ${updateError.message}`)
    }
    console.log(`  5年生 → 6年生: ${grade5.length} 人更新`)
  }

  if (grade6.length > 0) {
    // 卒業対象をCSVに出力
    const exportDir = path.join(process.cwd(), "export")
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:-]/g, "").slice(0, 15)
    const csvPath = path.join(exportDir, `graduating_students_${timestamp}.csv`)
    const csvHeader = "id,user_id,email,display_name\n"
    // auth.users から email、profiles から display_name を取得して結合
    const authEmailMap = new Map(allAuthUsers.map((u: any) => [u.id, u.email || ""]))
    const profileNameMap = new Map(exportData["profiles"].map((p: any) => [p.id, p.display_name || ""]))
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }
    const csvRows = grade6.map((s) => {
      const email = authEmailMap.get(s.user_id) || ""
      const displayName = profileNameMap.get(s.user_id) || ""
      return `${s.id},${s.user_id},${escapeCsv(email)},${escapeCsv(displayName)}`
    }).join("\n")
    fs.writeFileSync(csvPath, csvHeader + csvRows + "\n")
    console.log(`  卒業対象 CSV: ${csvPath} (${grade6.length} 件)`)
    console.log(`  ※ BAN処理: npx tsx scripts/ban-graduated-users.ts ${csvPath}`)
  }

  // 結果（ここに到達 = 整合性チェック成功済み）
  console.log("")
  console.log("=============================================")
  console.log(" RESULT: 移行成功")

  // 更新後の学年分布
  const finalStudents = await fetchAll(db2026, "students")
  const finalGrade5 = finalStudents.filter((s) => s.grade === 5)
  const finalGrade6 = finalStudents.filter((s) => s.grade === 6)
  console.log(` 更新後: 5年生=${finalGrade5.length}人, 6年生=${finalGrade6.length}人`)
  console.log("=============================================")
  console.log("")
  console.log("次のステップ:")
  console.log("  1. Vercel の環境変数を DB2026 に切り替え")
  console.log("  2. (任意) 卒業生 BAN: npx tsx scripts/ban-graduated-users.ts export/graduating_students_*.csv")
}

main().catch((err) => {
  console.error("エラー:", err)
  process.exit(1)
})
