// ============================================================================
// 算数自動採点 — ユーティリティ関数（Server Actions から分離）
// ============================================================================
// 'use server' ファイルの export は全て async 関数でなければならないため、
// 純粋関数はこのファイルに配置する。

import { shuffleWithSeed } from '@/lib/math-grading'

export interface MultiPartConfig {
  template: string
  slots: { label: string; unit: string }[]
}

export interface SelectionConfig {
  options: string[]
  unit: string | null
}

/**
 * answer_config のサニタイズ（正答データ除去）
 * クライアントに correct_values を送らない
 */
export function sanitizeAnswerConfig(
  answerType: string,
  config: Record<string, unknown> | null,
  questionId: number
): MultiPartConfig | SelectionConfig | null {
  if (!config || typeof config !== 'object') return null

  try {
    if (answerType === 'multi_part') {
      const { slots, template } = config as { slots: { label: string; unit: string }[]; template: string }
      if (!Array.isArray(slots) || typeof template !== 'string') return null
      return { template, slots }
    }

    if (answerType === 'selection') {
      const { correct_values, dummy_values } = config as { correct_values: string[]; dummy_values: string[] }
      if (!Array.isArray(correct_values) || !Array.isArray(dummy_values)) return null
      const allValues = [...correct_values, ...dummy_values]
      return { options: shuffleWithSeed(allValues, questionId), unit: (config as { unit?: string | null }).unit ?? null }
    }
  } catch {
    return null
  }

  return null
}
