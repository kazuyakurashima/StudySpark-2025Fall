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
 * AIコーチメッセージ取得（AI生成版 + キャッシュ）
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

    // 生徒情報取得
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, grade, course")
      .eq("user_id", user.id)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // プロフィール取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()

    const displayName = profile?.display_name || "さん"

    // キャッシュキー生成（日付ベース）
    const today = new Date()
    const dateStr = today.toISOString().split("T")[0] // YYYY-MM-DD
    const cacheKey = `daily_coach_${student.id}_${dateStr}`

    // キャッシュチェック
    const { data: cached } = await supabase
      .from("ai_cache")
      .select("cached_content, hit_count")
      .eq("cache_key", cacheKey)
      .eq("cache_type", "coach_message")
      .single()

    if (cached) {
      // キャッシュヒット - ヒットカウント更新
      await supabase
        .from("ai_cache")
        .update({
          hit_count: cached.hit_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("cache_key", cacheKey)

      const message = JSON.parse(cached.cached_content) as string
      console.log(`[Coach Message] Cache HIT: ${cacheKey}`)
      return { message }
    }

    // キャッシュミス - AI生成
    console.log(`[Coach Message] Cache MISS: ${cacheKey}, generating...`)

    // データ収集
    const [willData, logsData, streakData, testData] = await Promise.all([
      getLatestWillAndGoalForCoach(student.id),
      getRecentStudyLogsForCoach(student.id, 3),
      getStudyStreak(),
      getUpcomingTestForCoach(student.id),
    ])

    // AI生成（動的インポート）
    const { generateCoachMessage } = await import("@/lib/openai/coach-message")
    type CoachMessageContext = Awaited<ReturnType<typeof import("@/lib/openai/coach-message")>>["CoachMessageContext"]

    const context: any = {
      studentId: student.id,
      studentName: displayName,
      grade: student.grade,
      course: student.course,
      latestWill: willData?.will,
      latestGoal: willData?.goal,
      recentLogs: logsData || [],
      upcomingTest: testData || undefined,
      studyStreak: typeof streakData?.streak === "number" ? streakData.streak : 0,
    }

    const result = await generateCoachMessage(context)

    if (!result.success) {
      // AI生成失敗 → フォールバック（テンプレート）
      console.warn(`[Coach Message] AI generation failed: ${result.error}`)
      return { message: getTemplateMessage(displayName) }
    }

    // キャッシュ保存
    await supabase.from("ai_cache").insert({
      cache_key: cacheKey,
      cache_type: "coach_message",
      cached_content: JSON.stringify(result.message),
    })

    console.log(`[Coach Message] AI generated and cached: ${cacheKey}`)
    return { message: result.message }
  } catch (error) {
    console.error("Get AI coach message error:", error)

    // エラー時フォールバック
    const { data: profile } = await (await createClient())
      .from("profiles")
      .select("display_name")
      .eq("id", (await (await createClient()).auth.getUser()).data.user?.id || "")
      .single()

    return { message: getTemplateMessage(profile?.display_name || "さん") }
  }
}

/**
 * テンプレートメッセージ（フォールバック用）
 */
function getTemplateMessage(displayName: string): string {
  const hour = new Date().getHours()

  if (hour >= 0 && hour < 12) {
    return `おはよう、${displayName}！今日も一緒に頑張ろう✨`
  } else if (hour >= 12 && hour < 18) {
    return `おかえり、${displayName}！今日も学習を続けよう！`
  } else {
    return `今日もお疲れさま、${displayName}！明日も一緒に頑張ろう！`
  }
}

/**
 * 最新のWillとGoalを取得（AIコーチメッセージ用）
 */
async function getLatestWillAndGoalForCoach(studentId: string): Promise<{ will?: string; goal?: string } | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("weekly_analysis")
    .select("growth_areas, challenges")
    .eq("student_id", studentId)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  // growth_areasとchallengesからWill/Goal抽出（簡易版）
  return {
    will: data.growth_areas || undefined,
    goal: data.challenges || undefined,
  }
}

/**
 * 直近N日の学習ログ取得（AIコーチメッセージ用）
 */
