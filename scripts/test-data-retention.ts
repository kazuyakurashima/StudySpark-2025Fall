/**
 * データ保持ポリシーテストスクリプト
 *
 * 実行方法:
 *   npx tsx scripts/test-data-retention.ts
 */

import { createClient } from "@supabase/supabase-js"

async function testDataRetentionCleanup() {
  console.log("🧪 データ保持ポリシーテスト開始\n")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ 環境変数が設定されていません")
    console.log("必要な環境変数:")
    console.log("  - NEXT_PUBLIC_SUPABASE_URL")
    console.log("  - SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 削除前のデータ数を確認
    console.log("📊 削除前のデータ数:")

    const { count: auditCount } = await supabase.from("audit_logs").select("*", { count: "exact", head: true })

    const { count: cacheCount } = await supabase.from("ai_cache").select("*", { count: "exact", head: true })

    const { count: analysisCount } = await supabase
      .from("weekly_analysis")
      .select("*", { count: "exact", head: true })

    const { count: notificationCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })

    console.log(`  - 監査ログ: ${auditCount}件`)
    console.log(`  - AIキャッシュ: ${cacheCount}件`)
    console.log(`  - 週次分析: ${analysisCount}件`)
    console.log(`  - 通知: ${notificationCount}件\n`)

    // データ削除実行
    console.log("🗑️ データ削除を実行中...")
    const { data: results, error } = await supabase.rpc("run_data_retention_cleanup")

    if (error) {
      console.error("❌ エラー:", error)
      process.exit(1)
    }

    console.log("\n✅ 削除完了:")
    results?.forEach((result: { cleanup_type: string; deleted_count: number }) => {
      console.log(`  - ${result.cleanup_type}: ${result.deleted_count}件削除`)
    })

    // 削除後のデータ数を確認
    console.log("\n📊 削除後のデータ数:")

    const { count: auditCountAfter } = await supabase.from("audit_logs").select("*", { count: "exact", head: true })

    const { count: cacheCountAfter } = await supabase.from("ai_cache").select("*", { count: "exact", head: true })

    const { count: analysisCountAfter } = await supabase
      .from("weekly_analysis")
      .select("*", { count: "exact", head: true })

    const { count: notificationCountAfter } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })

    console.log(`  - 監査ログ: ${auditCountAfter}件`)
    console.log(`  - AIキャッシュ: ${cacheCountAfter}件`)
    console.log(`  - 週次分析: ${analysisCountAfter}件`)
    console.log(`  - 通知: ${notificationCountAfter}件`)

    console.log("\n🎉 テスト完了！")
  } catch (error) {
    console.error("💥 エラーが発生しました:", error)
    process.exit(1)
  }
}

// 実行
testDataRetentionCleanup()
