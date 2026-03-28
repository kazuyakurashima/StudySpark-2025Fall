"use server"

import { createClient } from "@/lib/supabase/server"
import { ChildProfile } from "@/lib/types/profile"
import { getCurrentLearningPeriod } from "@/lib/utils/learning-period"

/**
 * 保護者に紐づく子供のリストを取得
 */
export async function getParentChildren(): Promise<{ children: ChildProfile[]; error?: string }> {
  try {
    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { children: [], error: "認証エラー" }
    }

    // 保護者レコードを取得
    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (parentError || !parent) {
      return { children: [], error: "保護者情報が見つかりません" }
    }

    // parent_child_relationsから子供の情報を取得（RLSで保護者自身の関係のみ取得可能）
    // students と profiles を JOIN で一度に取得
    const { data: relations, error: relationsError } = await supabase
      .from("parent_child_relations")
      .select(`
        student_id,
        students!inner (
          id,
          full_name,
          grade,
          course,
          user_id,
          profiles:user_id (
            id,
            nickname,
            avatar_id,
            custom_avatar_url,
            theme_color
          )
        )
      `)
      .eq("parent_id", parent.id)

    if (relationsError || !relations || relations.length === 0) {
      return { children: [] }
    }

    // データを組み合わせて ChildProfile 型に整形
    const children: ChildProfile[] = relations
      .map((relation) => {
        const student = Array.isArray(relation.students) ? relation.students[0] : relation.students
        if (!student) return null

        const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
        if (!profile) return null

        return {
          id: student.id,
          user_id: student.user_id,
          nickname: profile.nickname,
          avatar_id: profile.avatar_id,
          custom_avatar_url: profile.custom_avatar_url || null,
          theme_color: profile.theme_color,
          grade: student.grade,
          course: student.course as "A" | "B" | "C" | "S",
        }
      })
      .filter((child): child is ChildProfile => child !== null)

    return { children }
  } catch (error) {
    console.error("getParentChildren error:", error)
    return { children: [], error: "予期しないエラーが発生しました" }
  }
}

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
      console.error("🔍 [SERVER] Auth error:", userError)
      return { error: "認証エラー" }
    }

    // Get parent profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_id, role")
      .eq("id", user.id)
      .single()

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

    if (parentError || !parent) {
      console.error("🔍 [SERVER] Parent error:", parentError)
      return { error: "保護者情報が見つかりません" }
    }

    // Use admin client for cross-table queries (bypasses RLS)
    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    // Get student IDs associated with this parent
    const { data: relations, error: relationsError } = await supabase
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

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, full_name, grade, course, user_id")
      .in("id", studentIds)

    if (studentsError || !students) {
      console.error("🔍 [SERVER] Students error:", studentsError)
      return { error: "生徒情報の取得に失敗しました" }
    }

    // Fetch profiles for all students
    const userIds = students.map((s) => s.user_id).filter(Boolean)

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_id")
      .in("id", userIds)

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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要
    const { data: recentLogs } = await supabase
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

    return { message, createdAt: new Date().toISOString() }
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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
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

    const { count, error } = await supabase
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
 * 今日の様子メッセージ取得（AI生成版・キャッシュファースト）
 *
 * ロジック:
 * 1. 今日のキャッシュをチェック → 存在すれば即返却
 * 2. 今日の学習ログをチェック → 存在すれば新規生成
 * 3. 昨日のキャッシュをチェック → 存在すれば「昨日の様子です」付きで返却
 * 4. フォールバック → テンプレートメッセージ
 */
