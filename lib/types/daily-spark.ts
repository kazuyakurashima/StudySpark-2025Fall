/**
 * Daily Sparkのレベル
 * - none: 未達成
 * - child: 子供のみ達成（生徒が今日のミッション完了）
 * - parent: 保護者のみ達成（保護者が今日応援メッセージ送信）
 * - both: 両方達成
 */
export type SparkLevel = "none" | "child" | "parent" | "both"
