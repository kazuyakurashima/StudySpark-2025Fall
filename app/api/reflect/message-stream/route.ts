import { NextRequest } from "next/server"
import {
  generateReflectMessageStream,
  type ReflectContext,
} from "@/lib/openai/reflect-coaching"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"

// 実行環境を明示的に固定（Edge Runtimeとの差異を回避）
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "リクエストの解析に失敗しました" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // サーバー側コンテキスト再構築: クライアント送信値のstudentNameは信頼しない
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

  // DB検証済みの値でコンテキストを構築
  const context: ReflectContext = {
    studentName: student.full_name, // DBから取得（クライアント値は無視）
    weekType: body.weekType as ReflectContext["weekType"],
    thisWeekAccuracy: Number(body.thisWeekAccuracy) || 0,
    lastWeekAccuracy: Number(body.lastWeekAccuracy) || 0,
    accuracyDiff: Number(body.accuracyDiff) || 0,
    upcomingTest: (body.upcomingTest as ReflectContext["upcomingTest"]) ?? null,
    conversationHistory: Array.isArray(body.conversationHistory)
      ? (body.conversationHistory as ReflectContext["conversationHistory"])
      : [],
    turnNumber: Number(body.turnNumber) || 1,
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

      try {
        for await (const event of generateReflectMessageStream(
          context,
          request.signal
        )) {
          if (request.signal.aborted) break
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("Reflect stream error:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "AI対話でエラーが発生しました" })}\n\n`
            )
          )
        }
      } finally {
        clearInterval(heartbeat)
        controller.close()
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
