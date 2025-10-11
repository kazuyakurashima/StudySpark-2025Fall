/**
 * Phase 5-5: 監査ログE2Eテストスクリプト
 *
 * テスト内容:
 * 1. profiles更新 → 監査ログ記録確認
 * 2. invitation_codes発行 → 監査ログ記録確認
 * 3. 管理者画面でログ閲覧確認
 * 4. フィルター機能の動作確認
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

// .env.local を読み込み
config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: any
  new_data: any
  user_id: string | null
  created_at: string
}

async function testAuditLogs() {
  console.log("🧪 Phase 5-5: 監査ログE2Eテスト開始\n")

  let testsPassed = 0
  let testsFailed = 0

  // テスト1: profiles更新 → 監査ログ記録確認
  console.log("📋 テスト1: profiles更新時の監査ログ記録")
  try {
    // テスト用の生徒ユーザーを取得
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("user_id")
      .limit(1)
      .single()

    if (studentError || !student) {
      throw new Error("テスト用生徒が見つかりません")
    }

    // 更新前の監査ログ件数を取得
    const { count: beforeCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("table_name", "profiles")
      .eq("record_id", student.user_id)

    // profilesを更新（display_nameを変更）
    const testDisplayName = `テストユーザー_${Date.now()}`
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: testDisplayName })
      .eq("id", student.user_id)

    if (updateError) {
      throw new Error(`profiles更新エラー: ${updateError.message}`)
    }

    // 少し待機（トリガー実行を待つ）
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 更新後の監査ログを確認
    const { data: auditLogs, count: afterCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("table_name", "profiles")
      .eq("record_id", student.user_id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!auditLogs || auditLogs.length === 0) {
      throw new Error("監査ログが記録されていません")
    }

    const latestLog = auditLogs[0] as AuditLog

    // 検証
    if (latestLog.action !== "UPDATE") {
      throw new Error(`期待されるアクション: UPDATE, 実際: ${latestLog.action}`)
    }

    if (latestLog.new_data?.display_name !== testDisplayName) {
      throw new Error(
        `新しいdisplay_nameが記録されていません: ${JSON.stringify(latestLog.new_data)}`
      )
    }

    console.log("  ✅ profiles更新が正しく監査ログに記録されました")
    console.log(`     - アクション: ${latestLog.action}`)
    console.log(`     - 新しいdisplay_name: ${latestLog.new_data.display_name}`)
    console.log(`     - ログ件数: ${beforeCount} → ${afterCount}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト1失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト2: invitation_codes発行 → 監査ログ記録確認
  console.log("📋 テスト2: invitation_codes発行時の監査ログ記録")
  try {
    // 更新前の監査ログ件数を取得
    const { count: beforeCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("table_name", "invitation_codes")

    // 招待コードを発行
    const testCode = `TEST_${Date.now()}`
    const { data: invitationCode, error: insertError } = await supabase
      .from("invitation_codes")
      .insert({
        code: testCode,
        role: "parent",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`招待コード発行エラー: ${insertError.message}`)
    }

    // 少し待機（トリガー実行を待つ）
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 監査ログを確認
    const { data: auditLogs, count: afterCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("table_name", "invitation_codes")
      .eq("record_id", invitationCode.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!auditLogs || auditLogs.length === 0) {
      throw new Error("監査ログが記録されていません")
    }

    const latestLog = auditLogs[0] as AuditLog

    // 検証
    if (latestLog.action !== "INSERT") {
      throw new Error(`期待されるアクション: INSERT, 実際: ${latestLog.action}`)
    }

    if (latestLog.new_data?.code !== testCode) {
      throw new Error(
        `新しいcodeが記録されていません: ${JSON.stringify(latestLog.new_data)}`
      )
    }

    console.log("  ✅ invitation_codes発行が正しく監査ログに記録されました")
    console.log(`     - アクション: ${latestLog.action}`)
    console.log(`     - コード: ${latestLog.new_data.code}`)
    console.log(`     - ロール: ${latestLog.new_data.role}`)
    console.log(`     - ログ件数: ${beforeCount} → ${afterCount}\n`)
    testsPassed++

    // クリーンアップ（テスト用招待コードを削除）
    await supabase.from("invitation_codes").delete().eq("id", invitationCode.id)
  } catch (error) {
    console.error("  ❌ テスト2失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト3: 監査ログ閲覧（全件取得）
  console.log("📋 テスト3: 監査ログ閲覧（全件取得）")
  try {
    const { data: allLogs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      throw new Error(`監査ログ取得エラー: ${error.message}`)
    }

    if (!allLogs || allLogs.length === 0) {
      throw new Error("監査ログが取得できません")
    }

    console.log(`  ✅ 監査ログを取得できました（直近20件: ${allLogs.length}件）`)
    console.log("     テーブル別件数:")

    // テーブル別に集計
    const tableCount = allLogs.reduce((acc, log) => {
      acc[log.table_name] = (acc[log.table_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(tableCount).forEach(([table, count]) => {
      console.log(`       - ${table}: ${count}件`)
    })
    console.log()
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト3失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト4: フィルター機能（テーブル名でフィルター）
  console.log("📋 テスト4: フィルター機能（テーブル名）")
  try {
    const targetTable = "profiles"
    const { data: filteredLogs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("table_name", targetTable)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`フィルター取得エラー: ${error.message}`)
    }

    if (!filteredLogs || filteredLogs.length === 0) {
      throw new Error(`${targetTable}の監査ログが見つかりません`)
    }

    // すべてのログがtargetTableであることを確認
    const allMatchTable = filteredLogs.every((log) => log.table_name === targetTable)
    if (!allMatchTable) {
      throw new Error("フィルターが正しく機能していません")
    }

    console.log(`  ✅ テーブル名フィルター（${targetTable}）が正しく動作しました`)
    console.log(`     - 取得件数: ${filteredLogs.length}件`)
    console.log(`     - すべて${targetTable}テーブル: ${allMatchTable}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト4失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト5: フィルター機能（アクション種別でフィルター）
  console.log("📋 テスト5: フィルター機能（アクション種別）")
  try {
    const targetAction = "UPDATE"
    const { data: filteredLogs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("action", targetAction)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`フィルター取得エラー: ${error.message}`)
    }

    if (!filteredLogs || filteredLogs.length === 0) {
      throw new Error(`${targetAction}の監査ログが見つかりません`)
    }

    // すべてのログがtargetActionであることを確認
    const allMatchAction = filteredLogs.every((log) => log.action === targetAction)
    if (!allMatchAction) {
      throw new Error("フィルターが正しく機能していません")
    }

    console.log(`  ✅ アクション種別フィルター（${targetAction}）が正しく動作しました`)
    console.log(`     - 取得件数: ${filteredLogs.length}件`)
    console.log(`     - すべて${targetAction}アクション: ${allMatchAction}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト5失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト6: 監査ログの詳細情報確認
  console.log("📋 テスト6: 監査ログの詳細情報確認")
  try {
    const { data: sampleLog, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !sampleLog) {
      throw new Error("サンプルログの取得に失敗しました")
    }

    // 必須フィールドの存在確認
    const requiredFields = ["id", "table_name", "record_id", "action", "created_at"]
    const missingFields = requiredFields.filter((field) => !sampleLog[field])

    if (missingFields.length > 0) {
      throw new Error(`必須フィールドが不足: ${missingFields.join(", ")}`)
    }

    console.log("  ✅ 監査ログの詳細情報が正しく記録されています")
    console.log(`     - ID: ${sampleLog.id}`)
    console.log(`     - テーブル: ${sampleLog.table_name}`)
    console.log(`     - アクション: ${sampleLog.action}`)
    console.log(`     - レコードID: ${sampleLog.record_id}`)
    console.log(
      `     - old_data: ${sampleLog.old_data ? "あり" : "なし"}${sampleLog.old_data ? ` (${Object.keys(sampleLog.old_data).length}フィールド)` : ""}`
    )
    console.log(
      `     - new_data: ${sampleLog.new_data ? "あり" : "なし"}${sampleLog.new_data ? ` (${Object.keys(sampleLog.new_data).length}フィールド)` : ""}`
    )
    console.log(`     - ユーザーID: ${sampleLog.user_id || "なし"}`)
    console.log(`     - 作成日時: ${sampleLog.created_at}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト6失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // 結果サマリー
  console.log("=" .repeat(60))
  console.log(`\n📊 テスト結果サマリー`)
  console.log(`   成功: ${testsPassed}/6`)
  console.log(`   失敗: ${testsFailed}/6`)
  console.log(`   成功率: ${Math.round((testsPassed / 6) * 100)}%\n`)

  if (testsFailed === 0) {
    console.log("🎉 すべてのテストが成功しました！")
    console.log("\n✅ 監査ログ機能は正常に動作しています:")
    console.log("   - profiles更新が監査ログに記録される")
    console.log("   - invitation_codes発行が監査ログに記録される")
    console.log("   - 監査ログの閲覧が可能")
    console.log("   - テーブル名フィルターが機能する")
    console.log("   - アクション種別フィルターが機能する")
    console.log("   - 詳細情報が正しく記録されている")
  } else {
    console.error("\n❌ 一部のテストが失敗しました。上記のエラーを確認してください。")
    process.exit(1)
  }
}

// 実行
testAuditLogs().catch((error) => {
  console.error("💥 テスト実行中にエラーが発生しました:", error)
  process.exit(1)
})
