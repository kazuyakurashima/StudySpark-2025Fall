import { NextRequest } from "next/server"
import { z } from "zod"
import {
  generateReflectMessageStream,
  type ReflectContext,
} from "@/lib/openai/reflect-coaching"
import { getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"
import { PerfTimer } from "@/lib/utils/perf-timer"
import { getLangfuseClient } from "@/lib/langfuse/client"

// 実行環境を明示的に固定（Edge Runtimeとの差異を回避）
export const runtime = "nodejs"

// 入力バリデーションスキーマ
const requestSchema = z.object({
  weekType: z.enum(["growth", "stable", "challenge", "special"]),
  thisWeekAccuracy: z.number().min(0).max(100).default(0),
  lastWeekAccuracy: z.number().min(0).max(100).default(0),
  accuracyDiff: z.number().default(0),
  upcomingTest: z.object({
    test_types: z.object({ name: z.string() }),
    test_date: z.string(),
  }).nullable().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["assistant", "user"]),
    content: z.string().max(5000),
  })).max(20).default([]),
  turnNumber: z.number().int().min(1).max(10).default(1),
  requestId: z.string().max(64).optional(),
})

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

  // zodバリデーション
  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "不正なリクエストです", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
  const body = parsed.data

  // サーバー側コンテキスト再構築: クライアント送信値のstudentNameは信頼しない
  timer.mark("db_start")
  const supabase = await createClient()
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, grade, course")
    .eq("user_id", auth.user.id)
    .single()

  if (!student) {
    return new Response(
      JSON.stringify({ error: "生徒情報が見つかりません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  timer.mark("db_done")
  timer.measure("db", "db_start")

  // トレーサビリティ: クライアント送信のrequestIdをログに記録
  const requestId = body.requestId || "unknown"

  let provider: string
  let llmModel: string
  try {
    const resolved = getModelForModule("reflect", "realtime")
    provider = resolved.provider
    llmModel = resolved.model
  } catch (error) {
    console.error(`[Reflect stream] getModelForModule failed [requestId=${requestId}]:`, sanitizeForLog(error))
    return new Response(
      JSON.stringify({ error: "LLM設定の解決に失敗しました" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
  console.log(`[Reflect stream] requestId=${requestId} provider=${provider} model=${llmModel}`)

  // DB検証済みの値でコンテキストを構築
  const context: ReflectContext = {
    studentName: student.full_name, // DBから取得（クライアント値は無視）
    weekType: body.weekType,
    thisWeekAccuracy: body.thisWeekAccuracy,
    lastWeekAccuracy: body.lastWeekAccuracy,
    accuracyDiff: body.accuracyDiff,
    upcomingTest: body.upcomingTest ?? null,
    conversationHistory: body.conversationHistory,
    turnNumber: body.turnNumber,
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat: 15秒間隔でSSEコメント送信（プロキシ/LBの無通信切断防止）
      const heartbeat = setInterval(() => {
        if (!request.signal.aborted) {
          try {
            controller.enqueue(encoder.encode(":\n\n"))
          } catch {
            // controller already closed
            clearInterval(heartbeat)
          }
        }
      }, 15_000)

      let fullContent = ""
      let firstTokenReceived = false

      try {
        // stream_start: プロンプト構築+API呼び出しの直前
        // ※ 実際のプロンプト構築はgenerator内で行われるため、
        //    TTFTはプロンプト構築+API latencyの合算値となる
        timer.mark("stream_start")

        for await (const event of generateReflectMessageStream(
          context,
          request.signal
        )) {
          if (request.signal.aborted) break

          // TTFT計測: 最初のdeltaイベントで初トークン到着時刻を記録
          if (event.type === "delta" && !firstTokenReceived) {
            timer.mark("first_token")
            timer.measure("llm_ttft", "stream_start")
            firstTokenReceived = true
          }

          // TTLB計測: doneイベントで最終トークン到着時刻を記録
          if (event.type === "done") {
            timer.mark("last_token")
            timer.measure("llm_ttlb", "stream_start")
            fullContent = event.content
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error(`Reflect stream error [requestId=${requestId}]:`, sanitizeForLog(error))
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "AI対話でエラーが発生しました" })}\n\n`
            )
          )
        }
      } finally {
        clearInterval(heartbeat)

        // 総時間計測
        timer.mark("response_done")
        timer.measure("total", "request_start")

        const perfMetrics = timer.toMetadata()
        console.log(`[Reflect stream] perf [requestId=${requestId}]:`, perfMetrics)

        // SSE接続を先に閉じ、テレメトリはバックグラウンドで永続化
        controller.close()

        // Langfuseトレース: saveTrace/denormalizationパイプラインを経由せず
        // 直接クライアントで記録（SSEストリームにはDB上のメッセージIDが無いため）
        try {
          const langfuse = getLangfuseClient()
          if (langfuse) {
            const trace = langfuse.trace({
              name: "reflect-stream",
              userId: auth.user.id,
              metadata: {
                weekType: body.weekType,
                turnNumber: body.turnNumber,
                provider,
                model: llmModel,
                requestId,
                ...perfMetrics,
              },
            })
            trace.generation({
              name: "reflect-stream-generation",
              input: JSON.stringify({ weekType: body.weekType, turnNumber: body.turnNumber }),
              output: fullContent,
              metadata: perfMetrics,
            })
            // サーバレス環境でのメトリクス欠損防止: 3秒上限付きflush
            await Promise.race([
              langfuse.flushAsync(),
              new Promise(resolve => setTimeout(resolve, 3_000)),
            ]).catch(() => {})
          }
        } catch (e) {
          console.error("[Reflect stream] trace error:", sanitizeForLog(e))
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
