"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 保護者ダッシュボードデータ取得
 */
export async function getParentDashboardData() {
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

    // Get parent profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return { error: "プロフィール情報の取得に失敗しました" }
    }

    // Get parent record
    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (parentError || !parent) {
      return { error: "保護者情報が見つかりません" }
    }

    // Get children associated with this parent
    const { data: children, error: childrenError } = await supabase
      .from("parent_student_relations")
      .select(
        `
        student_id,
        students (
          id,
          grade,
          course,
          profiles!students_user_id_fkey (
            display_name,
            avatar_url
          )
        )
      `
      )
      .eq("parent_id", parent.id)

    if (childrenError) {
      return { error: "子ども情報の取得に失敗しました" }
    }

    return {
      profile,
      parent,
      children: children || [],
    }
  } catch (error) {
    console.error("Get parent dashboard data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 今日の様子メッセージ取得（テンプレート版）
 */
export async function getTodayStatusMessage(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Get student display name
    const { data: student } = await supabase
      .from("students")
      .select(
        `
        id,
        profiles!students_user_id_fkey (display_name)
      `
      )
      .eq("id", studentId)
      .single()

    const displayName = student?.profiles?.display_name || "お子さん"

    // Get recent logs (last 3 days)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(0, 0, 0, 0)

    const { data: recentLogs } = await supabase
      .from("study_logs")
      .select("id, correct_count, total_problems, subjects (name)")
      .eq("student_id", studentId)
      .gte("logged_at", threeDaysAgo.toISOString())

    // Generate simple template message
    let message = `今日も${displayName}さんは頑張っています！`

    if (recentLogs && recentLogs.length > 0) {
      const totalProblems = recentLogs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
      const totalCorrect = recentLogs.reduce((sum, log) => sum + (log.correct_count || 0), 0)

      if (totalProblems > 0) {
        const accuracy = Math.round((totalCorrect / totalProblems) * 100)
        message = `${displayName}さん、この3日間で${totalProblems}問に取り組み、正答率${accuracy}%です。素晴らしい努力ですね！`
      }
    }

    return { message }
  } catch (error) {
    console.error("Get today status message error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの連続学習日数を計算
 */
export async function getStudentStreak(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Get all study logs ordered by logged_at descending
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select("logged_at")
      .eq("student_id", studentId)
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
    console.error("Get student streak error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの今日のミッションデータ取得
 */
export async function getStudentTodayMissionData(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
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
        logged_at,
        reflection_text,
        subjects (name),
        study_content_types (content_name),
        study_sessions (session_number)
      `
      )
      .eq("student_id", studentId)
      .gte("logged_at", today.toISOString())
      .lte("logged_at", todayEnd.toISOString())

    if (logsError) {
      console.error("Get student today mission data error:", logsError)
      return { error: "今日のミッションデータの取得に失敗しました" }
    }

    // Aggregate by subject
    const subjectMap: {
      [key: string]: {
        totalCorrect: number
        totalProblems: number
        logs: any[]
      }
    } = {}

    todayLogs?.forEach((log) => {
      const subjectName = log.subjects?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalCorrect: 0, totalProblems: 0, logs: [] }
      }
      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0
      subjectMap[subjectName].logs.push(log)
    })

    const todayProgress = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      accuracy: data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0,
      correctCount: data.totalCorrect,
      totalProblems: data.totalProblems,
      logs: data.logs,
    }))

    return { todayProgress }
  } catch (error) {
    console.error("Get student today mission data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの週次科目別進捗取得
 */
export async function getStudentWeeklyProgress(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
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
      .eq("student_id", studentId)
      .gte("logged_at", monday.toISOString())
      .lte("logged_at", sunday.toISOString())

    if (logsError) {
      console.error("Get student weekly progress error:", logsError)
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
    console.error("Get student weekly progress error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの学習カレンダーデータ取得
 */
export async function getStudentCalendarData(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
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
      .eq("student_id", studentId)
      .gte("logged_at", sixWeeksAgo.toISOString())
      .lte("logged_at", today.toISOString())

    if (logsError) {
      console.error("Get student calendar data error:", logsError)
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
    console.error("Get student calendar data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの直近学習履歴取得
 */
export async function getStudentRecentLogs(studentId: number, limit: number = 5) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Get yesterday 0:00 to today 23:59
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        logged_at,
        correct_count,
        total_problems,
        reflection_text,
        session_id,
        subjects (name, color_code),
        study_content_types (content_name),
        study_sessions (session_number)
      `
      )
      .eq("student_id", studentId)
      .gte("logged_at", yesterday.toISOString())
      .lte("logged_at", today.toISOString())
      .order("logged_at", { ascending: false })
      .limit(limit)

    if (logsError) {
      console.error("Get student recent logs error:", logsError)
      return { error: "学習履歴の取得に失敗しました" }
    }

    return { logs: logs || [] }
  } catch (error) {
    console.error("Get student recent logs error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもへの直近応援メッセージ取得
 */
export async function getStudentRecentMessages(studentId: number, limit: number = 3) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
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
      .eq("student_id", studentId)
      .gte("sent_at", yesterday.toISOString())
      .lte("sent_at", today.toISOString())
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (messagesError) {
      console.error("Get student encouragement messages error:", messagesError)
      return { error: "応援メッセージの取得に失敗しました" }
    }

    return { messages: messages || [] }
  } catch (error) {
    console.error("Get student encouragement messages error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}
