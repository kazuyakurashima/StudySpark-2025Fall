import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateWeeklyAnalysisForBatch } from "@/app/actions/weekly-analysis"

export const dynamic = 'force-dynamic'

// Supabase Admin Client（バッチ処理用）
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * 週次AI分析バッチ処理
 *
 * 実行タイミング:
 * - 月曜 0:00 (Asia/Tokyo): 速報版 - 前週月〜日を分析
 * - 木曜 0:00 (Asia/Tokyo): 確定版 - 前週月〜日を再分析（上書き）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cron Secret）
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("CRON_SECRET is not configured")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🤖 週次AI分析バッチ処理開始")

    const supabase = getSupabaseAdmin()

    // 全生徒を取得
    const { data: students, error: studentsError } = await supabase.from("students").select("id, full_name")

    if (studentsError) {
      throw new Error(`生徒一覧の取得に失敗: ${studentsError.message}`)
    }

    if (!students || students.length === 0) {
      console.log("⚠️ 分析対象の生徒が見つかりません")
      return NextResponse.json({ success: true, analyzed: 0, message: "No students found" })
    }

    // 分析対象週を計算（前週月曜〜日曜）
    const { weekStart, weekEnd } = getPreviousWeek()

    console.log(`📅 分析対象週: ${weekStart.toISOString()} 〜 ${weekEnd.toISOString()}`)
    console.log(`👥 対象生徒数: ${students.length}人`)

    const results = {
      total: students.length,
      success: 0,
      failed: 0,
      errors: [] as { studentId: string; error: string }[],
    }

    // 各生徒の分析を生成（リトライ付き）
    const promises = students.map(async (student) => {
      const maxRetries = 3
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`  🔄 ${student.full_name}さんの分析を生成中... (試行 ${attempt}/${maxRetries})`)

          const result = await generateWeeklyAnalysisForBatch(student.id, weekStart, weekEnd)

          if (result.error) {
            throw new Error(result.error)
          }

          results.success++
          console.log(`  ✅ ${student.full_name}さんの分析完了`)
          return // 成功したらループを抜ける
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unknown error")
          console.error(`  ⚠️ 試行 ${attempt}/${maxRetries} 失敗:`, lastError.message)

          // 最後の試行でない場合は待機
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)) // 指数バックオフ
          }
        }
      }

      // 全ての試行が失敗
      results.failed++
      results.errors.push({
        studentId: student.id,
        error: lastError?.message || "Unknown error",
      })
      console.error(`  ❌ ${student.full_name}さんの分析失敗（全${maxRetries}回試行）`)
    })

    // 全ての分析を並列実行（最大10件ずつ）
    for (let i = 0; i < promises.length; i += 10) {
      const chunk = promises.slice(i, i + 10)
      await Promise.all(chunk)
    }

    console.log("📊 バッチ処理結果:")
    console.log(`  ✅ 成功: ${results.success}/${results.total}`)
    console.log(`  ❌ 失敗: ${results.failed}/${results.total}`)

    if (results.errors.length > 0) {
      console.error("❌ エラー詳細:", results.errors)
    }

    return NextResponse.json({
      success: true,
      analyzed: results.success,
      failed: results.failed,
      total: results.total,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error("💥 バッチ処理でエラーが発生:", error)

    return NextResponse.json(
      {
        error: "Batch processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * 前週の月曜日と日曜日を取得（Asia/Tokyo）
 */
function getPreviousWeek(): { weekStart: Date; weekEnd: Date } {
  // 現在の日時（Asia/Tokyo）
  const now = new Date()
  const jstOffset = 9 * 60 // JST = UTC+9
  const utcOffset = now.getTimezoneOffset()
  const jstNow = new Date(now.getTime() + (jstOffset + utcOffset) * 60 * 1000)

  // 今日の曜日（0=日曜, 1=月曜, ..., 6=土曜）
  const dayOfWeek = jstNow.getDay()

  // 前週の月曜日を計算
  // - 月曜なら -7日
  // - 火曜なら -8日
  // - 日曜なら -6日
  const daysToLastMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek + 6)

  const weekStart = new Date(jstNow)
  weekStart.setDate(jstNow.getDate() + daysToLastMonday)
  weekStart.setHours(0, 0, 0, 0)

  // 前週の日曜日（月曜日 + 6日）
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}
