import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkAkira5TodayLogs() {
  // Get JST date
  const now = new Date()
  const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  const today = jstDate.toISOString().split("T")[0]

  console.log("📅 今日(JST):", today)
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

  console.log("🎓 星野明 (akira5)")
  console.log("   Student ID:", student?.id)
  console.log("   学年:", student?.grade)
  console.log("")

  // Get today's current session for grade 5
  const { data: currentSession } = await supabase
    .from("study_sessions")
    .select("id, session_number, start_date, end_date")
    .eq("grade", student?.grade || 5)
    .lte("start_date", today)
    .gte("end_date", today)
    .single()

  console.log("📚 今日の学習回 (小5):")
  console.log("   Session ID:", currentSession?.id)
  console.log("   第", currentSession?.session_number, "回")
  console.log("   期間:", currentSession?.start_date, "~", currentSession?.end_date)
  console.log("")

  // Get today's logs
  const { data: todayLogs } = await supabase
    .from("study_logs")
    .select(
      `
      id,
      study_date,
      session_id,
      correct_count,
      total_problems,
      logged_at,
      subjects(name),
      study_sessions(session_number, grade)
    `
    )
    .eq("student_id", student?.id)
    .eq("study_date", today)
    .order("logged_at", { ascending: false })

  console.log("📝 今日の学習ログ:", todayLogs?.length || 0, "件")
  console.log("")

  if (todayLogs && todayLogs.length > 0) {
    todayLogs.forEach((log, i) => {
      const subject = (log as any).subjects?.name || "不明"
      const session = (log as any).study_sessions
      const isCurrentSession = log.session_id === currentSession?.id
      console.log(
        `${i + 1}. [${isCurrentSession ? "✅" : "❌"}] ${subject}: ${log.correct_count}/${log.total_problems} (session_id=${log.session_id}, 小${session?.grade}第${session?.session_number}回)`
      )
    })
  } else {
    console.log("⚠️  今日の学習ログがありません")
  }

  console.log("")
  console.log("🔍 getTodayMissionData() が返すべきデータ:")
  console.log("   現在のsession_id:", currentSession?.id)
  console.log("   今日の日付:", today)
  console.log(
    "   条件: student_id =",
    student?.id,
    "AND session_id =",
    currentSession?.id,
    "AND study_date =",
    today
  )

  // Try to reproduce getTodayMissionData logic
  console.log("")
  console.log("🧪 getTodayMissionData() ロジックを再現:")

  const { data: missionLogs, error } = await supabase
    .from("study_logs")
    .select(
      `
      id,
      correct_count,
      total_problems,
      subjects (name)
    `
    )
    .eq("student_id", student?.id)
    .eq("session_id", currentSession?.id || 0)
    .eq("study_date", today)

  if (error) {
    console.log("❌ エラー:", error.message)
  } else {
    console.log("   取得件数:", missionLogs?.length || 0)
    if (missionLogs && missionLogs.length > 0) {
      const subjectMap: { [key: string]: { totalCorrect: number; totalProblems: number; logCount: number } } =
        {}

      missionLogs.forEach((log) => {
        const subject = Array.isArray((log as any).subjects)
          ? (log as any).subjects[0]
          : (log as any).subjects
        const subjectName = subject?.name || "不明"
        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = { totalCorrect: 0, totalProblems: 0, logCount: 0 }
        }
        subjectMap[subjectName].totalCorrect += log.correct_count || 0
        subjectMap[subjectName].totalProblems += log.total_problems || 0
        subjectMap[subjectName].logCount += 1
      })

      console.log("")
      console.log("   科目別集計:")
      Object.entries(subjectMap).forEach(([subject, data]) => {
        const accuracy = data.totalProblems > 0 ? Math.round((data.totalCorrect / data.totalProblems) * 100) : 0
        console.log(`   - ${subject}: ${accuracy}% (${data.totalCorrect}/${data.totalProblems}, ${data.logCount}回入力)`)
      })
    }
  }
}

checkAkira5TodayLogs()
