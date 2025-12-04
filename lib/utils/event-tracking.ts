/**
 * イベント計測ユーティリティ
 *
 * @description
 * モチベーション機能の効果測定用イベント記録。
 * Server Actions / API Routes 内で呼び出すこと。
 * フロントから直接呼び出し不可（RLSでブロック）。
 *
 * @see docs/MOTIVATION_FEATURE_IMPLEMENTATION_PLAN.md
 */

import { createServiceClient } from "@/lib/supabase/service-client"

/**
 * イベント記録オプション
 */
interface EventOptions {
  /** 生徒ID（生徒イベントの場合） */
  studentId?: number
  /** LangfuseトレースID（AI生成イベントの場合） */
  langfuseTraceId?: string
  /** 関連コンテンツID（褒めヒント等） */
  contentId?: number
}

/**
 * ユーザーロール型
 */
type UserRole = "student" | "parent" | "coach" | "system"

/**
 * イベント記録（service_role使用）
 *
 * @description
 * - Server Actions / API Routes 内で呼び出すこと
 * - フロントから直接呼び出し不可（RLSでブロック）
 * - 失敗時はサイレントエラー（計測失敗で本機能を止めない）
 *
 * @param userId - auth.usersのUUID
 * @param userRole - イベント発火者のロール
 * @param eventType - イベント種別
 * @param eventData - イベント固有データ
 * @param options - オプション（studentId, langfuseTraceId, contentId）
 * @returns 成功/失敗とエラーメッセージ
 */
export async function recordEvent(
  userId: string,
  userRole: UserRole,
  eventType: string,
  eventData: Record<string, unknown>,
  options: EventOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase.from("user_events").insert({
      user_id: userId,
      student_id: options.studentId || null,
      user_role: userRole,
      event_type: eventType,
      event_data: eventData,
      langfuse_trace_id: options.langfuseTraceId || null,
      content_id: options.contentId || null,
    })

    if (error) {
      // ログ出力のみ、例外は投げない
      console.error("[event-tracking] Insert failed:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    // 予期せぬエラーもサイレント処理
    console.error("[event-tracking] Unexpected error:", err)
    return { success: false, error: String(err) }
  }
}

// ========================================
// Phase 0-1: ストリーク関連イベント
// ========================================

/**
 * StreakCard表示時イベント
 */
export async function recordStreakCardView(
  userId: string,
  studentId: number,
  data: {
    streak: number
    totalDays: number
    state: "active" | "grace" | "reset"
  }
) {
  return recordEvent(
    userId,
    "student",
    "streak_card_view",
    {
      streak: data.streak,
      total_days: data.totalDays,
      state: data.state,
    },
    { studentId }
  )
}

/**
 * 連続切れ検知時イベント
 */
export async function recordStreakReset(
  userId: string,
  studentId: number,
  data: {
    previousStreak: number
    totalDays: number
    lastStudyDate: string // YYYY-MM-DD（復帰日数計算に使用）
  }
) {
  return recordEvent(
    userId,
    "student",
    "streak_reset",
    {
      previous_streak: data.previousStreak,
      total_days: data.totalDays,
      last_study_date: data.lastStudyDate,
    },
    { studentId }
  )
}

/**
 * リセット後の復帰イベント
 */
export async function recordStreakResume(
  userId: string,
  studentId: number,
  data: {
    daysSinceReset: number | null
    totalDays: number
    previousStreak: number
    resumeDate: string // YYYY-MM-DD
  }
) {
  return recordEvent(
    userId,
    "student",
    "streak_resume",
    {
      days_since_reset: data.daysSinceReset,
      total_days: data.totalDays,
      previous_streak: data.previousStreak,
      resume_date: data.resumeDate,
    },
    { studentId }
  )
}

// ========================================
// Phase 2: 保護者/指導者イベント
// ========================================

/**
 * 保護者ダッシュボード表示イベント
 */
export async function recordParentDashboardView(
  userId: string,
  childStudentId: number
) {
  return recordEvent(userId, "parent", "parent_dashboard_view", {
    child_student_id: childStudentId,
  })
}

/**
 * 褒めヒント表示イベント
 */
export async function recordPraiseHintView(
  userId: string,
  data: {
    hintCategory: string
    langfuseTraceId?: string
  }
) {
  return recordEvent(
    userId,
    "parent",
    "praise_hint_view",
    {
      hint_category: data.hintCategory,
      langfuse_trace_id: data.langfuseTraceId,
    },
    { langfuseTraceId: data.langfuseTraceId }
  )
}

/**
 * 褒めヒントNG報告イベント
 */
export async function recordPraiseHintNgReport(
  userId: string,
  contentId: number,
  reason?: string
) {
  return recordEvent(
    userId,
    "parent",
    "praise_hint_ng_report",
    {
      content_id: contentId,
      reason: reason || "unspecified",
    },
    { contentId }
  )
}

/**
 * 応援メッセージ送信イベント
 */
export async function recordEncouragementSent(
  userId: string,
  userRole: "parent" | "coach",
  recipientStudentId: number,
  messageLength: number
) {
  return recordEvent(userId, userRole, "encouragement_sent", {
    recipient_student_id: recipientStudentId,
    message_length: messageLength,
  })
}

/**
 * 週次サマリー閲覧イベント
 */
export async function recordWeeklySummaryView(userId: string, weekStart: string) {
  return recordEvent(userId, "parent", "weekly_summary_view", {
    week_start: weekStart,
  })
}

// ========================================
// Phase 3: バッジイベント
// ========================================

/**
 * バッジ獲得イベント
 */
export async function recordBadgeEarned(
  userId: string,
  studentId: number,
  data: {
    badgeId: string
    badgeName: string
    trigger: string
  }
) {
  return recordEvent(
    userId,
    "student",
    "badge_earned",
    {
      badge_id: data.badgeId,
      badge_name: data.badgeName,
      trigger: data.trigger,
    },
    { studentId }
  )
}

/**
 * バッジ通知送信イベント（cronジョブ用）
 */
export async function recordBadgeNotificationSent(
  recipientUserId: string,
  badgeIds: string[]
) {
  return recordEvent(
    recipientUserId, // システムが通知を送信するが、recipient_user_idとして記録
    "system",
    "badge_notification_sent",
    {
      recipient_user_id: recipientUserId,
      badge_ids: badgeIds,
    }
  )
}

/**
 * バッジ一覧表示イベント
 */
export async function recordBadgeCardView(
  userId: string,
  studentId: number,
  data: {
    earnedCount: number
    totalCount: number
  }
) {
  return recordEvent(
    userId,
    "student",
    "badge_card_view",
    {
      earned_count: data.earnedCount,
      total_count: data.totalCount,
    },
    { studentId }
  )
}
