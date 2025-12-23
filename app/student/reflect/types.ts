/**
 * テスト結果履歴機能の共通型定義
 *
 * このファイルは以下のコンポーネントで共有される:
 * - app/student/reflect/assessment-history.tsx
 * - app/student/reflect/components/assessment-summary-cards.tsx
 * - app/student/reflect/components/assessment-trend-chart.tsx
 * - app/student/reflect/components/assessment-history-list.tsx
 * - app/parent/reflect/page.tsx (予定)
 */

/**
 * テスト結果の基本データ型
 * データベースの class_assessments テーブルと assessment_masters テーブルの結合結果
 */
export interface AssessmentData {
  id: string
  score: number
  max_score_at_submission: number
  assessment_date: string
  master?: {
    id: string
    title: string | null
    assessment_type: string
    max_score: number
    session_number: number
  }
}

/**
 * テスト結果のサマリー統計データ型
 * 最新結果、平均、受験回数などを含む
 */
export interface AssessmentSummary {
  latest: {
    math: {
      id: string
      name: string | null
      score: number
      maxScore: number
      percentage: number
      submittedAt: string
    } | null
    kanji: {
      id: string
      name: string | null
      score: number
      maxScore: number
      percentage: number
      submittedAt: string
    } | null
  } | null
  averages: {
    math: number | null
    kanji: number | null
  } | null
  counts: {
    math: number
    kanji: number
    total: number
  }
}
