"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 生徒ダッシュボードデータ取得
 */
export async function getStudentDashboardData() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "認証エラー" }
    }

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return { error: "プロフィール情報の取得に失敗しました" }
    }

    // Get student record
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, grade")
      .eq("user_id", user.id)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報が見つかりません" }
    }

    return {
      profile,
      student,
    }
  } catch (error) {
    console.error("Get dashboard data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * AIコーチメッセージ取得（テンプレート版）
 */
export async function getAICoachMessage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Get display name
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

    const displayName = profile?.display_name || "さん"

    // 時間帯別テンプレートメッセージ
    const hour = new Date().getHours()
    let message = ""

    if (hour >= 0 && hour < 12) {
      // 朝（0:00-11:59）
      message = `おはよう、${displayName}！今日も一緒に頑張ろう✨`
    } else if (hour >= 12 && hour < 18) {
      // 昼（12:00-17:59）
      message = `おかえり、${displayName}！今日も学習を続けよう！`
    } else {
      // 夕（18:00-23:59）
      message = `今日もお疲れさま、${displayName}！明日も一緒に頑張ろう！`
    }

    return { message }
  } catch (error) {
    console.error("Get AI coach message error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 連続学習日数を計算
 */
export async function getStudyStreak() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get all study logs ordered by logged_at descending
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select("logged_at")
      .eq("student_id", student.id)
      .order("logged_at", { ascending: false })

    if (logsError) {
      return { error: "学習ログの取得に失敗しました" }
    }

    if (!logs || logs.length === 0) {
      return { streak: 0 }
    }

    // Calculate streak
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uniqueDates = new Set<string>()
    logs.forEach((log) => {
      const date = new Date(log.logged_at)
      date.setHours(0, 0, 0, 0)
      uniqueDates.add(date.toISOString().split("T")[0])
    })

    const sortedDates = Array.from(uniqueDates).sort().reverse()

    // Check if there's a log today or yesterday
    const todayStr = today.toISOString().split("T")[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) {
      return { streak: 0 }
    }

    // Count consecutive days
    let currentDate = new Date(today)
    if (!sortedDates.includes(todayStr)) {
      currentDate = yesterday
    }

    for (const dateStr of sortedDates) {
      const checkDate = currentDate.toISOString().split("T")[0]
      if (dateStr === checkDate) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return { streak }
  } catch (error) {
    console.error("Get study streak error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 直近の学習履歴取得
 */
export async function getRecentStudyLogs(limit: number = 5) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get recent study logs with related data
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        logged_at,
        correct_count,
        total_problems,
        session_id,
        subjects (name, color_code),
        study_content_types (content_name)
      `
      )
      .eq("student_id", student.id)
      .order("logged_at", { ascending: false })
      .limit(limit)

    if (logsError) {
      console.error("Get recent study logs error:", logsError)
      return { error: "学習履歴の取得に失敗しました" }
    }

    return { logs: logs || [] }
  } catch (error) {
    console.error("Get recent study logs error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 直近の応援メッセージ取得
 */
export async function getRecentEncouragementMessages(limit: number = 3) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get yesterday 0:00 to today 23:59
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const { data: messages, error: messagesError } = await supabase
      .from("encouragement_messages")
      .select(
        `
        id,
        message,
        sent_at,
        sender_role,
        profiles!encouragement_messages_sender_id_fkey (display_name, avatar_url)
      `
      )
      .eq("student_id", student.id)
      .gte("sent_at", yesterday.toISOString())
      .lte("sent_at", today.toISOString())
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (messagesError) {
      console.error("Get encouragement messages error:", messagesError)
      return { error: "応援メッセージの取得に失敗しました" }
    }

    return { messages: messages || [] }
  } catch (error) {
    console.error("Get encouragement messages error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 今週の科目別進捗を取得（月曜開始）
 */
export async function getWeeklySubjectProgress() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get this week (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        correct_count,
        total_problems,
        subject_id,
        subjects (name, color_code)
      `
      )
      .eq("student_id", student.id)
      .gte("logged_at", monday.toISOString())
      .lte("logged_at", sunday.toISOString())

    if (logsError) {
      console.error("Get weekly subject progress error:", logsError)
      return { error: "週次進捗の取得に失敗しました" }
    }

    // Aggregate by subject
    const subjectMap: {
      [key: string]: { name: string; color_code: string; totalCorrect: number; totalProblems: number }
    } = {}

    logs?.forEach((log) => {
      const subjectName = log.subjects?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          name: subjectName,
          color_code: log.subjects?.color_code || "#3b82f6",
          totalCorrect: 0,
          totalProblems: 0,
        }
      }
      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0
    })

    const progress = Object.values(subjectMap).map((subject) => ({
      subject: subject.name,
      colorCode: subject.color_code,
      accuracy: subject.totalProblems > 0 ? Math.round((subject.totalCorrect / subject.totalProblems) * 100) : 0,
      correctCount: subject.totalCorrect,
      totalProblems: subject.totalProblems,
    }))

    return { progress }
  } catch (error) {
    console.error("Get weekly subject progress error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 6週間分の学習カレンダーデータ取得
 */
export async function getLearningCalendarData() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get last 6 weeks of data
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const sixWeeksAgo = new Date(today)
    sixWeeksAgo.setDate(today.getDate() - 42)
    sixWeeksAgo.setHours(0, 0, 0, 0)

    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        logged_at,
        correct_count,
        total_problems,
        subject_id
      `
      )
      .eq("student_id", student.id)
      .gte("logged_at", sixWeeksAgo.toISOString())
      .lte("logged_at", today.toISOString())

    if (logsError) {
      console.error("Get learning calendar data error:", logsError)
      return { error: "カレンダーデータの取得に失敗しました" }
    }

    // Aggregate by date
    const dateMap: { [key: string]: { subjectCount: number; accuracy80Count: number } } = {}

    logs?.forEach((log) => {
      const date = new Date(log.logged_at)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split("T")[0]

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { subjectCount: 0, accuracy80Count: 0 }
      }

      dateMap[dateStr].subjectCount += 1

      const accuracy = log.total_problems > 0 ? (log.correct_count / log.total_problems) * 100 : 0
      if (accuracy >= 80) {
        dateMap[dateStr].accuracy80Count += 1
      }
    })

    return { calendarData: dateMap }
  } catch (error) {
    console.error("Get learning calendar data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 今日のミッションデータ取得
 */
export async function getTodayMissionData() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get today's logs
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const { data: todayLogs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        correct_count,
        total_problems,
        subjects (name)
      `
      )
      .eq("student_id", student.id)
      .gte("logged_at", today.toISOString())
      .lte("logged_at", todayEnd.toISOString())

    if (logsError) {
      console.error("Get today mission data error:", logsError)
      return { error: "今日のミッションデータの取得に失敗しました" }
    }

    // Aggregate by subject
    const subjectMap: { [key: string]: { totalCorrect: number; totalProblems: number } } = {}

    todayLogs?.forEach((log) => {
      const subjectName = log.subjects?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalCorrect: 0, totalProblems: 0 }
      }
      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0
    })

    const todayProgress = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      accuracy: data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0,
      correctCount: data.totalCorrect,
      totalProblems: data.totalProblems,
    }))

    return { todayProgress }
  } catch (error) {
    console.error("Get today mission data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 最終ログイン日時を取得
 */
export async function getLastLoginInfo() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Get user's last sign in from auth metadata
    const lastSignIn = user.last_sign_in_at

    if (!lastSignIn) {
      return { lastLoginDays: null, isFirstTime: true }
    }

    const lastSignInDate = new Date(lastSignIn)
    const now = new Date()
    const diffMs = now.getTime() - lastSignInDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffHours / 24)

    return {
      lastLoginDays: diffDays,
      lastLoginHours: diffHours,
      isFirstTime: false,
    }
  } catch (error) {
    console.error("Get last login info error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}
