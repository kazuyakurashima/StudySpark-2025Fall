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
  // 新クライアント: testScheduleId でDB再構築
  testScheduleId: z.number().int().positive().optional(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
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
  // 後方互換: 旧クライアントが送るフィールド（testScheduleId未送信時に使用）
  studentName: z.string().max(100).optional(),
  testName: z.string().max(200).optional(),
  testDate: z.string().max(20).optional(),
})

/** 動的ステップが有効か */
function isDynamicStepsEnabled(): boolean {
  return process.env.GOAL_DYNAMIC_STEPS_ENABLED !== "false"
}

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
    // 動的ステップ無効時: Step 2 はフォールバックテンプレートを返す
    if (!isDynamicStepsEnabled() && body.currentStep === 2) {
      const key = "full:2" as keyof typeof FALLBACK_TEMPLATES
      return NextResponse.json({ message: FALLBACK_TEMPLATES[key] })
    }

    // --- 互換レイヤー: testScheduleId の有無で経路分岐 ---
    let studentName: string
    let testName: string
    let testDate: string

    const supabase = await createClient()

    if (body.testScheduleId) {
      // 新クライアント: DB再構築
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

      studentName = student.full_name
      testName = testTypes?.name ?? "テスト"
      testDate = schedule.test_date
    } else {
      // 旧クライアント互換: クライアント送信値を使用（フロントエンド移行完了後に削除予定）
      console.warn(
        `[Goal nav compat] legacy payload used: userId=${auth.user.id} step=${body.currentStep}`
      )

      // studentName は DB から取得（セキュリティ上クライアント値を信頼しない）
      const studentResult = await supabase
        .from("students")
        .select("full_name")
        .eq("user_id", auth.user.id)
        .single()
      studentName = studentResult.data?.full_name ?? body.studentName ?? "生徒"
      testName = body.testName ?? "テスト"
      testDate = body.testDate ?? new Date().toISOString().slice(0, 10)
    }

    // プロンプト生成（prompts.ts関数を使用 = プロンプト単一責務）
    const ctx: GoalNavigationContext = {
      studentName,
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
