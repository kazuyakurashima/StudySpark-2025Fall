/**
 * クラス内テスト機能の型定義
 *
 * Phase 6: 算数プリント・漢字テスト
 * 設計ドキュメント: docs/tasks/P6-class-assessment.md
 */

// =============================================================================
// 基本型
// =============================================================================

/** テスト種別 */
export type AssessmentType = "math_print" | "kanji_test"

/** 入力ソース */
export type AssessmentSource = "manual" | "import"

/** ステータス（完了/欠席/未提出） */
export type AssessmentStatus = "completed" | "absent" | "not_submitted"

/** 対象学年 */
export type AssessmentGrade = "5年" | "6年"

// =============================================================================
// マスタデータ
// =============================================================================

/** テストマスタ（assessment_masters テーブル） */
export interface AssessmentMaster {
  id: string
  assessment_type: AssessmentType
  grade: AssessmentGrade
  session_number: number // 学習回（1〜19）
  attempt_number: number // 回数（算数:1-2, 漢字:1）
  max_score: number // 満点（算数:100, 漢字:50）
  created_at: string
}

/** マスタ表示用（UI用） */
export interface AssessmentMasterDisplay extends AssessmentMaster {
  /** 表示名: "第3回 算数プリント1回目" */
  display_name: string
  /** 短縮表示名: "算数プリント1回目" */
  short_name: string
}

// =============================================================================
// テスト結果レコード
// =============================================================================

/** テスト結果（class_assessments テーブル） */
export interface ClassAssessment {
  id: string
  student_id: number
  master_id: string
  status: AssessmentStatus
  /** 得点（status='completed'のときのみ有効、それ以外はnull） */
  score: number | null
  /** 入力時点の満点（マスタからコピー、不変） */
  max_score_at_submission: number
  /** 入力時点の学年（マスタからコピー、不変） */
  grade_at_submission: AssessmentGrade
  /** 実施日（YYYY-MM-DD） */
  assessment_date: string
  /** 再提出フラグ（true=再提出、初回欠席→補習はfalse） */
  is_resubmission: boolean
  /** 入力した指導者のユーザーID */
  grader_id: string
  /** 管理者が修正した場合のユーザーID */
  modified_by: string | null
  source: AssessmentSource
  created_at: string
  updated_at: string
}

/** テスト結果 + マスタ情報（JOIN用） */
export interface ClassAssessmentWithMaster extends ClassAssessment {
  master: AssessmentMaster
}

// =============================================================================
// UI表示用
// =============================================================================

/** UI表示用テスト結果（計算済みの値を含む） */
export interface AssessmentDisplayData {
  id: string
  student_id: number
  status: AssessmentStatus

  // テスト情報
  assessment_type: AssessmentType
  session_number: number
  attempt_number: number
  assessment_date: string
  is_resubmission: boolean

  /** 単元名（算数プリントのみ、漢字テストはnull） */
  description?: string | null
  /** 採点日時（最終更新日、TIMESTAMPTZ、ISO 8601形式、UTC） */
  graded_at?: string | null

  // 得点情報（status='completed'の場合のみ有効）
  score: number | null
  max_score: number
  /** 正答率: score / max_score_at_submission * 100 */
  percentage: number | null

  // 前回比（同種別・同attempt_number の直近と比較、再提出除外）
  previous_score?: number
  previous_percentage?: number
  /** 前回比（得点差） */
  change?: number
  /** 表示ラベル: "前回比(算数プリント1回目)" */
  change_label?: string

  // クラス平均（同マスタ × 提出済み全件、日付問わず）
  // 除外: 欠席(absent)、未提出(not_submitted)、再提出(is_resubmission=true)
  class_average?: number
  class_average_percentage?: number
  /** 平均算出に使用した人数（提出済み人数） */
  class_average_count?: number

  // 行動提案（AI生成 or テンプレート）
  action_suggestion?: string
}

