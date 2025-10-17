/**
 * Test script to debug parent daily status message generation
 *
 * Usage:
 * NODE_ENV=development npx dotenv -e .env.local -- npx tsx scripts/test-parent-daily-status.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testDailyStatusData() {
  console.log("=== Testing Parent Daily Status Data ===\n")

  // Find Taro
  const { data: student } = await adminClient
    .from("students")
    .select(`
      id,
      user_id,
      full_name,
      profiles!students_user_id_fkey (
        display_name
      )
    `)
    .eq("full_name", "山田太郎")
    .single()

  if (!student) {
    console.error("Student not found")
    return
  }

  console.log("Student ID:", student.id)
  console.log("Display name:", student.profiles?.display_name)

  // Calculate dates (same logic as parent-dashboard.ts)
  const now = new Date()
  console.log("\nCurrent time (UTC):", now.toISOString())

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const todayDateStr = formatter.format(now)
  console.log("Today (JST):", todayDateStr)

  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(now.getDate() - 3)
  const threeDaysAgoStr = formatter.format(threeDaysAgo)
  console.log("3 days ago:", threeDaysAgoStr)

  // Fetch recent logs
  const { data: recentLogs, error: logsError } = await adminClient
    .from("study_logs")
    .select(`
      study_date,
      correct_count,
      total_problems,
      subjects (name)
    `)
    .eq("student_id", student.id)
    .gte("study_date", threeDaysAgoStr)
    .lte("study_date", todayDateStr)
    .order("study_date", { ascending: false })

  if (logsError) {
    console.error("Error fetching logs:", logsError)
    return
  }

  console.log("\n=== Recent Logs (3 days) ===")
  console.log("Total logs fetched:", recentLogs?.length || 0)

  if (recentLogs && recentLogs.length > 0) {
    const logsByDate = recentLogs.reduce((acc, log) => {
      if (!acc[log.study_date]) {
        acc[log.study_date] = []
      }
      acc[log.study_date].push(log)
      return acc
    }, {} as Record<string, any[]>)

    Object.entries(logsByDate).forEach(([date, logs]) => {
      console.log(`\n${date}:`)
      logs.forEach(log => {
        console.log(`  - ${log.subjects.name}: ${log.correct_count}/${log.total_problems}`)
      })
    })
  }

  // Filter today's logs
  const todayLogs = recentLogs?.filter(log => log.study_date === todayDateStr) || []
  console.log("\n=== Today's Logs ===")
  console.log("Count:", todayLogs.length)

  if (todayLogs.length > 0) {
    console.log("Today has logs!")
    todayLogs.forEach(log => {
      console.log(`  - ${log.subjects.name}: ${log.correct_count}/${log.total_problems}`)
    })
  } else {
    console.log("No logs for today")
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayStr = formatter.format(yesterday)
  const yesterdayLogs = recentLogs?.filter(log => log.study_date === yesterdayStr) || []

  console.log("\n=== Yesterday's Logs ===")
  console.log("Date:", yesterdayStr)
  console.log("Count:", yesterdayLogs.length)

  if (yesterdayLogs.length > 0) {
    yesterdayLogs.forEach(log => {
      console.log(`  - ${log.subjects.name}: ${log.correct_count}/${log.total_problems}`)
    })
  }
}

testDailyStatusData().catch(console.error)
