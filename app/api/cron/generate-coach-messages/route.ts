import { createClient } from "@/lib/supabase/server"
import { generateCoachMessage } from "@/lib/openai/coach-message"
import type { CoachMessageContext } from "@/lib/openai/coach-message"

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
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)

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
      .gte("profiles.last_login_at", cutoffDate.toISOString())

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
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    let successCount = 0
    let failureCount = 0
    const errors: { studentId: string; error: string }[] = []

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
        const context: CoachMessageContext = {
          studentId: studentId,
          studentName: (student as any).profiles?.display_name || "さん",
          grade: student.grade,
          course: student.course,
          latestWill: willData?.will,
          latestGoal: willData?.goal,
          recentLogs: logsData || [],
          upcomingTest: testData || undefined,
          studyStreak: typeof streakData === "number" ? streakData : 0,
        }

        // AI生成
        const result = await generateCoachMessage(context)

        if (!result.success) {
          throw new Error(result.error)
        }

        // キャッシュ保存
        await supabase.from("ai_cache").insert({
          cache_key: cacheKey,
          cache_type: "coach_message",
          cached_content: JSON.stringify(result.message),
        })

        console.log(`[Coach Message Cron] ✅ Generated for student ${studentId}`)
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
      generatedAt: new Date().toISOString(),
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
async function getLatestWillAndGoal(studentId: string): Promise<{ will?: string; goal?: string } | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("weekly_analysis")
    .select("growth_areas, challenges")
    .eq("student_id", studentId)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    will: data.growth_areas || undefined,
    goal: data.challenges || undefined,
  }
}

/**
 * 直近N日の学習ログ取得
 */
async function getRecentStudyLogs(studentId: string, days: number = 3) {
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
 * 近日のテスト情報取得
 */
async function getUpcomingTest(studentId: string) {
  const supabase = await createClient()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0]

  const { data: test } = await supabase
    .from("test_goals")
    .select(`
      test_date,
      test_types (name)
    `)
    .eq("student_id", studentId)
    .gte("test_date", tomorrowStr)
    .order("test_date", { ascending: true })
    .limit(1)
    .single()

  if (!test) return null

  const testDate = new Date(test.test_date)
  const tomorrowDate = new Date(tomorrowStr)
  const daysUntil = Math.ceil((testDate.getTime() - tomorrowDate.getTime()) / (1000 * 60 * 60 * 24))

  return {
    name: (test as any).test_types?.name || "テスト",
    date: test.test_date,
    daysUntil,
  }
}

/**
 * 連続学習日数を計算（特定の生徒）
 */
async function getStudyStreakForStudent(studentId: string): Promise<number> {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("study_logs")
    .select("logged_at")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })

  if (!logs || logs.length === 0) return 0

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
    return 0
  }

  // Count consecutive days
  let currentDate = new Date(today)
  if (!sortedDates.includes(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  for (const dateStr of sortedDates) {
    const logDate = new Date(dateStr)
    logDate.setHours(0, 0, 0, 0)

    if (logDate.toISOString().split("T")[0] === currentDate.toISOString().split("T")[0]) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
