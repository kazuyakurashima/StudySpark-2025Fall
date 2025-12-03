/**
 * API件数上限の定数定義
 *
 * @description
 * 各画面で取得するデータの件数上限を定義。
 * ドキュメントとコードで共有し、将来のDB集約移行判断の基準とする。
 *
 * @see docs/BATCH_GROUPING_UI_IMPLEMENTATION_PLAN.md
 */

/**
 * 学習履歴の取得件数上限
 */
export const STUDY_LOG_LIMITS = {
  /** ダッシュボード（生徒/保護者）- 直近の学習履歴 */
  DASHBOARD: 10,
  /** リフレクト学習履歴 */
  REFLECT_STUDY_HISTORY: 50,
  /** リフレクト応援履歴 */
  REFLECT_ENCOURAGEMENT_HISTORY: 50,
  /** 指導者生徒詳細 */
  COACH_STUDENT_DETAIL: 50,
  /** 応援送信（学習記録選択）- 未応援のみ */
  ENCOURAGEMENT_SELECTION: 30,
} as const

/**
 * DB集約への移行判断基準
 *
 * この件数を超えるデータが発生した場合、
 * DB側 GROUP BY COALESCE(batch_id, id) への移行を検討する。
 */
export const DB_AGGREGATION_THRESHOLD = 100
