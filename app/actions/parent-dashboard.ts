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
      .from("parent_child_relations")
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

    const profiles = Array.isArray(student?.profiles) ? student?.profiles[0] : student?.profiles
    const displayName = profiles?.display_name || "お子さん"

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
 * 今日の様子メッセージ取得（AI生成版）
 */
export async function getTodayStatusMessageAI(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(
        `
        id,
        grade,
        course,
        profiles!students_user_id_fkey (display_name)
      `
      )
      .eq("id", studentId)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報の取得に失敗しました" }
    }

    const profiles = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
    const displayName = profiles?.display_name || "お子さん"

    // Get today's logs
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const { data: todayLogs } = await supabase
      .from("study_logs")
      .select(
        `
        correct_count,
        total_problems,
        logged_at,
        subjects (name),
        study_content_types (content_name)
      `
      )
      .eq("student_id", studentId)
      .gte("logged_at", today.toISOString())
      .lte("logged_at", todayEnd.toISOString())
      .order("logged_at", { ascending: true })

    // Get study streak
    const { streak } = await getStudentStreak(studentId)

    // Get weekly trend
    const oneWeekAgo = new Date(today)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const { data: thisWeekLogs } = await supabase
      .from("study_logs")
      .select("correct_count, total_problems")
      .eq("student_id", studentId)
      .gte("logged_at", oneWeekAgo.toISOString())
      .lt("logged_at", today.toISOString())

    const { data: lastWeekLogs } = await supabase
      .from("study_logs")
      .select("correct_count, total_problems")
      .eq("student_id", studentId)
      .gte("logged_at", twoWeeksAgo.toISOString())
      .lt("logged_at", oneWeekAgo.toISOString())

    let weeklyTrend: "improving" | "stable" | "declining" | "none" = "none"
    if (thisWeekLogs && thisWeekLogs.length > 0 && lastWeekLogs && lastWeekLogs.length > 0) {
      const thisWeekAccuracy =
        thisWeekLogs.reduce((sum, log) => sum + log.correct_count, 0) /
        thisWeekLogs.reduce((sum, log) => sum + log.total_problems, 0)
      const lastWeekAccuracy =
        lastWeekLogs.reduce((sum, log) => sum + log.correct_count, 0) /
        lastWeekLogs.reduce((sum, log) => sum + log.total_problems, 0)

      const diff = (thisWeekAccuracy - lastWeekAccuracy) * 100
      if (diff >= 10) {
        weeklyTrend = "improving"
      } else if (diff <= -10) {
        weeklyTrend = "declining"
      } else {
        weeklyTrend = "stable"
      }
    }

    // Get recent reflection
    const { data: recentReflection } = await supabase
      .from("reflect_sessions")
      .select("summary")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get upcoming test
    const { data: upcomingTest } = await supabase
      .from("test_schedules")
      .select(
        `
        test_date,
        test_types!inner (name, grade)
      `
      )
      .eq("test_types.grade", student.grade)
      .gt("test_date", today.toISOString())
      .order("test_date", { ascending: true })
      .limit(1)
      .maybeSingle()

    // Format context for AI
    const context: import("@/lib/openai/daily-status").DailyStatusContext = {
      studentName: displayName,
      grade: student.grade,
      course: student.course,
      todayLogs:
        todayLogs?.map((log) => {
          const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
          const content = Array.isArray(log.study_content_types)
            ? log.study_content_types[0]
            : log.study_content_types
          const logDate = new Date(log.logged_at)
          return {
            subject: subject?.name || "不明",
            content: content?.content_name || "不明",
            correct: log.correct_count,
            total: log.total_problems,
            accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
            time: `${logDate.getHours()}:${String(logDate.getMinutes()).padStart(2, "0")}`,
          }
        }) || [],
      studyStreak: streak || 0,
      weeklyTrend,
      recentReflection: recentReflection?.summary,
      upcomingTest: upcomingTest
        ? {
            name: (Array.isArray(upcomingTest.test_types)
              ? upcomingTest.test_types[0]
              : upcomingTest.test_types
            )?.name || "テスト",
            date: new Date(upcomingTest.test_date).toLocaleDateString("ja-JP"),
            daysUntil: Math.ceil(
              (new Date(upcomingTest.test_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            ),
          }
        : undefined,
    }

    // Generate AI message
    const { generateDailyStatusMessage } = await import("@/lib/openai/daily-status")
    const result = await generateDailyStatusMessage(context)

    if (!result.success) {
      console.error("AI generation failed, falling back to template")
      // Fallback to template version
      return getTodayStatusMessage(studentId)
    }

    return { message: result.message }
  } catch (error) {
    console.error("Get today status message AI error:", error)
    // Fallback to template version
    return getTodayStatusMessage(studentId)
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
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
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
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          name: subjectName,
          color_code: subject?.color_code || "#3b82f6",
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
        sender_id
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

    // 送信者情報を別途取得（RPC経由で安全に取得）
    if (!messages || messages.length === 0) {
      return { messages: [] }
    }

    const senderIds = messages.map((msg: any) => msg.sender_id)
    const { data: senderProfiles, error: senderError } = await supabase.rpc("get_sender_profiles", {
      sender_ids: senderIds,
    })

    if (senderError) {
      console.error("Error fetching sender profiles:", senderError)
      // フォールバック: 送信者情報なしで返す
      return {
        messages: messages.map((msg: any) => ({
          ...msg,
          profiles: { display_name: "不明", avatar_url: null },
        })),
      }
    }

    // 送信者情報をマージ
    const messagesWithSender = messages.map((msg: any) => {
      const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)
      return {
        ...msg,
        profiles: senderProfile || { display_name: "不明", avatar_url: null },
      }
    })

    return { messages: messagesWithSender }
  } catch (error) {
    console.error("Get student encouragement messages error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}
