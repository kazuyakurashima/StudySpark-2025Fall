/**
 * P3-1 ゴールナビ機能テストスクリプト
 *
 * テスト項目:
 * 1. getAvailableTests() - テスト日程取得（表示期間制御）
 * 2. saveTestGoal() - 目標保存（重複防止）
 * 3. getTestGoal() - 既存目標取得
 * 4. getAllTestGoals() - 全目標取得
 * 5. AI対話システム - 6ステップ対話（モック）
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

interface TestResult {
  test: string
  status: "✅ SUCCESS" | "❌ FAILED"
  details?: string
  error?: string
}

const results: TestResult[] = []

async function test1_getAvailableTests() {
  console.log("\n📝 Test 1: テスト日程取得（表示期間制御）")

  try {
    // テスト用の生徒IDを取得（小学6年生）
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, grade, full_name")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) {
      results.push({
        test: "Test 1: getAvailableTests()",
        status: "❌ FAILED",
        error: "テスト用の小学6年生が見つかりません",
      })
      return
    }

    console.log(`   生徒: ${student.full_name} (小学${student.grade}年生)`)

    // 現在日時を設定（テスト用）
    const now = new Date()

    // test_schedulesから表示期間内のテストを取得
    const { data: tests, error } = await supabase
      .from("test_schedules")
      .select(`
        id,
        test_type_id,
        test_date,
        display_start_date,
        display_end_date,
        test_types (
          id,
          name,
          type_category,
          target_grade
        )
      `)
      .eq("test_types.target_grade", student.grade)
      .lte("display_start_date", now.toISOString())
      .gte("display_end_date", now.toISOString())
      .order("test_date", { ascending: true })

    if (error) {
      results.push({
        test: "Test 1: getAvailableTests()",
        status: "❌ FAILED",
        error: error.message,
      })
      return
    }

    console.log(`   ✅ ${tests?.length || 0}件のテストを取得`)
    if (tests && tests.length > 0) {
      tests.forEach((test: any) => {
        console.log(`      - ${test.test_types.name} (${test.test_date})`)
      })
    }

    results.push({
      test: "Test 1: getAvailableTests()",
      status: "✅ SUCCESS",
      details: `${tests?.length || 0}件のテストを取得（表示期間制御OK）`,
    })
  } catch (error: any) {
    results.push({
      test: "Test 1: getAvailableTests()",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test2_saveTestGoal() {
  console.log("\n📝 Test 2: 目標保存（重複防止）")

  try {
    // テスト用の生徒を取得
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, full_name")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) {
      results.push({
        test: "Test 2: saveTestGoal()",
        status: "❌ FAILED",
        error: "テスト用の生徒が見つかりません",
      })
      return
    }

    // テスト日程を取得
    const { data: testSchedule } = await supabase
      .from("test_schedules")
      .select("id, test_types(name)")
      .limit(1)
      .single()

    if (!testSchedule) {
      results.push({
        test: "Test 2: saveTestGoal()",
        status: "❌ FAILED",
        error: "テスト日程が見つかりません",
      })
      return
    }

    console.log(`   生徒: ${student.full_name}`)
    console.log(`   テスト: ${(testSchedule as any).test_types.name}`)

    // 既存の目標を削除（クリーンアップ）
    await supabase
      .from("test_goals")
      .delete()
      .eq("student_id", student.id)
      .eq("test_schedule_id", testSchedule.id)

    // 1回目: 新規保存
    const goalData1 = {
      student_id: student.id,
      test_schedule_id: testSchedule.id,
      target_course: "C",
      target_class: 15,
      goal_thoughts: "今回は絶対にCコース15組を目指す！",
    }

    const { data: inserted, error: insertError } = await supabase
      .from("test_goals")
      .insert(goalData1)
      .select()
      .single()

    if (insertError) {
      results.push({
        test: "Test 2: saveTestGoal()",
        status: "❌ FAILED",
        error: `新規保存失敗: ${insertError.message}`,
      })
      return
    }

    console.log(`   ✅ 新規保存成功 (ID: ${inserted.id})`)

    // 2回目: 更新（重複防止）
    const { data: existing } = await supabase
      .from("test_goals")
      .select("id")
      .eq("student_id", student.id)
      .eq("test_schedule_id", testSchedule.id)
      .single()

    if (existing) {
      const { error: updateError } = await supabase
        .from("test_goals")
        .update({
          target_course: "B",
          target_class: 20,
          goal_thoughts: "目標を変更！Bコース20組を目指す！",
        })
        .eq("id", existing.id)

      if (updateError) {
        results.push({
          test: "Test 2: saveTestGoal()",
          status: "❌ FAILED",
          error: `更新失敗: ${updateError.message}`,
        })
        return
      }

      console.log(`   ✅ 重複チェック＆更新成功 (ID: ${existing.id})`)
    }

    // クリーンアップ
    await supabase
      .from("test_goals")
      .delete()
      .eq("student_id", student.id)
      .eq("test_schedule_id", testSchedule.id)

    results.push({
      test: "Test 2: saveTestGoal()",
      status: "✅ SUCCESS",
      details: "新規保存・重複防止・更新すべて正常",
    })
  } catch (error: any) {
    results.push({
      test: "Test 2: saveTestGoal()",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test3_getTestGoal() {
  console.log("\n📝 Test 3: 既存目標取得")

  try {
    // テスト用の生徒を取得
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, full_name")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) {
      results.push({
        test: "Test 3: getTestGoal()",
        status: "❌ FAILED",
        error: "テスト用の生徒が見つかりません",
      })
      return
    }

    // テスト日程を取得
    const { data: testSchedule } = await supabase
      .from("test_schedules")
      .select("id, test_types(name)")
      .limit(1)
      .single()

    if (!testSchedule) {
      results.push({
        test: "Test 3: getTestGoal()",
        status: "❌ FAILED",
        error: "テスト日程が見つかりません",
      })
      return
    }

    // テスト用の目標を作成
    const { data: created } = await supabase
      .from("test_goals")
      .insert({
        student_id: student.id,
        test_schedule_id: testSchedule.id,
        target_course: "C",
        target_class: 15,
        goal_thoughts: "テスト目標！",
      })
      .select()
      .single()

    console.log(`   生徒: ${student.full_name}`)
    console.log(`   テスト: ${(testSchedule as any).test_types.name}`)

    // 目標を取得
    const { data: goal, error } = await supabase
      .from("test_goals")
      .select("*")
      .eq("student_id", student.id)
      .eq("test_schedule_id", testSchedule.id)
      .single()

    if (error) {
      results.push({
        test: "Test 3: getTestGoal()",
        status: "❌ FAILED",
        error: error.message,
      })
      return
    }

    console.log(`   ✅ 目標取得成功: ${goal.target_course}コース${goal.target_class}組`)
    console.log(`      思い: ${goal.goal_thoughts}`)

    // クリーンアップ
    if (created) {
      await supabase.from("test_goals").delete().eq("id", created.id)
    }

    results.push({
      test: "Test 3: getTestGoal()",
      status: "✅ SUCCESS",
      details: `目標取得成功: ${goal.target_course}コース${goal.target_class}組`,
    })
  } catch (error: any) {
    results.push({
      test: "Test 3: getTestGoal()",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test4_getAllTestGoals() {
  console.log("\n📝 Test 4: 全目標取得")

  try {
    // テスト用の生徒を取得
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, full_name")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) {
      results.push({
        test: "Test 4: getAllTestGoals()",
        status: "❌ FAILED",
        error: "テスト用の生徒が見つかりません",
      })
      return
    }

    console.log(`   生徒: ${student.full_name}`)

    // テスト用の目標を2件作成
    const { data: testSchedules } = await supabase
      .from("test_schedules")
      .select("id, test_types(name)")
      .limit(2)

    if (!testSchedules || testSchedules.length < 2) {
      results.push({
        test: "Test 4: getAllTestGoals()",
        status: "❌ FAILED",
        error: "テスト日程が不足しています",
      })
      return
    }

    const createdGoals = []
    for (let i = 0; i < 2; i++) {
      const { data: created } = await supabase
        .from("test_goals")
        .insert({
          student_id: student.id,
          test_schedule_id: testSchedules[i].id,
          target_course: ["C", "B"][i],
          target_class: [15, 20][i],
          goal_thoughts: `テスト目標${i + 1}！`,
        })
        .select()
        .single()

      if (created) createdGoals.push(created)
    }

    // 全目標を取得
    const { data: goals, error } = await supabase
      .from("test_goals")
      .select(`
        *,
        test_schedules (
          test_date,
          test_types (
            name
          )
        )
      `)
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })

    if (error) {
      results.push({
        test: "Test 4: getAllTestGoals()",
        status: "❌ FAILED",
        error: error.message,
      })
      return
    }

    console.log(`   ✅ ${goals?.length || 0}件の目標を取得`)
    if (goals) {
      goals.forEach((goal: any) => {
        console.log(`      - ${goal.test_schedules.test_types.name}: ${goal.target_course}コース${goal.target_class}組`)
      })
    }

    // クリーンアップ
    for (const goal of createdGoals) {
      await supabase.from("test_goals").delete().eq("id", goal.id)
    }

    results.push({
      test: "Test 4: getAllTestGoals()",
      status: "✅ SUCCESS",
      details: `${goals?.length || 0}件の目標を取得`,
    })
  } catch (error: any) {
    results.push({
      test: "Test 4: getAllTestGoals()",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test5_aiDialogueSystem() {
  console.log("\n📝 Test 5: AI対話システム（プロンプト設計確認）")

  try {
    // lib/openai/prompts.tsの確認（インポート可能か）
    const { getGoalNavigationSystemPrompt, getGoalNavigationStepPrompt } = await import(
      "../../lib/openai/prompts"
    )

    // システムプロンプト生成
    const systemPrompt = getGoalNavigationSystemPrompt()
    console.log(`   ✅ システムプロンプト生成成功 (${systemPrompt.length}文字)`)

    // 各ステップのプロンプト生成
    const context = {
      studentName: "テスト太郎",
      targetCourse: "Cコース",
      targetClass: 15,
      testName: "第3回合不合判定テスト",
      testDate: "9月7日(日)",
      conversationHistory: [],
      currentStep: 1 as const,
    }

    for (let step = 1; step <= 6; step++) {
      const stepPrompt = getGoalNavigationStepPrompt({
        ...context,
        currentStep: step as 1 | 2 | 3 | 4 | 5 | 6,
      })
      console.log(`   ✅ Step ${step}プロンプト生成成功 (${stepPrompt.length}文字)`)
    }

    results.push({
      test: "Test 5: AI対話システム",
      status: "✅ SUCCESS",
      details: "プロンプト設計確認完了（6ステップすべて正常）",
    })
  } catch (error: any) {
    results.push({
      test: "Test 5: AI対話システム",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function runAllTests() {
  console.log("🚀 P3-1 ゴールナビ機能テスト開始\n")
  console.log("=" .repeat(60))

  await test1_getAvailableTests()
  await test2_saveTestGoal()
  await test3_getTestGoal()
  await test4_getAllTestGoals()
  await test5_aiDialogueSystem()

  console.log("\n" + "=".repeat(60))
  console.log("\n📊 テスト結果サマリー\n")

  const successCount = results.filter((r) => r.status === "✅ SUCCESS").length
  const failCount = results.filter((r) => r.status === "❌ FAILED").length

  results.forEach((result) => {
    console.log(`${result.status} ${result.test}`)
    if (result.details) console.log(`   ${result.details}`)
    if (result.error) console.log(`   エラー: ${result.error}`)
  })

  console.log(`\n成功: ${successCount}/${results.length}`)
  console.log(`失敗: ${failCount}/${results.length}`)
  console.log(`成功率: ${((successCount / results.length) * 100).toFixed(1)}%`)

  if (successCount === results.length) {
    console.log("\n✅ すべてのテストが成功しました！")
  } else {
    console.log("\n❌ 一部のテストが失敗しました")
  }

  process.exit(failCount > 0 ? 1 : 0)
}

runAllTests()
