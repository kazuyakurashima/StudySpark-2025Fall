import { createClient } from "@supabase/supabase-js"
import { getTodayJST } from "@/lib/utils/date-jst"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkScienceStudyDates() {
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

  // Get all science logs for student 3 in session 9
  const { data: scienceLogs } = await supabase
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
    .order("study_date", { ascending: false })
    .order("id", { ascending: false })

  console.log("🔬 理科のログ（セッション", currentSession?.id, "）:")
  const scienceOnly = scienceLogs?.filter((log) => {
    const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
    return subject?.name === "理科"
  })

  scienceOnly?.forEach((log) => {
    const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
    console.log(`   ${log.study_date}: ${log.correct_count}/${log.total_problems} (${subject?.name})`)
  })

  console.log("")
  console.log("🔍 study_date === today の理科ログ:")
  const todayScience = scienceOnly?.filter((log) => log.study_date === today)
  console.log("   件数:", todayScience?.length || 0)
  todayScience?.forEach((log) => {
    console.log(`   ${log.study_date}: ${log.correct_count}/${log.total_problems}`)
  })
}

checkScienceStudyDates().catch(console.error)
