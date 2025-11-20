/**
 * デモデータ作成スクリプト
 * ピッチプレゼン用のデモユーザーとデータを作成
 */

import { createClient } from "@supabase/supabase-js"
import { getTodayJST, getDaysAgoJST, getDateJST, formatDateToJST } from "../lib/utils/date-jst"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log("🚀 Starting demo data creation...")
console.log(`📍 Supabase URL: ${supabaseUrl}\n`)

// デモアカウント情報
const DEMO_ACCOUNTS = {
  student5: {
    loginId: "demo-student5",
    password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
    email: "demo-student5@studyspark.local",
    fullName: "山田太郎",
    displayName: "たろう",
    grade: 5,
    course: "B" as const,
  },
  student6: {
    loginId: "demo-student6",
    password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
    email: "demo-student6@studyspark.local",
    fullName: "佐藤花子",
    displayName: "はなちゃん",
    grade: 6,
    course: "C" as const,
  },
  parent: {
    email: "demo-parent@example.com",
    password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
    fullName: "山田一郎（保護者）",
    displayName: "山田父",
  },
}

async function createDemoStudent(
  loginId: string,
  password: string,
  email: string,
  fullName: string,
  displayName: string,
  grade: number,
  course: string
) {
  console.log(`📝 Creating demo student: ${fullName} (${loginId})`)

  // 1. Auth User作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (authError) {
    console.error("❌ Auth user creation failed:", authError.message)
    return null
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // 2. Profile作成
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    display_name: displayName,
    role: "student",
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginId}`,
  })

  if (profileError) {
    console.error("❌ Profile creation failed:", profileError.message)
    return null
  }

  console.log("✅ Profile created")

  // 3. Student Record作成
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert({
      user_id: authData.user.id,
      login_id: loginId,
      full_name: fullName,
      grade,
      course,
    })
    .select()
    .single()

  if (studentError) {
    console.error("❌ Student record creation failed:", studentError.message)
    return null
  }

  console.log(`✅ Student record created: ${studentData.id}`)
  console.log(`🎉 Demo student created successfully!`)
  console.log(`   Login ID: ${loginId}`)
  console.log(`   Password: ${password}\n`)

  return studentData
}

async function createDemoParent(email: string, password: string, fullName: string, displayName: string) {
  console.log(`📝 Creating demo parent: ${fullName} (${email})`)

  // 1. Auth User作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (authError) {
    console.error("❌ Auth user creation failed:", authError.message)
    return null
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // 2. Profile作成
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    display_name: displayName,
    role: "parent",
  })

  if (profileError) {
    console.error("❌ Profile creation failed:", profileError.message)
    return null
  }

  console.log("✅ Profile created")

  // 3. Parent Record作成
  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: authData.user.id,
      full_name: fullName,
    })
    .select()
    .single()

  if (parentError) {
    console.error("❌ Parent record creation failed:", parentError.message)
    return null
  }

  console.log(`✅ Parent record created: ${parentData.id}`)
  console.log(`🎉 Demo parent created successfully!`)
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}\n`)

  return parentData
}

async function linkParentToChildren(parentId: number, studentIds: number[]) {
  console.log(`🔗 Linking parent ${parentId} to students ${studentIds.join(", ")}`)

  for (const studentId of studentIds) {
    const { error } = await supabase.from("parent_child_relations").insert({
      parent_id: parentId,
      student_id: studentId,
    })

    if (error) {
      console.error(`❌ Failed to link parent to student ${studentId}:`, error.message)
    } else {
      console.log(`✅ Linked to student ${studentId}`)
    }
  }
}

