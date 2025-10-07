import { getOpenAIClient, getDefaultModel } from "./client"
import {
  getGoalNavigationSystemPrompt,
  getGoalNavigationStepPrompt,
  type GoalNavigationContext,
} from "./prompts"

/**
 * ゴールナビのAI対話を実行
 */
export async function generateGoalNavigationMessage(
  context: GoalNavigationContext
): Promise<{ message?: string; error?: string }> {
  try {
    const client = getOpenAIClient()

    const systemPrompt = getGoalNavigationSystemPrompt()
    const stepPrompt = getGoalNavigationStepPrompt(context)

    // 対話履歴を構築
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: stepPrompt },
    ]

    // 既存の対話履歴を追加
    if (context.conversationHistory.length > 0) {
      context.conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      })
    }

    // AI応答を生成
    const completion = await client.chat.completions.create({
      model: getDefaultModel(),
      messages,
      max_completion_tokens: 800,
    })

    const message = completion.choices[0]?.message?.content

    if (!message) {
      return { error: "AI応答の生成に失敗しました" }
    }

    return { message }
  } catch (error: any) {
    console.error("Goal navigation AI error:", error)
    return { error: error.message || "AI対話でエラーが発生しました" }
  }
}

/**
 * 「今回の思い」を生成（Step 6）
 */
export async function generateGoalThoughts(
  context: GoalNavigationContext
): Promise<{ goalThoughts?: string; error?: string }> {
  try {
    const client = getOpenAIClient()

    const systemPrompt = getGoalNavigationSystemPrompt()
    const stepPrompt = getGoalNavigationStepPrompt({
      ...context,
      currentStep: 6,
    })

    // 対話履歴全体を含める
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: stepPrompt },
    ]

    // 対話履歴を追加
    context.conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    })

    // AI応答を生成（JSON形式）
    const completion = await client.chat.completions.create({
      model: getDefaultModel(),
      messages,
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      return { error: "AI応答の生成に失敗しました" }
    }

    // JSON解析
    try {
      const parsed = JSON.parse(responseText)

      if (!parsed.goalThoughts) {
        return { error: "生成されたデータが不正です" }
      }

      return { goalThoughts: parsed.goalThoughts }
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return { error: "AI応答の解析に失敗しました" }
    }
  } catch (error: any) {
    console.error("Goal thoughts generation error:", error)
    return { error: error.message || "目標の思いの生成に失敗しました" }
  }
}
