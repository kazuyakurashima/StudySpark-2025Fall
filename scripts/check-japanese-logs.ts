import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkJapaneseLogs() {
  try {
    console.log("🔍 Checking all Japanese logs...")

    // Get all grade 6 students
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id, user_id, profiles(display_name)")
      .eq("grade", 6)

    if (studentError || !students || students.length === 0) {
      throw new Error(`Failed to find students: ${studentError?.message}`)
    }

    console.log(`✅ Found ${students.length} grade 6 students\n`)

    // Get Japanese subject ID
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", "国語")
      .single()

    if (subjectError || !subject) {
      throw new Error(`Failed to find subject: ${subjectError?.message}`)
    }

    // Get all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("id, session_number, start_date, end_date")
      .eq("grade", 6)
      .order("session_number")

    if (sessionsError || !sessions) {
      throw new Error(`Failed to find sessions: ${sessionsError?.message}`)
    }

    console.log(`✅ Found ${sessions.length} sessions\n`)

    // Process each student
    for (const student of students) {
      const displayName = (student as any).profiles?.display_name || "Unknown"
      console.log(`\n${"=".repeat(60)}`)
      console.log(`📚 Student: ${displayName} (ID: ${student.id})`)
      console.log("=".repeat(60))

      // Get all Japanese logs for this student
      const { data: logs, error: logsError } = await supabase
        .from("study_logs")
        .select(`
          id,
          session_id,
          study_date,
          correct_count,
          total_problems,
          study_content_types (content_name)
        `)
        .eq("student_id", student.id)
        .eq("subject_id", subject.id)
        .order("study_date", { ascending: false })
        .order("id", { ascending: false })

      if (logsError) {
        console.error(`❌ Failed to fetch logs: ${logsError.message}`)
        continue
      }

      if (!logs || logs.length === 0) {
        console.log("⚠️ No Japanese logs found for this student")
        continue
      }

      // Group by session
      const logsBySession = new Map<number, any[]>()
      logs.forEach(log => {
        if (!logsBySession.has(log.session_id)) {
          logsBySession.set(log.session_id, [])
        }
        logsBySession.get(log.session_id)!.push(log)
      })

      // Display grouped logs
      sessions.forEach(session => {
        const sessionLogs = logsBySession.get(session.id) || []
        if (sessionLogs.length > 0) {
          console.log(`\n📅 Session ${session.session_number} (${session.start_date} ~ ${session.end_date}):`)
          sessionLogs.forEach(log => {
            const content = (log as any).study_content_types?.content_name || "Unknown"
            console.log(`  - [ID: ${log.id}] ${log.study_date}: ${log.correct_count}/${log.total_problems} (${content})`)
          })
        }
      })
    }

    console.log(`\n${"=".repeat(60)}`)
    console.log("🎉 Check completed!")
    console.log("=".repeat(60))

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

checkJapaneseLogs()
