/**
 * 結果入力期間を確認するスクリプト
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

async function checkResultEntryPeriods() {
  console.log("📅 結果入力期間を確認中...")

  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  console.log(`\n現在日時（東京）: ${tokyoNow.toLocaleString("ja-JP")}`)

  // 小学5年生のテストを取得
  console.log("\n【小学5年生】")
  const { data: grade5Tests } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      result_entry_start_date,
      result_entry_end_date,
      detailed_name,
      test_types!inner (
        name,
        grade
      )
    `)
    .eq("test_types.grade", 5)
    .order("test_date", { ascending: true })

  if (grade5Tests) {
    grade5Tests.forEach((test: any) => {
      const testDate = test.test_date
      const startDate = test.result_entry_start_date
      const endDate = test.result_entry_end_date

      console.log(`\n${test.test_types.name}`)
      console.log(`  テスト日: ${testDate}`)
      console.log(`  結果入力開始日: ${startDate || "未設定"}`)
      console.log(`  結果入力終了日: ${endDate || "未設定"}`)

      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const isInPeriod = start <= tokyoNow && tokyoNow <= end
        console.log(`  現在の入力可否: ${isInPeriod ? "✅ 入力可能" : "❌ 入力不可"}`)
      } else {
        console.log(`  現在の入力可否: ⚠️ 期間未設定`)
      }
    })
  }

  // 小学6年生のテストを取得
  console.log("\n\n【小学6年生】")
  const { data: grade6Tests } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      result_entry_start_date,
      result_entry_end_date,
      detailed_name,
      test_types!inner (
        name,
        grade
      )
    `)
    .eq("test_types.grade", 6)
    .order("test_date", { ascending: true })

  if (grade6Tests) {
    grade6Tests.forEach((test: any) => {
      const testDate = test.test_date
      const startDate = test.result_entry_start_date
      const endDate = test.result_entry_end_date

      console.log(`\n${test.test_types.name}`)
      console.log(`  テスト日: ${testDate}`)
      console.log(`  結果入力開始日: ${startDate || "未設定"}`)
      console.log(`  結果入力終了日: ${endDate || "未設定"}`)

      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const isInPeriod = start <= tokyoNow && tokyoNow <= end
        console.log(`  現在の入力可否: ${isInPeriod ? "✅ 入力可能" : "❌ 入力不可"}`)
      } else {
        console.log(`  現在の入力可否: ⚠️ 期間未設定`)
      }
    })
  }
}

checkResultEntryPeriods()
