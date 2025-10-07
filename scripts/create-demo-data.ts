/**
 * デモデータ作成スクリプト
 * ピッチプレゼン用のデモユーザーとデータを作成
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

console.log("🚀 Starting demo data creation...")
console.log(`📍 Supabase URL: ${supabaseUrl}\n`)

// デモアカウント情報
const DEMO_ACCOUNTS = {
  student5: {
    loginId: "demo-student5",
    password: "demo2025",
    email: "demo-student5@studyspark.local",
    fullName: "山田太郎",
    displayName: "たろう",
    grade: 5,
    course: "B" as const,
  },
  student6: {
    loginId: "demo-student6",
    password: "demo2025",
    email: "demo-student6@studyspark.local",
    fullName: "佐藤花子",
    displayName: "はなちゃん",
    grade: 6,
    course: "C" as const,
  },
  parent: {
    email: "demo-parent@example.com",
    password: "demo2025",
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
  console.log(`📚 Creating study logs for student ${studentId}`)

  // 科目ID取得
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("display_order")

  if (!subjects || subjects.length === 0) {
    console.error("❌ No subjects found")
    return
  }

  // 学習回取得
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, session_number")
    .eq("grade", grade)
    .order("session_number")
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

    // 1日1-2科目
    const numSubjectsToday = Math.random() > 0.3 ? 2 : 1

    for (let j = 0; j < numSubjectsToday; j++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)]
      const session = sessions[Math.floor(Math.random() * sessions.length)]
      const contentType = contentTypes.find((ct) => ct.subject_id === subject.id)

      if (!contentType) continue

      const totalProblems = Math.floor(Math.random() * 10) + 10 // 10-20問
      const correctCount = Math.floor(totalProblems * (0.6 + Math.random() * 0.3)) // 60-90%

      logsToCreate.push({
        student_id: studentId,
        session_id: session.id,
        subject_id: subject.id,
        content_type_id: contentType.id,
        total_problems: totalProblems,
        correct_count: correctCount,
        study_date: logDate.toISOString().split("T")[0],
        student_record_time: logDate.toISOString(),
        reflection_text: i < 3 ? `${subject.name}の学習を頑張りました！` : null,
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

async function createEncouragementMessages(parentId: number, studentId: number) {
  console.log(`💬 Creating encouragement messages for student ${studentId}`)

  // 最近の学習ログを取得
  const { data: logs } = await supabase
    .from("study_logs")
    .select("id")
    .eq("student_id", studentId)
    .order("student_record_time", { ascending: false })
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
    sender_id: parentId,
    sender_type: "parent" as const,
    study_log_id: log.id,
    message_type: "custom" as const,
    message_content: messages[index] || "頑張ったね！",
    is_read: index === 0, // 最新のみ既読
  }))

  const { error } = await supabase.from("encouragement_messages").insert(messagesToCreate)

  if (error) {
    console.error("❌ Encouragement messages creation failed:", error.message)
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
  console.log(`🤔 Creating reflect session for student ${studentId}`)

  const summary = "今週は算数と理科を中心に学習しました。基本問題は理解できていますが、応用問題でまだ時間がかかります。来週は演習問題を多めに取り組んで、スピードアップを目指します！"

  const { data: session, error: sessionError } = await supabase
    .from("reflect_sessions")
    .insert({
      student_id: studentId,
      week_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      week_type: "stable",
      summary,
      is_completed: true,
    })
    .select()
    .single()

  if (sessionError) {
    console.error("❌ Reflect session creation failed:", sessionError.message)
    return
  }

  // メッセージ追加
  const messages = [
    {
      session_id: session.id,
      turn_number: 1,
      sender: "ai" as const,
      message: "今週の学習、お疲れさまでした！どんな1週間でしたか？",
    },
    {
      session_id: session.id,
      turn_number: 2,
      sender: "student" as const,
      message: "算数と理科を頑張りました。基本はできるけど、応用がまだ難しいです。",
    },
    {
      session_id: session.id,
      turn_number: 3,
      sender: "ai" as const,
      message: "基本がしっかりできているのは素晴らしいですね！応用問題は時間がかかるものです。来週はどんなことにチャレンジしたいですか？",
    },
    {
      session_id: session.id,
      turn_number: 4,
      sender: "student" as const,
      message: "演習問題をたくさん解いて、スピードアップしたいです！",
    },
  ]

  const { error: messagesError } = await supabase.from("reflect_messages").insert(messages)

  if (messagesError) {
    console.error("❌ Reflect messages creation failed:", messagesError.message)
  } else {
    console.log("✅ Reflect session created with messages")
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