/** テストサマリー（特定種別の集計） */
export interface AssessmentSummary {
  assessment_type: AssessmentType
  /** 完了件数 */
  total_count: number
  /** 平均正答率 */
  average_percentage: number
  /** 最高得点 */
  best_score: number
  /** 最新得点 */
  latest_score: number
  /** 欠席件数 */
  absent_count: number
}

// =============================================================================
// 入力用
// =============================================================================

/** 単一入力用 */
export interface AssessmentInput {
  student_id: number
  master_id: string
  status: AssessmentStatus
  /** 得点（status='completed'のときのみ必須） */
  score: number | null
  assessment_date: string
  is_resubmission: boolean
}

/** バッチ入力用 */
export interface BatchAssessmentInput {
  student_id: number
  master_id: string
  status: AssessmentStatus
  score: number | null
  assessment_date: string
  is_resubmission: boolean
}

/** バッチ入力結果 */
export interface BatchAssessmentResult {
  success: boolean
  inserted: number
  updated: number
  errors: Array<{
    student_id: number
    master_id: string
    error: string
  }>
}

// =============================================================================
// フィルター・検索用
// =============================================================================

/** テスト結果検索フィルター */
export interface AssessmentFilter {
  student_id?: number
  assessment_type?: AssessmentType
  grade?: AssessmentGrade
  session_number?: number
  /** 日付範囲（from） */
  date_from?: string
  /** 日付範囲（to） */
  date_to?: string
  /** 再提出を含むか */
  include_resubmissions?: boolean
  /** ステータスフィルター */
  status?: AssessmentStatus[]
}

/** ソートオプション */
export interface AssessmentSortOption {
  field: "assessment_date" | "session_number" | "score" | "created_at"
  direction: "asc" | "desc"
}

// =============================================================================
// 応援機能統合用
// =============================================================================

/** 応援メッセージ関連テスト（encouragement_messagesテーブル拡張用） */
export interface EncouragementAssessmentLink {
  encouragement_id: string
  assessment_id: string
  assessment_type: AssessmentType
  session_number: number
  score: number
  percentage: number
}

// =============================================================================
// ヘルパー型
// =============================================================================

/** テスト種別の表示名 */
export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  math_print: "算数プリント",
  kanji_test: "漢字テスト",
}

/** ステータスの表示名 */
export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  completed: "完了",
  absent: "欠席",
  not_submitted: "未入力",
}

/** ステータスの色（Tailwind CSS クラス） */
export const ASSESSMENT_STATUS_COLORS: Record<
  AssessmentStatus,
  { bg: string; text: string; border: string }
> = {
  completed: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  absent: {
    bg: "bg-gray-100",
    text: "text-gray-500",
    border: "border-gray-200",
  },
  not_submitted: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
}

/** テスト種別の色（算数=青系、漢字=オレンジ系） */
export const ASSESSMENT_TYPE_COLORS: Record<
  AssessmentType,
  { bg: string; text: string; badge: string }
> = {
  math_print: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
  },
  kanji_test: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800",
  },
}

// =============================================================================
// ユーティリティ関数の型
// =============================================================================

/** 正答率を計算 */
export function calculatePercentage(
  score: number | null,
  maxScore: number
): number | null {
  if (score === null || maxScore <= 0) return null
  return Math.round((score / maxScore) * 100)
}

/** 表示名を生成 */
export function getAssessmentDisplayName(
  type: AssessmentType,
  sessionNumber: number,
  attemptNumber: number
): string {
  const typeName = ASSESSMENT_TYPE_LABELS[type]
  if (type === "kanji_test") {
    return `第${sessionNumber}回 ${typeName}`
  }
  return `第${sessionNumber}回 ${typeName}${attemptNumber}回目`
}

/** 短縮表示名を生成 */
export function getAssessmentShortName(
  type: AssessmentType,
  attemptNumber: number
): string {
  const typeName = ASSESSMENT_TYPE_LABELS[type]
  if (type === "kanji_test") {
    return typeName
  }
  return `${typeName}${attemptNumber}回目`
}
