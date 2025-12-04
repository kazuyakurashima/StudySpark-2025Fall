"use server"

/**
 * ストリーク関連イベント記録用 Server Actions
 *
 * @description
 * クライアントから呼び出し可能なイベント記録関数。
 * RLSをバイパスしてuser_eventsテーブルに記録。
 *
 * @see docs/MOTIVATION_FEATURE_IMPLEMENTATION_PLAN.md
 */

import { createClient } from "@/lib/supabase/server"
import { recordStreakCardView } from "@/lib/utils/event-tracking"

/**
 * StreakCard表示イベントを記録
 *
 * @description
 * ダッシュボードでStreakCardが表示された際に呼び出される。
 * 効果測定用。失敗してもUIには影響しない（サイレントエラー）。
 *
 * @param data - ストリーク情報
 */
export async function trackStreakCardView(data: {
  streak: number
  totalDays: number
  state: "active" | "grace" | "reset"
}) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn("[streak-events] No authenticated user")
      return { success: false }
    }

    // 生徒情報を取得
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!student) {
      console.warn("[streak-events] Student not found")
      return { success: false }
    }

    // イベント記録（サイレントエラー）
    await recordStreakCardView(user.id, student.id, data)

    return { success: true }
  } catch (error) {
    console.error("[streak-events] trackStreakCardView error:", error)
    return { success: false }
  }
}
