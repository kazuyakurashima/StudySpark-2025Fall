// ============================================================================
// 算数自動採点 — ユーティリティ関数（Server Actions から分離）
// ============================================================================
// 'use server' ファイルの export は全て async 関数でなければならないため、
// 純粋関数はこのファイルに配置する。

import { shuffleWithSeed } from '@/lib/math-grading'

export interface MultiPartConfig {
  template: string
  slots: { label: string; unit?: string }[]
  /** 頂点番号対応表（任意）。例: {"1":"A","2":"B","3":"C"} */
  vertex_map?: Record<string, string>
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
      const { slots, template, vertex_map } = config as {
        slots: { label: string; unit: string }[]
        template: string
        vertex_map?: Record<string, string>
      }
      if (!Array.isArray(slots) || typeof template !== 'string') return null
      const result: MultiPartConfig = { template, slots }
      if (vertex_map && typeof vertex_map === 'object') result.vertex_map = vertex_map
      return result
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
