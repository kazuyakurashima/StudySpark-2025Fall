"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentLearningPeriod } from "@/lib/utils/learning-period"
import type { SpecialPeriod } from "@/lib/constants/special-periods"

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
      .select("display_name, avatar_id, nickname, theme_color")
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

    // 生徒情報とプロフィール情報を取得
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, grade, course, furigana")
      .eq("user_id", user.id)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません" }
    }

    // プロフィールからdisplay_nameを取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, nickname")
      .eq("id", user.id)
      .single()

    // 優先順位: profiles.display_name → profiles.nickname → students.furigana → "さん"
    const displayName = profile?.display_name || profile?.nickname || student.furigana || "さん"

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
      return { message, createdAt: cached.created_at }
    }

    // キャッシュミス - テンプレートを即返却 & AI生成はバックグラウンドで実行

    // 🚀 改善: テンプレートメッセージを即座に返却（3-5秒の待機を回避）
    const templateMessage = getTemplateMessage(displayName)

    // バックグラウンドでAI生成（await せずに非同期実行）
    generateAndCacheCoachMessage(supabase, user.id, student, displayName, cacheKey)
      .catch((err) => console.error(`[Coach Message] Background AI generation failed:`, err))

    return {
      message: templateMessage,
      createdAt: getNowJST().toISOString(),
      isTemplate: true
    }
  } catch (error) {
    console.error("Get AI coach message error:", error)

    // エラー時フォールバック（生徒のdisplay_nameを取得）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: student } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()

      return { message: getTemplateMessage(student?.display_name || "さん") }
    }

    return { message: getTemplateMessage("さん") }
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
 * AI生成とキャッシュ保存（内部ヘルパー関数）
 */
async function generateAndCacheCoachMessage(
  supabase: any,
  userId: string,
  student: any,
  displayName: string,
  cacheKey: string
) {
  try {
    // データ収集
    const [willData, logsData, streakData, testData, missionData, weeklyData] = await Promise.all([
      getLatestWillAndGoalForCoach(student.id),
      getRecentStudyLogsForCoach(student.id, 3),
      getStudyStreak(),
      getUpcomingTestForCoach(student.id),
      getTodayMissionForCoach(student.id),
      getWeeklyCumulativeProgress(student.id),
    ])

    // AI生成（動的インポート）
    const { generateCoachMessage } = await import("@/lib/openai/coach-message")

    const context: any = {
      studentId: student.id,
      studentName: displayName,
      grade: student.grade,
      course: student.course,
      latestWill: willData?.will,
      latestGoal: willData?.goal,
      recentLogs: logsData || [],
      weeklyProgress: weeklyData?.progress,
      upcomingTest: testData || undefined,
      studyStreak: typeof streakData?.streak === "number" ? streakData.streak : 0,
      todayMission: missionData || undefined,
    }

    const result = await generateCoachMessage(context)

    if (!result.success) {
      console.warn(`[Coach Message] Background AI generation failed: ${result.error}`)
      return
    }

    // Langfuseトレース作成用にプロンプトを構築
    const promptSummary = `Student: ${displayName}, Course: ${student.course}, Streak: ${context.studyStreak} days`

    // entity_idを発行
    const { randomUUID } = await import("node:crypto")
    const entityId = randomUUID()

    // Langfuseトレース保存
    const { createDailyCoachMessageTrace } = await import("@/lib/langfuse/trace-helpers")
    const traceId = await createDailyCoachMessageTrace(
      entityId,
      userId,
      student.id,
      promptSummary,
      result.message,
      false // 新規生成なのでcacheHit=false
    )

    // キャッシュ保存（entity_id と langfuse_trace_id を含む）
    const { getNowJST } = await import("@/lib/utils/date-jst")
    const now = getNowJST().toISOString()
    await supabase.from("ai_cache").insert({
      entity_id: entityId,
      cache_key: cacheKey,
      cache_type: "coach_message",
      cached_content: JSON.stringify(result.message),
      langfuse_trace_id: traceId,
      created_at: now,
    })

  } catch (error) {
    console.error("[Coach Message] Background generation failed:", error)
    throw error
  }
}

/**
 * 最新のWillとGoalを取得（AIコーチメッセージ用）
 */
