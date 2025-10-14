import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testTodayMission() {
  console.log("🔍 Testing today mission data fetch...")

  const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const studentId = 1 // 東進太郎

  // Calculate today's date in JST
  const now = new Date()
  const jstOffset = 9 * 60 // UTC+9
  const nowJST = new Date(now.getTime() + jstOffset * 60 * 1000)
  const todayDateStr = nowJST.toISOString().split('T')[0]

  console.log("📅 Today's date (JST):", todayDateStr)
  console.log("🕐 Server time (UTC):", now.toISOString())
  console.log("🕐 JST time:", nowJST.toISOString())

  // Get today's logs
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
      study_sessions (session_number)
    `
    )
    .eq("student_id", studentId)
    .eq("study_date", todayDateStr)

  console.log("\n📊 Query results:")
  console.log("  Error:", logsError?.message || "None")
  console.log("  Logs count:", todayLogs?.length || 0)

  if (todayLogs && todayLogs.length > 0) {
    console.log("\n📝 First log:")
    console.log("  ID:", todayLogs[0].id)
    console.log("  Study date:", todayLogs[0].study_date)
    console.log("  Logged at:", todayLogs[0].logged_at)
    console.log("  Subject:", todayLogs[0].subjects)
    console.log("  Correct/Total:", todayLogs[0].correct_count, "/", todayLogs[0].total_problems)

    console.log("\n📚 All logs:")
    todayLogs.forEach((log, i) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      console.log(`  ${i + 1}. ${subject?.name}: ${log.correct_count}/${log.total_problems} (${log.study_date})`)
    })

    // Aggregate by subject
    const subjectMap: {
      [key: string]: {
        totalCorrect: number
        totalProblems: number
        logs: any[]
      }
    } = {}

    todayLogs.forEach((log) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = subject?.name || "不明"
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalCorrect: 0, totalProblems: 0, logs: [] }
      }
      subjectMap[subjectName].totalCorrect += log.correct_count || 0
      subjectMap[subjectName].totalProblems += log.total_problems || 0
      subjectMap[subjectName].logs.push(log)
    })

    const todayProgress = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      accuracy: data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0,
      correctCount: data.totalCorrect,
      totalProblems: data.totalProblems,
      logsCount: data.logs.length,
    }))

    console.log("\n✅ Today progress:")
    console.log(JSON.stringify(todayProgress, null, 2))
  } else {
    console.log("\n❌ No logs found for today")

    // Check what dates exist
    const { data: allDates } = await adminClient
      .from("study_logs")
      .select("study_date, logged_at")
      .eq("student_id", studentId)
      .order("study_date", { ascending: false })
      .limit(10)

    console.log("\n📅 Recent study dates for student", studentId, ":")
    allDates?.forEach((log) => {
      console.log(`  - study_date: ${log.study_date}, logged_at: ${log.logged_at}`)
    })
  }
}

testTodayMission().catch(console.error)
