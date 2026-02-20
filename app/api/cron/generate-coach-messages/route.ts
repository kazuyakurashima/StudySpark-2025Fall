import { createClient } from "@/lib/supabase/server"
import { generateCoachMessage } from "@/lib/openai/coach-message"
import type { CoachMessageContext } from "@/lib/openai/coach-message"
import {
  getTodayJST,
  getDateJST,
  getDaysAgoJST,
  getNowJSTISO,
} from "@/lib/utils/date-jst"

export const dynamic = 'force-dynamic'

/**
 * AIコーチメッセージバックグラウンド生成
 *
 * Vercel Cronで毎日午前3時（JST）に実行
 * 全アクティブ生徒の翌日分メッセージを事前生成してキャッシュに保存
 */
export async function GET(request: Request) {
  // CRON_SECRET認証
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Coach Message Cron] Unauthorized access attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("[Coach Message Cron] Starting background generation...")

  try {
    const supabase = await createClient()

    // アクティブ生徒取得（7日以内にログインした生徒）
    const cutoffDateStr = getDaysAgoJST(7)

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select(`
        id,
        user_id,
        grade,
        course,
        profiles!inner (
          display_name,
          last_login_at
        )
      `)
      .gte("profiles.last_login_at", `${cutoffDateStr}T00:00:00+09:00`)

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`)
    }

    if (!students || students.length === 0) {
      console.log("[Coach Message Cron] No active students found")
      return Response.json({
        success: true,
        totalStudents: 0,
        successCount: 0,
        failureCount: 0,
        message: "No active students",
      })
    }

    console.log(`[Coach Message Cron] Found ${students.length} active students`)

    // 翌日の日付（キャッシュキー用）
    const tomorrowStr = getDateJST(1)

    let successCount = 0
    let failureCount = 0
    const errors: { studentId: number; error: string }[] = []

    // 各生徒のメッセージを生成
    for (const student of students) {
      try {
        const studentId = student.id
        const cacheKey = `daily_coach_${studentId}_${tomorrowStr}`

        // 既にキャッシュ存在チェック
        const { data: existing } = await supabase
          .from("ai_cache")
          .select("cache_key")
          .eq("cache_key", cacheKey)
          .single()

        if (existing) {
          console.log(`[Coach Message Cron] Cache already exists for student ${studentId}, skipping`)
          successCount++
          continue
        }

        // データ収集
        const [willData, logsData, testData] = await Promise.all([
          getLatestWillAndGoal(studentId),
          getRecentStudyLogs(studentId, 3),
          getUpcomingTest(studentId),
        ])

        // 連続学習日数取得
        const streakData = await getStudyStreakForStudent(studentId)

        // コンテキスト構築
        const profile = (student as Record<string, unknown>).profiles as { display_name: string | null } | null
        const context: CoachMessageContext = {
          studentId: studentId,
          studentName: profile?.display_name ?? "さん",
          grade: student.grade,
          course: student.course ?? "",
          latestWill: willData?.will,
          latestGoal: willData?.goal,
          recentLogs: logsData,
          upcomingTest: testData || undefined,
          studyStreak: typeof streakData === "number" ? streakData : 0,
        }

        // AI生成
        const result = await generateCoachMessage(context)

        if (!result.success) {
          throw new Error(result.error)
        }

        // Langfuseトレース作成用にプロンプトを構築
        const promptSummary = `Student: ${context.studentName}, Course: ${context.course}, Streak: ${context.studyStreak} days`

        // entity_idを発行
        const { randomUUID } = await import("node:crypto")
        const entityId = randomUUID()

        // Langfuseトレース保存
        const { createDailyCoachMessageTrace } = await import("@/lib/langfuse/trace-helpers")
        const traceId = await createDailyCoachMessageTrace(
          entityId,
          student.user_id,
          String(studentId),
          promptSummary,
          result.message,
          false // 新規生成なのでcacheHit=false
        )

        // キャッシュ保存（entity_id と langfuse_trace_id を含む）
        await supabase.from("ai_cache").insert({
          entity_id: entityId,
          cache_key: cacheKey,
          cache_type: "coach_message",
          cached_content: JSON.stringify(result.message),
          langfuse_trace_id: traceId,
        })

        console.log(`[Coach Message Cron] ✅ Generated for student ${studentId} (trace: ${traceId})`)
        successCount++
      } catch (error) {
        console.error(`[Coach Message Cron] ❌ Failed for student ${student.id}:`, error)
        failureCount++
        errors.push({
          studentId: student.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const result = {
      success: true,
      totalStudents: students.length,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
      generatedAt: getNowJSTISO(),
      targetDate: tomorrowStr,
    }

    console.log(`[Coach Message Cron] Completed: ${successCount}/${students.length} succeeded`)

    return Response.json(result)
  } catch (error) {
    console.error("[Coach Message Cron] Fatal error:", error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * 最新のWillとGoalを取得
 */
async function getLatestWillAndGoal(studentId: number): Promise<{ will?: string; goal?: string } | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("weekly_analysis")
    .select("strengths, challenges")
    .eq("student_id", studentId)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    will: data.strengths || undefined,
    goal: data.challenges || undefined,
  }
}

/**
 * 直近N日の学習ログ取得
 */
async function getRecentStudyLogs(studentId: number, days: number = 3): Promise<CoachMessageContext["recentLogs"]> {
  const supabase = await createClient()

  const cutoffDateStr = getDaysAgoJST(days)

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
    .gte("study_date", cutoffDateStr)
    .order("study_date", { ascending: false })
    .limit(20)

  const todayStr = getTodayJST()
  const yesterdayStr = getDateJST(-1)
  const dayBeforeYesterdayStr = getDateJST(-2)

  type LogEntry = {
    subject: string
    content: string
    correct: number
    total: number
    accuracy: number
    date: string
  }

  const mapLog = (log: Record<string, unknown>): LogEntry => {
    const subjects = log.subjects as { name: string } | null
    const contentTypes = log.study_content_types as { content_name: string } | null
    const correctCount = (log.correct_count as number) || 0
    const totalProblems = (log.total_problems as number) || 0
    return {
      subject: subjects?.name || "不明",
      content: contentTypes?.content_name || "",
      correct: correctCount,
      total: totalProblems,
      accuracy: totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0,
      date: (log.study_date as string) || "",
    }
  }

  const result: CoachMessageContext["recentLogs"] = {
    today: [],
    yesterday: [],
    dayBeforeYesterday: [],
  }

  if (!logs || logs.length === 0) return result

  for (const log of logs) {
    const entry = mapLog(log as unknown as Record<string, unknown>)
    if (entry.date === todayStr) {
      result.today.push(entry)
    } else if (entry.date === yesterdayStr) {
      result.yesterday.push(entry)
    } else if (entry.date === dayBeforeYesterdayStr) {
      result.dayBeforeYesterday.push(entry)
    }
  }

  return result
}

/**
 * 近日のテスト情報取得
 */
async function getUpcomingTest(studentId: number) {
  const supabase = await createClient()

  const tomorrowStr = getDateJST(1)

  const { data: tests } = await supabase
    .from("test_goals")
    .select(`
      test_schedule_id,
      test_schedules!inner (
        test_date,
        test_types (name)
      )
    `)
    .eq("student_id", studentId)
    .gte("test_schedules.test_date", tomorrowStr)
    .limit(5)

  if (!tests || tests.length === 0) return null

  // Sort by test_date and pick the earliest
  type ScheduleData = { test_date: string; test_types: { name: string } | null }
  const sorted = tests
    .map((t) => t.test_schedules as unknown as ScheduleData)
    .sort((a, b) => a.test_date.localeCompare(b.test_date))

  const schedule = sorted[0]
  const { getDaysDifference } = await import("@/lib/utils/date-jst")
  const daysUntil = getDaysDifference(tomorrowStr, schedule.test_date)

  return {
    name: schedule.test_types?.name || "テスト",
    date: schedule.test_date,
    daysUntil,
  }
}

/**
 * 連続学習日数を計算（特定の生徒）
 */
async function getStudyStreakForStudent(studentId: number): Promise<number> {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("study_logs")
    .select("study_date")
    .eq("student_id", studentId)
    .order("study_date", { ascending: false })

  if (!logs || logs.length === 0) return 0

  // Get unique dates and sort
  const uniqueDates = Array.from(new Set(logs.map((log) => log.study_date))).sort().reverse()

  const todayStr = getTodayJST()
  const yesterdayStr = getDateJST(-1)

  // Check if there's a log today or yesterday
  if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
    return 0
  }

  // Count consecutive days
  let streak = 0
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

  return streak
}
