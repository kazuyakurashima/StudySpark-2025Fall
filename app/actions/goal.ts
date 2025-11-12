"use server"

import { createClient } from "@/lib/supabase/server"
import { formatDateToJST, getNowJST } from "@/lib/utils/date-jst"

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

  // 現在日時（JST）
  const tokyoNow = getNowJST()

  // 目標設定期間内のテスト日程を取得
  // 条件: goal_setting_start_date <= 今 <= goal_setting_end_date
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
        grade,
        type_category
      )
    `)
    .eq("test_types.grade", student.grade)
    .lte("goal_setting_start_date", formatDateToJST(tokyoNow))
    .gte("goal_setting_end_date", formatDateToJST(tokyoNow))
    .order("test_date", { ascending: true })

  console.log("🔍 [getAvailableTests] tokyoNow:", tokyoNow.toISOString())
  console.log("🔍 [getAvailableTests] student.grade:", student.grade)
  console.log("🔍 [getAvailableTests] tests count:", tests?.length || 0)
  console.log("🔍 [getAvailableTests] testsError:", testsError)

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

  console.log("🔍 [getAllTestGoals] student.id:", student.id)
  console.log("🔍 [getAllTestGoals] goals:", goals)
  console.log("🔍 [getAllTestGoals] error:", goalsError)

  if (goalsError) {
    return { error: goalsError.message }
  }

  return { goals }
}

/**
 * 結果入力可能なテスト（目標設定済み＋結果入力期間内）を取得
 */
export async function getAvailableTestsForResult() {
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
    .select("id, grade")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 現在日時（JST）
  const tokyoNow = getNowJST()

  const parseAsTokyoDate = (value: string | null) => {
    if (!value) return null
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
    return new Date(`${value}T00:00:00+09:00`)
  }

  // テストスケジュールを取得（実施日が過去のもの）
  const { data: testSchedules, error: schedulesError } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_date,
      result_entry_start_date,
      result_entry_end_date,
      test_types!inner (
        id,
        name,
        grade
      )
    `)
    .eq("test_types.grade", student.grade)
    .order("test_date", { ascending: true })

  if (schedulesError) {
    return { error: schedulesError.message }
  }

  // 実施日が過去のテストをフィルタリング
  const availableTests = testSchedules?.filter((test) => {
    const testDateRaw = test.test_date as string | null
    if (!testDateRaw) {
      return false
    }

    const testDate = parseAsTokyoDate(testDateRaw)
    if (!testDate) {
      return false
    }

    // 実施日が今日より前（過去）のテストを含める
    const startOfToday = new Date(tokyoNow.getFullYear(), tokyoNow.getMonth(), tokyoNow.getDate())
    return testDate < startOfToday
  }) || []

  // 各テストに対応する目標を取得
  const { data: goals } = await supabase
    .from("test_goals")
    .select("*")
    .eq("student_id", student.id)
    .in("test_schedule_id", availableTests.map(t => t.id))

  // テストスケジュールと目標を結合
  const testsWithGoals = availableTests.map((test) => {
    const goal = goals?.find((g) => g.test_schedule_id === test.id)
    return {
      test_schedule_id: test.id,
      test_schedules: test,
      // 目標がある場合はその情報、ない場合はnull
      id: goal?.id || null,
      target_course: goal?.target_course || null,
      target_class: goal?.target_class || null,
      goal_thoughts: goal?.goal_thoughts || null,
      student_id: student.id,
    }
  })

  return { goals: testsWithGoals }
}

/**
 * テスト結果を保存
 * 目標と結果を結びつける
 */
