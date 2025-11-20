import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
)

async function testParentGoalNavi() {
  console.log("=== 保護者ゴールナビデータ確認 ===\n")

  // 1. 保護者のuser_idを取得
  const { data: parent1Auth } = await supabase.auth.admin.listUsers()
  const parent1User = parent1Auth.users.find(u => u.email === "demo-parent1@example.com")

  if (!parent1User) {
    console.log("❌ 保護者アカウントが見つかりません")
    return
  }

  console.log("1️⃣ 保護者ユーザー:", parent1User.email, parent1User.id)

  // 2. parentsテーブルから保護者IDを取得
  const { data: parent } = await supabase
    .from("parents")
    .select("id, user_id, full_name")
    .eq("user_id", parent1User.id)
    .single()

  console.log("2️⃣ Parents record:", parent)

  // 3. parent_child_relationsを取得
  const { data: relations } = await supabase
    .from("parent_child_relations")
    .select("*")
    .eq("parent_id", parent?.id)

  console.log("3️⃣ Parent-Child Relations:", relations)

  if (!relations || relations.length === 0) {
    console.log("❌ 親子関係が見つかりません")
    return
  }

  // 4. 子どもの情報を取得
  const studentIds = relations.map(r => r.student_id)
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, grade, user_id")
    .in("id", studentIds)

  console.log("4️⃣ Students:", students)

  // 5. 子どものprofilesを取得
  const userIds = students?.map(s => s.user_id) || []
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds)

  console.log("5️⃣ Profiles:", profiles)

  // 6. 各子どもの目標を取得
  for (const student of students || []) {
    console.log(`\n📚 ${student.full_name} (小${student.grade}) の目標:`)

    const { data: goals } = await supabase
      .from("test_goals")
      .select(`
        id,
        target_course,
        target_class,
        goal_thoughts,
        test_schedules (
          test_date,
          test_types (
            name,
            grade
          )
        )
      `)
      .eq("student_id", student.id)

    console.log("   Goals:", goals)

    // 7. 利用可能なテストスケジュールを取得
    const { data: schedules } = await supabase
      .from("test_schedules")
      .select(`
        id,
        test_date,
        test_types (
          name,
          grade
        )
      `)
      .eq("test_types.grade", student.grade)
      .gte("test_date", "2025-01-01")
      .order("test_date")
      .limit(5)

    console.log("   Available Tests:", schedules)
  }
}

testParentGoalNavi()
