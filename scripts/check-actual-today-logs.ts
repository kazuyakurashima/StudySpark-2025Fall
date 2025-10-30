import { createClient } from "@supabase/supabase-js"
import { getTodayJST } from "@/lib/utils/date-jst"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkActualTodayLogs() {
  const today = getTodayJST()
  console.log("📅 今日(JST - getTodayJST()):", today)
  console.log("")

  // Get akira5 student
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const akira5User = authUsers?.users.find((u) => u.email === "akira5@studyspark.local")

  if (!akira5User) {
    console.log("❌ akira5が見つかりません")
    return
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, grade")
    .eq("user_id", akira5User.id)
    .single()

  console.log("🎓 星野明 (akira5) - Student ID:", student?.id)

  // Get current session
  const { data: currentSession } = await supabase
    .from("study_sessions")
    .select("id, session_number")
    .eq("grade", student?.grade || 5)
    .lte("start_date", today)
    .gte("end_date", today)
    .single()

  console.log("📚 現在のセッション:", currentSession)
  console.log("")

  // Get ALL logs for today (2025-10-31) for session 9
  const { data: todayLogs } = await supabase
    .from("study_logs")
    .select(`
      id,
      study_date,
      correct_count,
      total_problems,
      session_id,
      subjects (name)
    `)
    .eq("student_id", student?.id || 3)
    .eq("session_id", currentSession?.id || 9)
    .eq("study_date", today)
    .order("id", { ascending: false })

  console.log(`🔍 今日（${today}）のログ（セッション ${currentSession?.id}）:`)
  console.log("   件数:", todayLogs?.length || 0)
  console.log("")

  if (todayLogs && todayLogs.length > 0) {
    todayLogs.forEach((log) => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      console.log(`   ${subject?.name}: ${log.correct_count}/${log.total_problems}`)
    })
  } else {
    console.log("   ログがありません")
  }
}

checkActualTodayLogs().catch(console.error)