export async function saveSimpleTestResult(
  testScheduleId: string,
  resultCourse: string,
  resultClass: number
) {
  console.log("🔍 [saveSimpleTestResult] Called with:", { testScheduleId, resultCourse, resultClass });

  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "ログインが必要です" }
  }

  // 生徒ID取得（現在のコースも取得）
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, course")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { success: false, error: "生徒情報が見つかりません" }
  }

  console.log("🔍 [saveSimpleTestResult] Student ID:", student.id);
  console.log("🔍 [saveSimpleTestResult] Current course:", student.course, "Result course:", resultCourse);

  // 既存の結果をチェック
  const { data: existingResult } = await supabase
    .from("test_results")
    .select("id")
    .eq("student_id", student.id)
    .eq("test_schedule_id", testScheduleId)
    .maybeSingle()

  console.log("🔍 [saveSimpleTestResult] Existing result:", existingResult);

  if (existingResult) {
    return { success: false, error: "この結果は既に入力されています" }
  }

  // 新規結果を作成
  const insertData = {
    student_id: student.id,
    test_schedule_id: testScheduleId,
    result_course: resultCourse,
    result_class: resultClass,
    result_entered_at: new Date().toISOString(),
  };

  console.log("🔍 [saveSimpleTestResult] Inserting data:", insertData);

  const { data: newResult, error: insertError } = await supabase
    .from("test_results")
    .insert(insertData)
    .select()
    .single()

  console.log("🔍 [saveSimpleTestResult] Insert result:", newResult);
  console.log("🔍 [saveSimpleTestResult] Insert error:", insertError);

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // 現在のコースと入力結果のコースが異なる場合、コースを更新
  if (student.course !== resultCourse) {
    console.log("🔍 [saveSimpleTestResult] Updating course from", student.course, "to", resultCourse);

    const { error: updateCourseError } = await supabase
      .from("students")
      .update({ course: resultCourse })
      .eq("id", student.id)

    if (updateCourseError) {
      console.error("🔍 [saveSimpleTestResult] Error updating course:", updateCourseError);
      // コース更新エラーは致命的ではないので、結果保存は成功として返す
    } else {
      console.log("🔍 [saveSimpleTestResult] Course updated successfully");
    }
  }

  return { success: true, resultId: newResult.id }
}

