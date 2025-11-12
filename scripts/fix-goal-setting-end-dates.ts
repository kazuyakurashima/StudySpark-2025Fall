import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

async function fixGoalSettingEndDates() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("🔧 Fixing goal_setting_end_date to match test_date...")
  console.log()

  // First, get all test schedules
  const { data: allSchedules, error: fetchError } = await supabase
    .from("test_schedules")
    .select("id, test_date, goal_setting_end_date")

  if (fetchError) {
    console.error("❌ Fetch error:", fetchError.message)
    process.exit(1)
  }

  // Update each schedule where goal_setting_end_date != test_date
  let updateCount = 0
  for (const schedule of allSchedules || []) {
    if (schedule.goal_setting_end_date !== schedule.test_date) {
      const { error: updateError } = await supabase
        .from("test_schedules")
        .update({ goal_setting_end_date: schedule.test_date })
        .eq("id", schedule.id)

      if (updateError) {
        console.error(`❌ Error updating schedule ${schedule.id}:`, updateError.message)
      } else {
        updateCount++
        console.log(`✅ Updated schedule ${schedule.id}: ${schedule.goal_setting_end_date} → ${schedule.test_date}`)
      }
    }
  }

  console.log()
  console.log(`✅ Updated ${updateCount} test schedules`)
  console.log()

  // Verify the changes
  console.log("🔍 Verifying changes...")
  const { data: allTests, error: verifyError } = await supabase
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
    .order("test_date", { ascending: true })

  if (verifyError) {
    console.error("❌ Verification error:", verifyError.message)
    process.exit(1)
  }

  console.log("\n📊 All test schedules:")
  allTests?.forEach((test: any) => {
    const match = test.goal_setting_end_date === test.test_date
    console.log(`${match ? '✅' : '❌'} ${test.test_types.name} (Grade ${test.test_types.grade})`)
    console.log(`   Test Date: ${test.test_date}`)
    console.log(`   Goal Period: ${test.goal_setting_start_date} 〜 ${test.goal_setting_end_date}`)
    console.log()
  })

  console.log("✅ All done!")
}

fixGoalSettingEndDates()
