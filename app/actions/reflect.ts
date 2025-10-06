"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 週次振り返りが利用可能かチェック
 * 土曜12:00 〜 水曜23:59のみ利用可能
 */
export async function checkReflectAvailability() {
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))

  const dayOfWeek = tokyoNow.getDay() // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  const hours = tokyoNow.getHours()

  // 土曜12:00以降
  const isSaturdayAfterNoon = dayOfWeek === 6 && hours >= 12
  // 日曜終日
  const isSunday = dayOfWeek === 0
  // 月曜〜水曜終日
  const isMondayToWednesday = dayOfWeek >= 1 && dayOfWeek <= 3

  const isAvailable = isSaturdayAfterNoon || isSunday || isMondayToWednesday

  return {
    isAvailable,
    currentDay: ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek],
    currentTime: `${hours}:${String(tokyoNow.getMinutes()).padStart(2, '0')}`,
  }
}

/**
 * 週タイプを判定
 * 成長週: 正答率+10%以上
 * 安定週: 正答率±10%以内
 * 挑戦週: 正答率-10%以上
 * 特別週: 大きなテスト直前
 */
export async function determineWeekType() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 今週と先週の学習ログを取得
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))

  // 今週の月曜日
  const thisMonday = new Date(tokyoNow)
  thisMonday.setDate(tokyoNow.getDate() - ((tokyoNow.getDay() + 6) % 7))
  thisMonday.setHours(0, 0, 0, 0)

  // 先週の月曜日
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)

  // 先週の日曜日
  const lastSunday = new Date(thisMonday)
  lastSunday.setDate(lastSunday.getDate() - 1)
  lastSunday.setHours(23, 59, 59, 999)

  // 今週のデータ
  const { data: thisWeekLogs } = await supabase
    .from("study_logs")
    .select("total_questions, correct_answers")
    .eq("student_id", student.id)
    .gte("study_date", thisMonday.toISOString())

  // 先週のデータ
  const { data: lastWeekLogs } = await supabase
    .from("study_logs")
    .select("total_questions, correct_answers")
    .eq("student_id", student.id)
    .gte("study_date", lastMonday.toISOString())
    .lte("study_date", lastSunday.toISOString())

  // 正答率を計算
  const calculateAccuracy = (logs: any[] | null) => {
    if (!logs || logs.length === 0) return 0
    const total = logs.reduce((sum, log) => sum + (log.total_questions || 0), 0)
    const correct = logs.reduce((sum, log) => sum + (log.correct_answers || 0), 0)
    return total > 0 ? (correct / total) * 100 : 0
  }

  const thisWeekAccuracy = calculateAccuracy(thisWeekLogs)
  const lastWeekAccuracy = calculateAccuracy(lastWeekLogs)
  const accuracyDiff = thisWeekAccuracy - lastWeekAccuracy

  // テスト日程をチェック（特別週判定）
  const nextWeek = new Date(thisMonday)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const { data: upcomingTests } = await supabase
    .from("test_schedules")
    .select("test_date, test_types(name)")
    .gte("test_date", thisMonday.toISOString())
    .lte("test_date", nextWeek.toISOString())

  const hasUpcomingTest = upcomingTests && upcomingTests.length > 0

  let weekType: "growth" | "stable" | "challenge" | "special"

  if (hasUpcomingTest) {
    weekType = "special"
  } else if (accuracyDiff >= 10) {
    weekType = "growth"
  } else if (accuracyDiff <= -10) {
    weekType = "challenge"
  } else {
    weekType = "stable"
  }

  return {
    weekType,
    thisWeekAccuracy: Math.round(thisWeekAccuracy),
    lastWeekAccuracy: Math.round(lastWeekAccuracy),
    accuracyDiff: Math.round(accuracyDiff),
    upcomingTest: hasUpcomingTest ? upcomingTests[0] : null,
  }
}

/**
 * コーチングセッションを開始
 */
export async function startCoachingSession(weekType: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 今週のセッションが既に存在するかチェック
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  const thisMonday = new Date(tokyoNow)
  thisMonday.setDate(tokyoNow.getDate() - ((tokyoNow.getDay() + 6) % 7))
  thisMonday.setHours(0, 0, 0, 0)

  const { data: existingSession } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("student_id", student.id)
    .gte("session_date", thisMonday.toISOString())
    .maybeSingle()

  if (existingSession) {
    return { sessionId: existingSession.id, isNew: false }
  }

  // 新規セッション作成
  const { data: newSession, error } = await supabase
    .from("coaching_sessions")
    .insert({
      student_id: student.id,
      session_date: tokyoNow.toISOString(),
      session_type: "weekly_reflection",
      week_type: weekType,
      status: "in_progress",
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { sessionId: newSession.id, isNew: true }
}

/**
 * コーチングメッセージを保存
 */
export async function saveCoachingMessage(
  sessionId: string,
  role: "assistant" | "user",
  content: string,
  turnNumber: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("coaching_messages")
    .insert({
      session_id: sessionId,
      message_role: role,
      message_content: content,
      turn_number: turnNumber,
    })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * コーチングセッションを完了
 */
export async function completeCoachingSession(sessionId: string, summary: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("coaching_sessions")
    .update({
      status: "completed",
      summary_text: summary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * 過去のコーチングセッション一覧を取得
 */
export async function getCoachingSessions() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  const { data: sessions, error } = await supabase
    .from("coaching_sessions")
    .select(`
      id,
      session_date,
      session_type,
      week_type,
      status,
      summary_text,
      coaching_messages (
        message_role,
        message_content,
        turn_number
      )
    `)
    .eq("student_id", student.id)
    .order("session_date", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { sessions }
}
