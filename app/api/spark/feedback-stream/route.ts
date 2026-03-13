import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"
import { createAdminClient } from "@/lib/supabase/server"
import { sanitizeForLog } from "@/lib/llm/logger"
import { getLangfuseClient } from "@/lib/langfuse/client"
import { PerfTimer } from "@/lib/utils/perf-timer"
import { SSE_META } from "@/lib/sse/types"
import {
  PROMPT_VERSION,
  getSystemPrompt,
  getUserPrompt,
  getPromptHash,
  getTimeoutMs,
  getFallbackFeedback,
  verifyBatchOwnership,
  checkExistingFeedback,
  saveFeedbackToDb,
  saveFallbackToDb,
} from "@/lib/services/coach-feedback"
import { generateCoachFeedbackStream } from "@/lib/services/coach-feedback-stream"
import type { StudyDataForFeedback } from "@/lib/types/coach-feedback"

export const runtime = "nodejs"

// ============================================================================
// Zod スキーマ
// ============================================================================

const subjectSchema = z.object({
  name: z.string(),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
})

const requestSchema = z.object({
  studentId: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  batchId: z.string().min(1).max(100),
  studyLogIds: z.array(z.number().int().positive()).min(1),
  data: z.object({
    subjects: z.array(subjectSchema).min(1),
    studentName: z.string().optional(),
    streak: z.number().int().min(0).optional(),
    previousAccuracy: z.number().min(0).max(100).optional(),
    reflectionText: z.string().max(2000).optional(),
  }),
})

// ============================================================================
// SSE ヘルパー
// ============================================================================

function sseEvent(type: string, content: string): string {
  return `data: ${JSON.stringify({ type, content })}\n\n`
}

// ============================================================================
// POST handler
// ============================================================================

