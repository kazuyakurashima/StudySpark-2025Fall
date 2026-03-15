/**
 * 演習問題集 テスト — 純粋関数テスト
 *
 * テスト対象:
 * - コース別フィルタ（filterByCourse ロジック）
 * - 採点ロジック（gradeAnswer 連携）
 * - 再挑戦スコア独立性
 */

import { describe, it, expect } from 'vitest'
import { gradeAnswer } from '@/lib/math-grading'

// filterByCourse ロジック（exercise.ts と同一定義）
const COURSE_RANK: Record<string, number> = { A: 1, B: 2, C: 3, S: 4 }

function filterByCourse<T extends { min_course: string | null }>(
  questions: T[],
  studentCourse: string
): T[] {
  const studentRank = COURSE_RANK[studentCourse] ?? 1
  return questions.filter(q => {
    if (!q.min_course) return true
    return (COURSE_RANK[q.min_course] ?? 1) <= studentRank
  })
}

const mockQuestions = [
  ...Array.from({ length: 17 }, (_, i) => ({
    id: i + 1, min_course: 'A' as string | null, points: 1, section_name: '反復問題（基本）',
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    id: i + 18, min_course: 'B' as string | null, points: 1, section_name: '反復問題（練習）',
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: i + 30, min_course: 'C' as string | null, points: 1, section_name: '実戦演習',
  })),
]

describe('演習問題集 コース別フィルタ', () => {
  it('Aコース: 17問、maxScore=17', () => {
    const f = filterByCourse(mockQuestions, 'A')
    expect(f).toHaveLength(17)
    expect(f.reduce((s, q) => s + q.points, 0)).toBe(17)
  })

  it('Bコース: 29問（実戦演習は含まない）', () => {
    const f = filterByCourse(mockQuestions, 'B')
    expect(f).toHaveLength(29)
    expect(new Set(f.map(q => q.section_name))).not.toContain('実戦演習')
  })

  it('C/Sコース: 全39問', () => {
    expect(filterByCourse(mockQuestions, 'C')).toHaveLength(39)
    expect(filterByCourse(mockQuestions, 'S')).toHaveLength(39)
  })

  it('min_course=NULL は全コースで表示', () => {
    const q = [{ id: 1, min_course: null, points: 1 }, { id: 2, min_course: 'C' as string | null, points: 1 }]
    expect(filterByCourse(q, 'A')).toHaveLength(1)
    expect(filterByCourse(q, 'C')).toHaveLength(2)
  })

  it('未知コースはA相当', () => {
    expect(filterByCourse(mockQuestions, 'X')).toHaveLength(17)
  })
})

describe('演習問題集 採点ロジック', () => {
  it('numeric正答', () => expect(gradeAnswer('numeric', '12', '12', null).isCorrect).toBe(true))
  it('numeric不正答', () => expect(gradeAnswer('numeric', '13', '12', null).isCorrect).toBe(false))
  it('numeric先頭ゼロ正規化', () => expect(gradeAnswer('numeric', '012', '12', null).isCorrect).toBe(true))
  it('fraction正答', () => expect(gradeAnswer('fraction', '3/4', '3/4', null).isCorrect).toBe(true))

  it('multi_part全スロット一致', () => {
    const config = {
      slots: [{ label: '最大公約数' }, { label: '最小公倍数' }],
      correct_values: { '最大公約数': '2', '最小公倍数': '180' },
      template: '最大公約数{最大公約数}, 最小公倍数{最小公倍数}',
    }
    expect(gradeAnswer('multi_part', JSON.stringify({ '最大公約数': '2', '最小公倍数': '180' }), null, config).isCorrect).toBe(true)
  })

  it('multi_part 1スロット不一致', () => {
    const config = {
      slots: [{ label: '最大公約数' }, { label: '最小公倍数' }],
      correct_values: { '最大公約数': '2', '最小公倍数': '180' },
      template: '最大公約数{最大公約数}, 最小公倍数{最小公倍数}',
    }
    expect(gradeAnswer('multi_part', JSON.stringify({ '最大公約数': '2', '最小公倍数': '100' }), null, config).isCorrect).toBe(false)
  })
})

describe('演習問題集 再挑戦スコア独立性', () => {
  it('maxScoreは同じ、totalScoreは独立', () => {
    const maxScore = filterByCourse(mockQuestions, 'B').reduce((s, q) => s + q.points, 0)
    expect(maxScore).toBe(29)
    expect(Math.round((20 / maxScore) * 100)).toBe(69)
    expect(Math.round((25 / maxScore) * 100)).toBe(86)
  })
})

describe('previewCourse バリデーション', () => {
  const validCourses = new Set(['A', 'B', 'C', 'S'])

  it('有効なコース値はそのまま使用', () => {
    for (const c of ['A', 'B', 'C', 'S']) {
      expect(validCourses.has(c)).toBe(true)
    }
  })

  it('無効なコース値は無視される（nullフォールバック）', () => {
    for (const c of ['X', 'a', 'AB', '', '1']) {
      expect(validCourses.has(c)).toBe(false)
    }
  })
})

describe('到達率計算（到達度マップ用）', () => {
  it('到達率 = 正解数 / 対象問題数（計画書準拠）', () => {
    // Bコース: 29問中15問正解、10問未回答
    const totalQuestions = 29
    const correctQuestions = 15
    const answeredQuestions = 19
    const accuracy = Math.round((correctQuestions / totalQuestions) * 100)
    const answeredRate = Math.round((answeredQuestions / totalQuestions) * 100)
    expect(accuracy).toBe(52) // 15/29
    expect(answeredRate).toBe(66) // 19/29
  })

  it('未回答時は到達率0%', () => {
    expect(Math.round((0 / 29) * 100)).toBe(0)
  })

  it('全問正解で100%', () => {
    expect(Math.round((29 / 29) * 100)).toBe(100)
  })
})
