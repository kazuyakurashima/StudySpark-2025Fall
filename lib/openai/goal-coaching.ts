import { getOpenAIClient } from "./client"
import { getGeminiClient, getModelForModule } from "../llm/client"
import { Type } from "@google/genai"
import { sanitizeForLog } from "../llm/logger"
import { toGeminiContents } from "../llm/gemini-utils"
import {
  getGoalNavigationSystemPrompt,
  getGoalNavigationStepPrompt,
  type GoalNavigationContext,
} from "./prompts"
import type { LLMStreamEvent } from "../llm/types"

/**
 * ゴールナビのAI対話を実行
 */
export async function generateGoalNavigationMessage(
  context: GoalNavigationContext
): Promise<{ message?: string; error?: string }> {
  const { provider, model } = getModelForModule("goal", "realtime")

  if (provider === "gemini") {
    return generateGoalNavigationMessageGemini(context, model)
  }
  return generateGoalNavigationMessageOpenAI(context, model)
}

async function generateGoalNavigationMessageOpenAI(
  context: GoalNavigationContext,
  model: string
): Promise<{ message?: string; error?: string }> {
  try {
    const client = getOpenAIClient()
    const systemPrompt = getGoalNavigationSystemPrompt()
    const stepPrompt = getGoalNavigationStepPrompt(context)

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: stepPrompt },
    ]

    if (context.conversationHistory.length > 0) {
      context.conversationHistory.forEach((msg) => {
        messages.push({ role: msg.role, content: msg.content })
      })
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_completion_tokens: 800,
    })

    const message = completion.choices[0]?.message?.content
    if (!message) return { error: "AI応答の生成に失敗しました" }
    return { message }
  } catch (error) {
    console.error("Goal navigation AI error (OpenAI):", sanitizeForLog(error))
    return { error: error instanceof Error ? error.message : "AI対話でエラーが発生しました" }
  }
}

async function generateGoalNavigationMessageGemini(
  context: GoalNavigationContext,
  model: string
): Promise<{ message?: string; error?: string }> {
  try {
    const client = getGeminiClient()
    const systemPrompt = getGoalNavigationSystemPrompt()
    const stepPrompt = getGoalNavigationStepPrompt(context)

    // stepPromptを先頭user、その後にconversationHistoryを追加
    const geminiContents = toGeminiContents([
      { role: "user" as const, content: stepPrompt },
      ...context.conversationHistory,
    ])

    const response = await client.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 800,
      },
      contents: geminiContents,
    })

    const message = response.text
    if (!message) return { error: "AI応答の生成に失敗しました" }
    return { message }
  } catch (error) {
    console.error("Goal navigation AI error (Gemini):", sanitizeForLog(error))
    return { error: error instanceof Error ? error.message : "AI対話でエラーが発生しました" }
  }
}

export type GoalThoughtsErrorCode = "MODEL_ERROR" | "JSON_PARSE_ERROR" | "VALIDATION_ERROR"

export interface GoalThoughtsResult {
  goalThoughts?: string
  error?: string
  error_code?: GoalThoughtsErrorCode
}

/**
 * 「今回の思い」を生成（Step 3）
 */
export async function generateGoalThoughts(
  context: GoalNavigationContext
): Promise<GoalThoughtsResult> {
  const { provider, model } = getModelForModule("goal", "structured")

  const generate = provider === "gemini"
    ? () => generateGoalThoughtsGemini(context, model)
    : () => generateGoalThoughtsOpenAI(context, model)

  // 1回リトライ（JSONパース失敗はLLMの応答品質問題で再試行で解決することが多い）
  const result = await generate()
  if (result.error_code === "JSON_PARSE_ERROR") {
    console.warn("[generateGoalThoughts] JSON parse failed, retrying once...")
    return generate()
  }
  return result
}

/** LLM応答からJSON文字列を抽出する（マークダウンコードブロックで包まれている場合の対応） */
function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return match ? match[1].trim() : text
}

