import { createClient } from "@/lib/supabase/server"
import { getOpenAIClient } from "./client"
import { getGeminiClient, getModelForModule } from "../llm/client"
import { Type } from "@google/genai"
import { sanitizeForLog } from "../llm/logger"
import {
  getEncouragementSystemPrompt,
  getEncouragementUserPrompt,
  type EncouragementContext,
} from "./prompts"
import crypto from "crypto"

/**
 * キャッシュキーを生成
 * 同一状況を識別するためのハッシュ
 * バッチ応援対応: 科目数・平均正答率・問題数を丸めてキー化
 */
function generateCacheKey(context: EncouragementContext, promptVersion: string = "v1.0"): string {
  const keyData = {
    senderRole: context.senderRole,
    // バッチ応援の場合
    batchPerformance: context.batchPerformance
      ? {
          subjectCount: context.batchPerformance.subjectCount,
          // 正答率を10%刻みで丸める
          accuracyRange: Math.floor(context.batchPerformance.averageAccuracy / 10) * 10,
          // 問題数を10問刻みで丸める
          problemCountRange: Math.floor(context.batchPerformance.totalProblems / 10) * 10,
          // 最高/挑戦科目の有無
          hasBestSubject: !!context.batchPerformance.bestSubject,
          hasChallengeSubject: !!context.batchPerformance.challengeSubject,
        }
      : null,
    // 単一科目の場合（後方互換）
    recentPerformance: context.recentPerformance && !context.batchPerformance
      ? {
          subject: context.recentPerformance.subject,
          // 正答率を10%刻みで丸める（80% → 80, 75% → 70）
          accuracyRange: Math.floor(context.recentPerformance.accuracy / 10) * 10,
          problemCountRange: Math.floor(context.recentPerformance.problemCount / 10) * 10,
        }
      : null,
    weeklyTrend: context.weeklyTrend,
    // 連続学習日数を5日刻みで丸める
    studyStreakRange: context.studyStreak ? Math.floor(context.studyStreak / 5) * 5 : null,
    promptVersion,
  }

  const keyString = JSON.stringify(keyData)
  return crypto.createHash("sha256").update(keyString).digest("hex")
}

/**
 * キャッシュから応援メッセージを取得
 */
async function getCachedMessages(cacheKey: string): Promise<string[] | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ai_cache")
    .select("cached_content, hit_count")
    .eq("cache_key", cacheKey)
    .eq("cache_type", "encouragement")
    .single()

  if (error || !data) {
    return null
  }

  // 使用回数を更新
  await supabase
    .from("ai_cache")
    .update({
      hit_count: data.hit_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq("cache_key", cacheKey)

  return JSON.parse(data.cached_content) as string[]
}

/**
 * キャッシュに応援メッセージを保存
 */
async function cacheMessages(
  cacheKey: string,
  messages: string[]
): Promise<void> {
  const supabase = await createClient()

  await supabase.from("ai_cache").insert({
    cache_key: cacheKey,
    cache_type: "encouragement",
    cached_content: JSON.stringify(messages),
  })
}

/**
 * AI応援メッセージを生成（キャッシュ活用）
 */
export async function generateEncouragementMessages(
  context: EncouragementContext
): Promise<{ success: true; messages: string[] } | { success: false; error: string }> {
  try {
    const promptVersion = "v1.0"
    const cacheKey = generateCacheKey(context, promptVersion)

    // キャッシュチェック
    const cachedMessages = await getCachedMessages(cacheKey)
    if (cachedMessages) {
      return { success: true, messages: cachedMessages }
    }

    // LLM呼び出し（プロバイダ分岐）
    const { provider, model } = getModelForModule("batch", "structured")
    const systemPrompt = getEncouragementSystemPrompt(context.senderRole)
    const userPrompt = getEncouragementUserPrompt(context)

    let responseText: string
    if (provider === "gemini") {
      const client = getGeminiClient()
      const response = await client.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              messages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["messages"],
          },
        },
        contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
      })
      responseText = response.text?.trim() || ""
    } else {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 800,
        response_format: { type: "json_object" },
      })
      responseText = completion.choices[0]?.message?.content || ""
    }

    if (!responseText) {
      throw new Error("AI応答の生成に失敗しました")
    }

    const response = JSON.parse(responseText)
    const messages = response.messages as string[]

    if (!Array.isArray(messages) || messages.length !== 3) {
      throw new Error("AI応答のフォーマットが不正です")
    }

    // キャッシュに保存
    await cacheMessages(cacheKey, messages)

    return { success: true, messages }
  } catch (error) {
    console.error("Encouragement generation error:", sanitizeForLog(error))
    const errorMessage = error instanceof Error ? error.message : "応援メッセージの生成に失敗しました"
    return { success: false, error: errorMessage }
  }
}

/**
 * コーチ向け応援メッセージ提案を生成
 */
export async function generateEncouragementSuggestions(input: {
  studentName: string
  subject: string
  understandingLevel: string
  reflection: string
  correctRate: number
  streak: number
}): Promise<{ suggestions?: string[]; error?: string }> {
  try {
    const { provider, model } = getModelForModule("coach", "structured")

    const systemPrompt = `あなたは中学受験を目指す小学生を指導するプロのコーチです。生徒の学習状況に基づいて、具体的で前向きな応援メッセージを3つ提案してください。

各メッセージは：
- 生徒の名前を使う
- 具体的な成果や努力を認める
- 次のステップへの励ましを含む
- 50-80文字程度で簡潔に`

    const userPrompt = `生徒：${input.studentName}
科目：${input.subject}
理解度：${input.understandingLevel}
振り返り：${input.reflection}
正答率：${input.correctRate}%
連続学習日数：${input.streak}日

この生徒への応援メッセージを3つ提案してください。JSON形式で返してください：
{"suggestions": ["メッセージ1", "メッセージ2", "メッセージ3"]}`

    let responseText: string
    if (provider === "gemini") {
      const client = getGeminiClient()
      const response = await client.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["suggestions"],
          },
        },
        contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
      })
      responseText = response.text?.trim() || ""
    } else {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 600,
        response_format: { type: "json_object" },
      })
      responseText = completion.choices[0]?.message?.content || ""
    }

    if (!responseText) {
      throw new Error("AI応答の生成に失敗しました")
    }

    const response = JSON.parse(responseText)
    return { suggestions: response.suggestions as string[] }
  } catch (error) {
    console.error("Encouragement suggestions error:", sanitizeForLog(error))
    const errorMessage = error instanceof Error ? error.message : "提案メッセージの生成に失敗しました"
    return { error: errorMessage }
  }
}
