/**
 * Daily Spark デバッグスクリプト
 * hana6 の今日のミッション達成状況を確認
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugDailySpark() {
  console.log("🔍 Daily Spark Debug - hana6\n")

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 1. hana6 の student_id を取得
  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id, login_id, full_name, grade")
    .eq("login_id", "hana6")
    .single()

  if (studentError || !student) {
    console.error("❌ hana6 not found:", studentError?.message)
    return
  }

  console.log(`✅ Student: ${student.full_name} (ID: ${student.id}, Grade: ${student.grade})`)

  // 2. 今日の日付（JST）を取得
  const now = new Date()
  const jstOffset = 9 * 60
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000)
  const year = jstTime.getUTCFullYear()
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, "0")
  const day = String(jstTime.getUTCDate()).padStart(2, "0")
  const today = `${year}-${month}-${day}`

  console.log(`📅 Today (JST): ${today}`)

  // 3. 今日の曜日から必要な科目を計算
  const dayOfWeek = jstTime.getUTCDay() // 0=日, 1=月, ..., 6=土
  const dayNames = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"]
  console.log(`📆 Day of Week: ${dayNames[dayOfWeek]} (${dayOfWeek})`)

  let missionSubjects: string[] = []
  if (dayOfWeek === 1 || dayOfWeek === 2) {
    // 月火: ブロックA
    missionSubjects = ["算数", "国語", "社会"]
  } else if (dayOfWeek === 3 || dayOfWeek === 4) {
    // 水木: ブロックB
    missionSubjects = ["算数", "国語", "理科"]
  } else if (dayOfWeek === 5 || dayOfWeek === 6) {
    // 金土: ブロックC
    missionSubjects = ["算数", "理科", "社会"]
  } else {
    // 日曜: 週次振り返り
    missionSubjects = []
    console.log("📝 Mission: 週次振り返り（リフレクト）")
  }

  if (missionSubjects.length > 0) {
    console.log(`📝 Mission Subjects: ${missionSubjects.join(", ")}`)
  }

  // 4. 今日の学習ログを取得
  const { data: logs, error: logsError } = await adminClient
    .from("study_logs")
    .select(
      `
      id,
      logged_at,
      subjects!inner (name)
    `
    )
    .eq("student_id", student.id)
    .gte("logged_at", `${today}T00:00:00+09:00`)
    .lt("logged_at", `${today}T23:59:59+09:00`)
    .order("logged_at", { ascending: true })

  if (logsError) {
    console.error("❌ Error fetching logs:", logsError.message)
    return
  }

  console.log(`\n📊 Today's Study Logs (${logs?.length || 0} records):`)
  if (logs && logs.length > 0) {
    logs.forEach((log: any, index: number) => {
      console.log(`  ${index + 1}. ${log.subjects.name} (logged: ${log.logged_at})`)
    })

    // 記録された科目（重複除去）
    const recordedSubjects = [...new Set(logs.map((log: any) => log.subjects.name))]
    console.log(`\n✅ Recorded Subjects: ${recordedSubjects.join(", ")}`)

    // 達成チェック
    if (missionSubjects.length > 0) {
      const missingSubjects = missionSubjects.filter((subject) => !recordedSubjects.includes(subject))
      if (missingSubjects.length === 0) {
        console.log(`\n🎉 MISSION COMPLETE! All subjects recorded.`)
        console.log(`   ✨ Logo should be GLOWING (blue-purple gradient)`)
      } else {
        console.log(`\n⏳ Mission Incomplete. Missing: ${missingSubjects.join(", ")}`)
        console.log(`   ⚪ Logo should be GRAY`)
      }
    }
  } else {
    console.log("  (No logs found)")
    console.log(`\n⏳ Mission Incomplete. No logs recorded.`)
    console.log(`   ⚪ Logo should be GRAY`)
  }

  // 5. getDailySparkLevel の実行をシミュレート
  console.log(`\n🔧 Testing getDailySparkLevel logic...`)
  const { getDailySparkLevel } = await import("@/lib/utils/daily-spark")
  try {
    const level = await getDailySparkLevel(student.id)
    console.log(`   Result: "${level}"`)
    console.log(
      `   Expected: ${missionSubjects.length > 0 && logs && logs.length >= missionSubjects.length ? '"child"' : '"none"'}`
    )
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message)
  }
}

debugDailySpark().catch((error) => {
  console.error("💥 Unexpected error:", error)
  process.exit(1)
})
