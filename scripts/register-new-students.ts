/**
 * 新規生徒＋保護者 一括登録スクリプト
 *
 * 実行方法:
 *   set -a && source .env.local && set +a && npx tsx scripts/register-new-students.ts [--dry-run]
 *
 * 処理:
 *   1. 生徒の auth.users 作成 ({login_id}@studyspark.local)
 *   2. 保護者の auth.users 作成 (実メール)
 *   3. profiles 自動生成を待機
 *   4. students / parents テーブルにレコード挿入
 *   5. parent_child_relations で紐づけ
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const dryRun = process.argv.includes("--dry-run")

// ─── 登録データ ──────────────────────────────────────
interface Family {
  student: {
    fullName: string
    loginId: string
    password: string
    grade: 5 | 6
    course: "A" | "B" | "C" | "S"
  }
  parent: {
    fullName: string
    furigana: string
    email: string
    password: string
    displayName: string
  }
}

const families: Family[] = [
  {
    student: { fullName: "小林和輝", loginId: "kazuki5", password: "pass2026", grade: 5, course: "A" },
    parent: { fullName: "小林憲史", furigana: "コバヤシ", email: "toshin.hitachi+test025@gmail.com", password: "pass4921", displayName: "コバヤシ" },
  },
  {
    student: { fullName: "逆井唯花", loginId: "yuika5", password: "pass2026", grade: 5, course: "A" },
    parent: { fullName: "逆井和弘", furigana: "サカサイ", email: "toshin.hitachi+test026@gmail.com", password: "pass7702", displayName: "サカサイ" },
  },
  {
    student: { fullName: "添田悠斗", loginId: "yuuto5", password: "pass2026", grade: 5, course: "A" },
    parent: { fullName: "添田誠司", furigana: "ソエダ", email: "toshin.hitachi+test027@gmail.com", password: "pass3158", displayName: "ソエダ" },
  },
  {
    student: { fullName: "名越花音", loginId: "kanon5", password: "pass2026", grade: 5, course: "A" },
    parent: { fullName: "名越俊昌", furigana: "ナゴシ", email: "toshin.hitachi+test028@gmail.com", password: "pass8249", displayName: "ナゴシ" },
  },
  {
    student: { fullName: "山田愛佳", loginId: "manaka5", password: "pass2026", grade: 5, course: "A" },
    parent: { fullName: "山田真理子", furigana: "ヤマダ", email: "toshin.hitachi+test029@gmail.com", password: "pass6015", displayName: "ヤマダ" },
  },
]

// ─── ユーティリティ ───────────────────────────────────
async function waitForProfile(userId: string, maxRetries = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).single()
    if (data) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

// ─── メイン処理 ───────────────────────────────────────
async function main() {
  console.log("=".repeat(60))
  console.log("新規生徒＋保護者 一括登録")
  console.log("=".repeat(60))
  console.log(`Supabase: ${supabaseUrl}`)
  console.log(`Mode: ${dryRun ? "DRY-RUN" : "EXECUTE"}`)
  console.log(`対象: ${families.length} 家庭`)
  console.log("")

  // login_id 重複チェック
  const loginIds = families.map((f) => f.student.loginId)
  const { data: existing } = await supabase.from("students").select("login_id").in("login_id", loginIds)
  if (existing && existing.length > 0) {
    console.error(`❌ 既存の login_id が見つかりました: ${existing.map((e) => e.login_id).join(", ")}`)
    console.error("重複を解消してから再実行してください。")
    process.exit(1)
  }

  // メール存在チェック（既存アカウントは再利用する）
  const { data: allUsers } = await supabase.auth.admin.listUsers()
  const existingEmailMap = new Map<string, string>()
  for (const email of families.map((f) => f.parent.email)) {
    const found = allUsers?.users?.find((u) => u.email === email)
    if (found) {
      existingEmailMap.set(email, found.id)
      console.log(`  ⚠ ${email} は既存アカウント (${found.id}) → 再利用します`)
    }
  }

  console.log("✓ 重複チェック OK\n")

  let successCount = 0

  for (const family of families) {
    const { student, parent } = family
    console.log(`── ${student.fullName} (${student.loginId}) / ${parent.fullName} ──`)

    if (dryRun) {
      const reuse = existingEmailMap.has(parent.email) ? " (再利用)" : " (新規)"
      console.log(`  [dry-run] 生徒: ${student.loginId}@studyspark.local / ${student.password}`)
      console.log(`  [dry-run] 保護者: ${parent.email} / ${parent.password}${reuse}`)
      console.log("")
      successCount++
      continue
    }

    // 1. 生徒の auth.user 作成
    const studentEmail = `${student.loginId}@studyspark.local`
    const { data: studentAuth, error: studentAuthErr } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: student.password,
      email_confirm: true,
      user_metadata: {
        role: "student",
        full_name: student.fullName,
        login_id: student.loginId,
      },
    })
    if (studentAuthErr || !studentAuth.user) {
      console.error(`  ❌ 生徒 auth.user 作成失敗: ${studentAuthErr?.message}`)
      continue
    }
    const studentUserId = studentAuth.user.id
    console.log(`  ✓ 生徒 auth.user: ${studentUserId}`)

    // 2. 保護者の auth.user 作成 or 既存再利用
    let parentUserId: string
    const existingParentId = existingEmailMap.get(parent.email)
    if (existingParentId) {
      // 既存アカウントを再利用: メタデータ＋パスワード更新
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existingParentId, {
        password: parent.password,
        user_metadata: {
          role: "parent",
          full_name: parent.fullName,
          full_name_kana: parent.furigana,
        },
      })
      if (updateErr) {
        console.error(`  ❌ 保護者 auth.user 更新失敗: ${updateErr.message}`)
        continue
      }
      parentUserId = existingParentId
      console.log(`  ✓ 保護者 auth.user (再利用): ${parentUserId}`)
    } else {
      const { data: parentAuth, error: parentAuthErr } = await supabase.auth.admin.createUser({
        email: parent.email,
        password: parent.password,
        email_confirm: true,
        user_metadata: {
          role: "parent",
          full_name: parent.fullName,
          full_name_kana: parent.furigana,
        },
      })
      if (parentAuthErr || !parentAuth.user) {
        console.error(`  ❌ 保護者 auth.user 作成失敗: ${parentAuthErr?.message}`)
        continue
      }
      parentUserId = parentAuth.user.id
      console.log(`  ✓ 保護者 auth.user (新規): ${parentUserId}`)
    }

    // 3. profile 自動生成を待機（既存の場合はすでに存在するのでスキップ可能）
    const studentProfileOk = await waitForProfile(studentUserId)
    const parentProfileOk = await waitForProfile(parentUserId)
    if (!studentProfileOk || !parentProfileOk) {
      console.error(`  ❌ profile 自動生成タイムアウト`)
      continue
    }
    console.log(`  ✓ profiles OK`)

    // 4. students テーブル挿入
    const { data: studentRow, error: studentErr } = await supabase
      .from("students")
      .insert({
        user_id: studentUserId,
        login_id: student.loginId,
        full_name: student.fullName,
        grade: student.grade,
        course: student.course,
      })
      .select("id")
      .single()
    if (studentErr || !studentRow) {
      console.error(`  ❌ students 挿入失敗: ${studentErr?.message}`)
      continue
    }
    console.log(`  ✓ students: id=${studentRow.id}`)

    // 5. parents テーブル: 既存レコードがあれば更新、なければ挿入
    let parentRowId: number
    if (existingParentId) {
      const { data: existingParent } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", existingParentId)
        .single()
      if (existingParent) {
        const { error: updateParentErr } = await supabase
          .from("parents")
          .update({ full_name: parent.fullName, furigana: parent.furigana })
          .eq("id", existingParent.id)
        if (updateParentErr) {
          console.error(`  ❌ parents 更新失敗: ${updateParentErr.message}`)
          continue
        }
        parentRowId = existingParent.id
        console.log(`  ✓ parents (更新): id=${parentRowId}`)
      } else {
        const { data: parentRow, error: parentErr } = await supabase
          .from("parents")
          .insert({ user_id: parentUserId, full_name: parent.fullName, furigana: parent.furigana })
          .select("id")
          .single()
        if (parentErr || !parentRow) {
          console.error(`  ❌ parents 挿入失敗: ${parentErr?.message}`)
          continue
        }
        parentRowId = parentRow.id
        console.log(`  ✓ parents (新規): id=${parentRowId}`)
      }
    } else {
      const { data: parentRow, error: parentErr } = await supabase
        .from("parents")
        .insert({ user_id: parentUserId, full_name: parent.fullName, furigana: parent.furigana })
        .select("id")
        .single()
      if (parentErr || !parentRow) {
        console.error(`  ❌ parents 挿入失敗: ${parentErr?.message}`)
        continue
      }
      parentRowId = parentRow.id
      console.log(`  ✓ parents (新規): id=${parentRowId}`)
    }

    // 6. parent_child_relations 作成
    const { error: relErr } = await supabase.from("parent_child_relations").insert({
      parent_id: parentRowId,
      student_id: studentRow.id,
      relation_type: "guardian",
    })
    if (relErr) {
      console.error(`  ❌ 紐づけ失敗: ${relErr.message}`)
      continue
    }
    console.log(`  ✓ parent_child_relations: parent=${parentRowId} → student=${studentRow.id}`)

    console.log("")
    successCount++
  }

  console.log("=".repeat(60))
  console.log(`結果: ${successCount}/${families.length} 家庭 登録完了`)
  if (dryRun) console.log("[dry-run] 実際には登録されていません。")
  console.log("=".repeat(60))
}

main().catch((err) => {
  console.error("エラー:", err)
  process.exit(1)
})
