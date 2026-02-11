import type { AssessmentData } from './types'

/**
 * AssessmentData のソート比較関数
 *
 * ソート戦略:
 *   一次キー: assessment_date（日付昇順の自然順。呼び出し側が dir で反転）
 *   同日タイブレーカー: graded_at タイムスタンプ（常に新しい時刻が先、昇降順に依存しない）
 *   最終手段: id の辞書順で安定ソート
 */

/** assessment_date 降順（マージソート用） */
export function compareAssessmentDateDesc(a: AssessmentData, b: AssessmentData): number {
  // 一次キー: assessment_date 降順
  const dateDiff = new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime()
  if (dateDiff !== 0) return dateDiff
  return sameDayTiebreaker(a, b)
}

/** assessment_date の昇降順を dir で切り替え（リスト表示用） */
export function compareAssessmentDate(
  a: AssessmentData,
  b: AssessmentData,
  direction: 'asc' | 'desc',
): number {
  const dir = direction === 'desc' ? -1 : 1
  const dateDiff =
    new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime()
  if (dateDiff !== 0) return dateDiff * dir
  // 同日タイブレーカーは常に「新しい時刻が先」で固定
  return sameDayTiebreaker(a, b)
}

/** 同日内の安定ソート: graded_at 降順 → id 辞書順 */
function sameDayTiebreaker(a: AssessmentData, b: AssessmentData): number {
  if (a.graded_at && b.graded_at) return b.graded_at.localeCompare(a.graded_at)
  if (a.graded_at && !b.graded_at) return -1
  if (!a.graded_at && b.graded_at) return 1
  return a.id.localeCompare(b.id)
}