async function getRecentStudyLogsForCoach(studentId: string, days: number = 3) {
  const supabase = await createClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data: logs } = await supabase
    .from("study_logs")
    .select(`
      correct_count,
      total_problems,
      study_date,
      subjects (name),
      study_content_types (content_name)
    `)
    .eq("student_id", studentId)
    .gte("study_date", cutoffDate.toISOString().split("T")[0])
    .order("study_date", { ascending: false })
    .limit(20)

  if (!logs || logs.length === 0) return []

  return logs.map((log: any) => ({
    subject: log.subjects?.name || "不明",
    content: log.study_content_types?.content_name || "",
    correct: log.correct_count || 0,
    total: log.total_problems || 0,
    accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
    date: log.study_date || "",
  }))
}

/**
 * 近日のテスト情報取得（AIコーチメッセージ用）
 */
async function getUpcomingTestForCoach(studentId: string) {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]

  const { data: test } = await supabase
    .from("test_goals")
    .select(`
      test_date,
      test_types (name)
    `)
    .eq("student_id", studentId)
    .gte("test_date", today)
    .order("test_date", { ascending: true })
    .limit(1)
    .single()

  if (!test) return null

  const testDate = new Date(test.test_date)
  const todayDate = new Date(today)
  const daysUntil = Math.ceil((testDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

  return {
    name: (test as any).test_types?.name || "テスト",
    date: test.test_date,
    daysUntil,
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
 * 直近の学習履歴取得（昨日0:00〜今日23:59）
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

    // Get recent study logs with related data (no date filtering, just order by study_date)
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        logged_at,
        study_date,
        correct_count,
        total_problems,
        reflection_text,
        session_id,
        subjects (name, color_code),
        study_content_types (content_name),
        study_sessions (session_number, start_date, end_date)
      `
      )
      .eq("student_id", student.id)
      .order("study_date", { ascending: false })
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
        sender_id
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
        study_content_type_id,
        subjects (name, color_code),
        study_content_types (content_name)
      `
      )
      .eq("student_id", student.id)
      .gte("logged_at", monday.toISOString())
      .lte("logged_at", sunday.toISOString())

    if (logsError) {
      console.error("Get weekly subject progress error:", logsError)
      return { error: "週次進捗の取得に失敗しました" }
    }

    // Aggregate by subject with content details
    const subjectMap: {
      [key: string]: {
        name: string
        color_code: string
        totalCorrect: number
        totalProblems: number
        contentDetails: { [contentName: string]: { correct: number; total: number } }
      }
    } = {}

    logs?.forEach((log) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
      const contentType = Array.isArray(log.study_content_types) ? log.study_content_types[0] : log.study_content_types
      const contentName = contentType?.content_name || "その他"

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          name: subjectName,
          color_code: subject?.color_code || "#3b82f6",
          totalCorrect: 0,
          totalProblems: 0,
          contentDetails: {}
        }
      }

      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0

      // Track by content type
      if (!subjectMap[subjectName].contentDetails[contentName]) {
        subjectMap[subjectName].contentDetails[contentName] = { correct: 0, total: 0 }
      }
      subjectMap[subjectName].contentDetails[contentName].correct += log.correct_count || 0
      subjectMap[subjectName].contentDetails[contentName].total += log.total_problems || 0
    })

    const progress = Object.values(subjectMap).map((subject) => ({
      subject: subject.name,
      colorCode: subject.color_code,
      accuracy: subject.totalProblems > 0 ? Math.round((subject.totalCorrect / subject.totalProblems) * 100) : 0,
      correctCount: subject.totalCorrect,
      totalProblems: subject.totalProblems,
      details: Object.entries(subject.contentDetails).map(([content, data]) => ({
        content,
        correct: data.correct,
        total: data.total,
        remaining: data.total - data.correct
      }))
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
    const subjectMap: { [key: string]: { totalCorrect: number; totalProblems: number; logCount: number } } = {}

    todayLogs?.forEach((log) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalCorrect: 0, totalProblems: 0, logCount: 0 }
      }
      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0
      subjectMap[subjectName].logCount += 1 // 入力回数をカウント
    })

    const todayProgress = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      accuracy: data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0,
      correctCount: data.totalCorrect,
      totalProblems: data.totalProblems,
      logCount: data.logCount, // 入力回数を追加
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
