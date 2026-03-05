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

export type FlowType = "simple" | "full"

/** フォールバックテンプレートのキー型 */
type FallbackKey = "simple:2" | "simple:3" | "full:2"

/** フォールバックテンプレート（flowType+step別） */
export const FALLBACK_TEMPLATES: Record<FallbackKey, string> = {
  "simple:2": "それが達成できたら、どんな気持ちになると思う？",
  "simple:3": 'すてきだね！その自分から"今の自分"にひとこと送るとしたら？',
  "full:2": 'すてきだね！その自分から"今の自分"にひとこと送るとしたら？',
}

/** フォールバックキーを生成 */
function toFallbackKey(flowType: FlowType, step: 2 | 3): FallbackKey {
  const key = `${flowType}:${step}` as FallbackKey
  if (!(key in FALLBACK_TEMPLATES)) {
    // full:3 は存在しない（Step 3 はJSON非ストリームで別経路）
    return "simple:2"
  }
  return key
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
 * @param flowType フロータイプ（simple / full）
 * @param step ステップ番号（2 or 3）
 */
export function validateGoalStepOutput(
  output: string,
  flowType: FlowType,
  step: 2 | 3
): ValidationResult {
  const trimmed = output.trim()
  const key = toFallbackKey(flowType, step)
  const fallback = FALLBACK_TEMPLATES[key]

  if (trimmed.length < 20) {
    return { valid: false, content: fallback, reason: "too_short" }
  }

  if (trimmed.length > 200) {
    return { valid: false, content: fallback, reason: "too_long" }
  }

  if (trimmed.includes("\n")) {
    return { valid: false, content: fallback, reason: "newline" }
  }

  if (!trimmed.includes("？")) {
    return { valid: false, content: fallback, reason: "no_question" }
  }

  if (FORBIDDEN_PATTERNS.some((p) => p.test(trimmed))) {
    return { valid: false, content: fallback, reason: "forbidden" }
  }

  return { valid: true, content: trimmed }
}
