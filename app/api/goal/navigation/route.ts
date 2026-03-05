import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOpenAIClient } from "@/lib/openai/client"
import { getGeminiClient, getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"
import {
  getFullGoalStepPrompt,
  type GoalNavigationContext,
} from "@/lib/openai/prompts"
import {
  validateGoalStepOutput,
  FALLBACK_TEMPLATES,
} from "@/lib/openai/goal-output-validator"
import { toGeminiContents } from "@/lib/llm/gemini-utils"

const VALID_COURSES = ["S", "A", "B", "C"] as const

const requestSchema = z.object({
  testScheduleId: z.number().int().positive(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(20),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .default([]),
  // 後方互換: 旧クライアントが送る可能性のあるフィールド（無視する）
  studentName: z.string().optional(),
  testName: z.string().optional(),
  testDate: z.string().optional(),
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

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "不正なリクエストです", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  try {
    // DB再構築: studentName + testName/testDate をサーバー側で取得
    const supabase = await createClient()

    const [studentResult, scheduleResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, grade")
        .eq("user_id", auth.user.id)
        .single(),
      supabase
        .from("test_schedules")
        .select(`
          id,
          test_date,
          test_types!inner ( name, grade )
        `)
        .eq("id", body.testScheduleId)
        .single(),
    ])

    if (!studentResult.data) {
      return NextResponse.json({ error: "生徒情報が見つかりません" }, { status: 404 })
    }
    const student = studentResult.data

    if (!scheduleResult.data) {
      return NextResponse.json(
        { error: "指定されたテスト日程が見つかりません" },
        { status: 404 }
      )
    }
    const schedule = scheduleResult.data

    // 学年整合チェック
    const testTypes = Array.isArray(schedule.test_types)
      ? schedule.test_types[0]
      : schedule.test_types
    if (testTypes && testTypes.grade !== student.grade) {
      return NextResponse.json(
        { error: "テストの対象学年と生徒の学年が一致しません" },
        { status: 400 }
      )
    }

    const testName = testTypes?.name ?? "テスト"
    const testDate = schedule.test_date

    // プロンプト生成（prompts.ts関数を使用 = プロンプト単一責務）
    const ctx: GoalNavigationContext = {
      studentName: student.full_name,
      testName,
      testDate,
      targetCourse: body.targetCourse,
      targetClass: body.targetClass,
      conversationHistory: body.conversationHistory,
      currentStep: body.currentStep,
    }
    const { systemPrompt, userPrompt } = getFullGoalStepPrompt(ctx)

    // AI呼び出し（プロバイダ分岐）
    const { provider, model } = getModelForModule("goal", "realtime")
    let message: string | undefined

    if (provider === "gemini") {
      const client = getGeminiClient()
      // 対話履歴がある場合はGemini contents形式に変換
      const geminiContents = body.conversationHistory.length > 0
        ? toGeminiContents([
            { role: "user" as const, content: userPrompt },
            ...body.conversationHistory,
          ])
        : [{ role: "user" as const, parts: [{ text: userPrompt }] }]

      const response = await client.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 800,
        },
        contents: geminiContents,
      })
      message = response.text?.trim()
    } else {
      const openai = getOpenAIClient()
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]
      if (body.conversationHistory.length > 0) {
        body.conversationHistory.forEach((msg) => {
          messages.push({ role: msg.role, content: msg.content })
        })
      }
      const completion = await openai.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 800,
      })
      message = completion.choices[0]?.message?.content?.trim()
    }

    if (!message) {
      return NextResponse.json({ error: "AI応答の生成に失敗しました" }, { status: 500 })
    }

    // Step 2: 出力バリデーション
    if (body.currentStep === 2) {
      const validated = validateGoalStepOutput(message, "full", 2)
      if (!validated.valid) {
        console.warn(`[Goal nav] validation failed step=2: ${validated.reason}`)
        return NextResponse.json({ message: validated.content })
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Goal navigation API error:", sanitizeForLog(error))
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
