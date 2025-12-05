/**
 * ベースラインKPI記録スクリプト
 *
 * @description
 * Phase 0: 計測基盤整備の一部として、現状のKPIを記録する。
 * このスクリプトは手動で実行し、結果を記録する。
 *
 * 実行方法:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/record-baseline-kpi.ts
 *
 * @see docs/MOTIVATION_FEATURE_IMPLEMENTATION_PLAN.md
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません")
  console.error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface StudentMetrics {
  student_id: number
  display_name: string
  total_days: number
  current_streak: number
  max_streak: number
  last_study_date: string | null
  streak_state: "active" | "grace" | "reset"
}

interface EncouragementMetrics {
  total_messages: number
  parent_messages: number
  coach_messages: number
  ai_messages: number
  quick_messages: number
  custom_messages: number
}

async function getStudentMetrics(): Promise<StudentMetrics[]> {
  // 現状確認SQL（JSTベース）
  const { data, error } = await supabase.rpc("exec_sql", {
    query: `
      WITH today_jst AS (
        SELECT (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE AS today
      ),
      study_days AS (
        SELECT DISTINCT student_id, study_date FROM study_logs
      ),
      numbered AS (
        SELECT
          student_id,
          study_date,
          study_date - ROW_NUMBER() OVER (
            PARTITION BY student_id ORDER BY study_date
          )::INT AS grp
        FROM study_days
      ),
      streaks AS (
        SELECT
          student_id,
          MIN(study_date) AS streak_start,
          MAX(study_date) AS streak_end,
          COUNT(*) AS streak_length
        FROM numbered
        GROUP BY student_id, grp
      ),
      current_streaks AS (
        SELECT
          student_id,
          CASE
            WHEN streak_end = (SELECT today FROM today_jst) THEN streak_length
            WHEN streak_end = (SELECT today FROM today_jst) - 1 THEN streak_length
            ELSE 0
          END AS current_streak,
          streak_end AS last_study_date,
          CASE
            WHEN streak_end = (SELECT today FROM today_jst) THEN 'active'
            WHEN streak_end = (SELECT today FROM today_jst) - 1 THEN 'grace'
            ELSE 'reset'
          END AS streak_state
        FROM streaks
        WHERE streak_end >= (SELECT today FROM today_jst) - 1
           OR streak_end = (SELECT MAX(streak_end) FROM streaks s2 WHERE s2.student_id = streaks.student_id)
      ),
      totals AS (
        SELECT student_id, COUNT(DISTINCT study_date) AS total_days
        FROM study_logs GROUP BY student_id
      ),
      max_streaks AS (
        SELECT student_id, MAX(streak_length) AS max_streak
        FROM streaks GROUP BY student_id
      )
      SELECT
        s.id AS student_id,
        p.display_name,
        COALESCE(t.total_days, 0) AS total_days,
        COALESCE(cs.current_streak, 0) AS current_streak,
        COALESCE(ms.max_streak, 0) AS max_streak,
        cs.last_study_date,
        COALESCE(cs.streak_state, 'reset') AS streak_state
      FROM students s
      JOIN profiles p ON s.user_id = p.id
      LEFT JOIN totals t ON s.id = t.student_id
      LEFT JOIN current_streaks cs ON s.id = cs.student_id
      LEFT JOIN max_streaks ms ON s.id = ms.student_id
      ORDER BY s.id
    `,
  })

  if (error) {
    // RPCがない場合は手動でクエリを組み立て
    console.log("📊 RPCが利用できないため、直接クエリを実行...")

    // シンプルなクエリで基本データを取得
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, full_name, user_id")

    if (studentsError) {
      throw new Error(`生徒データ取得エラー: ${studentsError.message}`)
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")

    if (profilesError) {
      throw new Error(`プロファイルデータ取得エラー: ${profilesError.message}`)
    }

    const { data: studyLogs, error: logsError } = await supabase
      .from("study_logs")
      .select("student_id, study_date")
      .order("study_date", { ascending: true })

    if (logsError) {
      throw new Error(`学習ログ取得エラー: ${logsError.message}`)
    }

    // メトリクスを計算
    const metrics: StudentMetrics[] = []
    const today = new Date().toISOString().split("T")[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

    for (const student of students || []) {
      const profile = profiles?.find((p) => p.id === student.user_id)
      const studentLogs = studyLogs?.filter((l) => l.student_id === student.id) || []
      const uniqueDates = Array.from(new Set(studentLogs.map((l) => l.study_date))).sort()

      // 累積日数
      const totalDays = uniqueDates.length

      // 連続日数とストリーク状態を計算
      let currentStreak = 0
      let maxStreak = 0
      let lastStudyDate = uniqueDates[uniqueDates.length - 1] || null
      let streakState: "active" | "grace" | "reset" = "reset"

      if (uniqueDates.length > 0) {
        // ストリークグループを計算
        const streaks: number[] = []
        let streakLength = 1

        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(uniqueDates[i - 1])
          const curr = new Date(uniqueDates[i])
          const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

          if (diff === 1) {
            streakLength++
          } else {
            streaks.push(streakLength)
            streakLength = 1
          }
        }
        streaks.push(streakLength)

        maxStreak = Math.max(...streaks)

        // 現在のストリーク状態を判定
        if (lastStudyDate === today) {
          streakState = "active"
          currentStreak = streakLength
        } else if (lastStudyDate === yesterday) {
          streakState = "grace"
          currentStreak = streakLength
        } else {
          streakState = "reset"
          currentStreak = 0
        }
      }

      metrics.push({
        student_id: student.id,
        display_name: profile?.display_name || student.full_name || "不明",
        total_days: totalDays,
        current_streak: currentStreak,
        max_streak: maxStreak,
        last_study_date: lastStudyDate,
        streak_state: streakState,
      })
    }

    return metrics
  }

  return data || []
}

async function getEncouragementMetrics(): Promise<EncouragementMetrics> {
  // 応援メッセージの統計
  const { data, error } = await supabase
    .from("encouragement_messages")
    .select("sender_role, support_type")

  if (error) {
    console.error("応援メッセージ取得エラー:", error.message)
    return {
      total_messages: 0,
      parent_messages: 0,
      coach_messages: 0,
      ai_messages: 0,
      quick_messages: 0,
      custom_messages: 0,
    }
  }

  const messages = data || []

  return {
    total_messages: messages.length,
    parent_messages: messages.filter((m) => m.sender_role === "parent").length,
    coach_messages: messages.filter((m) => m.sender_role === "coach").length,
    ai_messages: messages.filter((m) => m.support_type === "ai").length,
    quick_messages: messages.filter((m) => m.support_type === "quick").length,
    custom_messages: messages.filter((m) => m.support_type === "custom").length,
  }
}

async function getResumeRate(): Promise<{ totalResets: number; resumedWithin7Days: number; rate: number }> {
  // streak_resetイベントからの復帰率を計算
  const { data: resetEvents, error: resetError } = await supabase
    .from("user_events")
    .select("user_id, event_data, created_at")
    .eq("event_type", "streak_reset")

  if (resetError || !resetEvents || resetEvents.length === 0) {
    return { totalResets: 0, resumedWithin7Days: 0, rate: 0 }
  }

  const { data: resumeEvents, error: resumeError } = await supabase
    .from("user_events")
    .select("user_id, event_data, created_at")
    .eq("event_type", "streak_resume")

  if (resumeError) {
    return { totalResets: resetEvents.length, resumedWithin7Days: 0, rate: 0 }
  }

  let resumedWithin7Days = 0

  for (const reset of resetEvents) {
    const resume = resumeEvents?.find((r) => {
      if (r.user_id !== reset.user_id) return false
      const resetDate = new Date(reset.created_at)
      const resumeDate = new Date(r.created_at)
      const diff = Math.floor((resumeDate.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24))
      return diff > 0 && diff <= 7
    })

    if (resume) {
      resumedWithin7Days++
    }
  }

  return {
    totalResets: resetEvents.length,
    resumedWithin7Days,
    rate: resetEvents.length > 0 ? (resumedWithin7Days / resetEvents.length) * 100 : 0,
  }
}

async function main() {
  console.log("=" .repeat(60))
  console.log("📊 ベースラインKPI記録")
  console.log("=" .repeat(60))
  console.log(`実行日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`)
  console.log()

  // 1. 生徒メトリクス
  console.log("📈 生徒別メトリクス")
  console.log("-".repeat(60))

  const studentMetrics = await getStudentMetrics()
  const totalStudents = studentMetrics.length
  const activeStudents = studentMetrics.filter((s) => s.streak_state !== "reset").length

  console.log("| 生徒名 | 累積日数 | 現在連続 | 最大連続 | 状態 | 最終学習日 |")
  console.log("|--------|----------|----------|----------|------|------------|")

  for (const s of studentMetrics) {
    console.log(
      `| ${s.display_name.padEnd(6)} | ${String(s.total_days).padStart(8)} | ${String(s.current_streak).padStart(8)} | ${String(s.max_streak).padStart(8)} | ${s.streak_state.padEnd(6)} | ${s.last_study_date || "なし"} |`
    )
  }

  console.log()

  // 2. サマリー統計
  console.log("📊 サマリー統計")
  console.log("-".repeat(60))

  const avgTotalDays = studentMetrics.length > 0
    ? studentMetrics.reduce((sum, s) => sum + s.total_days, 0) / studentMetrics.length
    : 0

  const avgMaxStreak = studentMetrics.length > 0
    ? studentMetrics.reduce((sum, s) => sum + s.max_streak, 0) / studentMetrics.length
    : 0

  console.log(`週次アクティブ生徒数: ${activeStudents}名 / ${totalStudents}名`)
  console.log(`平均累積日数: ${avgTotalDays.toFixed(1)}日`)
  console.log(`平均最大連続日数: ${avgMaxStreak.toFixed(1)}日`)
  console.log()

  // 3. 応援メッセージ統計
  console.log("💬 応援メッセージ統計")
  console.log("-".repeat(60))

  const encouragementMetrics = await getEncouragementMetrics()
  console.log(`総応援数: ${encouragementMetrics.total_messages}件`)
  console.log(`  - 保護者から: ${encouragementMetrics.parent_messages}件`)
  console.log(`  - 指導者から: ${encouragementMetrics.coach_messages}件`)
  console.log(`  - AI生成: ${encouragementMetrics.ai_messages}件`)
  console.log(`  - クイック: ${encouragementMetrics.quick_messages}件`)
  console.log(`  - カスタム: ${encouragementMetrics.custom_messages}件`)
  console.log()

  // 4. 復帰率
  console.log("🔄 復帰率")
  console.log("-".repeat(60))

  const resumeRate = await getResumeRate()
  if (resumeRate.totalResets > 0) {
    console.log(`連続切れ発生: ${resumeRate.totalResets}回`)
    console.log(`7日以内復帰: ${resumeRate.resumedWithin7Days}回`)
    console.log(`復帰率: ${resumeRate.rate.toFixed(1)}%`)
  } else {
    console.log("※ streak_resetイベントがまだ記録されていません")
    console.log("※ streak_resumeイベント計測はこれから開始されます")
  }
  console.log()

  // 5. KPIサマリー（コピペ用）
  console.log("=" .repeat(60))
  console.log("📋 KPIサマリー（ドキュメント記録用）")
  console.log("=" .repeat(60))
  console.log()
  console.log("### KPI（ベースライン）")
  console.log(`- 週次アクティブ生徒数: ${activeStudents}名 / ${totalStudents}名`)
  console.log(`- 平均累積日数: ${avgTotalDays.toFixed(1)}日`)
  console.log(`- 平均最大連続日数: ${avgMaxStreak.toFixed(1)}日`)
  console.log(`- 連続切れ後7日以内復帰率: ${resumeRate.totalResets > 0 ? `${resumeRate.rate.toFixed(1)}%` : "計測開始前"}`)
  console.log(`- 総応援メッセージ数: ${encouragementMetrics.total_messages}件`)
  console.log()
  console.log(`記録日: ${new Date().toISOString().split("T")[0]}`)
}

main().catch(console.error)
