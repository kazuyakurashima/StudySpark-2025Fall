/**
 * デモ用学習ログ追加スクリプト
 * 既存のデモユーザーに学習データを追加
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log("🚀 Adding demo study logs...")
console.log(`📍 Supabase URL: ${supabaseUrl}\n`)

async function createStudyLogs(studentId: number, grade: number, studentName: string) {
  console.log(`📚 Creating study logs for ${studentName} (student ${studentId})`)

  // 科目ID取得
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("display_order")

  if (!subjects || subjects.length === 0) {
    console.error("❌ No subjects found")
    return
  }

  // 学習回取得（最新5回分）
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, session_number")
    .eq("grade", grade)
    .order("session_number", { ascending: false })
    .limit(5)

  if (!sessions || sessions.length === 0) {
    console.error("❌ No study sessions found")
    return
  }

  // 学習内容タイプ取得
  const { data: contentTypes } = await supabase
    .from("study_content_types")
    .select("id, subject_id, content_name")
    .eq("grade", grade)

  if (!contentTypes || contentTypes.length === 0) {
    console.error("❌ No content types found")
    return
  }

  // 過去2週間分のログを作成
  const logsToCreate = []
  const today = new Date()

  for (let i = 0; i < 14; i++) {
    const logDate = new Date(today)
    logDate.setDate(logDate.getDate() - i)
    logDate.setHours(18, 0, 0, 0) // 18時に設定

    // 日曜日はスキップ
    if (logDate.getDay() === 0) continue

    // 1日2-3科目
    const numSubjectsToday = i < 7 ? 3 : 2

    const usedSubjects = new Set()

    for (let j = 0; j < numSubjectsToday; j++) {
      // 重複しない科目を選択
      let subject
      do {
        subject = subjects[Math.floor(Math.random() * subjects.length)]
      } while (usedSubjects.has(subject.id))
      usedSubjects.add(subject.id)

      const session = sessions[Math.floor(Math.random() * sessions.length)]
      const contentTypesForSubject = contentTypes.filter((ct) => ct.subject_id === subject.id)

      if (contentTypesForSubject.length === 0) continue

      const contentType = contentTypesForSubject[Math.floor(Math.random() * contentTypesForSubject.length)]

      const totalProblems = Math.floor(Math.random() * 8) + 12 // 12-20問
      const baseAccuracy = 0.65 + Math.random() * 0.25 // 65-90%
      const correctCount = Math.floor(totalProblems * baseAccuracy)

      const recordTime = new Date(logDate)
      recordTime.setHours(18 + j, Math.floor(Math.random() * 60), 0, 0)

      logsToCreate.push({
        student_id: studentId,
        session_id: session.id,
        subject_id: subject.id,
        study_content_type_id: contentType.id,
        total_problems: totalProblems,
        correct_count: correctCount,
        logged_at: recordTime.toISOString(),
      })
    }
  }

  const { error } = await supabase.from("study_logs").insert(logsToCreate)

  if (error) {
    console.error("❌ Study logs creation failed:", error.message)
  } else {
    console.log(`✅ Created ${logsToCreate.length} study logs`)
  }
}

async function createEncouragementMessages(studentId: number, studentName: string) {
  console.log(`💬 Creating encouragement messages for ${studentName}`)

  // 保護者ID取得
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", (await supabase.auth.admin.listUsers()).data.users.find((u) => u.email === "demo-parent@example.com")?.id)
    .single()

  if (!parent) {
    console.error("❌ Parent not found")
    return
  }

  // 最近の学習ログを取得
  const { data: logs } = await supabase
    .from("study_logs")
    .select("id")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })
    .limit(5)

  if (!logs || logs.length === 0) {
    console.log("⚠️ No study logs found to attach encouragement")
    return
  }

  const messages = [
    "今日もよく頑張ったね！毎日の積み重ねが大切だよ。",
    "算数の問題、難しかったと思うけど最後まで諦めずにできたね。すごいよ！",
    "理科の学習、しっかり取り組んでいるね。この調子で続けていこう！",
    "国語の読解、少しずつ上達しているよ。応援しているよ！",
    "毎日コツコツ勉強している姿を見て、成長を感じています。",
  ]

  // 保護者のuser_idを取得
  const { data: parentUser } = await supabase
    .from("parents")
    .select("user_id")
    .eq("id", parent.id)
    .single()

  if (!parentUser) {
    console.error("❌ Parent user_id not found")
    return
  }

  const messagesToCreate = logs.slice(0, 4).map((log, index) => ({
    student_id: studentId,
    sender_id: parentUser.user_id,
    sender_role: "parent" as const,
    message: messages[index] || "頑張ったね！",
    is_ai_generated: false,
    read_at: index < 2 ? new Date().toISOString() : null, // 最新2件は既読
  }))

  const { error } = await supabase.from("encouragement_messages").insert(messagesToCreate)

  if (error) {
    console.error("❌ Encouragement messages creation failed:", error.message)
  } else {
    console.log(`✅ Created ${messagesToCreate.length} encouragement messages`)
  }
}

async function main() {
  // 生徒IDを取得
  const { data: students } = await supabase
    .from("students")
    .select("id, grade, full_name, login_id")
    .in("login_id", ["demo-student5", "demo-student6"])

  if (!students || students.length === 0) {
    console.error("❌ Demo students not found")
    return
  }

  for (const student of students) {
    console.log(`\n${"=".repeat(50)}`)
    console.log(`Processing: ${student.full_name} (Grade ${student.grade})`)
    console.log("=".repeat(50))

    await createStudyLogs(student.id, student.grade, student.full_name)
    await createEncouragementMessages(student.id, student.full_name)
  }

  console.log("\n" + "=".repeat(50))
  console.log("✅ Demo study logs added successfully!")
  console.log("=".repeat(50))
}

main()
  .then(() => {
    console.log("\n✅ Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