async function createStudyLogs(studentId: number, grade: number) {
  console.log(`📚 Creating study logs for student ${studentId} (grade ${grade})`)

  // 科目ID取得
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("display_order")

  if (!subjects || subjects.length === 0) {
    console.error("❌ No subjects found")
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

  // 過去2週間分のログを作成（JST基準）
  const logsToCreate = []
  const todayStr = getTodayJST()
  const usedCombinations = new Set<string>() // 重複防止用

  for (let i = 0; i < 14; i++) {
    const studyDate = getDaysAgoJST(i)

    // セッション取得（study_dateに基づく）
    const { data: session } = await supabase
      .from("study_sessions")
      .select("id, session_number")
      .eq("grade", grade)
      .lte("start_date", studyDate)
      .gte("end_date", studyDate)
      .single()

    if (!session) {
      console.log(`  ⚠️ セッションが見つかりません: ${studyDate}`)
      continue
    }

    // 1日1-2科目
    const numSubjectsToday = Math.random() > 0.3 ? 2 : 1
    const shuffledSubjects = [...subjects].sort(() => Math.random() - 0.5)

    for (let j = 0; j < numSubjectsToday && j < shuffledSubjects.length; j++) {
      const subject = shuffledSubjects[j]
      const subjectContentTypes = contentTypes.filter((ct) => ct.subject_id === subject.id)

      if (subjectContentTypes.length === 0) continue

      // ランダムに1つ選択
      const contentType = subjectContentTypes[Math.floor(Math.random() * subjectContentTypes.length)]

      // 重複チェック
      const key = `${studyDate}-${subject.id}-${contentType.id}`
      if (usedCombinations.has(key)) continue
      usedCombinations.add(key)

      const totalProblems = Math.floor(Math.random() * 10) + 10 // 10-20問
      const correctCount = Math.floor(totalProblems * (0.6 + Math.random() * 0.3)) // 60-90%

      // JST 18:00の時刻でlogged_atを設定
      const loggedAt = new Date(`${studyDate}T18:00:00+09:00`).toISOString()

      logsToCreate.push({
        student_id: studentId,
        session_id: session.id,
        subject_id: subject.id,
        study_content_type_id: contentType.id, // 正しいカラム名
        total_problems: totalProblems,
        correct_count: correctCount,
        study_date: studyDate, // JST日付
        logged_at: loggedAt, // JSTで18:00に記録したとする
        reflection_text: i < 3 ? `${subject.name}の学習を頑張りました！` : null,
      })
    }
  }

  const { error } = await supabase.from("study_logs").insert(logsToCreate)

  if (error) {
    console.error("❌ Study logs creation failed:", error.message)
    console.error("Error details:", error)
  } else {
    console.log(`✅ Created ${logsToCreate.length} study logs`)
  }
}

async function createEncouragementMessages(parentId: number, studentId: number) {
  console.log(`💬 Creating encouragement messages for student ${studentId}`)

  // 保護者のuser_idを取得
  const { data: parentData } = await supabase
    .from("parents")
    .select("user_id")
    .eq("id", parentId)
    .single()

  if (!parentData) {
    console.error("❌ Parent user_id not found")
    return
  }

  const parentUserId = parentData.user_id

  // 最近の学習ログを取得（logged_atでソート）
  const { data: logs } = await supabase
    .from("study_logs")
    .select("id, logged_at")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })
    .limit(3)

  if (!logs || logs.length === 0) {
    console.log("⚠️ No study logs found to attach encouragement")
    return
  }

  const messages = [
    "よく頑張ったね！この調子で続けていこう！",
    "算数の問題、難しかったと思うけど最後まで諦めずにできたね。すごいよ！",
    "毎日コツコツ勉強している姿を見て、成長を感じています。応援しているよ！",
  ]

  const messagesToCreate = logs.map((log, index) => ({
    student_id: studentId,
    sender_id: parentUserId, // user_id（UUID）を使用
    sender_role: "parent" as const, // sender_role
    support_type: "custom" as const, // support_type
    message: messages[index] || "頑張ったね！", // message
    related_study_log_id: log.id, // related_study_log_id
    is_ai_generated: false,
    read_at: index === 0 ? new Date().toISOString() : null, // 最新のみ既読
  }))

  const { error } = await supabase.from("encouragement_messages").insert(messagesToCreate)

  if (error) {
    console.error("❌ Encouragement messages creation failed:", error.message)
    console.error("Error details:", error)
  } else {
    console.log(`✅ Created ${messagesToCreate.length} encouragement messages`)
  }
}

async function createTestGoal(studentId: number, grade: number) {
  console.log(`🎯 Creating test goal for student ${studentId}`)

  // テスト日程取得
  const { data: testTypes } = await supabase.from("test_types").select("id").eq("grade", grade).single()

  if (!testTypes) {
    console.error("❌ No test type found")
    return
  }

  const { data: testSchedule } = await supabase
    .from("test_schedules")
    .select("id")
    .eq("test_type_id", testTypes.id)
    .order("test_date", { ascending: true })
    .limit(1)
    .single()

  if (!testSchedule) {
    console.error("❌ No test schedule found")
    return
  }

  const goalThoughts =
    grade === 5
      ? "次の組分けテストではBコースの上位を目指します！算数と理科を特に頑張って、毎日少しずつ復習を続けていきたいです。"
      : "合不合判定テストで偏差値60を目指します。苦手な国語の読解問題を克服するために、毎日文章を読む習慣をつけます！"

  const { error } = await supabase.from("test_goals").insert({
    student_id: studentId,
    test_schedule_id: testSchedule.id,
    target_course: grade === 5 ? "B" : "C",
    target_class: grade === 5 ? 15 : 10,
    goal_thoughts: goalThoughts,
  })

  if (error) {
    console.error("❌ Test goal creation failed:", error.message)
  } else {
    console.log("✅ Test goal created")
  }
}

