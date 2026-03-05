import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"
import { sanitizeForLog } from "@/lib/llm/logger"
import { getModelForModule } from "@/lib/llm/client"
import { PerfTimer } from "@/lib/utils/perf-timer"
import { getLangfuseClient } from "@/lib/langfuse/client"
import { generateGoalNavigationMessageStream } from "@/lib/openai/goal-coaching"
import {
  getSimpleGoalStepPrompt,
  getFullGoalStepPrompt,
  type SimpleGoalContext,
  type GoalNavigationContext,
} from "@/lib/openai/prompts"
import {
  validateGoalStepOutput,
  FALLBACK_TEMPLATES,
} from "@/lib/openai/goal-output-validator"
import { SSE_META } from "@/lib/sse/types"

export const runtime = "nodejs"

const VALID_COURSES = ["S", "A", "B", "C"] as const

const requestSchema = z.object({
  flowType: z.enum(["simple", "full"]),
  step: z.number().int().min(1).max(3),
  testScheduleId: z.number().int().positive(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .default([]),
  requestId: z.string().max(64).optional(),
})

/** 動的ステップが有効か（env変数による緊急無効化対応） */
function isDynamicStepsEnabled(): boolean {
  return process.env.GOAL_DYNAMIC_STEPS_ENABLED !== "false"
}

export async function POST(request: NextRequest) {
  const timer = new PerfTimer()
  timer.mark("request_start")

  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

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

  // step範囲チェック（simple:1-3, full:1-2）
  if (body.flowType === "full" && body.step > 2) {
    return new Response(
      JSON.stringify({ error: "Full flowのステップは1-2です" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // DB再構築: student + test_schedule をサーバー側で検証
  timer.mark("db_start")
  const supabase = await createClient()

  const [studentResult, scheduleResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, grade, course")
      .eq("user_id", auth.user.id)
      .single(),
    supabase
      .from("test_schedules")
      .select(`
        id,
        test_date,
        goal_setting_start_date,
        goal_setting_end_date,
        test_types!inner ( name, grade )
      `)
      .eq("id", body.testScheduleId)
      .single(),
  ])

  if (!studentResult.data) {
    return new Response(
      JSON.stringify({ error: "生徒情報が見つかりません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }
  const student = studentResult.data

  if (!scheduleResult.data) {
    return new Response(
      JSON.stringify({ error: "指定されたテスト日程が見つかりません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }
  const schedule = scheduleResult.data

  // 学年整合チェック
  const testTypes = Array.isArray(schedule.test_types)
    ? schedule.test_types[0]
    : schedule.test_types
  if (testTypes && testTypes.grade !== student.grade) {
    return new Response(
      JSON.stringify({ error: "テストの対象学年と生徒の学年が一致しません" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // 目標設定期間チェック（警告ログ、ブロックはしない）
  const now = new Date().toISOString().slice(0, 10)
  if (
    schedule.goal_setting_start_date &&
    schedule.goal_setting_end_date &&
    (now < schedule.goal_setting_start_date || now > schedule.goal_setting_end_date)
  ) {
    console.warn(
      `[Goal stream] outside goal-setting period: schedule=${body.testScheduleId} start=${schedule.goal_setting_start_date} end=${schedule.goal_setting_end_date} now=${now}`
    )
  }

  // DB再構築済みの値を使用
  const testName = testTypes?.name ?? "テスト"
  const testDate = schedule.test_date

  timer.mark("db_done")
  timer.measure("db", "db_start")

  const requestId = body.requestId || "unknown"

  // 動的ステップ無効時: Steps 2-3 はフォールバックテンプレートを即返却
  if (
    !isDynamicStepsEnabled() &&
    ((body.flowType === "simple" && body.step >= 2) ||
      (body.flowType === "full" && body.step === 2))
  ) {
    const fallbackStep = body.step as 2 | 3
    const fallbackKey = `${body.flowType}:${fallbackStep}` as keyof typeof FALLBACK_TEMPLATES
    const content = FALLBACK_TEMPLATES[fallbackKey] || FALLBACK_TEMPLATES["simple:2"]
    const encoder = new TextEncoder()
    const fallbackStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", content })}\n\n`)
        )
        controller.close()
      },
    })
    return new Response(fallbackStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }

  // プロンプト生成（route.ts + prompts.ts の責務）
  let systemPrompt: string
  let userPrompt: string

  if (body.flowType === "simple") {
    const ctx: SimpleGoalContext = {
      studentName: student.full_name,
      testName,
      testDate,
      targetCourse: body.targetCourse,
      targetClass: body.targetClass,
      conversationHistory: body.conversationHistory,
    }
    const prompts = getSimpleGoalStepPrompt(ctx, body.step as 1 | 2 | 3)
    systemPrompt = prompts.systemPrompt
    userPrompt = prompts.userPrompt
  } else {
    const ctx: GoalNavigationContext = {
      studentName: student.full_name,
      testName,
      testDate,
      targetCourse: body.targetCourse,
      targetClass: body.targetClass,
      conversationHistory: body.conversationHistory,
      currentStep: body.step as 1 | 2 | 3,
    }
    const prompts = getFullGoalStepPrompt(ctx)
    systemPrompt = prompts.systemPrompt
    userPrompt = prompts.userPrompt
  }

  // バリデーション対象か判定
  const needsValidation =
    (body.flowType === "simple" && (body.step === 2 || body.step === 3)) ||
    (body.flowType === "full" && body.step === 2)

  let provider: string
  let llmModel: string
  try {
    const resolved = getModelForModule("goal", "realtime")
    provider = resolved.provider
    llmModel = resolved.model
  } catch (error) {
    console.error(
      `[Goal stream] getModelForModule failed [requestId=${requestId}]:`,
      sanitizeForLog(error)
    )
    return new Response(
      JSON.stringify({ error: "LLM設定の解決に失敗しました" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
  console.log(
    `[Goal stream] requestId=${requestId} flow=${body.flowType} step=${body.step} provider=${provider} model=${llmModel}`
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        if (!request.signal.aborted) {
          try {
            controller.enqueue(encoder.encode(":\n\n"))
          } catch {
            clearInterval(heartbeat)
          }
        }
      }, 15_000)

      let fullContent = ""
      let firstTokenReceived = false

      try {
        timer.mark("stream_start")

        for await (const event of generateGoalNavigationMessageStream(
          systemPrompt,
          userPrompt,
          request.signal
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

            // 出力バリデーション（Steps 2-3 のみ）
            if (needsValidation) {
              const validationStep = body.step as 2 | 3
              const validated = validateGoalStepOutput(
                fullContent,
                body.flowType,
                validationStep
              )
              if (!validated.valid) {
                console.warn(
                  `[Goal stream] output validation failed [requestId=${requestId}]: ${validated.reason}`
                )
                // フォールバックテンプレートで done を送出
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done", content: validated.content })}\n\n`
                  )
                )
                // クライアントに置換を通知
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "meta", content: SSE_META.REPLACED_BY_TEMPLATE })}\n\n`
                  )
                )
                // 通常の done は送出しない
                continue
              }
            }

            // バリデーション通過 or 対象外: 通常の done 送出
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
            continue
          }

          // delta イベントはそのまま送出
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error(
            `[Goal stream] error [requestId=${requestId}]:`,
            sanitizeForLog(error)
          )
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "AI対話でエラーが発生しました" })}\n\n`
            )
          )
        }
      } finally {
        clearInterval(heartbeat)

        timer.mark("response_done")
        timer.measure("total", "request_start")

        const perfMetrics = timer.toMetadata()
        console.log(`[Goal stream] perf [requestId=${requestId}]:`, perfMetrics)

        controller.close()

        // Langfuseトレース
        try {
          const langfuse = getLangfuseClient()
          if (langfuse) {
            const trace = langfuse.trace({
              name: "goal-stream",
              userId: auth.user.id,
              metadata: {
                flowType: body.flowType,
                step: body.step,
                testScheduleId: body.testScheduleId,
                provider,
                model: llmModel,
                requestId,
                ...perfMetrics,
              },
            })
            trace.generation({
              name: "goal-stream-generation",
              input: JSON.stringify({
                flowType: body.flowType,
                step: body.step,
              }),
              output: fullContent,
              metadata: perfMetrics,
            })
            await Promise.race([
              langfuse.flushAsync(),
              new Promise((resolve) => setTimeout(resolve, 3_000)),
            ]).catch(() => {})
          }
        } catch (e) {
          console.error("[Goal stream] trace error:", sanitizeForLog(e))
        }
      }
    },
    cancel() {
      // クライアント切断時: request.signalが自動的にabortされる
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
