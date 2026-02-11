// ============================================================================
// 算数自動採点 — 採点ロジック（純粋関数、DBアクセスなし）
// ============================================================================
// 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md Section 6-1

/**
 * 数値入力の正規化
 * - 先頭ゼロ除去: "042" → "42"
 * - 末尾ゼロ除去: "3.50" → "3.5"
 * - 科学記数法拒否: "1e2" → null
 */
const NUMERIC_FORMAT = /^-?(\d+\.?\d*|\d*\.?\d+)$/

export function normalizeNumeric(raw: string): string | null {
  const trimmed = raw.trim()
  if (!NUMERIC_FORMAT.test(trimmed)) return null
  const num = Number(trimmed)
  if (!Number.isFinite(num)) return null
  return String(num)
}

/**
 * 問題単位の採点
 *
 * 前提条件（呼び出し側で保証すること）:
 * - rawInput は非null・非空文字（未回答は呼び出し前に除外し is_correct=NULL で処理）
 * - is_correct=true の問題は呼び出さない（リトライ時のスキップ）
 *
 * 戻り値:
 * - answerValue: 正規化済みの値（DB保存用）
 * - isCorrect: true=正解, false=不正解
 */
export function gradeAnswer(
  answerType: 'numeric' | 'fraction' | 'multi_part' | 'selection',
  rawInput: string,
  correctAnswer: string | null,
  answerConfig: Record<string, unknown> | null
): { answerValue: string; isCorrect: boolean } {

  switch (answerType) {
    case 'numeric': {
      const normalized = normalizeNumeric(rawInput)
      if (normalized === null) return { answerValue: rawInput.trim(), isCorrect: false }
      return { answerValue: normalized, isCorrect: normalized === correctAnswer }
    }

    case 'fraction': {
      const normalized = rawInput.trim()
      const parts = normalized.split('/')
      if (parts.length === 2 && Number(parts[1]) === 0) {
        return { answerValue: normalized, isCorrect: false }
      }
      return { answerValue: normalized, isCorrect: normalized === correctAnswer?.trim() }
    }

    case 'multi_part': {
      const config = answerConfig as {
        correct_values: Record<string, string>
        slots: { label: string }[]
      }
      let parsed: Record<string, string>
      try {
        parsed = JSON.parse(rawInput)
      } catch {
        return { answerValue: rawInput, isCorrect: false }
      }

      const allCorrect = config.slots.every(slot => {
        const studentValue = normalizeNumeric(parsed[slot.label] || '')
        const correctValue = config.correct_values[slot.label]
        return studentValue !== null && studentValue === correctValue
      })

      const normalizedObj: Record<string, string> = {}
      config.slots.forEach(slot => {
        normalizedObj[slot.label] = normalizeNumeric(parsed[slot.label] || '') || parsed[slot.label] || ''
      })

      return { answerValue: JSON.stringify(normalizedObj), isCorrect: allCorrect }
    }

    case 'selection': {
      const config = answerConfig as { correct_values: string[] }
      let parsed: string[]
      try {
        parsed = JSON.parse(rawInput)
        if (!Array.isArray(parsed)) return { answerValue: rawInput, isCorrect: false }
      } catch {
        return { answerValue: rawInput, isCorrect: false }
      }

      const normalizedStudent = [...new Set(parsed.map(v => String(v).trim()))].sort()
      const normalizedCorrect = [...new Set(config.correct_values.map(v => v.trim()))].sort()
      const isCorrect = JSON.stringify(normalizedStudent) === JSON.stringify(normalizedCorrect)

      return { answerValue: JSON.stringify(normalizedStudent), isCorrect }
    }
  }
}

/**
 * クライアント側の入力サニタイズ
 * - 全角数字→半角
 * - 全角マイナス→半角
 * - 全角ピリオド→半角
 * - 不正文字除去
 * - 先頭以外の - 除去
 * - 2つ目以降の . 除去
 */
export function sanitizeNumericInput(raw: string): string {
  return raw
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[−ー]/g, '-')
    .replace(/[．。]/g, '.')
    .replace(/[^0-9.\-]/g, '')
    .replace(/(?!^)-/g, '')
    .replace(/(\..*)\./g, '$1')
}

/**
 * seed付きシャッフル（選択式UIの選択肢並べ替え用）
 * question_id をシードに使用 → 同じ問題は常に同じ順序
 */
export function shuffleWithSeed(arr: string[], seed: number): string[] {
  const shuffled = [...arr]
  let s = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff  // LCG
    const j = s % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