async function createReflectSession(studentId: number) {
  console.log(`🤔 Creating coaching session for student ${studentId}`)

  // 先週の月曜日〜日曜日を取得（JST基準）
  // UTC環境でも正しくJSTの週境界を計算するため、JSTの曜日を使用
  const todayJST = getTodayJST()
  const todayJSTDate = new Date(`${todayJST}T00:00:00+09:00`)
  const dayOfWeek = todayJSTDate.getUTCDay() // 0(日)〜6(土)

  // JST基準で今日から今週月曜日までの日数（日曜=6, 月曜=0, 火曜=1, ...）
  const offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // 先週の月曜日と日曜日（week_start_date <= week_end_date が保証される）
  const lastWeekMonday = getDaysAgoJST(offsetToMonday + 7) // 先週月曜
  const lastWeekSunday = getDaysAgoJST(offsetToMonday + 1) // 先週日曜

  const { data: session, error: sessionError } = await supabase
    .from("coaching_sessions")
    .insert({
      student_id: studentId,
      week_start_date: lastWeekMonday,
      week_end_date: lastWeekSunday,
      week_type: "stable",
      status: "completed",
      total_turns: 4,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (sessionError) {
    console.error("❌ Coaching session creation failed:", sessionError.message)
    console.error("Error details:", sessionError)
    return
  }

  // メッセージ追加
  const messages = [
    {
      session_id: session.id,
      role: "assistant" as const,
      content: "今週の学習、お疲れさまでした！どんな1週間でしたか？",
      turn_number: 1,
      sent_at: new Date(Date.now() - 3600000 * 3).toISOString(), // 3時間前
    },
    {
      session_id: session.id,
      role: "user" as const,
      content: "算数と理科を頑張りました。基本はできるけど、応用がまだ難しいです。",
      turn_number: 2,
      sent_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    },
    {
      session_id: session.id,
      role: "assistant" as const,
      content: "基本がしっかりできているのは素晴らしいですね！応用問題は時間がかかるものです。来週はどんなことにチャレンジしたいですか？",
      turn_number: 3,
      sent_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      session_id: session.id,
      role: "user" as const,
      content: "演習問題をたくさん解いて、スピードアップしたいです！",
      turn_number: 4,
      sent_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
  ]

  const { error: messagesError } = await supabase.from("coaching_messages").insert(messages)

  if (messagesError) {
    console.error("❌ Coaching messages creation failed:", messagesError.message)
    console.error("Error details:", messagesError)
  } else {
    console.log(`✅ Coaching session created with ${messages.length} messages`)
  }
}

async function main() {
  console.log("==================================================")
  console.log("👨‍🎓 Creating Demo Students")
  console.log("==================================================\n")

  // 小5生徒作成
  const student5 = await createDemoStudent(
    DEMO_ACCOUNTS.student5.loginId,
    DEMO_ACCOUNTS.student5.password,
    DEMO_ACCOUNTS.student5.email,
    DEMO_ACCOUNTS.student5.fullName,
    DEMO_ACCOUNTS.student5.displayName,
    DEMO_ACCOUNTS.student5.grade,
    DEMO_ACCOUNTS.student5.course
  )

  // 小6生徒作成
  const student6 = await createDemoStudent(
    DEMO_ACCOUNTS.student6.loginId,
    DEMO_ACCOUNTS.student6.password,
    DEMO_ACCOUNTS.student6.email,
    DEMO_ACCOUNTS.student6.fullName,
    DEMO_ACCOUNTS.student6.displayName,
    DEMO_ACCOUNTS.student6.grade,
    DEMO_ACCOUNTS.student6.course
  )

  console.log("==================================================")
  console.log("👨‍👩‍👧 Creating Demo Parent")
  console.log("==================================================\n")

  // 保護者作成
  const parent = await createDemoParent(
    DEMO_ACCOUNTS.parent.email,
    DEMO_ACCOUNTS.parent.password,
    DEMO_ACCOUNTS.parent.fullName,
    DEMO_ACCOUNTS.parent.displayName
  )

  if (student5 && student6 && parent) {
    console.log("==================================================")
    console.log("🔗 Linking Relationships")
    console.log("==================================================\n")

    await linkParentToChildren(parent.id, [student5.id, student6.id])

    console.log("\n==================================================")
    console.log("📊 Creating Demo Data")
    console.log("==================================================\n")

    // 学習ログ作成
    await createStudyLogs(student5.id, 5)
    await createStudyLogs(student6.id, 6)

    // 応援メッセージ作成
    await createEncouragementMessages(parent.id, student5.id)
    await createEncouragementMessages(parent.id, student6.id)

    // 目標作成
    await createTestGoal(student5.id, 5)
    await createTestGoal(student6.id, 6)

    // 振り返り作成
    await createReflectSession(student5.id)
    await createReflectSession(student6.id)
  }

  console.log("\n==================================================")
  console.log("📋 Demo Accounts Summary")
  console.log("==================================================\n")

  console.log("🎓 Student Accounts (主催者に渡す):")
  console.log(`   1. Login ID: ${DEMO_ACCOUNTS.student5.loginId}`)
  console.log(`      Password: ${DEMO_ACCOUNTS.student5.password}`)
  console.log(`      (小学5年生 - 組分けテスト対象)\n`)

  console.log(`   2. Login ID: ${DEMO_ACCOUNTS.student6.loginId}`)
  console.log(`      Password: ${DEMO_ACCOUNTS.student6.password}`)
  console.log(`      (小学6年生 - 合不合判定テスト対象)\n`)

  console.log("👨‍👩‍👧 Parent Account (主催者に渡す):")
  console.log(`   Email: ${DEMO_ACCOUNTS.parent.email}`)
  console.log(`   Password: ${DEMO_ACCOUNTS.parent.password}\n`)

  console.log("==================================================")
  console.log("✅ Demo data creation completed!")
  console.log("==================================================")
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
