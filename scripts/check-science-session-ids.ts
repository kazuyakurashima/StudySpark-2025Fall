import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkScienceSessionIds() {
  try {
    console.log("🔍 Checking today's science logs and their session IDs...")

    // Get today's date in JST
    const now = new Date()
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
    const today = jstDate.toISOString().split("T")[0]

    console.log(`📅 Today (JST): ${today}`)

    // Get science subject
    const { data: scienceSubject } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", "理科")
      .single()

    if (!scienceSubject) {
      console.log("⚠️ Science subject not found")
      return
    }

    console.log(`✅ Science subject ID: ${scienceSubject.id}`)

    // Get all science logs for today
    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select(`
        id,
        session_id,
        study_date,
        correct_count,
        total_problems,
        logged_at,
        study_content_types (content_name),
        study_sessions (session_number, start_date, end_date),
        students (user_id, profiles(display_name))
      `)
      .eq("subject_id", scienceSubject.id)
      .eq("study_date", today)
      .order("logged_at", { ascending: false })

    if (logsError) {
      console.error("❌ Error fetching logs:", logsError)
      return
    }

    console.log(`\n📋 Found ${logs?.length || 0} science logs for today:\n`)

    logs?.forEach((log, index) => {
      const student = (log as any).students
      const displayName = student?.profiles?.display_name || "Unknown"
      const session = (log as any).study_sessions
      const content = (log as any).study_content_types

      console.log(`${index + 1}. [ID: ${log.id}]`)
      console.log(`   Student: ${displayName}`)
      console.log(`   Session ID: ${log.session_id} → Session ${session?.session_number || "?"} (${session?.start_date} ~ ${session?.end_date})`)
      console.log(`   Content: ${content?.content_name || "Unknown"}`)
      console.log(`   Score: ${log.correct_count}/${log.total_problems}`)
      console.log(`   Logged at: ${log.logged_at}`)
      console.log("")
    })

    // Get current session for today
    const { data: currentSession } = await supabase
      .from("study_sessions")
      .select("id, session_number, start_date, end_date")
      .eq("grade", 6)
      .lte("start_date", today)
      .gte("end_date", today)
      .single()

    if (currentSession) {
      console.log(`\n📅 Current session for today (${today}):`)
      console.log(`   Session ${currentSession.session_number} (ID: ${currentSession.id})`)
      console.log(`   Period: ${currentSession.start_date} ~ ${currentSession.end_date}`)

      // Check if any logs have wrong session
      const wrongSessionLogs = logs?.filter((log) => log.session_id !== currentSession.id)
      if (wrongSessionLogs && wrongSessionLogs.length > 0) {
        console.log(`\n⚠️ Found ${wrongSessionLogs.length} log(s) with WRONG session ID:`)
        wrongSessionLogs.forEach((log) => {
          const session = (log as any).study_sessions
          console.log(`   - Log ID ${log.id}: session_id=${log.session_id} (Session ${session?.session_number}), should be ${currentSession.id} (Session ${currentSession.session_number})`)
        })
      } else {
        console.log(`\n✅ All logs have correct session ID (${currentSession.id})`)
      }
    } else {
      console.log(`\n⚠️ No current session found for today`)
    }

    console.log(`\n🎉 Check completed!`)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

checkScienceSessionIds()
