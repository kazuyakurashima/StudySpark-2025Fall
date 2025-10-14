/**
 * demo-student5とdemo-student6のゴールナビ目標データを削除するスクリプト
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

async function clearDemoStudentGoals() {
  console.log("🗑️  demo-student5とdemo-student6の目標データを削除中...")

  try {
    // demo-student5とdemo-student6のstudent_idを取得
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, login_id, full_name")
      .in("login_id", ["demo-student5", "demo-student6"])

    if (studentsError) {
      throw studentsError
    }

    if (!students || students.length === 0) {
      console.log("⚠️  対象の生徒が見つかりませんでした")
      return
    }

    console.log(`\n📋 対象生徒:`)
    students.forEach((s) => {
      console.log(`  - ${s.full_name} (${s.login_id})`)
    })

    const studentIds = students.map((s) => s.id)

    // 既存の目標データを確認
    const { data: existingGoals, error: existingError } = await supabase
      .from("test_goals")
      .select(
        `
        id,
        student_id,
        target_course,
        target_class,
        goal_thoughts,
        test_schedules (
          test_types (
            name
          ),
          test_date
        )
      `
      )
      .in("student_id", studentIds)

    if (existingError) {
      throw existingError
    }

    if (!existingGoals || existingGoals.length === 0) {
      console.log("\n✅ 削除対象の目標データはありません")
      return
    }

    console.log(`\n🔍 削除対象の目標: ${existingGoals.length}件`)
    existingGoals.forEach((goal: any) => {
      const student = students.find((s) => s.id === goal.student_id)
      console.log(
        `  - ${student?.full_name}: ${goal.test_schedules.test_types.name} (${goal.test_schedules.test_date})`
      )
    })

    // 削除実行
    const { error: deleteError } = await supabase
      .from("test_goals")
      .delete()
      .in("student_id", studentIds)

    if (deleteError) {
      throw deleteError
    }

    console.log(`\n✅ ${existingGoals.length}件の目標データを削除しました`)
  } catch (error) {
    console.error("❌ エラーが発生しました:", error)
    process.exit(1)
  }
}

clearDemoStudentGoals()