export async function POST(request: NextRequest) {
  const timer = new PerfTimer()
  timer.mark("request_start")

  // 1. 認証（student ロールのみ許可）
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  // 2. リクエストボディ解析
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "リクエストの解析に失敗しました" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "不正なリクエストです", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
  const body = parsed.data

  // 3. auth.user.id → student_id の確定（requireAuth は user と role のみ返すため）
  timer.mark("db_start")
  const supabase = await createClient()
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", auth.user.id)
    .single()

  if (studentError || !student) {
    return new Response(
      JSON.stringify({ error: "生徒情報が見つかりません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  // クライアントが渡した studentId とDB上の student_id を照合
  if (student.id !== body.studentId) {
    return new Response(
      JSON.stringify({ error: "権限エラー: 他の生徒のデータにはアクセスできません" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )
  }

  const verifiedStudentId = student.id

  // 4. バッチ所有権検証
  const batchResult = await verifyBatchOwnership(
    supabase,
    verifiedStudentId,
    body.batchId,
    body.studyLogIds,
    body.sessionId
  )

  if (!batchResult.ok) {
    const status = batchResult.error === "batch_not_found" ? 404 : 400
    const message = batchResult.error === "batch_not_found"
      ? "学習記録が見つかりません"
      : batchResult.error
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    )
  }

  const { verifiedSessionId, representativeStudyLogId } = batchResult

  // 5. 入力データ検証
  const feedbackData: StudyDataForFeedback = body.data

  // 6. 既存フィードバック確認（キャッシュ）
  const adminClient = createAdminClient()
  const hasReflection = !!(feedbackData.reflectionText && feedbackData.reflectionText.trim())
  const cacheResult = await checkExistingFeedback(adminClient, body.batchId, hasReflection)

  timer.mark("db_done")
  timer.measure("db", "db_start")

  // ============================================================================
  // SSE ストリーム開始
  // ============================================================================

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat: 15秒間隔
      const heartbeat = setInterval(() => {
        if (!request.signal.aborted) {
          try {
            controller.enqueue(encoder.encode(":\n\n"))
          } catch {
            clearInterval(heartbeat)
          }
        }
      }, 15_000)

      try {
        // ==============================
        // パターン1: キャッシュヒット
        // ==============================
        if (cacheResult.hit) {
          console.log(`[Spark feedback-stream] cache hit batchId=${body.batchId}`)
          controller.enqueue(encoder.encode(sseEvent("done", cacheResult.feedbackText)))
          controller.enqueue(encoder.encode(sseEvent("meta", SSE_META.SAVE_OK)))
          return
        }

        // ==============================
        // パターン2/3: ストリーミング生成
        // ==============================
        const systemPrompt = getSystemPrompt()
        const userPrompt = getUserPrompt(feedbackData)
        const promptHash = getPromptHash(systemPrompt, userPrompt)

        // Langfuse trace
        const langfuse = getLangfuseClient()
        const trace = langfuse?.trace({
          name: "coach-spark-feedback-stream",
          userId: `student-${verifiedStudentId}`,
          metadata: {
            promptVersion: PROMPT_VERSION,
            subjectCount: feedbackData.subjects.length,
            streak: feedbackData.streak,
            cacheDeleted: cacheResult.deleted || false,
          },
        })

        // 動的タイムアウト
        const timeoutMs = getTimeoutMs(feedbackData.subjects.length)
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)

        // request.signal も監視（クライアント切断時）
        const onRequestAbort = () => abortController.abort()
        request.signal.addEventListener("abort", onRequestAbort)

        let fullContent = ""
        let firstTokenReceived = false
        let streamError = false

        try {
          timer.mark("stream_start")

          const generation = trace?.generation({
            name: "generate-feedback-stream",
            model: "auto",
            input: { systemPrompt, userPrompt },
            metadata: { promptVersion: PROMPT_VERSION, promptHash },
          })

          for await (const event of generateCoachFeedbackStream(
            { data: feedbackData },
            abortController.signal
          )) {
            if (request.signal.aborted) break

            if (event.type === "delta" && !firstTokenReceived) {
              timer.mark("first_token")
              timer.measure("llm_ttft", "stream_start")
              firstTokenReceived = true
            }

            if (event.type === "done") {
              timer.mark("last_token")
              timer.measure("llm_ttlb", "stream_start")
              fullContent = event.content
              // 空文字 done はクライアントへ流さない（後段で fallback done を送る）
              if (!fullContent || fullContent.trim().length === 0) continue
            }

            controller.enqueue(encoder.encode(sseEvent(event.type, event.content)))
          }

          clearTimeout(timeoutId)
          request.signal.removeEventListener("abort", onRequestAbort)

          generation?.end({
            output: fullContent,
            metadata: { promptHash },
          })

          // Abort されていた場合は save しない
          if (request.signal.aborted || abortController.signal.aborted) {
            return
          }

          // ==============================
          // DB保存 → meta(save_ok|save_failed)
          // ==============================
          if (fullContent && fullContent.trim().length > 0) {
            const saveResult = await saveFeedbackToDb(adminClient, {
              batchId: body.batchId,
              studyLogId: representativeStudyLogId,
              studentId: verifiedStudentId,
              sessionId: verifiedSessionId,
              feedbackText: fullContent,
              promptVersion: PROMPT_VERSION,
              promptHash,
              langfuseTraceId: trace?.id || null,
            })

            // UNIQUE競合で existingText が返った場合もDBにデータは存在するため save_ok
            const isSaved = saveResult.saved || !!saveResult.existingText
            controller.enqueue(
              encoder.encode(sseEvent("meta", isSaved ? SSE_META.SAVE_OK : SSE_META.SAVE_FAILED))
            )
          } else {
            // 空文字完了 → fallback に強制フォールバック（Fix 2）
            const fallbackText = getFallbackFeedback(feedbackData)
            controller.enqueue(encoder.encode(sseEvent("done", fallbackText)))

            const fallbackSaved = await saveFallbackToDb(adminClient, {
              batchId: body.batchId,
              studyLogId: representativeStudyLogId,
              studentId: verifiedStudentId,
              sessionId: verifiedSessionId,
              feedbackText: fallbackText,
              promptVersion: PROMPT_VERSION,
              langfuseTraceId: trace?.id || null,
            })

            controller.enqueue(
              encoder.encode(sseEvent("meta", fallbackSaved ? SSE_META.SAVE_OK : SSE_META.SAVE_FAILED))
            )
          }
        } catch (error) {
          clearTimeout(timeoutId)
          request.signal.removeEventListener("abort", onRequestAbort)
          streamError = true

          // Abort（クライアント切断 or タイムアウト）時は save しない
          if (request.signal.aborted || abortController.signal.aborted) {
            return
          }

          const isTimeout = error instanceof Error && error.name === "AbortError"
          const errorMessage = error instanceof Error ? error.message : "Unknown error"

          console.error("[Spark feedback-stream] LLM error:", sanitizeForLog({
            isTimeout,
            error: errorMessage,
            batchId: body.batchId,
            studentId: verifiedStudentId,
          }))

          trace?.update({
            metadata: { error: errorMessage, isTimeout },
          })

          // ==============================
          // パターン3: LLMエラー → フォールバック
          // ==============================
          const fallbackText = getFallbackFeedback(feedbackData)
          controller.enqueue(encoder.encode(sseEvent("done", fallbackText)))

          // フォールバックをDB保存
          const fallbackSaved = await saveFallbackToDb(adminClient, {
            batchId: body.batchId,
            studyLogId: representativeStudyLogId,
            studentId: verifiedStudentId,
            sessionId: verifiedSessionId,
            feedbackText: fallbackText,
            promptVersion: PROMPT_VERSION,
            langfuseTraceId: trace?.id || null,
          })

          controller.enqueue(
            encoder.encode(sseEvent("meta", fallbackSaved ? SSE_META.SAVE_OK : SSE_META.SAVE_FAILED))
          )
        } finally {
          // Langfuse flush（バックグラウンド、3秒上限）
          if (langfuse) {
            try {
              await Promise.race([
                langfuse.flushAsync(),
                new Promise((resolve) => setTimeout(resolve, 3_000)),
              ]).catch(() => {})
            } catch {
              // ignore
            }
          }

          // パフォーマンスログ
          if (!streamError || !request.signal.aborted) {
            timer.mark("response_done")
            timer.measure("total", "request_start")
            console.log(`[Spark feedback-stream] perf batchId=${body.batchId}:`, timer.toMetadata())
          }
        }
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
    cancel() {
      // クライアント切断時: request.signal が自動的に abort される
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
