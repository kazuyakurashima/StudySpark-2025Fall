/**
 * 日次メモリ差分更新 Cron (Phase 3)
 *
 * 毎日 3:30 AM JST = 18:30 UTC
 * study_logsの新規・更新分を検出し、compact_summaryに1行追記する。
 * LLM呼び出しなし → コストゼロ、高速。
 *
 * ## クライアント使い分け
 * - createServiceClient(): RLSバイパスで全生徒のデータにアクセス
 * - ユーザーリクエスト処理では使用しない（Cronバッチ専用）
 */

import { createServiceClient } from "@/lib/supabase/service-client"
import { appendDailyDelta } from "@/lib/llm/memory-generator"
import { getNowJSTISO } from "@/lib/utils/date-jst"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // CRON_SECRET認証
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Daily Memory Cron] Unauthorized access attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("[Daily Memory Cron] Starting daily delta update...")

  try {
    const serviceClient = createServiceClient()

    // student_memory_summaries が存在する生徒のみ対象
    const { data: memoryRows, error: memError } = await serviceClient
      .from("student_memory_summaries")
      .select("student_id")

    if (memError) {
      throw new Error(`Failed to fetch memory rows: ${memError.message}`)
    }

    if (!memoryRows || memoryRows.length === 0) {
      console.log("[Daily Memory Cron] No students with memory summaries found")
      return Response.json({
        success: true,
        totalStudents: 0,
        updatedCount: 0,
        skippedCount: 0,
      })
    }

    console.log(`[Daily Memory Cron] Found ${memoryRows.length} students with memory summaries`)

    let updatedCount = 0
    let skippedCount = 0
    let failureCount = 0
    const errors: { studentId: number; error: string }[] = []

    // LLM不使用なので逐次処理で十分（DB負荷抑制）
    for (const row of memoryRows) {
      try {
        const updated = await appendDailyDelta(serviceClient, row.student_id)
        if (updated) {
          updatedCount++
        } else {
          skippedCount++
        }
      } catch (error) {
        failureCount++
        console.error(`[Daily Memory Cron] ❌ Failed for student ${row.student_id}:`, error)
        errors.push({
          studentId: row.student_id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const response = {
      success: true,
      totalStudents: memoryRows.length,
      updatedCount,
      skippedCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
      generatedAt: getNowJSTISO(),
    }

    console.log(
      `[Daily Memory Cron] Completed: ${updatedCount} updated, ${skippedCount} skipped, ${failureCount} failed`,
    )

    return Response.json(response)
  } catch (error) {
    console.error("[Daily Memory Cron] Fatal error:", error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
