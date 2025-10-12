import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixResultEntryPeriods() {
  console.log("結果入力期間を修正します...")

  // 小学5年生のテスト結果入力期間
  const grade5Updates = [
    {
      testDate: "2025-08-31",
      resultEntryStartDate: "2025-08-31",
      resultEntryEndDate: "2025-10-31",
    },
    {
      testDate: "2025-10-05",
      resultEntryStartDate: "2025-10-05",
      resultEntryEndDate: "2025-11-30",
    },
    {
      testDate: "2025-11-09",
      resultEntryStartDate: "2025-11-09",
      resultEntryEndDate: "2025-12-31",
    },
    {
      testDate: "2025-12-14",
      resultEntryStartDate: "2025-12-14",
      resultEntryEndDate: "2026-01-31",
    },
    {
      testDate: "2026-01-25",
      resultEntryStartDate: "2026-01-25",
      resultEntryEndDate: "2026-02-28",
    },
  ]

  // 小学6年生のテスト結果入力期間
  const grade6Updates = [
    {
      testDate: "2025-09-07",
      resultEntryStartDate: "2025-09-07",
      resultEntryEndDate: "2025-10-31",
    },
    {
      testDate: "2025-10-05",
      resultEntryStartDate: "2025-10-05",
      resultEntryEndDate: "2025-11-30",
    },
    {
      testDate: "2025-11-16",
      resultEntryStartDate: "2025-11-16",
      resultEntryEndDate: "2025-12-31",
    },
    {
      testDate: "2025-12-07",
      resultEntryStartDate: "2025-12-07",
      resultEntryEndDate: "2026-02-28",
    },
  ]

  // 小学5年生のテストを更新
  console.log("\n小学5年生のテスト結果入力期間を更新中...")
  for (const update of grade5Updates) {
    const { data: testSchedules, error: fetchError } = await supabase
      .from("test_schedules")
      .select("id, test_types!inner(name, grade)")
      .eq("test_date", update.testDate)
      .eq("test_types.grade", 5)

    if (fetchError || !testSchedules || testSchedules.length === 0) {
      console.error(
        `エラー: テスト日 ${update.testDate} のテストスケジュールが見つかりません`,
        fetchError
      )
      continue
    }

    for (const testSchedule of testSchedules) {
      const { error: updateError } = await supabase
        .from("test_schedules")
        .update({
          result_entry_start_date: update.resultEntryStartDate,
          result_entry_end_date: update.resultEntryEndDate,
        })
        .eq("id", testSchedule.id)

      if (updateError) {
        console.error(`エラー: ID ${testSchedule.id} の更新に失敗`, updateError)
      } else {
        console.log(
          `✓ テスト日 ${update.testDate}: 結果入力期間 ${update.resultEntryStartDate} 〜 ${update.resultEntryEndDate}`
        )
      }
    }
  }

  // 小学6年生のテストを更新
  console.log("\n小学6年生のテスト結果入力期間を更新中...")
  for (const update of grade6Updates) {
    const { data: testSchedules, error: fetchError } = await supabase
      .from("test_schedules")
      .select("id, test_types!inner(name, grade)")
      .eq("test_date", update.testDate)
      .eq("test_types.grade", 6)

    if (fetchError || !testSchedules || testSchedules.length === 0) {
      console.error(
        `エラー: テスト日 ${update.testDate} のテストスケジュールが見つかりません`,
        fetchError
      )
      continue
    }

    for (const testSchedule of testSchedules) {
      const { error: updateError } = await supabase
        .from("test_schedules")
        .update({
          result_entry_start_date: update.resultEntryStartDate,
          result_entry_end_date: update.resultEntryEndDate,
        })
        .eq("id", testSchedule.id)

      if (updateError) {
        console.error(`エラー: ID ${testSchedule.id} の更新に失敗`, updateError)
      } else {
        console.log(
          `✓ テスト日 ${update.testDate}: 結果入力期間 ${update.resultEntryStartDate} 〜 ${update.resultEntryEndDate}`
        )
      }
    }
  }

  console.log("\n完了しました！")
}

fixResultEntryPeriods()
  .then(() => {
    console.log("\n全ての更新が完了しました")
    process.exit(0)
  })
  .catch((error) => {
    console.error("エラーが発生しました:", error)
    process.exit(1)
  })
