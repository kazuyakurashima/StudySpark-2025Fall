import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

async function checkGrade6TestSchedules() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("🔍 Checking test schedules for grade 6...")
  console.log()

  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  console.log("Current Tokyo time:", tokyoNow.toISOString())
  console.log()

  const { data: tests, error } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      test_types!inner (
        id,
        name,
        grade
      )
    `)
    .eq("test_types.grade", 6)
    .order("test_date", { ascending: true })

  if (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }

  console.log(`Found ${tests?.length || 0} test schedules for grade 6:`)
  console.log()

  tests?.forEach((test: any) => {
    const isInPeriod =
      test.goal_setting_start_date <= tokyoNow.toISOString() &&
      test.goal_setting_end_date >= tokyoNow.toISOString()

    console.log(`📝 ${test.test_types.name}`)
    console.log(`   Test Date: ${test.test_date}`)
    console.log(`   Goal Setting Period: ${test.goal_setting_start_date} ~ ${test.goal_setting_end_date}`)
    console.log(`   ${isInPeriod ? '✅ IN PERIOD' : '❌ NOT IN PERIOD'}`)
    console.log()
  })

  // Check with query conditions
  console.log("🔍 Testing query with period filter...")
  const { data: filteredTests, error: filteredError } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      test_types!inner (
        name,
        grade
      )
    `)
    .eq("test_types.grade", 6)
    .lte("goal_setting_start_date", tokyoNow.toISOString())
    .gte("goal_setting_end_date", tokyoNow.toISOString())
    .order("test_date", { ascending: true })

  if (filteredError) {
    console.error("❌ Filtered query error:", filteredError.message)
  } else {
    console.log(`Found ${filteredTests?.length || 0} tests within goal setting period`)
    filteredTests?.forEach((test: any) => {
      console.log(`  - ${test.test_types.name} (${test.test_date})`)
    })
  }
}

checkGrade6TestSchedules()
