/**
 * コーチフィードバック ストリーミング生成
 *
 * LLMプロバイダ分岐（OpenAI / Gemini）を行い、
 * AsyncGenerator で LLMStreamEvent を yield する。
 *
 * パターン参考: lib/openai/reflect-coaching.ts のストリーミング版
 */

import { getOpenAIClient } from "@/lib/openai/client"
import { getGeminiClient, getModelForModule } from "@/lib/llm/client"
import type { LLMStreamEvent } from "@/lib/llm/types"
import type { StudyDataForFeedback } from "@/lib/types/coach-feedback"
import { getSystemPrompt, getUserPrompt } from "./coach-feedback"

export interface CoachFeedbackStreamContext {
  data: StudyDataForFeedback
}

/**
 * コーチフィードバック ストリーミング生成
 *
 * プロバイダを自動判定し、delta → done の順で yield する。
 * Abort時は yield を停止して return する（呼び出し元で save しない保証）。
 */
export async function* generateCoachFeedbackStream(
  context: CoachFeedbackStreamContext,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamEvent> {
  const { provider, model } = getModelForModule("coach", "realtime")

  const systemPrompt = getSystemPrompt()
  const userPrompt = getUserPrompt(context.data)

  if (provider === "gemini") {
    yield* streamGemini(systemPrompt, userPrompt, model, signal)
  } else {
    yield* streamOpenAI(systemPrompt, userPrompt, model, signal)
  }
}

async function* streamOpenAI(
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
      max_completion_tokens: 150,
      stream: true,
    },
    { signal }
  )

  let fullContent = ""
  for await (const chunk of stream) {
    if (signal?.aborted) return
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      fullContent += delta
      yield { type: "delta", content: delta }
    }
  }

  if (signal?.aborted) return

  yield { type: "done", content: fullContent }
}

async function* streamGemini(
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
      maxOutputTokens: 150,
      abortSignal: signal,
    },
    contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
  })

  let fullContent = ""
  for await (const chunk of response) {
    if (signal?.aborted) return
    const delta = chunk.text
    if (delta) {
      fullContent += delta
      yield { type: "delta", content: delta }
    }
  }

  if (signal?.aborted) return

  yield { type: "done", content: fullContent }
}
