import { createClient } from "@supabase/supabase-js"

async function testInsert() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing environment variables")
    console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "NOT SET")
    console.log("SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "SET" : "NOT SET")
    process.exit(1)
  }

  console.log("Creating admin client...")
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get the latest study_log
  console.log("\nFetching latest study_log...")
  const { data: studyLog, error: fetchError } = await adminClient
    .from("study_logs")
    .select("id, student_id, session_id")
    .order("id", { ascending: false })
    .limit(1)
    .single()

  if (fetchError) {
    console.error("Failed to fetch study_log:", fetchError)
    process.exit(1)
  }

  console.log("Latest study_log:", studyLog)

  // Check if feedback already exists
  const { data: existing } = await adminClient
    .from("coach_feedbacks")
    .select("id")
    .eq("study_log_id", studyLog.id)
    .single()

  if (existing) {
    console.log("Feedback already exists for this study_log, skipping insert test")
    process.exit(0)
  }

  // Try to insert
  console.log("\nAttempting to insert coach_feedback...")
  const { data: inserted, error: insertError } = await adminClient
    .from("coach_feedbacks")
    .insert({
      study_log_id: studyLog.id,
      student_id: studyLog.student_id,
      session_id: studyLog.session_id,
      feedback_text: "テスト用フィードバック - 削除してください",
      prompt_version: "test",
      prompt_hash: "test-hash",
      langfuse_trace_id: null,
    })
    .select()

  if (insertError) {
    console.error("INSERT FAILED!")
    console.error("Error code:", insertError.code)
    console.error("Error message:", insertError.message)
    console.error("Error details:", insertError.details)
    console.error("Error hint:", insertError.hint)
    process.exit(1)
  }

  console.log("INSERT SUCCEEDED!")
  console.log("Inserted record:", inserted)

  // Clean up
  console.log("\nCleaning up test record...")
  const { error: deleteError } = await adminClient
    .from("coach_feedbacks")
    .delete()
    .eq("study_log_id", studyLog.id)

  if (deleteError) {
    console.error("Failed to delete test record:", deleteError)
  } else {
    console.log("Test record deleted successfully")
  }
}

testInsert().catch(console.error)