export async function getTodayStatusMessageAI(studentId: number) {
  try {
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

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, grade, course, user_id")
      .eq("id", studentId)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報の取得に失敗しました" }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", student.user_id)
      .single()

    const displayName = profile?.display_name || "お子さん"

    // 日付の準備
    const { getTodayJST, getDateJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()
    const yesterdayStr = getDateJST(-1)

    // === STEP 1: 今日のキャッシュをチェック ===
    const todayCacheKey = `daily_status_today_${studentId}_${todayStr}`
    const { data: todayCache } = await supabase
      .from("ai_cache")
      .select("cached_content, entity_id, created_at")
      .eq("cache_key", todayCacheKey)
      .single()

    if (todayCache) {
      const cachedData = JSON.parse(todayCache.cached_content)
      return {
        message: cachedData.message || cachedData,
        createdAt: todayCache.created_at,
        isFromCache: true,
      }
    }

    // === STEP 2: 今日の学習ログをチェック ===
    const { data: todayLogs } = await supabase
      .from("study_logs")
      .select("id")
      .eq("student_id", studentId)
      .eq("study_date", todayStr)
      .limit(1)

    if (todayLogs && todayLogs.length > 0) {

      // 🚀 改善: テンプレートメッセージを即座に返却（10-15秒の待機を回避）
      const templateResult = await getTodayStatusMessage(studentId)

      // バックグラウンドでAI生成（await せずに非同期実行）
      generateTodayStatusMessage(supabase, user.id, student, profile, todayStr, displayName)
        .catch((err) => console.error(`[Parent Status] Background AI generation failed:`, err))

      return {
        ...templateResult,
        isTemplate: true,
        note: 'AI生成は次回のアクセス時に反映されます'
      }
    }

    // === STEP 3: 昨日のキャッシュをチェック ===
    const yesterdayCacheKey = `daily_status_yesterday_${studentId}_${yesterdayStr}`
    const { data: yesterdayCache, error: yesterdayCacheError } = await supabase
      .from("ai_cache")
      .select("cached_content, entity_id, created_at")
      .eq("cache_key", yesterdayCacheKey)
      .single()

    if (yesterdayCache) {
      const cachedData = JSON.parse(yesterdayCache.cached_content)
      const message = cachedData.message || cachedData
      const prefix = cachedData.metadata?.prefix_message || "昨日の様子です"

      return {
        message: `${prefix}\n\n${message}`,
        createdAt: yesterdayCache.created_at,
        isFromCache: true,
        isYesterday: true,
      }
    }

    // === STEP 4: フォールバック ===
    return getTodayStatusMessage(studentId)
  } catch (error) {
    console.error("Get today status message AI error:", error)
    return getTodayStatusMessage(studentId)
  }
}

/**
 * 今日のメッセージを新規生成（内部ヘルパー関数）
 */
