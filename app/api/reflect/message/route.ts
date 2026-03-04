import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateReflectMessage } from "@/lib/openai/reflect-coaching"
import { getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"

// 入力バリデーションスキーマ（message-stream/route.ts と同一基準）
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
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    )
  }

  // zodバリデーション
  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "不正なリクエストです", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  // サーバー側コンテキスト再構築: クライアント送信値のstudentNameは信頼しない
  const supabase = await createClient()
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, grade, course")
    .eq("user_id", auth.user.id)
    .single()

  if (!student) {
    return NextResponse.json(
      { error: "生徒情報が見つかりません" },
      { status: 404 }
    )
  }

  try {
    const { provider, model: llmModel } = getModelForModule("reflect", "realtime")
    console.log(`[Reflect message] provider=${provider} model=${llmModel}`)
    const { message, error } = await generateReflectMessage({
      studentName: student.full_name, // DBから取得（クライアント値は無視）
      weekType: body.weekType,
      thisWeekAccuracy: body.thisWeekAccuracy,
      lastWeekAccuracy: body.lastWeekAccuracy,
      accuracyDiff: body.accuracyDiff,
      upcomingTest: body.upcomingTest ?? null,
      conversationHistory: body.conversationHistory,
      turnNumber: body.turnNumber,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Reflect message API error:", sanitizeForLog(error))
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
