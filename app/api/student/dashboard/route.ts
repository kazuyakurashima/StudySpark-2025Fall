import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getStudentDashboardData,
  getAICoachMessage,
  getStudyStreak,
  getRecentStudyLogs,
  getLastLoginInfo,
  getTodayMissionData,
  getYesterdayMissionData,
  getLearningCalendarData,
  getWeeklySubjectProgress,
  getWeeklyReflectionStatus,
  getLiveUpdateData,
} from "@/app/actions/dashboard"
import { getRecentEncouragementMessages } from "@/app/actions/encouragement"

export const dynamic = "force-dynamic"

/**
 * 生徒ダッシュボード用API Route
 * SWRのfetcher用エンドポイント
 * 全データを並列取得して返す
 */
export async function GET() {
  try {
    // 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    // 生徒ロールの確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "student") {
      return NextResponse.json(
        { error: "生徒アカウントが必要です" },
        { status: 403 }
      )
    }

    // 全データを並列取得
    const [
      dashboardData,
      coachMsg,
      streakResult,
      logsResult,
      messagesResult,
      loginInfo,
      todayMission,
      yesterdayMission,
      calendar,
      weeklySubject,
      reflectionStatus,
      liveUpdates,
    ] = await Promise.all([
      getStudentDashboardData(),
      getAICoachMessage(),
      getStudyStreak(),
      getRecentStudyLogs(50),
      getRecentEncouragementMessages(),
      getLastLoginInfo(),
      getTodayMissionData(),
      getYesterdayMissionData(),
      getLearningCalendarData(),
      getWeeklySubjectProgress(),
      getWeeklyReflectionStatus(),
      getLiveUpdateData(),
    ])

    // レスポンスを構築
    const response = {
      profile: dashboardData?.error
        ? { error: dashboardData.error }
        : {
            nickname: dashboardData?.profile?.nickname || "学習者",
            avatarId: dashboardData?.profile?.avatar_id || "student1",
            themeColor: dashboardData?.profile?.theme_color || "default",
          },
      aiCoachMessage: coachMsg?.error
        ? { message: "", createdAt: null, error: coachMsg.error }
        : { message: coachMsg?.message || "今日も一緒に頑張ろう！", createdAt: coachMsg?.createdAt || null },
      streak: streakResult?.error
        ? { streak: 0, maxStreak: 0, lastStudyDate: null, todayStudied: false, state: "reset" as const, error: streakResult.error }
        : {
            streak: typeof streakResult?.streak === "number" ? streakResult.streak : 0,
            maxStreak: typeof streakResult?.maxStreak === "number" ? streakResult.maxStreak : 0,
            lastStudyDate: streakResult?.lastStudyDate || null,
            todayStudied: streakResult?.todayStudied || false,
            // Server Action returns "streakState", but client expects "state"
            state: streakResult?.streakState || "reset",
          },
      recentLogs: logsResult?.error
        ? { logs: [], batchFeedbacks: {}, legacyFeedbacks: {}, error: logsResult.error }
        : {
            logs: Array.isArray(logsResult?.logs) ? logsResult.logs : [],
            batchFeedbacks: logsResult?.batchFeedbacks || {},
            legacyFeedbacks: logsResult?.legacyFeedbacks || {},
          },
      recentMessages: !messagesResult?.success
        ? { messages: [], error: "メッセージ取得エラー" }
        : { messages: Array.isArray(messagesResult?.messages) ? messagesResult.messages : [] },
      lastLoginInfo: loginInfo && "lastLoginDays" in loginInfo
        ? loginInfo
        : null,
      todayProgress: todayMission?.error
        ? { todayProgress: [], error: todayMission.error }
        : { todayProgress: Array.isArray(todayMission?.todayProgress) ? todayMission.todayProgress : [] },
      yesterdayProgress: yesterdayMission?.error
        ? { yesterdayProgress: [], error: yesterdayMission.error }
        : { yesterdayProgress: Array.isArray(yesterdayMission?.yesterdayProgress) ? yesterdayMission.yesterdayProgress : [] },
      calendar: calendar?.error
        ? { calendarData: {}, error: calendar.error }
        : { calendarData: calendar?.calendarData || {} },
      weeklyProgress: weeklySubject?.error
        ? { progress: [], sessionNumber: null, error: weeklySubject.error }
        : {
            progress: Array.isArray(weeklySubject?.progress) ? weeklySubject.progress : [],
            sessionNumber: typeof weeklySubject?.sessionNumber === "number" ? weeklySubject.sessionNumber : null,
          },
      reflection: reflectionStatus?.error
        ? { completed: false, error: reflectionStatus.error }
        : { completed: reflectionStatus?.reflectionCompleted || false },
      liveUpdates: liveUpdates?.error
        ? { updates: [], lastUpdateTime: null, hasUpdates: false, error: liveUpdates.error }
        : {
            updates: liveUpdates?.updates || [],
            lastUpdateTime: liveUpdates?.lastUpdateTime || null,
            hasUpdates: liveUpdates?.hasUpdates || false,
          },
      fetchedAt: Date.now(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API] Student dashboard error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
