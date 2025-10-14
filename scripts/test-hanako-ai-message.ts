/**
 * はなこさんのAI今日の様子メッセージをテスト
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testHanakoAIMessage() {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  console.log("🔍 Testing はなこさん's AI message data...\n")

  // はなこさんのstudent_idを取得（まず全生徒を表示）
  const { data: allStudents } = await adminClient
    .from("students")
    .select("id, full_name")
    .order("full_name")

  console.log("📋 All students:")
  allStudents?.forEach((s) => console.log(`   - ${s.full_name} (ID: ${s.id})`))
  console.log()

  const { data: student } = await adminClient
    .from("students")
    .select("id, full_name")
    .ilike("full_name", "%花子%")
    .single()

  if (!student) {
    console.error("❌ はなこさんが見つかりません")
    return
  }

  console.log(`✅ Student found: ${student.full_name} (ID: ${student.id})\n`)

  // 今日の日付（JST）を取得
  const now = new Date()
  const jstOffset = 9 * 60 // UTC+9
  const nowJST = new Date(now.getTime() + jstOffset * 60 * 1000)
  const todayDateStr = nowJST.toISOString().split("T")[0]

  console.log(`📅 Today (JST): ${todayDateStr}\n`)

  // study_dateで今日の学習記録を取得
  const { data: todayLogs, error } = await adminClient
    .from("study_logs")
    .select(
      `
      id,
      study_date,
      logged_at,
      correct_count,
      total_problems,
      subjects (name),
      study_content_types (content_name)
    `
    )
    .eq("student_id", student.id)
    .eq("study_date", todayDateStr)
    .order("logged_at", { ascending: false })

  if (error) {
    console.error("❌ Error fetching logs:", error)
    return
  }

  console.log(`📚 Today's study logs (filtered by study_date='${todayDateStr}'):`)
  console.log(`   Found ${todayLogs?.length || 0} records\n`)

  if (todayLogs && todayLogs.length > 0) {
    // 科目別に集計
    const subjectMap: { [subject: string]: { correct: number; total: number } } = {}

    todayLogs.forEach((log) => {
      const subject = log.subjects?.name || "不明"
      if (!subjectMap[subject]) {
        subjectMap[subject] = { correct: 0, total: 0 }
      }
      subjectMap[subject].correct += log.correct_count
      subjectMap[subject].total += log.total_problems

      console.log(
        `   - ${subject} | ${log.study_content_types?.content_name} | ${log.correct_count}/${log.total_problems} | study_date: ${log.study_date} | logged_at: ${log.logged_at}`
      )
    })

    console.log("\n📊 Subject-level aggregation (what AI should use):")
    Object.entries(subjectMap).forEach(([subject, data]) => {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      console.log(`   ${subject}: ${data.correct}/${data.total}問 (${accuracy}%)`)
    })

    // 全体集計
    const totalCorrect = todayLogs.reduce((sum, log) => sum + log.correct_count, 0)
    const totalProblems = todayLogs.reduce((sum, log) => sum + log.total_problems, 0)
    const overallAccuracy = Math.round((totalCorrect / totalProblems) * 100)
    console.log(`\n   全体: ${totalCorrect}/${totalProblems}問 (${overallAccuracy}%)`)
  } else {
    console.log("   No logs found for today")
  }

  // 参考：logged_atで取得した場合（旧実装）
  console.log("\n\n🔍 For comparison: using logged_at filter (old implementation):")

  const todayEnd = new Date(nowJST)
  todayEnd.setHours(23, 59, 59, 999)
  const today = new Date(nowJST)
  today.setHours(0, 0, 0, 0)

  const todayUTC = new Date(today.getTime() - jstOffset * 60 * 1000)
  const todayEndUTC = new Date(todayEnd.getTime() - jstOffset * 60 * 1000)

  const { data: loggedAtLogs } = await adminClient
    .from("study_logs")
    .select(
      `
      id,
      study_date,
      logged_at,
      correct_count,
      total_problems,
      subjects (name),
      study_content_types (content_name)
    `
    )
    .eq("student_id", student.id)
    .gte("logged_at", todayUTC.toISOString())
    .lte("logged_at", todayEndUTC.toISOString())
    .order("logged_at", { ascending: false })

  console.log(`   Found ${loggedAtLogs?.length || 0} records\n`)

  if (loggedAtLogs && loggedAtLogs.length > 0) {
    const subjectMap: { [subject: string]: { correct: number; total: number } } = {}

    loggedAtLogs.forEach((log) => {
      const subject = log.subjects?.name || "不明"
      if (!subjectMap[subject]) {
        subjectMap[subject] = { correct: 0, total: 0 }
      }
      subjectMap[subject].correct += log.correct_count
      subjectMap[subject].total += log.total_problems

      console.log(
        `   - ${subject} | ${log.study_content_types?.content_name} | ${log.correct_count}/${log.total_problems} | study_date: ${log.study_date} | logged_at: ${log.logged_at}`
      )
    })

    console.log("\n📊 Subject-level aggregation (OLD - incorrect):")
    Object.entries(subjectMap).forEach(([subject, data]) => {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      console.log(`   ${subject}: ${data.correct}/${data.total}問 (${accuracy}%)`)
    })

    const totalCorrect = loggedAtLogs.reduce((sum, log) => sum + log.correct_count, 0)
    const totalProblems = loggedAtLogs.reduce((sum, log) => sum + log.total_problems, 0)
    const overallAccuracy = Math.round((totalCorrect / totalProblems) * 100)
    console.log(`\n   全体: ${totalCorrect}/${totalProblems}問 (${overallAccuracy}%)`)
  }

  console.log("\n✅ Test complete!")
}

testHanakoAIMessage().catch(console.error)
