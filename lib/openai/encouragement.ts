import { createClient } from "@/lib/supabase/server"
import { getOpenAIClient, handleOpenAIError, getDefaultModel } from "./client"
import {
  getEncouragementSystemPrompt,
  getEncouragementUserPrompt,
  type EncouragementContext,
} from "./prompts"
import crypto from "crypto"

/**
 * キャッシュキーを生成
 * 同一状況を識別するためのハッシュ
 */
function generateCacheKey(context: EncouragementContext, promptVersion: string = "v1.0"): string {
  const keyData = {
    senderRole: context.senderRole,
    recentPerformance: context.recentPerformance
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
      console.log("Cache hit for encouragement messages:", cacheKey)
      return { success: true, messages: cachedMessages }
    }

    console.log("Cache miss, generating new messages:", cacheKey)

    // OpenAI API呼び出し
    const openai = getOpenAIClient()
    const systemPrompt = getEncouragementSystemPrompt(context.senderRole)
    const userPrompt = getEncouragementUserPrompt(context)

    const completion = await openai.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error("No response from OpenAI API")
    }

    const response = JSON.parse(responseText)
    const messages = response.messages as string[]

    if (!Array.isArray(messages) || messages.length !== 3) {
      throw new Error("Invalid response format from OpenAI API")
    }

    // キャッシュに保存
    await cacheMessages(cacheKey, messages)

    return { success: true, messages }
  } catch (error) {
    const errorMessage = handleOpenAIError(error)
    return { success: false, error: errorMessage }
  }
}
