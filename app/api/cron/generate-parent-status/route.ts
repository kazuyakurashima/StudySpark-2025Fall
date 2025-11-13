import { createClient } from "@/lib/supabase/server"
import { generateDailyStatusMessage } from "@/lib/openai/daily-status"
import type { DailyStatusContext } from "@/lib/openai/daily-status"
import {
  getTodayJST,
  getDateJST,
  getDaysAgoJST,
  getNowJSTISO,
} from "@/lib/utils/date-jst"

export const dynamic = 'force-dynamic'

/**
 * 保護者向け「今日の様子」メッセージバックグラウンド生成
 *
 * Vercel Cronで毎日午前3時（JST）に実行
 * 全アクティブ保護者の前日分メッセージを生成してキャッシュに保存
 * メッセージは is_yesterday メタデータ付きで保存され、表示時に「昨日の様子です」が付与される
 */
export async function GET(request: Request) {
  // CRON_SECRET認証
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Parent Status Cron] Unauthorized access attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("[Parent Status Cron] Starting background generation...")

  try {
    const supabase = await createClient()

    // アクティブな保護者とその子どもを取得（7日以内にログインした保護者）
    const cutoffDateStr = getDaysAgoJST(7)

    const { data: parents, error: parentsError } = await supabase
      .from("parents")
      .select(`
        id,
        user_id,
        profiles!inner (
          display_name,
          last_login_at
        ),
        parent_students!inner (
          student:students!inner (
            id,
            user_id,
            grade,
            course,
            profiles!inner (
              display_name
            )
          )
        )
      `)
      .gte("profiles.last_login_at", `${cutoffDateStr}T00:00:00+09:00`)

    if (parentsError) {
      throw new Error(`Failed to fetch parents: ${parentsError.message}`)
    }

    if (!parents || parents.length === 0) {
      console.log("[Parent Status Cron] No active parents found")
      return Response.json({
        success: true,
        totalParents: 0,
        successCount: 0,
        failureCount: 0,
        message: "No active parents",
      })
    }

    console.log(`[Parent Status Cron] Found ${parents.length} active parents`)

    // 前日の日付（キャッシュキー用）
    const yesterdayStr = getDateJST(-1)

    let successCount = 0
    let failureCount = 0
    const errors: { parentId: string; studentId: string; error: string }[] = []

    // 各保護者の各子どものメッセージを生成
    for (const parent of parents) {
      const parentStudents = (parent as any).parent_students || []

      for (const ps of parentStudents) {
        const student = ps.student
        if (!student) continue

        try {
          const studentId = student.id
          const cacheKey = `daily_status_yesterday_${studentId}_${yesterdayStr}`

          // 既にキャッシュ存在チェック
          const { data: existing } = await supabase
            .from("ai_cache")
            .select("cache_key")
            .eq("cache_key", cacheKey)
            .single()

          if (existing) {
            console.log(`[Parent Status Cron] Cache already exists for student ${studentId}, skipping`)
            successCount++
            continue
          }

          // 昨日の学習ログを取得
          const { data: yesterdayLogs } = await supabase
            .from("study_logs")
            .select(`
              correct_count,
              total_problems,
              study_date,
              subjects (name),
              study_content_types (content_name)
            `)
            .eq("student_id", studentId)
            .eq("study_date", yesterdayStr)
            .order("created_at", { ascending: false })

          // 週次トレンドを計算
          const weeklyTrend = await calculateWeeklyTrend(studentId, yesterdayStr)

          // 連続学習日数を取得
          const streak = await getStudyStreakForStudent(studentId)

          // 最近の振り返りコメントを取得
          const { data: recentReflection } = await supabase
            .from("coaching_messages")
            .select("summary")
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          // 近日のテストを取得
          const upcomingTest = await getUpcomingTest(studentId, yesterdayStr)

          // コンテキスト構築
          const context: DailyStatusContext = {
            studentName: student.profiles?.display_name || "さん",
            grade: student.grade,
            course: student.course,
            todayLogs: (yesterdayLogs || []).map((log: any) => ({
              subject: log.subjects?.name || "不明",
              content: log.study_content_types?.content_name || "",
              correct: log.correct_count || 0,
              total: log.total_problems || 0,
              accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
              time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
              date: log.study_date || yesterdayStr,
            })),
            studyStreak: streak,
            weeklyTrend,
            recentReflection: recentReflection?.summary || undefined,
            upcomingTest: upcomingTest || undefined,
          }

          // AI生成
          const result = await generateDailyStatusMessage(context)

          if (!result.success) {
            throw new Error(result.error)
          }

          // Langfuseトレース作成用にプロンプトを構築
          const promptSummary = `Parent view: ${context.studentName}, Grade: ${context.grade}, Yesterday logs: ${context.todayLogs.length}`

          // entity_idを発行
          const { randomUUID } = await import("node:crypto")
          const entityId = randomUUID()

          // メッセージにメタデータを付与
          const messageWithMetadata = {
            message: result.message,
            metadata: {
              is_yesterday: true,
              target_date: yesterdayStr,
              generation_trigger: "cron",
              prefix_message: "昨日の様子です",
            },
          }

          // Langfuseトレース保存（純粋なメッセージのみ）
          const { createDailyStatusTrace } = await import("@/lib/langfuse/trace-helpers")
          const traceId = await createDailyStatusTrace(
            entityId,
            parent.user_id,
            studentId,
            promptSummary,
            result.message,
            false, // 新規生成なのでcacheHit=false
            {
              is_yesterday: true,
              target_date: yesterdayStr,
              generation_trigger: "cron",
            }
          )

          // キャッシュ保存（メタデータ付き）
          await supabase.from("ai_cache").insert({
            entity_id: entityId,
            cache_key: cacheKey,
            cache_type: "daily_status",
            cached_content: JSON.stringify(messageWithMetadata),
            langfuse_trace_id: traceId,
          })

          console.log(`[Parent Status Cron] ✅ Generated for student ${studentId} (trace: ${traceId})`)
          successCount++
        } catch (error) {
          console.error(`[Parent Status Cron] ❌ Failed for student ${student.id}:`, error)
          failureCount++
          errors.push({
            parentId: parent.id,
            studentId: student.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    const result = {
      success: true,
      totalParents: parents.length,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
      generatedAt: getNowJSTISO(),
      targetDate: yesterdayStr,
    }

    console.log(`[Parent Status Cron] Completed: ${successCount} succeeded, ${failureCount} failed`)

    return Response.json(result)
  } catch (error) {
    console.error("[Parent Status Cron] Fatal error:", error)

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
 * 週次トレンドを計算
 */
async function calculateWeeklyTrend(
  studentId: string,
  todayStr: string
): Promise<"improving" | "stable" | "declining" | "none"> {
  const supabase = await createClient()

  // 過去2週間のデータを取得
  const twoWeeksAgo = getDateJST(-14)

  const { data: logs } = await supabase
    .from("study_logs")
    .select("correct_count, total_problems, study_date")
    .eq("student_id", studentId)
    .gte("study_date", twoWeeksAgo)
    .lte("study_date", todayStr)

  if (!logs || logs.length < 5) {
    return "none"
  }

  // 週ごとの正答率を計算
  const weekAgo = getDateJST(-7)
  const thisWeek = logs.filter((log) => log.study_date >= weekAgo)
  const lastWeek = logs.filter((log) => log.study_date < weekAgo)

  if (thisWeek.length === 0 || lastWeek.length === 0) {
    return "none"
  }

  const thisWeekAccuracy = calculateAverageAccuracy(thisWeek)
  const lastWeekAccuracy = calculateAverageAccuracy(lastWeek)

  const diff = thisWeekAccuracy - lastWeekAccuracy

  if (diff >= 10) return "improving"
  if (diff <= -10) return "declining"
  return "stable"
}

/**
 * 平均正答率を計算
 */
function calculateAverageAccuracy(logs: any[]): number {
  const totalCorrect = logs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
  const totalProblems = logs.reduce((sum, log) => sum + (log.total_problems || 0), 0)

  if (totalProblems === 0) return 0
  return Math.round((totalCorrect / totalProblems) * 100)
}

/**
 * 連続学習日数を計算（特定の生徒）
 */
async function getStudyStreakForStudent(studentId: string): Promise<number> {
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

/**
 * 近日のテスト情報取得
 */
async function getUpcomingTest(studentId: string, todayStr: string) {
  const supabase = await createClient()

  const { data: test } = await supabase
    .from("test_goals")
    .select(`
      test_date,
      test_types (name)
    `)
    .eq("student_id", studentId)
    .gte("test_date", todayStr)
    .order("test_date", { ascending: true })
    .limit(1)
    .single()

  if (!test) return null

  const { getDaysDifference } = await import("@/lib/utils/date-jst")
  const daysUntil = getDaysDifference(todayStr, test.test_date)

  return {
    name: (test as any).test_types?.name || "テスト",
    date: test.test_date,
    daysUntil,
  }
}
