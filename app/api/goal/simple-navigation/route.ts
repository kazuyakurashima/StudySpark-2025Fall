import { NextRequest, NextResponse } from "next/server"
import { getOpenAIClient } from "@/lib/openai/client"
import { getGeminiClient, getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { requireAuth } from "@/lib/api/auth"
import { simpleNavigationSchema } from "@/lib/api/goal-schemas"
import { createClient } from "@/lib/supabase/route"
import {
  getSimpleGoalStepPrompt,
  type SimpleGoalContext,
} from "@/lib/openai/prompts"
import {
  validateGoalStepOutput,
  FALLBACK_TEMPLATES,
} from "@/lib/openai/goal-output-validator"

const requestSchema = simpleNavigationSchema

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
    // 動的ステップ無効時: Steps 2-3 はフォールバックテンプレートを返す
    if (!isDynamicStepsEnabled() && (body.step === 2 || body.step === 3)) {
      const key = `simple:${body.step}` as keyof typeof FALLBACK_TEMPLATES
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
        `[Goal simple-nav compat] legacy payload used: userId=${auth.user.id} step=${body.step}`
      )

      // studentName は必ず DB から取得（クライアント値は使用しない）
      const studentResult = await supabase
        .from("students")
        .select("full_name")
        .eq("user_id", auth.user.id)
        .single()
      if (!studentResult.data) {
        return NextResponse.json({ error: "生徒情報が見つかりません" }, { status: 404 })
      }
      studentName = studentResult.data.full_name
      testName = body.testName ?? "テスト"
      testDate = body.testDate ?? new Date().toISOString().slice(0, 10)
    }

    // プロンプト生成（prompts.ts関数を使用 = プロンプト単一責務）
    const ctx: SimpleGoalContext = {
      studentName,
      testName,
      testDate,
      targetCourse: body.targetCourse,
      targetClass: body.targetClass,
      conversationHistory: body.conversationHistory,
    }
    const { systemPrompt, userPrompt } = getSimpleGoalStepPrompt(ctx, body.step)

    // AI呼び出し（プロバイダ分岐）
    const { provider, model } = getModelForModule("goal", "realtime")
    let message: string | undefined

    if (provider === "gemini") {
      const client = getGeminiClient()
      const response = await client.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 300,
        },
        contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
      })
      message = response.text?.trim()
    } else {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 300,
      })
      message = completion.choices[0]?.message?.content?.trim()
    }

    if (!message) {
      return NextResponse.json({ error: "メッセージ生成に失敗しました" }, { status: 500 })
    }

    // Steps 2-3: 出力バリデーション
    if (body.step === 2 || body.step === 3) {
      const validated = validateGoalStepOutput(message, "simple", body.step)
      if (!validated.valid) {
        console.warn(`[Goal simple-nav] validation failed step=${body.step}: ${validated.reason}`)
        return NextResponse.json({ message: validated.content })
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("AI対話エラー:", sanitizeForLog(error))
    return NextResponse.json({ error: "AI対話中にエラーが発生しました" }, { status: 500 })
  }
}