async function generateGoalThoughtsOpenAI(
  context: GoalNavigationContext,
  model: string
): Promise<GoalThoughtsResult> {
  try {
    const client = getOpenAIClient()
    const systemPrompt = getGoalNavigationSystemPrompt()
    const stepPrompt = getGoalNavigationStepPrompt({ ...context, currentStep: 3 })

    // 会話履歴を先に並べ、最後にJSON生成指示を置く
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ]
    context.conversationHistory.forEach((msg) => {
      messages.push({ role: msg.role, content: msg.content })
    })
    messages.push({ role: "user", content: stepPrompt })

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) return { error: "AI応答の生成に失敗しました", error_code: "MODEL_ERROR" }

    try {
      const parsed = JSON.parse(extractJson(responseText))
      if (!parsed.goalThoughts) return { error: "生成されたデータが不正です", error_code: "VALIDATION_ERROR" }
      return { goalThoughts: parsed.goalThoughts }
    } catch (parseError) {
      console.error("JSON parse error (OpenAI). Raw response (truncated):", responseText.slice(0, 200))
      return { error: "AI応答の解析に失敗しました", error_code: "JSON_PARSE_ERROR" }
    }
  } catch (error) {
    console.error("Goal thoughts generation error (OpenAI):", sanitizeForLog(error))
    return { error: error instanceof Error ? error.message : "目標の思いの生成に失敗しました", error_code: "MODEL_ERROR" }
  }
}

async function generateGoalThoughtsGemini(
  context: GoalNavigationContext,
  model: string
): Promise<GoalThoughtsResult> {
  try {
    const client = getGeminiClient()
    const systemPrompt = getGoalNavigationSystemPrompt()
    const stepPrompt = getGoalNavigationStepPrompt({ ...context, currentStep: 3 })

    // 会話履歴を先に並べ、最後にJSON生成指示を置く（指示が直近にあるほどGeminiが従いやすい）
    const geminiContents = toGeminiContents([
      ...context.conversationHistory,
      { role: "user" as const, content: stepPrompt },
    ])

    const response = await client.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goalThoughts: { type: Type.STRING },
          },
          required: ["goalThoughts"],
        },
      },
      contents: geminiContents,
    })

    const responseText = response.text
    if (!responseText) return { error: "AI応答の生成に失敗しました", error_code: "MODEL_ERROR" }

    try {
      const parsed = JSON.parse(extractJson(responseText))
      if (!parsed.goalThoughts) return { error: "生成されたデータが不正です", error_code: "VALIDATION_ERROR" }
      return { goalThoughts: parsed.goalThoughts }
    } catch (parseError) {
      console.error("JSON parse error (Gemini). Raw response (truncated):", responseText.slice(0, 200))
      return { error: "AI応答の解析に失敗しました", error_code: "JSON_PARSE_ERROR" }
    }
  } catch (error) {
    console.error("Goal thoughts generation error (Gemini):", sanitizeForLog(error))
    return { error: error instanceof Error ? error.message : "目標の思いの生成に失敗しました", error_code: "MODEL_ERROR" }
  }
}

// ─── SSEストリーミング生成（プロンプトは引数で受ける） ──────────

/**
 * ゴールナビSSEストリーム生成
 *
 * プロンプト構築責務はroute.ts + prompts.tsに委譲。
 * この関数は受け取ったプロンプトをLLMに渡してストリーミング出力するのみ。
 *
 * @param systemPrompt システムプロンプト
 * @param userPrompt ユーザープロンプト
 * @param signal AbortSignal（クライアント離脱時のキャンセル用）
 */
export async function* generateGoalNavigationMessageStream(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamEvent> {
  const { provider, model } = getModelForModule("goal", "realtime")

  if (provider === "gemini") {
    yield* streamGoalGemini(systemPrompt, userPrompt, model, signal)
  } else {
    yield* streamGoalOpenAI(systemPrompt, userPrompt, model, signal)
  }
}

async function* streamGoalOpenAI(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamEvent> {
  const openai = getOpenAIClient()

  const stream = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 400,
      stream: true,
    },
    { signal }
  )

  let fullContent = ""
  for await (const chunk of stream) {
    if (signal?.aborted) break
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      fullContent += delta
      yield { type: "delta", content: delta }
    }
  }

  if (signal?.aborted) return

  yield { type: "done", content: fullContent }
}

async function* streamGoalGemini(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamEvent> {
  const client = getGeminiClient()

  const response = await client.models.generateContentStream({
    model,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 400,
      abortSignal: signal,
    },
    contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
  })

  let fullContent = ""
  for await (const chunk of response) {
    if (signal?.aborted) break
    const delta = chunk.text
    if (delta) {
      fullContent += delta
      yield { type: "delta", content: delta }
    }
  }

  if (signal?.aborted) return

  yield { type: "done", content: fullContent }
}
