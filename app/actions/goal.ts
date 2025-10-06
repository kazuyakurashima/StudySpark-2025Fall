"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 生徒の学年に応じたテスト日程を取得
 * 目標設定期間内のテストのみ取得
 */
export async function getAvailableTests() {
  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 生徒情報取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("grade")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 現在日時（Asia/Tokyo）
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))

  // 目標設定期間内のテスト日程を取得
  const { data: tests, error: testsError } = await supabase
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
        grade
      )
    `)
    .eq("test_types.grade", student.grade)
    .lte("goal_setting_start_date", tokyoNow.toISOString())
    .gte("goal_setting_end_date", tokyoNow.toISOString())
    .order("test_date", { ascending: true })

  if (testsError) {
    return { error: testsError.message }
  }

  return { tests }
}

/**
 * 目標を保存（コース・組・思いを保存）
 * 重複時は更新
 */
export async function saveTestGoal(
  testScheduleId: string,
  targetCourse: string,
  targetClass: number,
  goalThoughts: string
) {
  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 生徒ID取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 既存の目標をチェック（同一テスト・生徒）
  const { data: existingGoal } = await supabase
    .from("test_goals")
    .select("id")
    .eq("student_id", student.id)
    .eq("test_schedule_id", testScheduleId)
    .maybeSingle()

  if (existingGoal) {
    // 既存の目標を更新
    const { error: updateError } = await supabase
      .from("test_goals")
      .update({
        target_course: targetCourse,
        target_class: targetClass,
        goal_thoughts: goalThoughts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingGoal.id)

    if (updateError) {
      return { error: updateError.message }
    }

    return { success: true, goalId: existingGoal.id, isUpdate: true }
  } else {
    // 新規目標を作成
    const { data: newGoal, error: insertError } = await supabase
      .from("test_goals")
      .insert({
        student_id: student.id,
        test_schedule_id: testScheduleId,
        target_course: targetCourse,
        target_class: targetClass,
        goal_thoughts: goalThoughts,
      })
      .select()
      .single()

    if (insertError) {
      return { error: insertError.message }
    }

    return { success: true, goalId: newGoal.id, isUpdate: false }
  }
}

/**
 * 特定のテストに対する目標を取得
 */
export async function getTestGoal(testScheduleId: string) {
  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 生徒ID取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 目標取得
  const { data: goal, error: goalError } = await supabase
    .from("test_goals")
    .select("*")
    .eq("student_id", student.id)
    .eq("test_schedule_id", testScheduleId)
    .maybeSingle()

  if (goalError) {
    return { error: goalError.message }
  }

  return { goal }
}

/**
 * 生徒の全目標一覧を取得
 */
export async function getAllTestGoals() {
  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 生徒ID取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 全目標を取得
  const { data: goals, error: goalsError } = await supabase
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

  if (goalsError) {
    return { error: goalsError.message }
  }

  return { goals }
}
