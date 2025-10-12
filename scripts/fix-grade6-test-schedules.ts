import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixGrade6TestSchedules() {
  console.log("🔧 小学6年生のテストスケジュール修正開始...")

  // 1. 既存の小学6年生テストスケジュールを削除
  const { data: grade6TestTypes } = await supabase
    .from("test_types")
    .select("id")
    .eq("grade", 6)

  if (grade6TestTypes && grade6TestTypes.length > 0) {
    const testTypeIds = grade6TestTypes.map((tt) => tt.id)
    const { error: deleteError } = await supabase
      .from("test_schedules")
      .delete()
      .in("test_type_id", testTypeIds)

    if (deleteError) {
      console.error("❌ 既存データ削除エラー:", deleteError)
      return
    }
    console.log("✅ 既存の小学6年生テストスケジュールを削除しました")
  }

  // 2. 正しいテストスケジュールを挿入
  const grade6Tests = [
    {
      name: "第3回合不合判定テスト",
      test_number: 3,
      test_date: "2025-09-07",
      goal_setting_start: "2025-08-01",
      goal_setting_end: "2025-09-30",
    },
    {
      name: "第4回合不合判定テスト",
      test_number: 4,
      test_date: "2025-10-05",
      goal_setting_start: "2025-09-01",
      goal_setting_end: "2025-10-31",
    },
    {
      name: "第5回合不合判定テスト",
      test_number: 5,
      test_date: "2025-11-16",
      goal_setting_start: "2025-10-01",
      goal_setting_end: "2025-11-30",
    },
    {
      name: "第6回合不合判定テスト",
      test_number: 6,
      test_date: "2025-12-07",
      goal_setting_start: "2025-11-01",
      goal_setting_end: "2025-12-31",
    },
  ]

  for (const test of grade6Tests) {
    // test_typeを取得または作成
    let { data: testType } = await supabase
      .from("test_types")
      .select("id")
      .eq("name", test.name)
      .eq("grade", 6)
      .single()

    if (!testType) {
      const { data: newTestType, error: typeError } = await supabase
        .from("test_types")
        .insert({
          name: test.name,
          grade: 6,
        })
        .select()
        .single()

      if (typeError) {
        console.error(`❌ テストタイプ作成エラー (${test.name}):`, typeError)
        continue
      }
      testType = newTestType
    }

    // test_scheduleを挿入
    const { error: scheduleError } = await supabase
      .from("test_schedules")
      .insert({
        test_type_id: testType.id,
        test_number: test.test_number,
        test_date: test.test_date,
        goal_setting_start_date: test.goal_setting_start,
        goal_setting_end_date: test.goal_setting_end,
      })

    if (scheduleError) {
      console.error(`❌ スケジュール作成エラー (${test.name}):`, scheduleError)
    } else {
      console.log(`✅ ${test.name} (${test.test_date}) を作成しました`)
    }
  }

  // 3. 結果確認
  const { data: result } = await supabase
    .from("test_schedules")
    .select(
      `
      id,
      test_number,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      test_types (
        name,
        grade
      )
    `
    )
    .eq("test_types.grade", 6)
    .order("test_date")

  console.log("\n📊 修正後の小学6年生テストスケジュール:")
  console.table(
    result?.map((r) => ({
      テスト名: r.test_types?.name,
      回数: `第${r.test_number}回`,
      テスト日: r.test_date,
      表示開始: r.goal_setting_start_date,
      表示終了: r.goal_setting_end_date,
    }))
  )

  console.log("\n✨ 小学6年生のテストスケジュール修正完了！")
}

fixGrade6TestSchedules().catch(console.error)
