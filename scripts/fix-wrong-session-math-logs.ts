import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixWrongSessionMathLogs() {
  try {
    console.log("🔧 Fixing wrong session math logs...")

    // Get Session 9 for Grade 5
    const { data: session9, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id, session_number")
      .eq("grade", 5)
      .eq("session_number", 9)
      .single()

    if (sessionError || !session9) {
      throw new Error(`Failed to find Session 9: ${sessionError?.message}`)
    }

    console.log(`✅ Session 9 ID: ${session9.id}`)

    // Update the 4 math logs (ID: 51, 52, 53, 54) to Session 9
    const logIds = [51, 52, 53, 54]

    console.log(`\n📝 Updating ${logIds.length} logs to Session 9...`)

    for (const logId of logIds) {
      // First, get the current log
      const { data: log } = await supabase
        .from("study_logs")
        .select("id, session_id, study_date, correct_count, total_problems, study_content_types(content_name)")
        .eq("id", logId)
        .single()

      if (log) {
        console.log(`\n  Before: [ID: ${log.id}] Session ${log.session_id} - ${(log as any).study_content_types?.content_name} - ${log.correct_count}/${log.total_problems}`)

        // Update to Session 9
        const { error: updateError } = await supabase
          .from("study_logs")
          .update({ session_id: session9.id })
          .eq("id", logId)

        if (updateError) {
          console.error(`  ❌ Failed to update log ${logId}: ${updateError.message}`)
        } else {
          console.log(`  ✅ After: [ID: ${log.id}] Session ${session9.session_number} - ${(log as any).study_content_types?.content_name} - ${log.correct_count}/${log.total_problems}`)
        }
      }
    }

    // Verify the update
    console.log(`\n🔍 Verifying updates...`)

    const { data: updatedLogs } = await supabase
      .from("study_logs")
      .select("id, session_id, study_date, correct_count, total_problems, study_sessions(session_number), study_content_types(content_name)")
      .in("id", logIds)
      .order("id")

    console.log(`\n📊 Updated logs:`)
    updatedLogs?.forEach((log) => {
      console.log(`  - [ID: ${log.id}] Session ${(log as any).study_sessions?.session_number} - ${(log as any).study_content_types?.content_name} - ${log.correct_count}/${log.total_problems}`)
    })

    const totalCorrect = updatedLogs?.reduce((sum, log) => sum + (log.correct_count || 0), 0) || 0
    const totalProblems = updatedLogs?.reduce((sum, log) => sum + (log.total_problems || 0), 0) || 0

    console.log(`\n✅ Total: ${totalCorrect}/${totalProblems}`)
    console.log(`\n🎉 Fix completed! Now the dashboard should show today's math progress correctly.`)

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

fixWrongSessionMathLogs()
