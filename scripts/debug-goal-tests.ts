import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugGoalTests() {
  console.log("🔍 Debugging goal test selection issue...")

  // 現在の日時（Asia/Tokyo）
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  console.log(`\n📅 Current time (Tokyo): ${tokyoNow.toISOString()}`)

  // 1. すべてのテスト日程を確認
  const { data: allTests, error: allTestsError } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_type_id,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      result_entry_start_date,
      result_entry_end_date,
      test_types (
        id,
        name,
        grade,
        type_category
      )
    `)
    .order("test_date", { ascending: true })
    .limit(20)

  if (allTestsError) {
    console.error("❌ Error fetching all tests:", allTestsError)
  } else {
    console.log(`\n📊 Total test schedules in DB: ${allTests?.length || 0}`)
    allTests?.forEach((test: any) => {
      console.log(`\nTest ID: ${test.id}`)
      console.log(`  Name: ${test.test_types.name} (Grade ${test.test_types.grade})`)
      console.log(`  Test Date: ${test.test_date}`)
      console.log(`  Goal Setting Period: ${test.goal_setting_start_date} ~ ${test.goal_setting_end_date}`)
      console.log(`  Result Entry Period: ${test.result_entry_start_date} ~ ${test.result_entry_end_date}`)
    })
  }

  // 2. 小学6年生の目標設定可能なテストを確認
  const { data: grade6Tests, error: grade6Error } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_type_id,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      test_types!inner (
        id,
        name,
        grade,
        type_category
      )
    `)
    .eq("test_types.grade", 6)
    .lte("goal_setting_start_date", tokyoNow.toISOString())
    .gte("goal_setting_end_date", tokyoNow.toISOString())
    .order("test_date", { ascending: true })

  if (grade6Error) {
    console.error("\n❌ Error fetching grade 6 tests:", grade6Error)
  } else {
    console.log(`\n✅ Grade 6 tests in goal setting period: ${grade6Tests?.length || 0}`)
    if (grade6Tests && grade6Tests.length > 0) {
      grade6Tests.forEach((test: any) => {
        console.log(`  - ${test.test_types.name} (${test.test_date})`)
      })
    } else {
      console.log("  ⚠️  No tests available for goal setting at this time")
    }
  }

  // 3. 今日から見て近い未来のテストを確認（目標設定期間が始まっていないテスト）
  const { data: futureTests, error: futureError } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      test_types!inner (
        name,
        grade
      )
    `)
    .eq("test_types.grade", 6)
    .gt("goal_setting_start_date", tokyoNow.toISOString())
    .order("test_date", { ascending: true })
    .limit(5)

  if (futureError) {
    console.error("\n❌ Error fetching future tests:", futureError)
  } else {
    console.log(`\n📆 Upcoming tests (goal setting not started yet): ${futureTests?.length || 0}`)
    futureTests?.forEach((test: any) => {
      console.log(`  - ${test.test_types.name}`)
      console.log(`    Test Date: ${test.test_date}`)
      console.log(`    Goal Setting Starts: ${test.goal_setting_start_date}`)
    })
  }

  // 4. 過去のテスト（目標設定期間が終了したテスト）
  const { data: pastTests, error: pastError } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      test_types!inner (
        name,
        grade
      )
    `)
    .eq("test_types.grade", 6)
    .lt("goal_setting_end_date", tokyoNow.toISOString())
    .order("test_date", { ascending: false })
    .limit(5)

  if (pastError) {
    console.error("\n❌ Error fetching past tests:", pastError)
  } else {
    console.log(`\n⏰ Past tests (goal setting ended): ${pastTests?.length || 0}`)
    pastTests?.forEach((test: any) => {
      console.log(`  - ${test.test_types.name}`)
      console.log(`    Test Date: ${test.test_date}`)
      console.log(`    Goal Setting Ended: ${test.goal_setting_end_date}`)
    })
  }
}

debugGoalTests().catch(console.error)
