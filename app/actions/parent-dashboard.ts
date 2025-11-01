"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * 保護者ダッシュボードデータ取得
 */
export async function getParentDashboardData() {
  try {
    console.log("🔍 [SERVER] getParentDashboardData called")
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("🔍 [SERVER] User auth check:", {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: userError?.message
    })

    if (userError || !user) {
      console.error("🔍 [SERVER] Auth error:", userError)
      return { error: "認証エラー" }
    }

    // Get parent profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_id, role")
      .eq("id", user.id)
      .single()

    console.log("🔍 [SERVER] Profile check:", {
      hasProfile: !!profile,
      role: profile?.role,
      error: profileError?.message
    })

    if (profileError) {
      console.error("🔍 [SERVER] Profile error:", profileError)
      return { error: "プロフィール情報の取得に失敗しました" }
    }

    // Get parent record
    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", user.id)
      .single()

    console.log("🔍 [SERVER] Parent record check:", {
      hasParent: !!parent,
      parentData: parent,
      error: parentError?.message,
      errorDetails: parentError
    })

    if (parentError || !parent) {
      console.error("🔍 [SERVER] Parent error:", parentError)
      return { error: "保護者情報が見つかりません" }
    }

    // Use admin client for cross-table queries (bypasses RLS)
    const adminClient = createAdminClient()

    // Get student IDs associated with this parent
    const { data: relations, error: relationsError } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)

    if (relationsError) {
      return { error: "子ども情報の取得に失敗しました" }
    }

    if (!relations || relations.length === 0) {
      return {
        profile,
        parent,
        children: [],
      }
    }

    // Fetch student and profile data for each student_id
    const studentIds = relations.map((r) => r.student_id)
    console.log("🔍 [SERVER] Student IDs:", studentIds)

    const { data: students, error: studentsError } = await adminClient
      .from("students")
      .select("id, full_name, grade, course, user_id")
      .in("id", studentIds)

    console.log("🔍 [SERVER] Students query:", { count: students?.length, error: studentsError?.message })

    if (studentsError || !students) {
      console.error("🔍 [SERVER] Students error:", studentsError)
      return { error: "生徒情報の取得に失敗しました" }
    }

    // Fetch profiles for all students
    const userIds = students.map((s) => s.user_id).filter(Boolean)
    console.log("🔍 [SERVER] User IDs for profiles:", userIds)

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, display_name, avatar_id")
      .in("id", userIds)

    console.log("🔍 [SERVER] Profiles query:", { count: profiles?.length, error: profilesError?.message })

    if (profilesError) {
      console.error("🔍 [SERVER] Profiles error:", profilesError)
      return { error: "プロフィール情報の取得に失敗しました" }
    }

    // Combine the data
    const children = relations.map((relation) => {
      const student = students.find((s) => s.id === relation.student_id)
      const profile = profiles?.find((p) => p.id === student?.user_id)

      return {
        student_id: relation.student_id,
        students: {
          id: student?.id,
          full_name: student?.full_name,
          grade: student?.grade,
          course: student?.course,
          user_id: student?.user_id,
          profiles: profile
            ? {
                display_name: profile.display_name,
                avatar_id: profile.avatar_id,
              }
            : null,
        },
      }
    })

    console.log("🔍 [SERVER] Returning data:", {
      hasProfile: !!profile,
      hasParent: !!parent,
      childrenCount: children.length
    })

    return {
      profile,
      parent,
      children,
    }
  } catch (error) {
    console.error("❌ [SERVER] Get parent dashboard data error:", error)
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

    // Get recent logs (last 3 days) using study_date for trend analysis
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const todayDateStr = formatter.format(now)

    // Calculate 3 days ago in JST
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = formatter.format(threeDaysAgo)

    const adminClient = createAdminClient()
    const { data: recentLogs } = await adminClient
      .from("study_logs")
      .select("id, correct_count, total_problems, study_date, subjects (name)")
      .eq("student_id", studentId)
      .gte("study_date", threeDaysAgoStr)
      .lte("study_date", todayDateStr)

    // Separate today's logs from recent logs
    const todayLogs = recentLogs?.filter(log => log.study_date === todayDateStr) || []
    const yesterdayStr = formatter.format(new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const yesterdayLogs = recentLogs?.filter(log => log.study_date === yesterdayStr) || []

    // Generate simple template message focused on today
    let message = `今日も${displayName}が頑張っています！`

    if (todayLogs.length > 0) {
      // Today's data available - focus on today
      const todayTotal = todayLogs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
      const todayCorrect = todayLogs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
      const todayAccuracy = todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0

      // Check if we have yesterday's data for comparison
      if (yesterdayLogs.length > 0) {
        const yesterdayTotal = yesterdayLogs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
        const yesterdayCorrect = yesterdayLogs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
        const yesterdayAccuracy = yesterdayTotal > 0 ? Math.round((yesterdayCorrect / yesterdayTotal) * 100) : 0
        const diff = todayAccuracy - yesterdayAccuracy

        if (diff >= 5) {
          message = `${displayName}、今日は${todayTotal}問に取り組み、正答率${todayAccuracy}%！昨日より${diff}%アップです。素晴らしい成長ですね！`
        } else if (diff <= -5) {
          message = `${displayName}、今日は${todayTotal}問に取り組み、正答率${todayAccuracy}%。少し苦戦していますが、継続して頑張っていますね。`
        } else {
          message = `${displayName}、今日は${todayTotal}問に取り組み、正答率${todayAccuracy}%。安定したペースで学習を続けていますね！`
        }
      } else {
        // No yesterday data, just today
        message = `${displayName}、今日は${todayTotal}問に取り組み、正答率${todayAccuracy}%です。素晴らしい努力ですね！`
      }
    } else if (recentLogs && recentLogs.length > 0) {
      // No today data, but has recent data
      const recentTotal = recentLogs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
      const recentCorrect = recentLogs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
      const recentAccuracy = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : 0

      message = `今日はまだ学習記録はありませんが、${displayName}は最近も頑張っていますね。直近の正答率は${recentAccuracy}%です。`
    } else {
      // No data at all
      message = `${displayName}のペースで、今日も学習を進めていきましょう。`
    }

    return { message }
  } catch (error) {
    console.error("Get today status message error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 今日のログ数を取得（キャッシュ判定用）
 */
export async function getTodayLogCount(studentId: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get today's logs count
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()

    const { count, error } = await adminClient
      .from("study_logs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("study_date", todayStr)

    if (error) {
      return { error: "ログ数の取得に失敗しました" }
    }

    return { count: count || 0 }
  } catch (error) {
    console.error("Get today log count error:", error)
    return { error: "ログ数の取得に失敗しました" }
  }
}

/**
 * 今日の様子メッセージ取得（AI生成版）
 */
export async function getTodayStatusMessageAI(studentId: number) {
  try {
    console.log("🔍 [SERVER] getTodayStatusMessageAI called for student:", studentId)
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("🔍 [SERVER] No authenticated user in getTodayStatusMessageAI")
      return { error: "認証エラー" }
    }

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      console.error("🔍 [SERVER] No parent found in getTodayStatusMessageAI")
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get student info
    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, grade, course, user_id")
      .eq("id", studentId)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報の取得に失敗しました" }
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", student.user_id)
      .single()

    const displayName = profile?.display_name || "お子さん"

    // Get today's and recent logs (last 3 days) using study_date (JST-based date)
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const todayDateStr = formatter.format(now) // YYYY-MM-DD in JST

    // Calculate 3 days ago for trend analysis
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = formatter.format(threeDaysAgo)

    // Get recent logs (last 3 days) for context and trend analysis
    const { data: recentLogs } = await adminClient
      .from("study_logs")
      .select(
        `
        correct_count,
        total_problems,
        logged_at,
        study_date,
        subjects (name),
        study_content_types (content_name)
      `
      )
      .eq("student_id", studentId)
      .gte("study_date", threeDaysAgoStr)
      .lte("study_date", todayDateStr)
      .order("study_date", { ascending: false })
      .order("logged_at", { ascending: true })

    // Separate today's logs from recent logs
    const todayLogs = recentLogs?.filter(log => log.study_date === todayDateStr) || []

    // Get study streak
    const { streak } = await getStudentStreak(studentId)

    // Get weekly trend (study_dateを使用)
    // 過去7日間（今日を含まない）
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoDateStr = formatter.format(oneWeekAgo)

    // 過去8〜14日間
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const twoWeeksAgoDateStr = formatter.format(twoWeeksAgo)

    const { data: thisWeekLogs } = await adminClient
      .from("study_logs")
      .select("correct_count, total_problems")
      .eq("student_id", studentId)
      .gte("study_date", oneWeekAgoDateStr)
      .lt("study_date", todayDateStr)

    const { data: lastWeekLogs } = await adminClient
      .from("study_logs")
      .select("correct_count, total_problems")
      .eq("student_id", studentId)
      .gte("study_date", twoWeeksAgoDateStr)
      .lt("study_date", oneWeekAgoDateStr)

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
    const { data: recentReflection } = await adminClient
      .from("reflect_sessions")
      .select("summary")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get upcoming test
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()
    const { data: upcomingTest } = await adminClient
      .from("test_schedules")
      .select(
        `
        test_date,
        test_types!inner (name, grade)
      `
      )
      .eq("test_types.grade", student.grade)
      .gt("test_date", todayStr)
      .order("test_date", { ascending: true })
      .limit(1)
      .maybeSingle()

    // Format context for AI (pass all recent logs, not just today)
    const context: import("@/lib/openai/daily-status").DailyStatusContext = {
      studentName: displayName,
      grade: student.grade,
      course: student.course,
      todayLogs:
        recentLogs?.map((log) => {
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
            date: log.study_date,  // YYYY-MM-DD format
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
              (new Date(upcomingTest.test_date).getTime() - new Date(todayStr).getTime()) /
                (1000 * 60 * 60 * 24)
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

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get all study logs ordered by study_date descending
    const { data: logs, error: logsError } = await adminClient
      .from("study_logs")
      .select("study_date")
      .eq("student_id", studentId)
      .order("study_date", { ascending: false })

    if (logsError) {
      return { error: "学習ログの取得に失敗しました" }
    }

    if (!logs || logs.length === 0) {
      return { streak: 0 }
    }

    // Calculate streak (using study_date which is JST-based)
    const { getTodayJST, getYesterdayJST, getDateJST } = await import("@/lib/utils/date-jst")
    let streak = 0

    const uniqueDates = Array.from(new Set(logs.map((log) => log.study_date))).sort().reverse()

    // Check if there's a log today or yesterday
    const todayStr = getTodayJST()
    const yesterdayStr = getYesterdayJST()

    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
      return { streak: 0 }
    }

    // Count consecutive days
    let dayOffset = uniqueDates.includes(todayStr) ? 0 : -1

    for (const dateStr of uniqueDates) {
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

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get today's and yesterday's logs (to handle late-night viewing)
    const { getTodayJST, getYesterdayJST } = await import("@/lib/utils/date-jst")
    const todayDateStr = getTodayJST()
    const yesterdayDateStr = getYesterdayJST()

    const { data: todayLogs, error: logsError } = await adminClient
      .from("study_logs")
      .select(
        `
        id,
        correct_count,
        total_problems,
        study_date,
        logged_at,
        reflection_text,
        subjects (name),
        study_content_types (content_name),
        study_sessions (session_number),
        encouragement_messages!related_study_log_id (id, sender_id, sender_role)
      `
      )
      .eq("student_id", studentId)
      .in("study_date", [todayDateStr, yesterdayDateStr])
      .order("study_date", { ascending: false })

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

      // Check if parent has already sent encouragement for this log
      const hasParentEncouragement = Array.isArray(log.encouragement_messages)
        ? log.encouragement_messages.some((msg: any) => msg.sender_id === user.id && msg.sender_role === 'parent')
        : false

      subjectMap[subjectName].logs.push({
        ...log,
        hasParentEncouragement
      })
    })

    const todayProgress = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      accuracy: data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0,
      correctCount: data.totalCorrect,
      totalProblems: data.totalProblems,
      logs: data.logs,
    }))

    console.log("🔍 [SERVER] Today mission - Student ID:", studentId)
    console.log("🔍 [SERVER] Today mission - Date filter (today/yesterday):", todayDateStr, "/", yesterdayDateStr)
    console.log("🔍 [SERVER] Today mission - Logs count:", todayLogs?.length)
    console.log("🔍 [SERVER] Today mission - First log:", todayLogs?.[0])
    console.log("🔍 [SERVER] Today mission - Progress:", JSON.stringify(todayProgress, null, 2))

    return { todayProgress }
  } catch (error) {
    console.error("Get student today mission data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの週次科目別進捗取得（学習回ベース）
 */
export async function getStudentWeeklyProgress(studentId: number) {
  try {
    console.log("🔍 [SERVER] getStudentWeeklyProgress called for student:", studentId)
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("🔍 [SERVER] User authenticated:", !!user, "User ID:", user?.id)

    if (!user) {
      console.error("🔍 [SERVER] No authenticated user")
      return { error: "認証エラー" }
    }

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    console.log("🔍 [SERVER] Parent found:", !!parent, "Parent ID:", parent?.id)

    if (!parent) {
      console.error("🔍 [SERVER] No parent record found for user")
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get student info (need grade for session lookup)
    const { data: student } = await adminClient
      .from("students")
      .select("id, grade")
      .eq("id", studentId)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Get current date in Tokyo timezone (YYYY-MM-DD format)
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const todayStr = formatter.format(now)

    console.log("🔍 [SERVER] Weekly progress - Today (JST):", todayStr)
    console.log("🔍 [SERVER] Weekly progress - Student grade:", student.grade)

    // Find this week's study session
    const { data: currentSession, error: sessionError } = await adminClient
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
    const { data: logs, error: logsError } = await adminClient
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
      .eq("student_id", studentId)
      .eq("session_id", currentSession.id)
      .order("logged_at", { ascending: false })

    console.log("🔍 [SERVER] Weekly progress - Logs count:", logs?.length)
    console.log("🔍 [SERVER] Weekly progress - Logs error:", logsError)

    if (logsError) {
      console.error("🔍 [SERVER] Get student weekly progress error:", logsError)
      return { error: "週次進捗の取得に失敗しました" }
    }

    if (!logs || logs.length === 0) {
      console.log("🔍 [SERVER] Weekly progress - No logs found, returning empty array")
      return { progress: [] }
    }

    // Get problem counts for this session (with content name for mapping)
    const { data: problemCounts, error: problemCountsError } = await adminClient
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

    console.log("🔍 [SERVER] Weekly progress - Final result:", JSON.stringify(progress, null, 2))

    return { progress, sessionNumber: currentSession.session_number }
  } catch (error) {
    console.error("🔍 [SERVER] Weekly progress - Unexpected error:", error)
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

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get last 6 weeks of data
    const { getTodayJST, getDaysAgoJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()
    const sixWeeksAgoStr = getDaysAgoJST(42)

    const { data: logs, error: logsError } = await adminClient
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
      .eq("student_id", studentId)
      .gte("study_date", sixWeeksAgoStr)
      .lte("study_date", todayStr)

    if (logsError) {
      console.error("Get student calendar data error:", logsError)
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
    console.error("Get student calendar data error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 子どもの直近学習履歴取得
 * 生徒画面と同じロジックで取得（日付フィルタなし、最新50件）
 */
export async function getStudentRecentLogs(studentId: number, limit: number = 50) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証エラー" }
    }

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get recent study logs with related data (no date filtering, just order by study_date)
    // This matches the student dashboard logic for consistency
    const { data: logs, error: logsError } = await adminClient
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
      .eq("student_id", studentId)
      .order("study_date", { ascending: false })
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

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { error: "保護者情報が見つかりません" }
    }

    const adminClient = createAdminClient()

    const { data: relation } = await adminClient
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get yesterday 0:00 to today 23:59 in JST
    const { getYesterdayJST, getTodayJST, getJSTDayStartISO, getJSTDayEndISO } = await import(
      "@/lib/utils/date-jst"
    )
    const yesterdayStr = getYesterdayJST()
    const todayStr = getTodayJST()
    const yesterdayStart = getJSTDayStartISO(yesterdayStr)
    const todayEnd = getJSTDayEndISO(todayStr)

    const { data: messages, error: messagesError } = await adminClient
      .from("encouragement_messages")
      .select(
        `
        id,
        message,
        sent_at,
        sender_role,
        sender_id,
        related_study_log_id,
        study_logs:related_study_log_id (
          correct_count,
          total_problems,
          subjects (name),
          study_content_types (content_name),
          study_sessions (session_number)
        )
      `
      )
      .eq("student_id", studentId)
      .gte("sent_at", yesterdayStart)
      .lte("sent_at", todayEnd)
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (messagesError) {
      console.error("Get student encouragement messages error:", messagesError)
      return { error: "応援メッセージの取得に失敗しました" }
    }

    if (!messages || messages.length === 0) {
      return { messages: [] }
    }

    // 送信者情報を直接取得（admin clientを使用）
    const senderIds = [...new Set(messages.map((msg: any) => msg.sender_id))]
    const { data: senderProfiles, error: senderError } = await adminClient
      .from("profiles")
      .select("id, display_name, avatar_id")
      .in("id", senderIds)

    if (senderError) {
      console.error("Error fetching sender profiles:", senderError)
      // フォールバック: 送信者情報なしで返す
      return {
        messages: messages.map((msg: any) => ({
          ...msg,
          sender_profile: { display_name: "不明", avatar_id: null },
        })),
      }
    }

    // 送信者情報をマージ
    const messagesWithSender = messages.map((msg: any) => {
      const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)
      return {
        ...msg,
        sender_profile: senderProfile || { display_name: "不明", avatar_id: null },
      }
    })

    return { messages: messagesWithSender }
  } catch (error) {
    console.error("Get student encouragement messages error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}
