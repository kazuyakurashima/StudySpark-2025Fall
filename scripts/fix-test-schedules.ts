import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

async function fixTestSchedules() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("🔧 Fixing test schedules to match requirements...")
  console.log()

  // Get test_type_id for 組分けテスト (grade 5)
  const { data: testType5 } = await supabase
    .from("test_types")
    .select("id")
    .eq("grade", 5)
    .eq("name", "組分けテスト")
    .single()

  if (!testType5) {
    console.error("❌ Test type for grade 5 not found")
    return
  }

  console.log("Test type ID (grade 5):", testType5.id)

  // 要件定義通りのデータ（小5）
  const grade5Tests = [
    {
      name: "第5回公開組分けテスト",
      test_number: 5,
      test_date: "2025-08-31",
      goal_setting_start: "2025-07-01",
      goal_setting_end: "2025-08-31",
    },
    {
      name: "第6回公開組分けテスト",
      test_number: 6,
      test_date: "2025-10-05",
      goal_setting_start: "2025-09-01",
      goal_setting_end: "2025-10-31",
    },
    {
      name: "第7回公開組分けテスト",
      test_number: 7,
      test_date: "2025-11-09",
      goal_setting_start: "2025-10-01",
      goal_setting_end: "2025-11-30",
    },
    {
      name: "第8回公開組分けテスト",
      test_number: 8,
      test_date: "2025-12-14",
      goal_setting_start: "2025-11-01",
      goal_setting_end: "2025-12-31",
    },
    {
      name: "新6年公開組分けテスト",
      test_number: 1,
      test_date: "2026-01-25",
      goal_setting_start: "2025-12-01",
      goal_setting_end: "2026-01-31",
    },
  ]

  // 既存のgrade 5テストを削除
  console.log("Deleting existing grade 5 test schedules...")
  const { error: deleteError } = await supabase
    .from("test_schedules")
    .delete()
    .eq("test_type_id", testType5.id)

  if (deleteError) {
    console.error("❌ Delete error:", deleteError.message)
    return
  }

  console.log("✅ Deleted existing test schedules")
  console.log()

  // 新しいテストスケジュールを挿入
  console.log("Inserting new test schedules...")
  for (const test of grade5Tests) {
    const { error } = await supabase.from("test_schedules").insert({
      test_type_id: testType5.id,
      test_number: test.test_number,
      test_date: test.test_date,
      goal_setting_start_date: test.goal_setting_start,
      goal_setting_end_date: test.goal_setting_end,
    })

    if (error) {
      console.error(`❌ Error inserting ${test.name}:`, error.message)
    } else {
      console.log(`✅ Inserted ${test.name} (${test.test_date})`)
      console.log(`   Goal setting: ${test.goal_setting_start} ~ ${test.goal_setting_end}`)
    }
  }

  console.log()
  console.log("🎉 Test schedules fixed!")
  console.log()

  // 確認
  console.log("Verifying...")
  const { data: verifyTests } = await supabase
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
    .eq("test_types.grade", 5)
    .order("test_date", { ascending: true })

  verifyTests?.forEach((test: any) => {
    console.log(`📝 ${test.test_types.name}`)
    console.log(`   Date: ${test.test_date}`)
    console.log(`   Period: ${test.goal_setting_start_date} ~ ${test.goal_setting_end_date}`)
  })
}

fixTestSchedules()
