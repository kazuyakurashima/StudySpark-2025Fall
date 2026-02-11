import { describe, it, expect } from 'vitest'
import { compareAssessmentDateDesc, compareAssessmentDate } from '../assessment-sort'
import type { AssessmentData } from '../types'

/** テスト用 AssessmentData ファクトリ */
function makeAssessment(overrides: Partial<AssessmentData> & { id: string }): AssessmentData {
  return {
    score: 80,
    max_score_at_submission: 100,
    assessment_date: '2026-02-10',
    ...overrides,
  }
}

describe('compareAssessmentDateDesc（マージソート用）', () => {
  it('異なる日付: 新しい日付が先', () => {
    const a = makeAssessment({ id: 'a', assessment_date: '2026-02-10' })
    const b = makeAssessment({ id: 'b', assessment_date: '2026-02-11' })
    const sorted = [a, b].sort(compareAssessmentDateDesc)
    expect(sorted.map(x => x.id)).toEqual(['b', 'a'])
  })

  it('同日・異時刻: 新しい graded_at が先', () => {
    const a = makeAssessment({
      id: 'a',
      assessment_date: '2026-02-10',
      graded_at: '2026-02-10T10:00:00Z',
    })
    const b = makeAssessment({
      id: 'b',
      assessment_date: '2026-02-10',
      graded_at: '2026-02-10T14:30:00Z',
    })
    const sorted = [a, b].sort(compareAssessmentDateDesc)
    expect(sorted.map(x => x.id)).toEqual(['b', 'a'])
  })

  it('同日: graded_at あり vs なし → graded_at ありが先', () => {
    const a = makeAssessment({
      id: 'a',
      assessment_date: '2026-02-10',
      graded_at: '2026-02-10T08:00:00Z',
    })
    const b = makeAssessment({
      id: 'b',
      assessment_date: '2026-02-10',
    })
    const sorted = [a, b].sort(compareAssessmentDateDesc)
    expect(sorted.map(x => x.id)).toEqual(['a', 'b'])
  })

  it('同日・同 graded_at なし: id 辞書順で安定ソート', () => {
    const a = makeAssessment({ id: 'c', assessment_date: '2026-02-10' })
    const b = makeAssessment({ id: 'a', assessment_date: '2026-02-10' })
    const c = makeAssessment({ id: 'b', assessment_date: '2026-02-10' })
    const sorted = [a, b, c].sort(compareAssessmentDateDesc)
    expect(sorted.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('3件混合: 異日 + 同日異時刻', () => {
    const items = [
      makeAssessment({ id: 'old', assessment_date: '2026-02-09', graded_at: '2026-02-09T23:59:00Z' }),
      makeAssessment({ id: 'today-early', assessment_date: '2026-02-10', graded_at: '2026-02-10T09:00:00Z' }),
      makeAssessment({ id: 'today-late', assessment_date: '2026-02-10', graded_at: '2026-02-10T18:00:00Z' }),
    ]
    const sorted = items.sort(compareAssessmentDateDesc)
    expect(sorted.map(x => x.id)).toEqual(['today-late', 'today-early', 'old'])
  })
})

describe('compareAssessmentDate（リスト表示用 direction 付き）', () => {
  const items = () => [
    makeAssessment({ id: 'feb09', assessment_date: '2026-02-09' }),
    makeAssessment({ id: 'feb10-early', assessment_date: '2026-02-10', graded_at: '2026-02-10T09:00:00Z' }),
    makeAssessment({ id: 'feb10-late', assessment_date: '2026-02-10', graded_at: '2026-02-10T18:00:00Z' }),
    makeAssessment({ id: 'feb11', assessment_date: '2026-02-11' }),
  ]

  it('date_desc: 新しい日付が先、同日内は新しい時刻が先', () => {
    const sorted = items().sort((a, b) => compareAssessmentDate(a, b, 'desc'))
    expect(sorted.map(x => x.id)).toEqual(['feb11', 'feb10-late', 'feb10-early', 'feb09'])
  })

  it('date_asc: 古い日付が先、同日内は新しい時刻が先', () => {
    const sorted = items().sort((a, b) => compareAssessmentDate(a, b, 'asc'))
    expect(sorted.map(x => x.id)).toEqual(['feb09', 'feb10-late', 'feb10-early', 'feb11'])
  })

  it('date_desc: 同日で graded_at 片側欠損 → graded_at ありが先', () => {
    const data = [
      makeAssessment({ id: 'no-ts', assessment_date: '2026-02-10' }),
      makeAssessment({ id: 'has-ts', assessment_date: '2026-02-10', graded_at: '2026-02-10T12:00:00Z' }),
    ]
    const sorted = data.sort((a, b) => compareAssessmentDate(a, b, 'desc'))
    expect(sorted.map(x => x.id)).toEqual(['has-ts', 'no-ts'])
  })

  it('date_asc: 同日で graded_at 片側欠損 → graded_at ありが先（同日内の順は固定）', () => {
    const data = [
      makeAssessment({ id: 'no-ts', assessment_date: '2026-02-10' }),
      makeAssessment({ id: 'has-ts', assessment_date: '2026-02-10', graded_at: '2026-02-10T12:00:00Z' }),
    ]
    const sorted = data.sort((a, b) => compareAssessmentDate(a, b, 'asc'))
    expect(sorted.map(x => x.id)).toEqual(['has-ts', 'no-ts'])
  })
})
