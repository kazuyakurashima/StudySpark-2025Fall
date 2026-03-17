import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"
import { createAdminClient } from "@/lib/supabase/server"
import { generateCoachFeedbackStream } from "@/lib/services/coach-feedback-stream"
import {
  getExerciseFeedbackSystemPrompt,
  getExerciseFeedbackUserPrompt,
  getExerciseFeedbackPromptHash,
  getExerciseFallbackFeedback,
  EXERCISE_PROMPT_VERSION,
} from "@/lib/services/exercise-feedback"

export const runtime = "nodejs"

const requestSchema = z.object({
  exerciseReflectionId: z.number().int().positive(),
})

function sseEvent(type: string, content: string): string {
  return `data: ${JSON.stringify({ type, content })}\n\n`
}

export async function POST(request: NextRequest) {
  // 1. 認証
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  // 2. リクエスト解析
  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return new Response(JSON.stringify({ error: "リクエストの解析に失敗しました" }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "不正なリクエストです" }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
  const { exerciseReflectionId } = parsed.data

  // 3. データ再取得（Route Handler用クライアント + admin）
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: student } = await supabase.from("students").select("id, full_name").eq("user_id", auth.user.id).single()
  if (!student) {
    return new Response(JSON.stringify({ error: "生徒情報が見つかりません" }), { status: 404, headers: { "Content-Type": "application/json" } })
  }

  // 振り返り取得
  const { data: reflection } = await admin
    .from("exercise_reflections")
    .select("id, answer_session_id, section_name, reflection_text")
    .eq("id", exerciseReflectionId)
    .single()

  if (!reflection) {
    return new Response(JSON.stringify({ error: "振り返りが見つかりません" }), { status: 404, headers: { "Content-Type": "application/json" } })
  }

  // answer_session の所有確認（JOINを分離）
  const { data: answerSession } = await admin
    .from("answer_sessions")
    .select("student_id, question_set_id")
    .eq("id", reflection.answer_session_id)
    .single()

  if (!answerSession || answerSession.student_id !== student.id) {
    return new Response(JSON.stringify({ error: "権限エラー" }), { status: 403, headers: { "Content-Type": "application/json" } })
  }

  // 4. 冪等チェック
  const { data: existingFeedback } = await admin
    .from("exercise_feedbacks")
    .select("feedback_text")
    .eq("exercise_reflection_id", exerciseReflectionId)
    .single()

  if (existingFeedback) {
    console.log("[exercise-feedback] phase=cache_hit reflectionId=", exerciseReflectionId)
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode(sseEvent("done", existingFeedback.feedback_text)))
        controller.enqueue(enc.encode(sseEvent("meta", "save_ok")))
        controller.close()
      },
    })
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } })
  }

  // 5. 採点結果をDB再取得（JOINを分離して安全に）
  const { data: sectionQuestions } = await admin
    .from("questions")
    .select("id")
    .eq("question_set_id", answerSession.question_set_id)
    .eq("section_name", reflection.section_name)

  const sectionQIds = (sectionQuestions || []).map((q) => q.id)

  let score = 0, maxScore = 0, incorrectCount = 0
  if (sectionQIds.length > 0) {
    const { data: answers } = await admin
      .from("student_answers")
      .select("question_id, is_correct")
      .eq("answer_session_id", reflection.answer_session_id)
      .in("question_id", sectionQIds)

    maxScore = (answers || []).length
    score = (answers || []).filter((a) => a.is_correct === true).length
    incorrectCount = (answers || []).filter((a) => a.is_correct === false).length
  }
  const accuracy = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  // 6. プロンプト生成
  const systemPrompt = getExerciseFeedbackSystemPrompt()
  const userPrompt = getExerciseFeedbackUserPrompt({
    studentName: student.full_name || "生徒",
    sectionName: reflection.section_name,
    score, maxScore, incorrectCount,
    reflectionText: reflection.reflection_text,
  })
  const promptHash = getExerciseFeedbackPromptHash(systemPrompt, userPrompt)

  // 7. SSEストリーミング
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ""
      let saveStatus = "save_failed"

      try {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 15000)
        const onRequestAbort = () => abortController.abort()
        request.signal.addEventListener("abort", onRequestAbort)

        try {
          for await (const event of generateCoachFeedbackStream(
            { data: { subjects: [{ name: "算数", correct: score, total: maxScore, accuracy }] } },
            abortController.signal,
            { systemPrompt, userPrompt }
          )) {
            if (request.signal.aborted) break
            if (event.type === "delta") {
              fullContent += event.content
              controller.enqueue(encoder.encode(sseEvent("delta", event.content)))
            } else if (event.type === "done") {
              fullContent = event.content
            }
          }
        } finally {
          clearTimeout(timeoutId)
          request.signal.removeEventListener("abort", onRequestAbort)
        }

        // 空出力時はフォールバック
        if (!fullContent.trim()) {
          fullContent = getExerciseFallbackFeedback(accuracy)
        }

        if (!request.signal.aborted) {
          console.log("[exercise-feedback] phase=llm_done length=", fullContent.length)
          controller.enqueue(encoder.encode(sseEvent("done", fullContent)))

          const { error: insertError } = await admin.from("exercise_feedbacks").insert({
            exercise_reflection_id: exerciseReflectionId,
            student_id: student.id,
            feedback_text: fullContent,
            prompt_version: EXERCISE_PROMPT_VERSION,
            prompt_hash: promptHash,
          })

          if (!insertError || insertError.code === "23505") {
            saveStatus = "save_ok"
          } else {
            console.error("Failed to save exercise feedback:", insertError)
          }
        }
      } catch (error) {
        console.error("[exercise-feedback] phase=llm_error", error)

        // LLM失敗時はフォールバック（error イベントは送らない — fetchSSE が throw するため）
        const fallback = getExerciseFallbackFeedback(accuracy)
        fullContent = fallback
        controller.enqueue(encoder.encode(sseEvent("done", fallback)))
        console.log("[exercise-feedback] phase=fallback_done")

        const { error: fbError } = await admin.from("exercise_feedbacks").insert({
          exercise_reflection_id: exerciseReflectionId,
          student_id: student.id,
          feedback_text: fallback,
          prompt_version: EXERCISE_PROMPT_VERSION + "-fallback",
          prompt_hash: promptHash,
        })
        if (!fbError || fbError.code === "23505") saveStatus = "save_ok"
      }

      controller.enqueue(encoder.encode(sseEvent("meta", saveStatus)))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  })
}
