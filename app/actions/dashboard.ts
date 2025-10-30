"use server"

import { createClient } from "@/lib/supabase/server"

function isMissingTable(error: { code?: string; message?: string } | null | undefined, tableName: string) {
  if (!error) return false
  if (error.code === "42P01") return true
  // PostgreSQLは "relation \"study_logs\" does not exist" または "relation \"public.study_logs\" does not exist" を返す可能性がある
  // スキーマプレフィックスを除いたテーブル名で比較
  const tableNameOnly = tableName.replace(/^public\./, '')
  return typeof error.message === "string" && (
    error.message.includes(`relation "${tableNameOnly}" does not exist`) ||
    error.message.includes(`relation "${tableName}" does not exist`)
  )
}

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

    // キャッシュキー生成（日付ベース - JST基準）
    const { getTodayJST, getNowJST } = await import("@/lib/utils/date-jst")
    const dateStr = getTodayJST() // YYYY-MM-DD in JST
    const cacheKey = `daily_coach_${student.id}_${dateStr}`

    // キャッシュチェック
    const { data: cached } = await supabase
      .from("ai_cache")
      .select("cached_content, hit_count, created_at")
      .eq("cache_key", cacheKey)
      .eq("cache_type", "coach_message")
      .single()

    if (cached) {
      // キャッシュヒット - ヒットカウント更新
      await supabase
        .from("ai_cache")
        .update({
          hit_count: cached.hit_count + 1,
          last_accessed_at: getNowJST().toISOString(),
        })
        .eq("cache_key", cacheKey)

      const message = JSON.parse(cached.cached_content) as string
      console.log(`[Coach Message] Cache HIT: ${cacheKey}`)
      return { message, createdAt: cached.created_at }
    }

    // キャッシュミス - AI生成
    console.log(`[Coach Message] Cache MISS: ${cacheKey}, generating...`)

    // データ収集
    const [willData, logsData, streakData, testData, missionData] = await Promise.all([
      getLatestWillAndGoalForCoach(student.id),
      getRecentStudyLogsForCoach(student.id, 3),
      getStudyStreak(),
      getUpcomingTestForCoach(student.id),
      getTodayMissionForCoach(student.id),
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
      todayMission: missionData || undefined,
    }

    const result = await generateCoachMessage(context)

    if (!result.success) {
      // AI生成失敗 → フォールバック（テンプレート）
      console.warn(`[Coach Message] AI generation failed: ${result.error}`)
      return { message: getTemplateMessage(displayName) }
    }

    // キャッシュ保存
    const now = getNowJST().toISOString()
    await supabase.from("ai_cache").insert({
      cache_key: cacheKey,
      cache_type: "coach_message",
      cached_content: JSON.stringify(result.message),
      created_at: now,
    })

    console.log(`[Coach Message] AI generated and cached: ${cacheKey}`)
    return { message: result.message, createdAt: now }
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
  const { getTodayJST, getYesterdayJST, getDaysAgoJST } = await import("@/lib/utils/date-jst")

  // 今日、昨日、一昨日の日付を取得（JST基準）
  const todayStr = getTodayJST()
  const yesterdayStr = getYesterdayJST()
  const dayBeforeYesterdayStr = getDaysAgoJST(2)

  console.log("🔍 [Coach Logs] Fetching logs for:", {
    studentId,
    today: todayStr,
    yesterday: yesterdayStr,
    dayBeforeYesterday: dayBeforeYesterdayStr,
  })

  const { data: logs, error } = await supabase
    .from("study_logs")
    .select(`
      study_date,
      correct_count,
      total_problems,
      logged_at,
      subjects (name),
      study_content_types (content_name)
    `)
    .eq("student_id", studentId)
    .gte("study_date", dayBeforeYesterdayStr)
    .lte("study_date", todayStr)
    .order("study_date", { ascending: false })
    .order("logged_at", { ascending: false })

  if (error) {
    console.error("🔍 [Coach Logs] Query error:", error)
    if (isMissingTable(error, "public.study_logs")) {
      return { today: [], yesterday: [], dayBeforeYesterday: [] }
    }
    return { today: [], yesterday: [], dayBeforeYesterday: [] }
  }

  console.log("🔍 [Coach Logs] Query result:", {
    count: logs?.length,
  })

  if (!logs || logs.length === 0) {
    console.log("🔍 [Coach Logs] No logs found")
    return { today: [], yesterday: [], dayBeforeYesterday: [] }
  }

  // 日別に分類（study_dateを使用）
  const todayLogs: any[] = []
  const yesterdayLogs: any[] = []
  const dayBeforeYesterdayLogs: any[] = []

  logs.forEach((log: any) => {
    const mappedLog = {
      subject: log.subjects?.name || "不明",
      content: log.study_content_types?.content_name || "",
      date: log.study_date,
      correct: log.correct_count || 0,
      total: log.total_problems || 0,
      accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
    }

    // study_dateで分類（すでにJST基準の日付）
    if (log.study_date === todayStr) {
      todayLogs.push(mappedLog)
    } else if (log.study_date === yesterdayStr) {
      yesterdayLogs.push(mappedLog)
    } else if (log.study_date === dayBeforeYesterdayStr) {
      dayBeforeYesterdayLogs.push(mappedLog)
    }
  })

  console.log("🔍 [Coach Logs] Logs by day:", {
    today: todayLogs.length,
    yesterday: yesterdayLogs.length,
    dayBeforeYesterday: dayBeforeYesterdayLogs.length,
  })

  return {
    today: todayLogs,
    yesterday: yesterdayLogs,
    dayBeforeYesterday: dayBeforeYesterdayLogs,
  }
}

