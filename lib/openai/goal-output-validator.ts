/**
 * ゴールナビ動的質問の出力バリデータ
 *
 * LLM生成の動的質問（Simple Steps 2-3 / Full Step 2）の品質を保証。
 * バリデーション失敗時はフォールバックテンプレートを返す。
 */

export interface ValidationResult {
  valid: boolean
  content: string
  /** invalid時の理由（ログ用） */
  reason?: string
}

/** フォールバックテンプレート（固定文） */
export const FALLBACK_TEMPLATES: Record<2 | 3, string> = {
  2: "それが達成できたら、どんな気持ちになると思う？",
  3: 'すてきだね！その自分から"今の自分"にひとこと送るとしたら？',
}

/** 禁止パターン（不適切表現） */
const FORBIDDEN_PATTERNS = [
  /死/,
  /殺/,
  /バカ/,
  /アホ/,
  /ダメ/,
  /無理/,
  /できない/,
  /やめ/,
]

/**
 * 動的質問のバリデーション
 *
 * @param output LLM出力テキスト
 * @param step Simple flow のステップ番号（2 or 3）
 */
export function validateGoalStepOutput(
  output: string,
  step: 2 | 3
): ValidationResult {
  const trimmed = output.trim()

  if (trimmed.length < 20) {
    return { valid: false, content: FALLBACK_TEMPLATES[step], reason: "too_short" }
  }

  if (trimmed.length > 200) {
    return { valid: false, content: FALLBACK_TEMPLATES[step], reason: "too_long" }
  }

  if (trimmed.includes("\n")) {
    return { valid: false, content: FALLBACK_TEMPLATES[step], reason: "newline" }
  }

  if (!trimmed.includes("？")) {
    return { valid: false, content: FALLBACK_TEMPLATES[step], reason: "no_question" }
  }

  if (FORBIDDEN_PATTERNS.some((p) => p.test(trimmed))) {
    return { valid: false, content: FALLBACK_TEMPLATES[step], reason: "forbidden" }
  }

  return { valid: true, content: trimmed }
}