async function generateTodayStatusMessage(
  supabase: any,
  userId: string,
  student: any,
  profile: any,
  todayStr: string,
  displayName: string
) {
  try {
    const studentId = student.id

    // Get today's and recent logs for context
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const todayDateStr = formatter.format(now)

    const { data: todayLogs } = await supabase
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
      .eq("study_date", todayDateStr)
      .order("logged_at", { ascending: true })

    // Get study streak
    const { streak } = await getStudentStreak(studentId)

    // Get weekly trend
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoDateStr = formatter.format(oneWeekAgo)

    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const twoWeeksAgoDateStr = formatter.format(twoWeeksAgo)

    const { data: thisWeekLogs } = await supabase
      .from("study_logs")
      .select("correct_count, total_problems")
      .eq("student_id", studentId)
      .gte("study_date", oneWeekAgoDateStr)
      .lt("study_date", todayDateStr)

    const { data: lastWeekLogs } = await supabase
      .from("study_logs")
      .select("correct_count, total_problems")
      .eq("student_id", studentId)
      .gte("study_date", twoWeeksAgoDateStr)
      .lt("study_date", oneWeekAgoDateStr)

    let weeklyTrend: "improving" | "stable" | "declining" | "none" = "none"
    if (thisWeekLogs && thisWeekLogs.length > 0 && lastWeekLogs && lastWeekLogs.length > 0) {
      const thisWeekAccuracy =
        thisWeekLogs.reduce((sum: number, log: any) => sum + log.correct_count, 0) /
        thisWeekLogs.reduce((sum: number, log: any) => sum + log.total_problems, 0)
      const lastWeekAccuracy =
        lastWeekLogs.reduce((sum: number, log: any) => sum + log.correct_count, 0) /
        lastWeekLogs.reduce((sum: number, log: any) => sum + log.total_problems, 0)

      const diff = (thisWeekAccuracy - lastWeekAccuracy) * 100
      if (diff >= 10) {
        weeklyTrend = "improving"
      } else if (diff <= -10) {
        weeklyTrend = "declining"
      } else {
        weeklyTrend = "stable"
      }
    }

    // Get recent reflection (coaching_sessions.summary_text)
    const { data: recentReflection } = await supabase
      .from("coaching_sessions")
      .select("summary_text")
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
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
      .gt("test_date", todayStr)
      .order("test_date", { ascending: true })
      .limit(1)
      .maybeSingle()

    // Format context for AI
    const context: import("@/lib/openai/daily-status").DailyStatusContext = {
      studentName: displayName,
      grade: student.grade,
      course: student.course,
      todayLogs:
        todayLogs?.map((log: any) => {
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
            date: log.study_date,
          }
        }) || [],
      studyStreak: streak || 0,
      weeklyTrend,
      recentReflection: recentReflection?.summary_text || undefined,
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
      throw new Error(result.error || "AI generation failed")
    }

    // Langfuseトレース作成
    const promptSummary = `Parent view (realtime): ${displayName}, Grade: ${student.grade}, Today logs: ${context.todayLogs.length}`

    const { randomUUID } = await import("node:crypto")
    const entityId = randomUUID()

    // メッセージにメタデータを付与
    const messageWithMetadata = {
      message: result.message,
      metadata: {
        is_yesterday: false,
        target_date: todayStr,
        generation_trigger: "realtime",
      },
    }

    const { createDailyStatusTrace } = await import("@/lib/langfuse/trace-helpers")
    const traceId = await createDailyStatusTrace(
      entityId,
      userId,
      String(studentId),
      promptSummary,
      result.message,
      false,
      {
        is_yesterday: false,
        target_date: todayStr,
        generation_trigger: "realtime",
      }
    )

    // キャッシュ保存（student_id for RLS）
    const todayCacheKey = `daily_status_today_${studentId}_${todayStr}`
    await supabase.from("ai_cache").insert({
      entity_id: entityId,
      cache_key: todayCacheKey,
      cache_type: "daily_status",
      cached_content: JSON.stringify(messageWithMetadata),
      langfuse_trace_id: traceId,
      student_id: studentId,
    })

    return { message: result.message, createdAt: new Date().toISOString() }
  } catch (error) {
    console.error("[Parent Status] Generation failed:", error)
    throw error
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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get all study logs ordered by study_date descending
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select("study_date")
      .eq("student_id", studentId)
      .order("study_date", { ascending: false })

    if (logsError) {
      return { error: "学習ログの取得に失敗しました" }
    }

    // Get student record for streak data
    const { data: student } = await supabase
      .from("students")
      .select("id, last_study_date, current_streak, max_streak")
      .eq("id", studentId)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // JST基準で今日と昨日の日付を取得
    const { getTodayJST, getYesterdayJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()
    const yesterdayStr = getYesterdayJST()

    const lastStudyDate = student.last_study_date
    const currentStreak = student.current_streak || 0
    const maxStreak = student.max_streak || 0

    // 今日の学習記録があるかチェック
    const { data: todayLogs } = await supabase
      .from("study_logs")
      .select("id")
      .eq("student_id", studentId)
      .eq("study_date", todayStr)
      .limit(1)

    const todayStudied = (todayLogs && todayLogs.length > 0) || false

    // Streak状態の判定
    let streakState: "active" | "grace" | "warning" | "reset"
    let displayStreak = currentStreak

    if (!lastStudyDate) {
      // 初回（学習記録なし）
      streakState = "reset"
      displayStreak = 0
    } else if (lastStudyDate === todayStr) {
      // 今日既に記録済み → アクティブ
      streakState = "active"
    } else if (lastStudyDate === yesterdayStr) {
      // 昨日まで継続中、今日未記録 → グレースピリオド
      streakState = "grace"
    } else {
      // 2日以上空いた → リセット状態
      streakState = "reset"
      displayStreak = 0
    }

    return {
      streak: displayStreak,
      maxStreak,
      lastStudyDate,
      todayStudied,
      streakState,
    }
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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get student's grade to find current session
    const { data: student } = await supabase
      .from("students")
      .select("grade")
      .eq("id", studentId)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // 今週の学習期間を判定
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const todayDateStr = getTodayJST()

    const period = await getCurrentLearningPeriod(student.grade, supabase)
    if (period.type === 'special') {
      return { todayProgress: [], specialPeriod: period.specialPeriod }
    }

    const currentSession = period.session

    // Get today's logs for this week's session only
    const { data: todayLogs, error: logsError } = await supabase
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
      .eq("session_id", currentSession.id)
      .eq("study_date", todayDateStr)
      .order("logged_at", { ascending: false })

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
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("🔍 [SERVER] No authenticated user")
      return { error: "認証エラー" }
    }

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      console.error("🔍 [SERVER] No parent record found for user")
      return { error: "保護者情報が見つかりません" }
    }

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get student info (need grade for session lookup)
    const { data: student } = await supabase
      .from("students")
      .select("id, grade")
      .eq("id", studentId)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // 今週の学習期間を判定
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const todayStr = formatter.format(now)

    const period = await getCurrentLearningPeriod(student.grade, supabase)
    const specialPeriod = period.type === 'special' ? period.specialPeriod : null
    const currentSession = period.type === 'regular' ? period.session : null

    let logs
    let logsError
    let sessionNumber = null
    let useFallback = false

    if (period.type === 'special') {
      console.warn("⚠️ [SERVER] Special period (spring/GW), using fallback (last 7 days)")
      useFallback = true

      // フォールバック: 直近7日間のログから集計
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const sevenDaysAgoStr = formatter.format(sevenDaysAgo)

      const result = await supabase
        .from("study_logs")
        .select(
          `
          id,
          correct_count,
          total_problems,
          subject_id,
          study_content_type_id,
          logged_at,
          study_date,
          subjects (name, color_code),
          study_content_types (id, content_name)
        `
        )
        .eq("student_id", studentId)
        .gte("study_date", sevenDaysAgoStr)
        .lte("study_date", todayStr)
        .order("logged_at", { ascending: false })

      logs = result.data
      logsError = result.error
      sessionNumber = null
    } else {
      // 通常: セッションベースで取得（period.type === 'regular' なので currentSession は非null）
      const result = await supabase
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
        .eq("session_id", currentSession!.id)
        .order("logged_at", { ascending: false })

      logs = result.data
      logsError = result.error
      sessionNumber = currentSession!.session_number
    }

    if (logsError) {
      console.error("🔍 [SERVER] Get student weekly progress error:", logsError)
      return { error: "週次進捗の取得に失敗しました" }
    }

    if (!logs || logs.length === 0) {
      return { progress: [], sessionNumber, specialPeriod }
    }

    // Get problem counts for this session (スキップ if フォールバック)
    let problemCounts = null
    if (!useFallback && currentSession) {
      const result = await supabase
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

      if (result.error) {
        console.error("Get problem counts error:", result.error)
        // フォールバック時と同様に problem_counts なしで続行
      } else {
        problemCounts = result.data
      }
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
      const subjectId = (subject as any)?.id
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

    return { progress, sessionNumber: currentSession?.session_number ?? sessionNumber, specialPeriod }
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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
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
 * 子どもの直近学習履歴取得（batch_id でグルーピング対応）
 * 生徒画面と同じロジックで取得（日付フィルタなし、最新50件）
 *
 * 返却形式:
 * - logs: 個別の学習ログ（batch_id付き）
 * - batchFeedbacks: batch_id → feedback_text のマップ
 * - groupedLogs: batch_id でグループ化されたログ配列（UI表示用）
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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { error: "アクセス権限がありません" }
    }

    // Get recent study logs with related data (batch_id を含む)
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
        batch_id,
        subjects (name, color_code),
        study_content_types (content_name),
        study_sessions (session_number, start_date, end_date)
      `
      )
      .eq("student_id", studentId)
      .order("study_date", { ascending: false })
      .order("logged_at", { ascending: false })
      .limit(limit * 4) // バッチグループ化のため多めに取得

    if (logsError) {
      console.error("Get student recent logs error:", logsError)
      return { error: "学習履歴の取得に失敗しました" }
    }

    if (!logs || logs.length === 0) {
      return { logs: [], batchFeedbacks: {}, groupedLogs: [] }
    }

    // batch_idを収集（NULL以外）
    const batchIds = [...new Set(logs.map(log => log.batch_id).filter((id): id is string => id !== null))]

    // batch_idがあるものはbatch単位でフィードバック取得
    const batchFeedbacks: Record<string, string> = {}
    if (batchIds.length > 0) {
      const { data: feedbacks, error: feedbackError } = await supabase
        .from("coach_feedbacks")
        .select("batch_id, feedback_text")
        .in("batch_id", batchIds)

      if (!feedbackError && feedbacks) {
        feedbacks.forEach(f => {
          if (f.batch_id) {
            batchFeedbacks[f.batch_id] = f.feedback_text
          }
        })
      }
    }

    // batch_idがNULLのログ用にstudy_log_idベースでフィードバック取得（レガシー対応）
    const legacyLogIds = logs.filter(log => log.batch_id === null).map(log => log.id)
    const legacyFeedbacks: Record<number, string> = {}
    if (legacyLogIds.length > 0) {
      const { data: legacyFb, error: legacyError } = await supabase
        .from("coach_feedbacks")
        .select("study_log_id, feedback_text")
        .in("study_log_id", legacyLogIds)
        .is("batch_id", null)

      if (!legacyError && legacyFb) {
        legacyFb.forEach(f => {
          legacyFeedbacks[f.study_log_id] = f.feedback_text
        })
      }
    }

    // batch_idでグループ化（UI表示用）
    type LogType = typeof logs[0]
    const batchGroups = new Map<string, LogType[]>()
    const standaloneLogs: (LogType & { feedback?: string })[] = []

    logs.forEach(log => {
      if (log.batch_id) {
        const group = batchGroups.get(log.batch_id) || []
        group.push(log)
        batchGroups.set(log.batch_id, group)
      } else {
        // batch_idがない場合は単独ログとして扱う
        standaloneLogs.push({
          ...log,
          feedback: legacyFeedbacks[log.id] || undefined,
        })
      }
    })

    // グループ化されたログ配列を作成
    type GroupedLogEntry = {
      type: "batch"
      batchId: string
      logs: LogType[]
      feedback?: string
      study_date: string
      logged_at: string
    } | {
      type: "single"
      log: LogType & { feedback?: string }
      study_date: string
      logged_at: string
    }

    const groupedLogs: GroupedLogEntry[] = []

    // バッチグループを追加
    batchGroups.forEach((batchLogs, batchId) => {
      // 日付でソート済みなので先頭が最新
      const latestLog = batchLogs[0]
      groupedLogs.push({
        type: "batch",
        batchId,
        logs: batchLogs,
        feedback: batchFeedbacks[batchId],
        study_date: latestLog.study_date,
        logged_at: latestLog.logged_at,
      })
    })

    // 単独ログを追加
    standaloneLogs.forEach(log => {
      groupedLogs.push({
        type: "single",
        log,
        study_date: log.study_date,
        logged_at: log.logged_at,
      })
    })

    // 日付順でソート
    groupedLogs.sort((a, b) => {
      const dateCompare = b.study_date.localeCompare(a.study_date)
      if (dateCompare !== 0) return dateCompare
      return b.logged_at.localeCompare(a.logged_at)
    })

    // limitを適用
    const limitedGroupedLogs = groupedLogs.slice(0, limit)

    return {
      logs: logs || [],
      batchFeedbacks,
      legacyFeedbacks,
      groupedLogs: limitedGroupedLogs,
    }
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

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
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

    const { data: messages, error: messagesError } = await supabase
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
    const { data: senderProfiles, error: senderError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_id, nickname")
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

/**
 * 子どもの今週の振り返り完了状態を取得（日曜日用）
 */
export async function checkStudentWeeklyReflection(studentId: number): Promise<{ completed: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { completed: false, error: "認証エラー" }
    }

    // Verify parent-child relationship
    const { data: parent } = await supabase.from("parents").select("id").eq("user_id", user.id).single()

    if (!parent) {
      return { completed: false, error: "保護者情報が見つかりません" }
    }

    // RLSポリシーにより、保護者は自分の子供のデータのみアクセス可能
    // createAdminClient() は不要

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("student_id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    if (!relation) {
      return { completed: false, error: "お子様の情報が見つかりません" }
    }

    // 1. 今週の月曜日の日付を計算（week_start_date）
    const now = new Date()
    const jstOffset = 9 * 60 // JSTはUTC+9
    const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000)

    const dayOfWeek = jstTime.getUTCDay() // 0=日, 1=月, ..., 6=土
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(jstTime)
    weekStart.setUTCDate(jstTime.getUTCDate() + diff)

    // YYYY-MM-DD形式に変換
    const year = weekStart.getUTCFullYear()
    const month = String(weekStart.getUTCMonth() + 1).padStart(2, "0")
    const day = String(weekStart.getUTCDate()).padStart(2, "0")
    const weekStartStr = `${year}-${month}-${day}`

    // 2. coaching_sessionsテーブルから今週のセッションを検索
    const { data: session } = await supabase
      .from("coaching_sessions")
      .select("id, status, completed_at, summary_text")
      .eq("student_id", studentId)
      .eq("week_start_date", weekStartStr)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .single()

    // 3. 完了しているかチェック
    const completed = session !== null && session.summary_text !== null

    return { completed }
  } catch (error) {
    console.error("Check student weekly reflection error:", error)
    return { completed: false }
  }
}
