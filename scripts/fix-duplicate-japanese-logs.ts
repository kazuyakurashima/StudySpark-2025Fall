import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixDuplicateJapaneseLogs() {
  try {
    console.log("🔍 Checking for duplicate Japanese logs...")

    // Get all grade 6 students
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id, user_id, profiles(display_name)")
      .eq("grade", 6)

    if (studentError || !students || students.length === 0) {
      throw new Error(`Failed to find students: ${studentError?.message}`)
    }

    console.log(`✅ Found ${students.length} grade 6 students`)

    // Process each student
    for (const student of students) {
      const displayName = (student as any).profiles?.display_name || "Unknown"
      console.log(`\n--- Processing student: ${displayName} (ID: ${student.id}) ---`)

    // Get Japanese subject ID
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", "国語")
      .single()

    if (subjectError || !subject) {
      throw new Error(`Failed to find subject: ${subjectError?.message}`)
    }

    console.log(`✅ Found subject ID: ${subject.id}`)

    // Get session 6 and 9
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("id, session_number")
      .eq("grade", 6)
      .in("session_number", [6, 9])
      .order("session_number")

    if (sessionsError || !sessions || sessions.length !== 2) {
      throw new Error(`Failed to find sessions: ${sessionsError?.message}`)
    }

    const session6 = sessions.find(s => s.session_number === 6)!
    const session9 = sessions.find(s => s.session_number === 9)!

    console.log(`✅ Found sessions - 6: ${session6.id}, 9: ${session9.id}`)

    // Get all Japanese logs for today (2025-10-30)
    const { data: todayLogs, error: logsError } = await supabase
      .from("study_logs")
      .select("id, session_id, study_date, correct_count, total_problems, study_content_types(content_name)")
      .eq("student_id", student.id)
      .eq("subject_id", subject.id)
      .eq("study_date", "2025-10-30")
      .order("id")

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`)
    }

    console.log(`\n📋 Found ${todayLogs?.length || 0} Japanese logs for 2025-10-30:`)
    todayLogs?.forEach(log => {
      console.log(`  - ID: ${log.id}, Session: ${log.session_id}, Score: ${log.correct_count}/${log.total_problems}`)
    })

    // Find duplicate in session 6
    const session6Log = todayLogs?.find(log => log.session_id === session6.id)

    if (session6Log) {
      console.log(`\n⚠️ Found duplicate log in session 6:`)
      console.log(`  - ID: ${session6Log.id}`)
      console.log(`  - Score: ${session6Log.correct_count}/${session6Log.total_problems}`)
      console.log(`  - Date: ${session6Log.study_date}`)

      // Delete the duplicate
      const { error: deleteError } = await supabase
        .from("study_logs")
        .delete()
        .eq("id", session6Log.id)

      if (deleteError) {
        throw new Error(`Failed to delete log: ${deleteError.message}`)
      }

      console.log(`✅ Deleted duplicate log from session 6`)
    } else {
      console.log(`\n✅ No duplicate log found in session 6`)
    }

    // Verify session 9 log exists
    const session9Log = todayLogs?.find(log => log.session_id === session9.id)

    if (session9Log) {
      console.log(`\n✅ Session 9 log is correct:`)
      console.log(`  - ID: ${session9Log.id}`)
      console.log(`  - Score: ${session9Log.correct_count}/${session9Log.total_problems}`)
      console.log(`  - Date: ${session9Log.study_date}`)
    } else {
      console.log(`\n⚠️ No log found in session 9 for today`)
    }

    } // end of for loop

    console.log(`\n🎉 Fix completed successfully!`)

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

fixDuplicateJapaneseLogs()
