import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function deleteWrongSession6Log() {
  try {
    console.log("🗑️  Deleting wrong Session 6 log (ID: 55)...")

    // First, verify the log exists and is correct
    const { data: log, error: fetchError } = await supabase
      .from("study_logs")
      .select(`
        id,
        session_id,
        study_date,
        correct_count,
        total_problems,
        student_id,
        study_sessions (session_number)
      `)
      .eq("id", 55)
      .single()

    if (fetchError || !log) {
      console.error(`❌ Log not found: ${fetchError?.message}`)
      return
    }

    console.log(`\n📋 Found log to delete:`)
    console.log(`  - ID: ${log.id}`)
    console.log(`  - Student ID: ${log.student_id}`)
    console.log(`  - Session: ${(log as any).study_sessions?.session_number}`)
    console.log(`  - Date: ${log.study_date}`)
    console.log(`  - Score: ${log.correct_count}/${log.total_problems}`)

    // Confirm it's the correct log
    if (log.study_date !== "2025-10-30" || log.correct_count !== 40 || log.total_problems !== 40) {
      console.error(`❌ Log data doesn't match expected values. Aborting for safety.`)
      return
    }

    if ((log as any).study_sessions?.session_number !== 6) {
      console.error(`❌ Log is not from Session 6. Aborting for safety.`)
      return
    }

    // Delete the log
    const { error: deleteError } = await supabase
      .from("study_logs")
      .delete()
      .eq("id", 55)

    if (deleteError) {
      throw new Error(`Failed to delete log: ${deleteError.message}`)
    }

    console.log(`\n✅ Successfully deleted log ID: 55`)
    console.log(`\n📊 Verifying remaining logs...`)

    // Verify deletion
    const { data: remainingLogs, error: verifyError } = await supabase
      .from("study_logs")
      .select(`
        id,
        study_date,
        correct_count,
        total_problems,
        study_sessions (session_number)
      `)
      .eq("student_id", log.student_id)
      .eq("subject_id", 2) // 国語
      .order("study_date", { ascending: false })

    if (verifyError) {
      console.error(`❌ Failed to verify: ${verifyError.message}`)
      return
    }

    console.log(`\n📋 Remaining Japanese logs for 星野明:`)
    remainingLogs?.forEach(l => {
      const sessionNum = (l as any).study_sessions?.session_number || "?"
      console.log(`  - [ID: ${l.id}] Session ${sessionNum}: ${l.study_date} - ${l.correct_count}/${l.total_problems}`)
    })

    console.log(`\n🎉 Fix completed successfully!`)
    console.log(`\nNow:`)
    console.log(`  - Session 6: No logs (correct - should show empty)`)
    console.log(`  - Session 9: 40/40 from 2025-10-30 (correct - today's data)`)

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

deleteWrongSession6Log()
