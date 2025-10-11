import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * データ保持ポリシー実行バッチ処理
 *
 * 実行タイミング: 毎日 午前3時（日本時間）
 *
 * 処理内容（run_data_retention_cleanup 関数）:
 * - 監査ログ: 365日（1年）以上前のデータを削除
 * - AIキャッシュ: 30日以上アクセスされていないデータを削除
 * - 週次分析: 6週間（42日）以上前のデータを削除
 * - 通知: 60日以上前の既読通知を削除
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronからのリクエストか検証）
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🗑️ データ保持ポリシーバッチ処理開始", new Date().toISOString())

    const supabase = await createClient()

    // マスター削除関数を実行（管理者権限が必要）
    const { data: results, error } = await supabase.rpc("run_data_retention_cleanup")

    if (error) {
      console.error("データ削除エラー:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    // 削除結果をログ出力
    console.log("📊 削除結果:")
    results?.forEach((result: { cleanup_type: string; deleted_count: number }) => {
      console.log(`  - ${result.cleanup_type}: ${result.deleted_count}件削除`)
    })

    console.log("✅ データ保持ポリシーバッチ処理完了", new Date().toISOString())

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 バッチ処理でエラーが発生:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
