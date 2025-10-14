/**
 * demo-student5とdemo-student6の目標を確認するスクリプト
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

async function checkDemoStudentGoals() {
  console.log("🎯 demo生徒の目標を確認中...")

  // demo-student5とdemo-student6の情報を取得
  const { data: students } = await supabase
    .from("students")
    .select("id, login_id, full_name, grade")
    .in("login_id", ["demo-student5", "demo-student6"])

  if (!students) {
    console.log("⚠️ デモ生徒が見つかりません")
    return
  }

  for (const student of students) {
    console.log(`\n【${student.full_name} (${student.login_id})】 - 小${student.grade}`)

    // 目標を取得
    const { data: goals } = await supabase
      .from("test_goals")
      .select(`
        id,
        target_course,
        target_class,
        goal_thoughts,
        test_schedules!inner (
          test_date,
          result_entry_start_date,
          result_entry_end_date,
          test_types!inner (
            name
          )
        )
      `)
      .eq("student_id", student.id)
      .order("test_schedules.test_date", { ascending: true })

    if (!goals || goals.length === 0) {
      console.log("  ⚠️ 目標が設定されていません")
    } else {
      console.log(`  設定済み目標: ${goals.length}件\n`)
      goals.forEach((goal: any) => {
        console.log(`  📌 ${goal.test_schedules.test_types.name}`)
        console.log(`     テスト日: ${goal.test_schedules.test_date}`)
        console.log(`     目標: ${goal.target_course}コース ${goal.target_class}組`)
        console.log(`     結果入力期間: ${goal.test_schedules.result_entry_start_date} 〜 ${goal.test_schedules.result_entry_end_date}`)

        const now = new Date()
        const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
        const startDate = new Date(goal.test_schedules.result_entry_start_date)
        const endDate = new Date(goal.test_schedules.result_entry_end_date)
        const isInPeriod = startDate <= tokyoNow && tokyoNow <= endDate

        console.log(`     結果入力可否: ${isInPeriod ? "✅ 可能" : "❌ 不可"}\n`)
      })
    }

    // 結果を取得
    const { data: results } = await supabase
      .from("test_results")
      .select(`
        id,
        result_course,
        result_class,
        test_schedules!inner (
          test_date,
          test_types!inner (
            name
          )
        )
      `)
      .eq("student_id", student.id)
      .order("test_schedules.test_date", { ascending: true })

    if (results && results.length > 0) {
      console.log(`  入力済み結果: ${results.length}件\n`)
      results.forEach((result: any) => {
        console.log(`  📊 ${result.test_schedules.test_types.name}`)
        console.log(`     テスト日: ${result.test_schedules.test_date}`)
        console.log(`     結果: ${result.result_course}コース ${result.result_class}組\n`)
      })
    }
  }
}

checkDemoStudentGoals()
