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
