/**
 * Gemini SDK向け共有ユーティリティ
 *
 * 複数モジュール（Reflect, Goal等）が使用する Gemini API 用ヘルパーを集約。
 */

/** Gemini contents の型 */
export type GeminiContent = {
  role: "user" | "model"
  parts: Array<{ text: string }>
}

/**
 * メッセージ配列をGemini contents形式に変換（連続同一ロール回避）
 *
 * assistant → model にロール変換し、連続する同一ロールのメッセージをpartsに結合する。
 * 全モジュール共通の基盤関数。
 */
export function toGeminiContents(
  messages: Array<{ role: "assistant" | "user"; content: string }>
): GeminiContent[] {
  return messages.reduce<GeminiContent[]>((acc, msg) => {
    const geminiRole = msg.role === "assistant" ? "model" as const : "user" as const
    if (acc.length > 0 && acc[acc.length - 1].role === geminiRole) {
      acc[acc.length - 1].parts.push({ text: msg.content })
    } else {
      acc.push({ role: geminiRole, parts: [{ text: msg.content }] })
    }
    return acc
  }, [])
}

/**
 * Gemini contents配列を構築（末尾にuserPromptを追加）
 *
 * conversationHistory + 末尾userPrompt パターン用。
 * 末尾がuserの場合はpartsに結合し、連続userを回避する。
 */
export function buildGeminiContents(
  conversationHistory: { role: "assistant" | "user"; content: string }[],
  userPrompt: string
): GeminiContent[] {
  return toGeminiContents([
    ...conversationHistory,
    { role: "user" as const, content: userPrompt },
  ])
}
