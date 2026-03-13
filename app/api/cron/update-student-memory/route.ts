/**
 * 週次メモリフル更新 Cron (Phase 3)
 *
 * 月曜 2:00 AM JST = 日曜 17:00 UTC
 * 8週分の学習データをLLMで要約し、student_memory_summaries を upsert する。
 *
 * ## クライアント使い分け
 * - createServiceClient(): RLSバイパスで全生徒のデータにアクセス
 * - ユーザーリクエスト処理では使用しない（Cronバッチ専用）
 */

import { createServiceClient } from "@/lib/supabase/service-client"
import { generateStudentMemory } from "@/lib/llm/memory-generator"
import { getDaysAgoJST, getNowJSTISO } from "@/lib/utils/date-jst"

export const dynamic = "force-dynamic"

const CHUNK_SIZE = 5

export async function GET(request: Request) {
  // CRON_SECRET認証
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Student Memory Cron] Unauthorized access attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("[Student Memory Cron] Starting weekly full generation...")

  try {
    const serviceClient = createServiceClient()

    // アクティブ生徒取得（14日以内にログイン）
    const cutoffDateStr = getDaysAgoJST(14)

    const { data: students, error: studentsError } = await serviceClient
      .from("students")
      .select(`
        id,
        profiles!inner (
          last_login_at
        )
      `)
      .gte("profiles.last_login_at", `${cutoffDateStr}T00:00:00+09:00`)

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`)
    }

    if (!students || students.length === 0) {
      console.log("[Student Memory Cron] No active students found")
      return Response.json({
        success: true,
        totalStudents: 0,
        successCount: 0,
        failureCount: 0,
      })
    }

    console.log(`[Student Memory Cron] Found ${students.length} active students`)

    let successCount = 0
    let failureCount = 0
    const errors: { studentId: number; error: string }[] = []

    // チャンク分割して処理（チャンク間は逐次、チャンク内は並列）
    const chunks: typeof students[] = []
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      chunks.push(students.slice(i, i + CHUNK_SIZE))
    }

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (student) => {
          try {
            const memoryData = await generateStudentMemory(serviceClient, student.id)

            // upsert_student_memory SQL関数で原子的にINSERT/UPDATE
            const { error: rpcError } = await serviceClient.rpc("upsert_student_memory", {
              p_student_id: student.id,
              p_compact_summary: memoryData.compactSummary,
              p_detailed_summary: memoryData.detailedSummary,
              p_subject_trends: memoryData.subjectTrends,
              p_stumbling_patterns: memoryData.stumblingPatterns,
              p_effective_encouragements: memoryData.effectiveEncouragements,
              p_recent_successes: memoryData.recentSuccesses,
              p_emotional_tendencies: memoryData.emotionalTendencies,
              p_last_study_log_id: memoryData.lastStudyLogId,
              p_data_window_start: memoryData.dataWindowStart,
              p_data_window_end: memoryData.dataWindowEnd,
              p_weeks_covered: memoryData.weeksCovered,
            })

            if (rpcError) {
              throw new Error(`upsert_student_memory failed: ${rpcError.message}`)
            }

            return { success: true as const, studentId: student.id }
          } catch (error) {
            return {
              success: false as const,
              studentId: student.id,
              error: error instanceof Error ? error.message : String(error),
            }
          }
        }),
      )

      for (const result of results) {
        if (result.success) {
          successCount++
          console.log(`[Student Memory Cron] ✅ Generated for student ${result.studentId}`)
        } else {
          failureCount++
          console.error(`[Student Memory Cron] ❌ Failed for student ${result.studentId}:`, result.error)
          errors.push({ studentId: result.studentId, error: result.error ?? "Unknown error" })
        }
      }
    }

    const response = {
      success: true,
      totalStudents: students.length,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
      generatedAt: getNowJSTISO(),
    }

    console.log(`[Student Memory Cron] Completed: ${successCount}/${students.length} succeeded`)

    return Response.json(response)
  } catch (error) {
    console.error("[Student Memory Cron] Fatal error:", error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