/**
 * 近日のテスト情報取得（AIコーチメッセージ用）
 */
async function getUpcomingTestForCoach(studentId: string) {
  const supabase = await createClient()
  const { getTodayJST, getDaysDifference } = await import("@/lib/utils/date-jst")

  const today = getTodayJST()

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

  const daysUntil = getDaysDifference(today, test.test_date)

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

    // Get all study logs ordered by study_date descending
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select("study_date")
      .eq("student_id", student.id)
      .order("study_date", { ascending: false })

    if (logsError) {
      if (isMissingTable(logsError, "public.study_logs")) {
        return { streak: 0 }
      }
      return { error: "学習ログの取得に失敗しました" }
    }

    if (!logs || logs.length === 0) {
      return { streak: 0 }
    }

    // Calculate streak using JST dates
    const { getTodayJST, getYesterdayJST, getDateJST } = await import("@/lib/utils/date-jst")
    let streak = 0
    const todayStr = getTodayJST()
    const yesterdayStr = getYesterdayJST()

    const uniqueDates = new Set<string>()
    logs.forEach((log) => {
      uniqueDates.add(log.study_date)
    })

    const sortedDates = Array.from(uniqueDates).sort().reverse()

    // Check if there's a log today or yesterday
    if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) {
      return { streak: 0 }
    }

    // Count consecutive days
    const currentDateStr = sortedDates.includes(todayStr) ? todayStr : yesterdayStr
    let dayOffset = 0

    for (const dateStr of sortedDates) {
      const expectedDate = getDateJST(dayOffset)
      if (dateStr === expectedDate) {
        streak++
        dayOffset--
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
      if (isMissingTable(logsError, "public.study_logs")) {
        return { logs: [] }
      }
      return { error: "学習履歴の取得に失敗しました" }
    }

    return { logs: logs || [] }
  } catch (error) {
    console.error("Get recent study logs error:", error)
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

    const { data: student } = await supabase.from("students").select("id, grade").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get current date in Tokyo timezone (YYYY-MM-DD format)
    const now = new Date()
    // Use Intl.DateTimeFormat to get date parts in Tokyo timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const todayStr = formatter.format(now) // Returns YYYY-MM-DD

    console.log("🔍 [SERVER] Weekly progress - Today (JST):", todayStr)
    console.log("🔍 [SERVER] Weekly progress - Student grade:", student.grade)

    // Find this week's study session
    const { data: currentSession, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id, session_number, start_date, end_date")
      .eq("grade", student.grade)
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .single()

    console.log("🔍 [SERVER] Weekly progress - Current session:", JSON.stringify(currentSession, null, 2))
    console.log("🔍 [SERVER] Weekly progress - Session error:", sessionError)

    if (sessionError || !currentSession) {
      console.error("No current session found:", sessionError)
      return { progress: [] }
    }

    // Get all logs for this student in this session
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        correct_count,
        total_problems,
        subject_id,
        study_content_type_id,
        logged_at,
        subjects (name, color_code),
        study_content_types (id, content_name)
      `
      )
      .eq("student_id", student.id)
      .eq("session_id", currentSession.id)
      .order("logged_at", { ascending: false })

    if (logsError) {
      console.error("Get weekly subject progress error:", logsError)
      if (isMissingTable(logsError, "public.study_logs")) {
        return { progress: [], sessionNumber: currentSession.session_number }
      }
      return { error: "週次進捗の取得に失敗しました" }
    }

    // Get problem counts for this session (with content name for mapping)
    const { data: problemCounts, error: problemCountsError } = await supabase
      .from("problem_counts")
      .select(`
        study_content_type_id,
        total_problems,
        study_content_types!inner (
          content_name,
          subjects!inner (
            id
          )
        )
      `)
      .eq("session_id", currentSession.id)

    if (problemCountsError) {
      console.error("Get problem counts error:", problemCountsError)
      return { error: "問題数の取得に失敗しました" }
    }

    // Create a map of subject_id + content_name -> total_problems
    const problemCountMap = new Map<string, number>()
    problemCounts?.forEach((pc) => {
      const contentType = Array.isArray(pc.study_content_types) ? pc.study_content_types[0] : pc.study_content_types
      const subject = Array.isArray(contentType?.subjects) ? contentType.subjects[0] : contentType?.subjects
      const key = `${subject?.id}_${contentType?.content_name}`
      // Only set if not already set (all courses have same problem count)
      if (!problemCountMap.has(key)) {
        problemCountMap.set(key, pc.total_problems)
      }
    })

    // Group logs by subject and content name (ignoring course), keeping only the latest log for each combination
    const latestLogsMap = new Map<string, typeof logs[0]>()

    logs?.forEach((log) => {
      const contentType = Array.isArray(log.study_content_types) ? log.study_content_types[0] : log.study_content_types
      const contentName = contentType?.content_name || "その他"
      const key = `${log.subject_id}_${contentName}`

      // Since logs are already ordered by logged_at DESC, first occurrence is the latest
      if (!latestLogsMap.has(key)) {
        latestLogsMap.set(key, log)
      }
    })

    // Aggregate by subject
    const subjectMap: {
      [key: string]: {
        name: string
        color_code: string
        totalCorrect: number
        totalProblems: number
        contentDetails: { [contentName: string]: { correct: number; total: number } }
      }
    } = {}

    latestLogsMap.forEach((log) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
      const subjectId = subject?.id
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

      // Use problem count from problem_counts table (by subject_id + content_name)
      const problemCountKey = `${subjectId}_${contentName}`
      const totalProblems = problemCountMap.get(problemCountKey) || log.total_problems || 0

      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += totalProblems

      // Track by content type
      if (!subjectMap[subjectName].contentDetails[contentName]) {
        subjectMap[subjectName].contentDetails[contentName] = { correct: 0, total: 0 }
      }
      subjectMap[subjectName].contentDetails[contentName].correct += log.correct_count || 0
      subjectMap[subjectName].contentDetails[contentName].total += totalProblems
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

    return { progress, sessionNumber: currentSession.session_number }
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
    const { getTodayJST, getDaysAgoJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()
    const sixWeeksAgoStr = getDaysAgoJST(42)

    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(
        `
        id,
        study_date,
        correct_count,
        total_problems,
        subject_id
      `
      )
      .eq("student_id", student.id)
      .gte("study_date", sixWeeksAgoStr)
      .lte("study_date", todayStr)

    if (logsError) {
      console.error("Get learning calendar data error:", logsError)
      if (isMissingTable(logsError, "public.study_logs")) {
        return { calendarData: {} }
      }
      return { error: "カレンダーデータの取得に失敗しました" }
    }

    // Aggregate by date (using study_date which is already in JST)
    const dateMap: { [key: string]: { subjectCount: number; accuracy80Count: number } } = {}

    logs?.forEach((log) => {
      const dateStr = log.study_date

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

    const { data: student } = await supabase.from("students").select("id, grade").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get today's date and current session
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const todayDateStr = getTodayJST()

    // Find this week's study session
    const { data: currentSession, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("grade", student.grade)
      .lte("start_date", todayDateStr)
      .gte("end_date", todayDateStr)
      .single()

    if (sessionError || !currentSession) {
      console.error("No current session found for today's mission:", sessionError)
      return { todayProgress: [] }
    }

    // Get today's logs for this week's session only
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
      .eq("session_id", currentSession.id)
      .eq("study_date", todayDateStr)

    if (logsError) {
      console.error("Get today mission data error:", logsError)
      if (isMissingTable(logsError, "public.study_logs")) {
        return { todayProgress: [] }
      }
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
 * 昨日のミッションデータを取得（diff計算用）
 */
export async function getYesterdayMissionData() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    const { data: student } = await supabase.from("students").select("id, grade").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get yesterday's date and current session
    const { getYesterdayJST, getTodayJST } = await import("@/lib/utils/date-jst")
    const yesterdayDateStr = getYesterdayJST()
    const todayDateStr = getTodayJST()

    // Find this week's study session
    const { data: currentSession, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("grade", student.grade)
      .lte("start_date", todayDateStr)
      .gte("end_date", todayDateStr)
      .single()

    if (sessionError || !currentSession) {
      return { yesterdayProgress: [] }
    }

    // Get yesterday's logs for this week's session only
    const { data: yesterdayLogs, error: logsError } = await supabase
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
      .eq("session_id", currentSession.id)
      .eq("study_date", yesterdayDateStr)

    if (logsError) {
      console.error("Get yesterday mission data error:", logsError)
      return { yesterdayProgress: [] }
    }

    // Aggregate by subject
    const subjectMap: { [key: string]: { totalCorrect: number; totalProblems: number } } = {}

    yesterdayLogs?.forEach((log) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalCorrect: 0, totalProblems: 0 }
      }
      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0
    })

    const yesterdayProgress = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      accuracy: data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0,
      correctCount: data.totalCorrect,
      totalProblems: data.totalProblems,
    }))

    return { yesterdayProgress }
  } catch (error) {
    console.error("Get yesterday mission data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * AIコーチメッセージのライブ更新データを取得
 * 今日 vs 昨日の科目別進捗を比較
 */
export async function getLiveUpdateData() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー", updates: [] }
    }

    const { data: student } = await supabase.from("students").select("id, grade").eq("user_id", user.id).single()

    if (!student) {
      return { error: "生徒情報が見つかりません", updates: [] }
    }

    // Get today's and yesterday's dates
    const { getTodayJST, getYesterdayJST } = await import("@/lib/utils/date-jst")
    const todayDateStr = getTodayJST()
    const yesterdayDateStr = getYesterdayJST()

    // Find this week's study session
    const { data: currentSession } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("grade", student.grade)
      .lte("start_date", todayDateStr)
      .gte("end_date", todayDateStr)
      .single()

    if (!currentSession) {
      return { error: "今週のセッションが見つかりません", updates: [] }
    }

    // Get today's logs
    const { data: todayLogs } = await supabase
      .from("study_logs")
      .select(`
        id,
        correct_count,
        total_problems,
        subjects (name)
      `)
      .eq("student_id", student.id)
      .eq("session_id", currentSession.id)
      .eq("study_date", todayDateStr)

    // Get yesterday's logs
    const { data: yesterdayLogs } = await supabase
      .from("study_logs")
      .select(`
        id,
        correct_count,
        total_problems,
        subjects (name)
      `)
      .eq("student_id", student.id)
      .eq("session_id", currentSession.id)
      .eq("study_date", yesterdayDateStr)

    // Aggregate by subject
    const todayBySubject: { [key: string]: { correct: number; total: number } } = {}
    const yesterdayBySubject: { [key: string]: { correct: number; total: number } } = {}

    todayLogs?.forEach((log: any) => {
      const subject = log.subjects?.name
      if (!subject) return
      if (!todayBySubject[subject]) {
        todayBySubject[subject] = { correct: 0, total: 0 }
      }
      todayBySubject[subject].correct += log.correct_count || 0
      todayBySubject[subject].total += log.total_problems || 0
    })

    yesterdayLogs?.forEach((log: any) => {
      const subject = log.subjects?.name
      if (!subject) return
      if (!yesterdayBySubject[subject]) {
        yesterdayBySubject[subject] = { correct: 0, total: 0 }
      }
      yesterdayBySubject[subject].correct += log.correct_count || 0
      yesterdayBySubject[subject].total += log.total_problems || 0
    })

    // Calculate improvements
    const updates: Array<{
      subject: string
      improvement: number // 正答数の増加
      isFirstTime: boolean // 初回入力かどうか
      todayCorrect: number
      todayTotal: number
    }> = []

    Object.entries(todayBySubject).forEach(([subject, todayData]) => {
      const yesterdayData = yesterdayBySubject[subject]

      if (!yesterdayData) {
        // 初回入力
        if (todayData.correct > 0) {
          updates.push({
            subject,
            improvement: todayData.correct,
            isFirstTime: true,
            todayCorrect: todayData.correct,
            todayTotal: todayData.total,
          })
        }
      } else {
        // 前回より正答数が増えた場合
        const improvement = todayData.correct - yesterdayData.correct
        if (improvement > 0) {
          updates.push({
            subject,
            improvement,
            isFirstTime: false,
            todayCorrect: todayData.correct,
            todayTotal: todayData.total,
          })
        }
      }
    })

    // 更新時刻を取得
    const lastUpdateTime = todayLogs && todayLogs.length > 0 ? new Date().toISOString() : null

    return {
      updates,
      lastUpdateTime,
      hasUpdates: updates.length > 0,
    }
  } catch (error) {
    console.error("Get live update data error:", error)
    return { error: "予期しないエラーが発生しました", updates: [] }
  }
}

/**
 * 今週のリフレクト完了状態を取得
 */
export async function getWeeklyReflectionStatus() {
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

    // 今週の開始日（月曜日）をJST基準で取得
    const { getThisWeekMondayJST } = await import("@/lib/utils/date-jst")
    const weekStartStr = getThisWeekMondayJST()

    // 今週のリフレクトセッションを確認
    const { data: reflection } = await supabase
      .from("coaching_sessions")
      .select("id, completed_at")
      .eq("student_id", student.id)
      .eq("session_type", "reflection")
      .gte("week_start_date", weekStartStr)
      .not("completed_at", "is", null)
      .maybeSingle()

    return {
      reflectionCompleted: !!reflection,
      reflectionId: reflection?.id || null,
    }
  } catch (error) {
    console.error("Get weekly reflection status error:", error)
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

/**
 * 今日のミッション情報取得（AIコーチ用）
 */
async function getTodayMissionForCoach(studentId: string) {
  const supabase = await createClient()

  // 今日の曜日を取得
  const now = new Date()
  const jstOffset = 9 * 60 // UTC+9
  const nowJST = new Date(now.getTime() + jstOffset * 60 * 1000)
  const weekday = nowJST.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
  const hour = nowJST.getHours()

  // 日曜日または土曜12時以降はミッションなし
  if (weekday === 0 || (weekday === 6 && hour >= 12)) {
    return null
  }

  // 曜日ごとの科目ブロック
  const blocks = {
    1: ["算数", "国語", "社会"], // 月曜
    2: ["算数", "国語", "社会"], // 火曜
    3: ["算数", "国語", "理科"], // 水曜
    4: ["算数", "国語", "理科"], // 木曜
    5: ["算数", "理科", "社会"], // 金曜
    6: ["算数", "理科", "社会"], // 土曜
  }

  const subjects = blocks[weekday as keyof typeof blocks] || []

  if (subjects.length === 0) {
    return null
  }

  // 今日の日付（study_date用）
  const { getTodayJST, getYesterdayJST } = await import("@/lib/utils/date-jst")
  const todayDateStr = getTodayJST()
  const yesterdayDateStr = getYesterdayJST()

  // 今日の学習ログを取得
  const { data: todayLogs, error: todayError } = await supabase
    .from("study_logs")
    .select(`
      subject_id,
      correct_count,
      total_problems,
      subjects (name)
    `)
    .eq("student_id", studentId)
    .in("study_date", [todayDateStr, yesterdayDateStr])

  if (todayError) {
    console.error("Get today mission for coach error:", todayError)
    if (isMissingTable(todayError, "public.study_logs")) {
      return {
        subjects,
        inputStatus: subjects.map((subject) => ({
          subject,
          isInputted: false,
        })),
      }
    }
    return null
  }

  // 科目別に集計
  const subjectMap: { [subject: string]: { correct: number; total: number } } = {}
  todayLogs?.forEach((log) => {
    const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
    const subjectName = subject?.name || "不明"
    if (!subjectMap[subjectName]) {
      subjectMap[subjectName] = { correct: 0, total: 0 }
    }
    subjectMap[subjectName].correct += log.correct_count || 0
    subjectMap[subjectName].total += log.total_problems || 0
  })

  // 各科目の入力状態を判定
  const inputStatus = subjects.map(subject => {
    const data = subjectMap[subject]
    if (data && data.total > 0) {
      const accuracy = Math.round((data.correct / data.total) * 100)
      return {
        subject,
        isInputted: true,
        accuracy,
      }
    }
    return {
      subject,
      isInputted: false,
    }
  })

  return {
    subjects,
    inputStatus,
  }
}
