import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkTodaysMathLogs() {
  try {
    console.log("🔍 Checking today's math logs for 星野明...")

    // Get 星野明's student record
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", "%星野%明%")
      .single()

    if (!profile) {
      console.log("⚠️ 星野明 not found")
      return
    }

    console.log(`✅ Found profile: ${profile.display_name} (${profile.id})`)

    const { data: student } = await supabase
      .from("students")
      .select("id, grade")
      .eq("user_id", profile.id)
      .single()

    if (!student) {
      console.log("⚠️ Student record not found")
      return
    }

    console.log(`✅ Student ID: ${student.id}, Grade: ${student.grade}`)

    // Get math subject
    const { data: mathSubject } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", "算数")
      .single()

    if (!mathSubject) {
      console.log("⚠️ Math subject not found")
      return
    }

    // Get today's date (JST)
    const today = new Date()
    const jstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
    const todayStr = jstDate.toISOString().split("T")[0]

    console.log(`\n📅 Today's date (JST): ${todayStr}`)

    // Get current session
    const { data: currentSession } = await supabase
      .from("study_sessions")
      .select("id, session_number, start_date, end_date")
      .eq("grade", student.grade)
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .single()

    if (!currentSession) {
      console.log("⚠️ No current session found")
      return
    }

    console.log(`✅ Current session: ${currentSession.session_number} (${currentSession.start_date} ~ ${currentSession.end_date})`)

    // Get today's math logs
    const { data: todayLogs } = await supabase
      .from("study_logs")
      .select(`
        id,
        study_date,
        correct_count,
        total_problems,
        created_at,
        study_content_types (
          id,
          content_name
        )
      `)
      .eq("student_id", student.id)
      .eq("session_id", currentSession.id)
      .eq("subject_id", mathSubject.id)
      .eq("study_date", todayStr)
      .order("created_at", { ascending: false })

    console.log(`\n📊 Today's math logs (${todayLogs?.length || 0} entries):`)

    if (todayLogs && todayLogs.length > 0) {
      todayLogs.forEach((log, index) => {
        const contentType = (log as any).study_content_types
        console.log(`\n${index + 1}. [ID: ${log.id}]`)
        console.log(`   Content: ${contentType?.content_name || "Unknown"} (Type ID: ${contentType?.id})`)
        console.log(`   Score: ${log.correct_count}/${log.total_problems}`)
        console.log(`   Created: ${log.created_at}`)
      })

      // Total
      const totalCorrect = todayLogs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
      const totalProblems = todayLogs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
      console.log(`\n📈 Total: ${totalCorrect}/${totalProblems} (${Math.round((totalCorrect / totalProblems) * 100)}%)`)
    } else {
      console.log("   No logs found for today")
    }

    // Get all study content types for current grade and course
    const { data: contentTypes } = await supabase
      .from("study_content_types")
      .select("id, content_name")
      .eq("grade", student.grade)
      .eq("subject_id", mathSubject.id)
      .order("display_order")

    console.log(`\n📚 Available content types for Grade ${student.grade} Math:`)
    contentTypes?.forEach((ct) => {
      const hasLog = todayLogs?.find((log) => (log as any).study_content_types?.id === ct.id)
      console.log(`   ${hasLog ? "✅" : "⬜"} ${ct.content_name} (ID: ${ct.id})`)
    })

  } catch (error) {
    console.error("❌ Error:", error)
  }
}

checkTodaysMathLogs()
