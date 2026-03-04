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
 * Gemini contents配列を構築（連続同一ロール回避）
 *
 * Gemini APIは同一ロールの連続メッセージを許容しない場合がある。
 * conversationHistoryの末尾がuserの場合、userPromptをそのメッセージのpartsに結合する。
 */
export function buildGeminiContents(
  conversationHistory: { role: "assistant" | "user"; content: string }[],
  userPrompt: string
): GeminiContent[] {
  const mapped: GeminiContent[] = conversationHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: msg.content }],
  }))

  // 末尾がuserなら、userPromptを結合して連続userを回避
  if (mapped.length > 0 && mapped[mapped.length - 1].role === "user") {
    mapped[mapped.length - 1] = {
      role: "user" as const,
      parts: [
        ...mapped[mapped.length - 1].parts,
        { text: userPrompt },
      ],
    }
    return mapped
  }

  return [...mapped, { role: "user" as const, parts: [{ text: userPrompt }] }]
}
