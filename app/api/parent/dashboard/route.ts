import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getTodayStatusMessageAI,
  getStudentStreak,
  getStudentTodayMissionData,
  getStudentWeeklyProgress,
  getStudentCalendarData,
  getStudentRecentLogs,
  getStudentRecentMessages,
  checkStudentWeeklyReflection,
} from "@/app/actions/parent-dashboard"

export const dynamic = "force-dynamic"

/**
 * 保護者ダッシュボード用API Route
 * 子どもIDを受け取り、ダッシュボードに必要な全データを並列取得して返す
 * SWRのfetcher用エンドポイント
 */
export async function GET(request: NextRequest) {
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

    // 子どもIDをクエリパラメータから取得
    const { searchParams } = new URL(request.url)
    const childIdParam = searchParams.get("childId")

    if (!childIdParam) {
      return NextResponse.json(
        { error: "childId パラメータが必要です" },
        { status: 400 }
      )
    }

    const childId = parseInt(childIdParam, 10)
    if (isNaN(childId)) {
      return NextResponse.json(
        { error: "childId は数値である必要があります" },
        { status: 400 }
      )
    }

    // 保護者が子どもにアクセス権限があるか確認
    const { data: parentProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (!parentProfile || parentProfile.role !== "parent") {
      return NextResponse.json(
        { error: "保護者アカウントが必要です" },
        { status: 403 }
      )
    }

    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!parent) {
      return NextResponse.json(
        { error: "保護者情報が見つかりません" },
        { status: 404 }
      )
    }

    // 子どもとの関係を確認
    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("id")
      .eq("parent_id", parent.id)
      .eq("student_id", childId)
      .single()

    if (!relation) {
      return NextResponse.json(
        { error: "この子どもへのアクセス権限がありません" },
        { status: 403 }
      )
    }

    // 全データを並列取得
    const [
      statusMsg,
      streakResult,
      todayMission,
      weeklySubject,
      calendar,
      logsResult,
      messagesResult,
      reflectionResult,
    ] = await Promise.all([
      getTodayStatusMessageAI(childId),
      getStudentStreak(childId),
      getStudentTodayMissionData(childId),
      getStudentWeeklyProgress(childId),
      getStudentCalendarData(childId),
      getStudentRecentLogs(childId, 50),
      getStudentRecentMessages(childId, 3),
      checkStudentWeeklyReflection(childId),
    ])

    // レスポンスを構築
    const response = {
      childId,
      todayStatus: "error" in statusMsg
        ? { message: "", createdAt: null, error: statusMsg.error }
        : { message: statusMsg.message, createdAt: statusMsg.createdAt || null },
      streak: "error" in streakResult
        ? { streak: 0, maxStreak: 0, lastStudyDate: null, todayStudied: false, state: "reset", error: streakResult.error }
        : streakResult,
      todayProgress: "error" in todayMission
        ? { todayProgress: [], error: todayMission.error }
        : { todayProgress: todayMission.todayProgress },
      weeklyProgress: "error" in weeklySubject
        ? { progress: [], sessionNumber: null, error: weeklySubject.error }
        : { progress: weeklySubject.progress, sessionNumber: weeklySubject.sessionNumber },
      calendar: "error" in calendar
        ? { calendarData: {}, error: calendar.error }
        : { calendarData: calendar.calendarData },
      recentLogs: "error" in logsResult
        ? { logs: [], error: logsResult.error }
        : { logs: logsResult.logs },
      recentMessages: "error" in messagesResult
        ? { messages: [], error: messagesResult.error }
        : { messages: messagesResult.messages },
      reflection: "error" in reflectionResult
        ? { completed: false, error: reflectionResult.error }
        : { completed: reflectionResult.completed },
      fetchedAt: Date.now(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API] Parent dashboard error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
