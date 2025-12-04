/**
 * ストリーク関連ヘルパー関数
 *
 * @description
 * 連続日数・累積日数の計算、streak_resumeイベントの記録など。
 * Server Actions / API Routes 内で呼び出すこと。
 *
 * @see docs/MOTIVATION_FEATURE_IMPLEMENTATION_PLAN.md
 */

import { createServiceClient } from "@/lib/supabase/service-client"
import { recordStreakResume } from "@/lib/utils/event-tracking"

/**
 * ストリーク状態
 */
export type StreakState = "active" | "grace" | "reset"

/**
 * ストリーク情報
 */
export interface StreakInfo {
  /** 現在の連続日数 */
  currentStreak: number
  /** 累積学習日数 */
  totalDays: number
  /** 最終学習日（YYYY-MM-DD） */
  lastStudyDate: string | null
  /** ストリーク状態 */
  state: StreakState
  /** 最大連続日数（過去最高） */
  maxStreak: number
}

/**
 * 累積学習日数を取得（DISTINCT study_date の件数）
 *
 * @note 将来の最適化
 * 現在は全study_dateを取得してSet化しているが、データ量増加時は
 * RPC関数（SQL: SELECT COUNT(DISTINCT study_date)）に置き換えること。
 * 例: supabase.rpc('get_total_study_days', { p_student_id: studentId })
 *
 * @param studentId - 生徒ID
 * @returns 累積学習日数
 */
export async function getTotalDays(studentId: number): Promise<number> {
  const supabase = createServiceClient()

  // Supabase は DISTINCT count を直接サポートしないため、
  // 全study_dateを取得してSet化でユニーク化
  // TODO: データ量増加時はRPC関数に置き換え
  const { data } = await supabase
    .from("study_logs")
    .select("study_date")
    .eq("student_id", studentId)

  const uniqueDays = new Set(data?.map((d) => d.study_date) || [])
  return uniqueDays.size
}

/**
 * 今日の日付をJST基準で取得（YYYY-MM-DD形式）
 */
export function getTodayJST(): string {
  const now = new Date()
  // JST (UTC+9) に変換
  const jstOffset = 9 * 60 // 分
  const jst = new Date(now.getTime() + jstOffset * 60 * 1000)
  return jst.toISOString().split("T")[0]
}

/**
 * 日付文字列から日数差を計算
 *
 * @param fromDate - 開始日（YYYY-MM-DD）
 * @param toDate - 終了日（YYYY-MM-DD）
 * @returns 日数差
 */
export function daysDiff(fromDate: string, toDate: string): number {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 学習記録保存時に呼び出し
 * reset状態から記録した場合にstreak_resumeイベントを記録
 *
 * @param userId - auth.usersのUUID
 * @param studentId - 生徒ID
 * @param previousState - 記録前のストリーク状態
 * @param todayDate - 今日の日付（YYYY-MM-DD, JST）
 */
export async function checkAndRecordStreakResume(
  userId: string,
  studentId: number,
  previousState: StreakState,
  todayDate: string
): Promise<void> {
  // reset状態から記録した場合のみstreak_resumeを記録
  if (previousState !== "reset") {
    return
  }

  const supabase = createServiceClient()

  // 直前のstreak_resetイベントを取得
  const { data: lastReset } = await supabase
    .from("user_events")
    .select("event_data")
    .eq("user_id", userId)
    .eq("event_type", "streak_reset")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // last_study_date（実際の最終学習日）からの日数差を計算
  // created_at（イベント記録日時）ではなく、学習日ベースで正確に算出
  const eventData = lastReset?.event_data as Record<string, unknown> | null
  const lastStudyDate = eventData?.last_study_date as string | undefined
  const daysSinceReset = lastStudyDate ? daysDiff(lastStudyDate, todayDate) : null

  const totalDays = await getTotalDays(studentId)

  await recordStreakResume(userId, studentId, {
    daysSinceReset,
    totalDays,
    previousStreak: (eventData?.previous_streak as number) || 0,
    resumeDate: todayDate,
  })
}

/**
 * 現在のストリーク状態を判定
 *
 * @param lastStudyDate - 最終学習日（YYYY-MM-DD）またはnull
 * @param todayJST - 今日の日付（YYYY-MM-DD, JST）
 * @returns ストリーク状態
 */
export function determineStreakState(
  lastStudyDate: string | null,
  todayJST: string
): StreakState {
  if (!lastStudyDate) {
    return "reset"
  }

  const diff = daysDiff(lastStudyDate, todayJST)

  if (diff === 0) {
    // 今日記録あり
    return "active"
  } else if (diff === 1) {
    // 昨日記録あり（グレースピリオド）
    return "grace"
  } else {
    // 2日以上空いている
    return "reset"
  }
}

/**
 * ストリーク情報を取得
 *
 * @param studentId - 生徒ID
 * @returns ストリーク情報
 *
 * @note
 * この関数は現在の実装を維持しつつ、将来的にRPC関数に置き換え可能な設計
 */
export async function getStreakInfo(studentId: number): Promise<StreakInfo> {
  const supabase = createServiceClient()
  const todayJST = getTodayJST()

  // 全学習日を取得
  const { data: logs } = await supabase
    .from("study_logs")
    .select("study_date")
    .eq("student_id", studentId)
    .order("study_date", { ascending: true })

  if (!logs || logs.length === 0) {
    return {
      currentStreak: 0,
      totalDays: 0,
      lastStudyDate: null,
      state: "reset",
      maxStreak: 0,
    }
  }

  // ユニークな学習日を抽出
  const uniqueDates = [...new Set(logs.map((l) => l.study_date))].sort()
  const totalDays = uniqueDates.length
  const lastStudyDate = uniqueDates[uniqueDates.length - 1]

  // 連続日数を計算（グループ化アルゴリズム）
  const streaks: number[] = []
  let currentStreakLength = 1

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = daysDiff(uniqueDates[i - 1], uniqueDates[i])
    if (diff === 1) {
      currentStreakLength++
    } else {
      streaks.push(currentStreakLength)
      currentStreakLength = 1
    }
  }
  streaks.push(currentStreakLength)

  const maxStreak = Math.max(...streaks)

  // 現在のストリーク状態を判定
  const state = determineStreakState(lastStudyDate, todayJST)

  // 現在のストリーク長を計算
  let currentStreak = 0
  if (state === "active" || state === "grace") {
    // 最終学習日から遡って連続日数をカウント
    currentStreak = 1
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const diff = daysDiff(uniqueDates[i], uniqueDates[i + 1])
      if (diff === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return {
    currentStreak,
    totalDays,
    lastStudyDate,
    state,
    maxStreak,
  }
}