export async function saveTestResult(
  testScheduleId: string,
  mathScore: number,
  japaneseScore: number,
  scienceScore: number,
  socialScore: number,
  mathDeviation?: number,
  japaneseDeviation?: number,
  scienceDeviation?: number,
  socialDeviation?: number,
  totalDeviation?: number
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

  const totalScore = mathScore + japaneseScore + scienceScore + socialScore

  // 既存の結果をチェック
  const { data: existingResult } = await supabase
    .from("test_results")
    .select("id")
    .eq("student_id", student.id)
    .eq("test_schedule_id", testScheduleId)
    .maybeSingle()

  if (existingResult) {
    // 既存の結果を更新
    const { error: updateError } = await supabase
      .from("test_results")
      .update({
        math_score: mathScore,
        japanese_score: japaneseScore,
        science_score: scienceScore,
        social_score: socialScore,
        total_score: totalScore,
        math_deviation: mathDeviation || null,
        japanese_deviation: japaneseDeviation || null,
        science_deviation: scienceDeviation || null,
        social_deviation: socialDeviation || null,
        total_deviation: totalDeviation || null,
        result_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingResult.id)

    if (updateError) {
      return { error: updateError.message }
    }

    return { success: true, resultId: existingResult.id, isUpdate: true }
  } else {
    // 新規結果を作成
    const { data: newResult, error: insertError } = await supabase
      .from("test_results")
      .insert({
        student_id: student.id,
        test_schedule_id: testScheduleId,
        math_score: mathScore,
        japanese_score: japaneseScore,
        science_score: scienceScore,
        social_score: socialScore,
        total_score: totalScore,
        math_deviation: mathDeviation || null,
        japanese_deviation: japaneseDeviation || null,
        science_deviation: scienceDeviation || null,
        social_deviation: socialDeviation || null,
        total_deviation: totalDeviation || null,
      })
      .select()
      .single()

    if (insertError) {
      return { error: insertError.message }
    }

    return { success: true, resultId: newResult.id, isUpdate: false }
  }
}

/**
 * テスト結果取得
 */
export async function getTestResult(testScheduleId: string) {
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

  // 結果取得
  const { data: result, error: resultError } = await supabase
    .from("test_results")
    .select("*")
    .eq("student_id", student.id)
    .eq("test_schedule_id", testScheduleId)
    .maybeSingle()

  if (resultError) {
    return { error: resultError.message }
  }

  return { result }
}

/**
 * 生徒の全テスト結果を目標と一緒に取得
 */
export async function getAllTestResults() {
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
    .select("id, grade")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 結果を取得（テスト日程・目標も含む）
  const { data: results, error: resultsError } = await supabase
    .from("test_results")
    .select(`
      *,
      test_schedules!inner (
        id,
        test_date,
        test_types!inner (
          id,
          name,
          grade
        )
      )
    `)
    .eq("student_id", student.id)
    .eq("test_schedules.test_types.grade", student.grade)
    .order("result_entered_at", { ascending: false })

  console.log("🔍 [getAllTestResults] student.id:", student.id)
  console.log("🔍 [getAllTestResults] results:", results)
  console.log("🔍 [getAllTestResults] error:", resultsError)

  if (resultsError) {
    return { error: resultsError.message }
  }

  // 各結果に対応する目標も取得
  const resultsWithGoals = await Promise.all(
    (results || []).map(async (result: any) => {
      const { data: goal } = await supabase
        .from("test_goals")
        .select("*")
        .eq("student_id", student.id)
        .eq("test_schedule_id", result.test_schedules.id)
        .maybeSingle()

      return {
        ...result,
        goal: goal || null,
      }
    })
  )

  return { results: resultsWithGoals }
}

/**
 * 保護者用: 特定の生徒の利用可能なテスト一覧を取得
 */
export async function getAvailableTestsForStudent(studentId: string) {
  console.log('🔍 [getAvailableTestsForStudent] studentId:', studentId)
  const supabase = await createClient()

  // 生徒情報取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("grade")
    .eq("id", studentId)
    .single()

  console.log('🔍 [getAvailableTestsForStudent] student:', student, 'error:', studentError)

  if (studentError || !student) {
    console.log('🔍 [getAvailableTestsForStudent] 生徒情報エラー')
    return { error: "生徒情報が見つかりません" }
  }

  // 現在日時（JST）
  const tokyoNow = getNowJST()

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
        grade,
        type_category
      )
    `)
    .eq("test_types.grade", student.grade)
    .gte("goal_setting_end_date", formatDateToJST(tokyoNow))
    .order("test_date", { ascending: true })

  console.log('🔍 [getAvailableTestsForStudent] tests count:', tests?.length, 'error:', testsError)

  if (testsError) {
    return { error: testsError.message }
  }

  const availableTests = (tests || []).filter((test: any) => {
    const startDate = new Date(test.goal_setting_start_date + "T00:00:00+09:00")
    const endDate = new Date(test.goal_setting_end_date + "T23:59:59+09:00")
    return tokyoNow >= startDate && tokyoNow <= endDate
  })

  console.log('🔍 [getAvailableTestsForStudent] availableTests count:', availableTests.length)

  return { tests: availableTests }
}

/**
 * 保護者用: 特定の生徒の全テスト結果を取得
 */
export async function getAllTestResultsForStudent(studentId: string) {
  console.log('🔍 [getAllTestResultsForStudent] studentId:', studentId)
  const supabase = await createClient()

  // 生徒情報取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, grade")
    .eq("id", studentId)
    .single()

  console.log('🔍 [getAllTestResultsForStudent] student:', student, 'error:', studentError)

  if (studentError || !student) {
    console.log('🔍 [getAllTestResultsForStudent] 生徒情報エラー')
    return { error: "生徒情報が見つかりません" }
  }

  // 結果を取得（テスト日程・目標も含む）
  const { data: results, error: resultsError } = await supabase
    .from("test_results")
    .select(`
      *,
      test_schedules!inner (
        id,
        test_date,
        test_types!inner (
          id,
          name,
          grade
        )
      )
    `)
    .eq("student_id", student.id)
    .eq("test_schedules.test_types.grade", student.grade)
    .order("result_entered_at", { ascending: false })

  console.log('🔍 [getAllTestResultsForStudent] results:', results?.length, 'error:', resultsError)

  if (resultsError) {
    return { error: resultsError.message }
  }

  // 各結果に対応する目標も取得
  const resultsWithGoals = await Promise.all(
    (results || []).map(async (result: any) => {
      const { data: goal } = await supabase
        .from("test_goals")
        .select("*")
        .eq("student_id", student.id)
        .eq("test_schedule_id", result.test_schedules.id)
        .maybeSingle()

      return {
        ...result,
        goal: goal || null,
      }
    })
  )

  return { results: resultsWithGoals }
}

/**
 * 保護者用: 特定の生徒の全テスト目標を取得
 */
export async function getAllTestGoalsForStudent(studentId: string) {
  console.log('🔍 [getAllTestGoalsForStudent] studentId:', studentId)
  const supabase = await createClient()

  const { data: goals, error: goalsError } = await supabase
    .from("test_goals")
    .select(`
      id,
      test_schedule_id,
      target_course,
      target_class,
      goal_thoughts,
      created_at,
      test_schedules!inner (
        id,
        test_date,
        test_types!inner (
          id,
          name,
          grade
        )
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  console.log('🔍 [getAllTestGoalsForStudent] goals:', goals?.length, 'error:', goalsError)

  if (goalsError) {
    return { error: goalsError.message }
  }

  // クライアント側でtest_dateでソート
  const sortedGoals = (goals || []).sort((a: any, b: any) => {
    const dateA = new Date(a.test_schedules.test_date).getTime()
    const dateB = new Date(b.test_schedules.test_date).getTime()
    return dateB - dateA // 降順（新しい順）
  })

  return { goals: sortedGoals }
}
