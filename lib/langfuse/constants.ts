/**
 * Langfuse定数定義
 */

/**
 * エンティティタイプ（どのAI機能か）
 */
export const ENTITY_TYPES = {
  COACHING_MESSAGE: "coaching_message", // 週次振り返りコーチングメッセージ
  ENCOURAGEMENT_MESSAGE: "encouragement_message", // 応援メッセージ
  WEEKLY_ANALYSIS: "weekly_analysis", // 週次分析（指導者向け）
  DAILY_COACH_MESSAGE: "daily_coach_message", // 毎日のAIコーチメッセージ
  DAILY_STATUS: "daily_status", // 保護者の今日の様子
} as const

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES]

/**
 * スコア名定義
 */
export const SCORE_NAMES = {
  // リアルタイムスコア（ユーザーフィードバック）
  USER_FEEDBACK: "user_feedback",
  MESSAGE_HELPFUL: "message_helpful",

  // バッチスコア（自動計算）
  MISSION_COMPLETED: "mission_completed",
  NEXT_DAY_ACTIVITY: "next_day_activity",
  WEEKLY_COMPLETION_RATE: "weekly_completion_rate",
} as const

export type ScoreName = (typeof SCORE_NAMES)[keyof typeof SCORE_NAMES]

/**
 * スコア値定義
 */
export const SCORE_VALUES = {
  POSITIVE: 1,
  NEGATIVE: 0,
  YES: 1,
  NO: 0,
} as const

/**
 * タグ定義
 */
export const TAGS = {
  CACHE_HIT: "cache_hit",
  CACHE_MISS: "cache_miss",
  GROWTH_WEEK: "growth_week",
  STABLE_WEEK: "stable_week",
  CHALLENGE_WEEK: "challenge_week",
  SPECIAL_WEEK: "special_week",
} as const

export type Tag = (typeof TAGS)[keyof typeof TAGS]

/**
 * メタデータキー定義
 */
export const METADATA_KEYS = {
  USER_ID: "user_id",
  STUDENT_ID: "student_id",
  WEEK_TYPE: "week_type",
  CACHE_HIT: "cache_hit",
  TURN_NUMBER: "turn_number",
  MESSAGE_ROLE: "message_role",
  ACCURACY_RATE: "accuracy_rate",
  COMPLETION_RATE: "completion_rate",
} as const
