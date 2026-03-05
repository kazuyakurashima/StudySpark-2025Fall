import { NextRequest, NextResponse } from "next/server"
import { getOpenAIClient } from "@/lib/openai/client"
import { getGeminiClient, getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { requireAuth } from "@/lib/api/auth"
import {
  getSimpleGoalStepPrompt,
  type SimpleGoalContext,
} from "@/lib/openai/prompts"
import {
  validateGoalStepOutput,
  FALLBACK_TEMPLATES,
} from "@/lib/openai/goal-output-validator"

interface RequestBody {
  studentName: string
  testName: string
  testDate: string
  targetCourse: string
  targetClass: number
  step: 1 | 2 | 3
  previousAnswer?: string
  conversationHistory?: { role: "assistant" | "user"; content: string }[]
}

/** 動的ステップが有効か */
function isDynamicStepsEnabled(): boolean {
  return process.env.GOAL_DYNAMIC_STEPS_ENABLED !== "false"
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  try {
    const body: RequestBody = await request.json()
    const { studentName, testName, testDate, targetCourse, targetClass, step } = body

    // 動的ステップ無効時: Steps 2-3 はフォールバックテンプレートを返す
    if (!isDynamicStepsEnabled() && (step === 2 || step === 3)) {
      return NextResponse.json({ message: FALLBACK_TEMPLATES[step] })
    }

    // プロンプト生成（prompts.ts関数を使用 = プロンプト単一責務）
    const ctx: SimpleGoalContext = {
      studentName,
      testName,
      testDate,
      targetCourse,
      targetClass,
      conversationHistory: body.conversationHistory ?? [],
    }
    const { systemPrompt, userPrompt } = getSimpleGoalStepPrompt(ctx, step)

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
    if (step === 2 || step === 3) {
      const validated = validateGoalStepOutput(message, step)
      if (!validated.valid) {
        console.warn(`[Goal simple-nav] validation failed step=${step}: ${validated.reason}`)
        return NextResponse.json({ message: validated.content })
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("AI対話エラー:", sanitizeForLog(error))
    return NextResponse.json({ error: "AI対話中にエラーが発生しました" }, { status: 500 })
  }
}