async function getLatestWillAndGoalForCoach(studentId: string): Promise<{ will?: string; goal?: string } | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("weekly_analysis")
    .select("strengths, challenges")
    .eq("student_id", Number(studentId))
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  // strengthsとchallengesからWill/Goal抽出（簡易版）
  return {
    will: data.strengths || undefined,
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
    .eq("student_id", Number(studentId))
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

  if (!logs || logs.length === 0) {
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

  return {
    today: todayLogs,
    yesterday: yesterdayLogs,
    dayBeforeYesterday: dayBeforeYesterdayLogs,
  }
}

/**
 * 今週の累積進捗取得（AIコーチメッセージ用）
 * @param studentId - student.id（数値ID）
 * @returns 科目別の週次累積進捗（算→国→理→社の順）
 */
async function getWeeklyCumulativeProgress(studentId: number) {
  const supabase = await createClient()

  try {
    // student.idから直接gradeを取得
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("grade")
      .eq("id", studentId)
      .single()

    if (studentError || !student) {
      console.error("🔍 [Coach Weekly] Student not found:", studentError)
      return { progress: [] }
    }

    // 今週の学習期間を判定
    const period = await getCurrentLearningPeriod(student.grade, supabase)
    if (period.type === 'special') {
      return { progress: [], specialPeriod: period.specialPeriod }
    }

    const currentSession = period.session

    // 今週の全ログを取得（logged_at降順で取得）
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(`
        correct_count,
        total_problems,
        subject_id,
        study_content_type_id,
        logged_at,
        subjects (id, name),
        study_content_types (id, content_name)
      `)
      .eq("student_id", Number(studentId))
      .eq("session_id", currentSession.id)
      .order("logged_at", { ascending: false })

    if (logsError) {
      console.error("🔍 [Coach Weekly] Logs fetch error:", logsError)
      return { progress: [] }
    }

    if (!logs || logs.length === 0) {
      return { progress: [] }
    }

    // 科目×学習内容の組み合わせごとに最新のログのみを保持
    // （getWeeklySubjectProgress()と同じロジック）
    const latestLogsMap = new Map<string, typeof logs[0]>()

    logs.forEach((log) => {
      const contentType = Array.isArray(log.study_content_types)
        ? log.study_content_types[0]
        : log.study_content_types
      const contentName = contentType?.content_name || "その他"
      const key = `${log.subject_id}_${contentName}`

      // ログは logged_at DESC でソートされているため、最初の出現が最新
      if (!latestLogsMap.has(key)) {
        latestLogsMap.set(key, log)
      }
    })

    // 科目別に集計（最新ログのみを使用）
    const subjectMap: {
      [subject: string]: {
        weekCorrect: number
        weekTotal: number
      }
    } = {}

    latestLogsMap.forEach((log) => {
      const subjectName = log.subjects?.name || "不明"

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { weekCorrect: 0, weekTotal: 0 }
      }
      subjectMap[subjectName].weekCorrect += log.correct_count || 0
      subjectMap[subjectName].weekTotal += log.total_problems || 0
    })

    // 科目順序を固定（算→国→理→社）
    const subjectOrder = ["算数", "国語", "理科", "社会"]

    // 各科目の進捗を計算
    const progress = subjectOrder
      .filter((subject) => {
        const data = subjectMap[subject]
        // データが存在し、かつ weekTotal >= 10 の科目のみ
        return data && data.weekTotal >= 10
      })
      .map((subject) => {
        const data = subjectMap[subject]
        const weekAccuracy = data.weekTotal > 0 ? Math.round((data.weekCorrect / data.weekTotal) * 100) : 0

        // 正しい計算式: 分母を増やさず、既存問題の80%正解を目指す
        const targetCorrect = Math.ceil(0.8 * data.weekTotal)
        const remainingToTarget = Math.max(0, targetCorrect - data.weekCorrect)

        return {
          subjectName: subject,
          weekCorrect: data.weekCorrect,
          weekTotal: data.weekTotal,
          weekAccuracy,
          remainingToTarget,
        }
      })

    return { progress }
  } catch (error) {
    console.error("🔍 [Coach Weekly] Unexpected error:", error)
    return { progress: [] }
  }
}

/**
 * 近日のテスト情報取得（AIコーチメッセージ用）
 */
async function getUpcomingTestForCoach(studentId: string) {
  const supabase = await createClient()
  const { getTodayJST, getDaysDifference } = await import("@/lib/utils/date-jst")

  const today = getTodayJST()

  const { data: goals } = await supabase
    .from("test_goals")
    .select(`
      test_schedules (
        test_date,
        test_types (name)
      )
    `)
    .eq("student_id", Number(studentId))

  if (!goals || goals.length === 0) return null

  // test_schedules 経由で test_date を取得し、今日以降のものをフィルタ
  const upcoming = goals
    .filter(g => g.test_schedules && g.test_schedules.test_date >= today)
    .sort((a, b) => a.test_schedules!.test_date.localeCompare(b.test_schedules!.test_date))

  if (upcoming.length === 0) return null

  const schedule = upcoming[0].test_schedules!
  const daysUntil = getDaysDifference(today, schedule.test_date)

  return {
    name: schedule.test_types?.name || "テスト",
    date: schedule.test_date,
    daysUntil,
  }
}

/**
 * 連続学習日数を計算（グレースピリオド対応版）
 * DBの students テーブルから最新のstreak情報を取得
 *
 * @returns streak情報（totalDays=累積学習日数を含む）
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

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, last_study_date, current_streak, max_streak")
      .eq("user_id", user.id)
      .single()

    if (studentError || !student) {
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
      .eq("student_id", student.id)
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

    // 累積学習日数を取得（Phase 1: モチベーション機能）
    const { getTotalDays } = await import("@/lib/utils/streak-helpers")
    const totalDays = await getTotalDays(student.id)

    return {
      streak: displayStreak,
      maxStreak,
      lastStudyDate,
      todayStudied,
      streakState,
      totalDays,
    }
  } catch (error) {
    console.error("Get study streak error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 直近の学習履歴取得（batch_id でグルーピング対応）
 *
 * 返却形式:
 * - logs: 個別の学習ログ（batch_id付き）
 * - batchFeedbacks: batch_id → feedback_text のマップ
 * - groupedLogs: batch_id でグループ化されたログ配列（UI表示用）
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
      .eq("student_id", student.id)
      .order("study_date", { ascending: false })
      .order("logged_at", { ascending: false })
      .limit(limit * 4) // バッチグループ化のため多めに取得

    if (logsError) {
      console.error("Get recent study logs error:", logsError)
      if (isMissingTable(logsError, "public.study_logs")) {
        return { logs: [], batchFeedbacks: {}, groupedLogs: [] }
      }
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

    // 今週の学習期間を判定
    const period = await getCurrentLearningPeriod(student.grade, supabase)
    if (period.type === 'special') {
      return { progress: [], sessionNumber: null, specialPeriod: period.specialPeriod }
    }

    const currentSession = period.session

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
        subjects (id, name, color_code),
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
      const subject = log.subjects
      const subjectName = subject?.name || "不明"
      const subjectId = subject?.id
      const contentType = log.study_content_types
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
    .eq("student_id", Number(studentId))
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
