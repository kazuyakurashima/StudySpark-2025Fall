import { createAdminClient } from "../lib/supabase/server"

async function setupDemoData() {
  const supabase = createAdminClient()

  console.log("Setting up demo data...\n")

  // 1. Create parent account
  console.log("1. Creating parent account...")
  const { data: parentAuthData, error: parentAuthError } =
    await supabase.auth.admin.createUser({
      email: "demo-parent@example.com",
      password: "demo2025",
      email_confirm: true,
      user_metadata: {
        role: "parent",
        name: "デモ保護者",
      },
    })

  if (parentAuthError) {
    console.error("Error creating parent auth:", parentAuthError)
    return
  }
  console.log("✓ Parent auth user created:", parentAuthData.user.id)

  // 2. Create parent profile
  const { error: parentProfileError } = await supabase.from("profiles").upsert({
    id: parentAuthData.user.id,
    role: "parent",
    display_name: "デモ保護者",
    setup_completed: true,
  })

  if (parentProfileError) {
    console.error("Error creating parent profile:", parentProfileError)
  } else {
    console.log("✓ Parent profile created")
  }

  // 3. Create parent record
  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: parentAuthData.user.id,
      full_name: "デモ保護者",
      furigana: "でもほごしゃ",
    })
    .select()
    .single()

  if (parentError) {
    console.error("Error creating parent record:", parentError)
    return
  }
  console.log("✓ Parent record created:", parentData.id)

  // 4. Link parent to students
  console.log("\n2. Linking parent to students...")
  const studentIds = [3, 4] // demo-student5 (id=3), demo-student6 (id=4)

  for (const studentId of studentIds) {
    const { error } = await supabase.from("parent_child_relations").insert({
      parent_id: parentData.id,
      student_id: studentId,
    })

    if (error) {
      console.error(`Error linking student ${studentId}:`, error)
    } else {
      console.log(`✓ Linked student ${studentId} to parent`)
    }
  }

  // 5. Create sample study logs for demo-student5 (Grade 5)
  console.log("\n3. Creating sample study logs for demo-student5...")
  const student5Logs = [
    // Week 1 - Math
    {
      student_id: 3,
      date: "2024-09-02",
      subject: "算数",
      session_number: 1,
      content_item: "類題",
      problem_count: 10,
      correct_count: 8,
    },
    {
      student_id: 3,
      date: "2024-09-02",
      subject: "算数",
      session_number: 1,
      content_item: "基本問題",
      problem_count: 15,
      correct_count: 12,
    },
    // Week 1 - Japanese
    {
      student_id: 3,
      date: "2024-09-03",
      subject: "国語",
      session_number: 1,
      content_item: "漢字",
      problem_count: 20,
      correct_count: 18,
    },
    {
      student_id: 3,
      date: "2024-09-03",
      subject: "国語",
      session_number: 1,
      content_item: "読解",
      problem_count: 10,
      correct_count: 7,
    },
    // Week 1 - Science
    {
      student_id: 3,
      date: "2024-09-04",
      subject: "理科",
      session_number: 1,
      content_item: "基本問題",
      problem_count: 15,
      correct_count: 13,
    },
    // Week 1 - Social Studies
    {
      student_id: 3,
      date: "2024-09-05",
      subject: "社会",
      session_number: 1,
      content_item: "基本問題",
      problem_count: 15,
      correct_count: 11,
    },
    // Week 2 - Math
    {
      student_id: 3,
      date: "2024-09-09",
      subject: "算数",
      session_number: 2,
      content_item: "類題",
      problem_count: 12,
      correct_count: 10,
    },
    {
      student_id: 3,
      date: "2024-09-09",
      subject: "算数",
      session_number: 2,
      content_item: "練習問題",
      problem_count: 8,
      correct_count: 6,
    },
    // Recent data for current week
    {
      student_id: 3,
      date: "2024-10-14",
      subject: "算数",
      session_number: 7,
      content_item: "類題",
      problem_count: 10,
      correct_count: 9,
    },
    {
      student_id: 3,
      date: "2024-10-14",
      subject: "国語",
      session_number: 7,
      content_item: "漢字",
      problem_count: 20,
      correct_count: 19,
    },
  ]

  const { error: logs5Error } = await supabase
    .from("study_logs")
    .insert(student5Logs)

  if (logs5Error) {
    console.error("Error creating student5 logs:", logs5Error)
  } else {
    console.log(`✓ Created ${student5Logs.length} study logs for student5`)
  }

  // 6. Create sample study logs for demo-student6 (Grade 6)
  console.log("\n4. Creating sample study logs for demo-student6...")
  const student6Logs = [
    // Week 1 - Math
    {
      student_id: 4,
      date: "2024-08-26",
      subject: "算数",
      session_number: 1,
      content_item: "１行問題",
      problem_count: 15,
      correct_count: 13,
    },
    {
      student_id: 4,
      date: "2024-08-26",
      subject: "算数",
      session_number: 1,
      content_item: "基本演習",
      problem_count: 10,
      correct_count: 8,
    },
    // Week 1 - Japanese
    {
      student_id: 4,
      date: "2024-08-27",
      subject: "国語",
      session_number: 1,
      content_item: "漢字・語句",
      problem_count: 20,
      correct_count: 17,
    },
    {
      student_id: 4,
      date: "2024-08-27",
      subject: "国語",
      session_number: 1,
      content_item: "読解",
      problem_count: 8,
      correct_count: 6,
    },
    // Week 1 - Science
    {
      student_id: 4,
      date: "2024-08-28",
      subject: "理科",
      session_number: 1,
      content_item: "基本演習",
      problem_count: 12,
      correct_count: 10,
    },
    // Week 1 - Social Studies
    {
      student_id: 4,
      date: "2024-08-29",
      subject: "社会",
      session_number: 1,
      content_item: "基本演習",
      problem_count: 12,
      correct_count: 9,
    },
    // Recent data for current week
    {
      student_id: 4,
      date: "2024-10-14",
      subject: "算数",
      session_number: 8,
      content_item: "１行問題",
      problem_count: 15,
      correct_count: 14,
    },
    {
      student_id: 4,
      date: "2024-10-14",
      subject: "国語",
      session_number: 8,
      content_item: "漢字・語句",
      problem_count: 20,
      correct_count: 18,
    },
  ]

  const { error: logs6Error } = await supabase
    .from("study_logs")
    .insert(student6Logs)

  if (logs6Error) {
    console.error("Error creating student6 logs:", logs6Error)
  } else {
    console.log(`✓ Created ${student6Logs.length} study logs for student6`)
  }

  // 7. Create sample test goals
  console.log("\n5. Creating sample test goals...")

  // Get test schedules
  const { data: testSchedules } = await supabase
    .from("test_schedules")
    .select("id, test_types!inner(grade, name)")
    .in("test_types.grade", [5, 6])
    .order("test_date", { ascending: true })
    .limit(4)

  if (testSchedules && testSchedules.length > 0) {
    // Find tests for each grade
    const grade5Test = testSchedules.find(
      (t: any) => t.test_types.grade === 5
    )
    const grade6Test = testSchedules.find(
      (t: any) => t.test_types.grade === 6
    )

    const goals = []

    if (grade5Test) {
      goals.push({
        student_id: 3,
        test_schedule_id: grade5Test.id,
        target_course: "B",
        target_class: 15,
        goal_thoughts:
          "前回よりも算数の点数を上げたいです。特に図形問題をしっかり解けるようになりたいです。毎日コツコツ練習して、わからないところは先生に質問します。",
      })
    }

    if (grade6Test) {
      goals.push({
        student_id: 4,
        test_schedule_id: grade6Test.id,
        target_course: "B",
        target_class: 10,
        goal_thoughts:
          "志望校合格に向けて、Bコース10組を目指します。国語の記述問題と算数の応用問題に力を入れて、確実に得点できるようにします。",
      })
    }

    if (goals.length > 0) {
      const { error: goalsError } = await supabase
        .from("test_goals")
        .insert(goals)

      if (goalsError) {
        console.error("Error creating test goals:", goalsError)
      } else {
        console.log(`✓ Created ${goals.length} test goals`)
      }
    } else {
      console.log("⚠ No suitable test schedules found for goals")
    }
  }

  console.log("\n✅ Demo data setup complete!")
  console.log("\nDemo accounts:")
  console.log("  Parent: demo-parent@example.com / demo2025")
  console.log("  Student (Grade 5): demo-student5 / demo2025")
  console.log("  Student (Grade 6): demo-student6 / demo2025")
}

setupDemoData()
