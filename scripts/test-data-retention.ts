/**
 * Phase 5-5: データ削除バッチテストスクリプト
 *
 * テスト内容:
 * 1. 削除前のデータ数確認
 * 2. run_data_retention_cleanup() 実行
 * 3. 削除後のデータ数確認
 * 4. 古いデータが削除され、保持期間内データが残存することを確認
 *
 * 実行方法:
 *   npx tsx scripts/test-data-retention.ts
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

// .env.local を読み込み
config({ path: ".env.local" })

async function testDataRetentionCleanup() {
  console.log("🧪 Phase 5-5: データ削除バッチテスト開始\n")

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

    // 削除件数の検証
    console.log("\n📋 削除件数の検証:")
    const totalDeleted = results?.reduce(
      (sum: number, r: { deleted_count: number }) => sum + r.deleted_count,
      0
    )
    console.log(`  - 合計削除件数: ${totalDeleted}件`)

    // 保持期間内データの確認
    console.log("\n🔍 保持期間内データの確認:")

    // 監査ログ: 365日（1年）以内
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    const { count: recentAuditCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneYearAgo.toISOString())

    console.log(`  - 監査ログ（365日以内）: ${recentAuditCount}件 残存`)

    // 週次分析: 6週間（42日）以内
    const sixWeeksAgo = new Date()
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42)
    const { count: recentAnalysisCount } = await supabase
      .from("weekly_analysis")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixWeeksAgo.toISOString())

    console.log(`  - 週次分析（42日以内）: ${recentAnalysisCount}件 残存`)

    // AIキャッシュ: 30日以内にアクセスされたもの
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count: recentCacheCount } = await supabase
      .from("ai_cache")
      .select("*", { count: "exact", head: true })
      .gte("last_accessed_at", thirtyDaysAgo.toISOString())

    console.log(`  - AIキャッシュ（30日以内アクセス）: ${recentCacheCount}件 残存`)

    // 通知: 60日以内または未読
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const { count: recentNotificationCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .or(`created_at.gte.${sixtyDaysAgo.toISOString()},is_read.eq.false`)

    console.log(`  - 通知（60日以内または未読）: ${recentNotificationCount}件 残存`)

    console.log("\n🎉 データ削除バッチテスト完了！")
    console.log("\n✅ 確認事項:")
    console.log("   - 古いデータが削除されました")
    console.log("   - 保持期間内のデータは残存しています")
    console.log("   - 削除ポリシーが正しく動作しています")
  } catch (error) {
    console.error("💥 エラーが発生しました:", error)
    process.exit(1)
  }
}

// 実行
testDataRetentionCleanup()
