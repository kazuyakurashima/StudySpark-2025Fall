"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ExamType, PastExamResult } from "@/lib/constants/past-exam"

// Server Action内でのバリデーション用（外部からインポートできないため直接定義）
const VALID_EXAM_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]

/**
 * 生徒の過去問演習結果を全て取得
 */
export async function getPastExamResults() {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 生徒情報を取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, grade")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  // 小学6年生以外はエラー
  if (student.grade !== 6) {
    return { error: "過去問演習は小学6年生のみ利用可能です" }
  }

  // 過去問結果を取得
  const { data: results, error } = await supabase
    .from("past_exam_results")
    .select("*")
    .eq("student_id", student.id)
    .order("exam_year", { ascending: false })
    .order("exam_type", { ascending: true })
    .order("attempt_number", { ascending: true })

  if (error) {
    console.error("Failed to fetch past exam results:", error)
    return { error: "過去問結果の取得に失敗しました" }
  }

  return { results: results as PastExamResult[], studentId: student.id }
}

/**
 * 特定年度の過去問結果を取得
 */
export async function getPastExamResultsByYear(year: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, grade")
    .eq("user_id", user.id)
    .single()

  if (!student || student.grade !== 6) {
    return { error: "過去問演習は小学6年生のみ利用可能です" }
  }

  const { data: results, error } = await supabase
    .from("past_exam_results")
    .select("*")
    .eq("student_id", student.id)
    .eq("exam_year", year)
    .order("exam_type", { ascending: true })
    .order("attempt_number", { ascending: true })

  if (error) {
    console.error("Failed to fetch past exam results by year:", error)
    return { error: "過去問結果の取得に失敗しました" }
  }

  return { results: results as PastExamResult[] }
}

/**
 * 過去問結果を保存
 */
export async function savePastExamResult(data: {
  exam_year: number
  exam_type: ExamType
  attempt_number: number
  score: number
  reflection?: string
  taken_at?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, grade")
    .eq("user_id", user.id)
    .single()

  if (!student || student.grade !== 6) {
    return { error: "過去問演習は小学6年生のみ利用可能です" }
  }

  // バリデーション
  if (data.score < 0 || data.score > 100) {
    return { error: "得点は0〜100の範囲で入力してください" }
  }

  if (data.attempt_number < 1 || data.attempt_number > 3) {
    return { error: "回数は1〜3の範囲で入力してください" }
  }

  if (!VALID_EXAM_YEARS.includes(data.exam_year)) {
    return { error: "無効な年度です" }
  }

  // 既存の結果をチェック
  const { data: existing } = await supabase
    .from("past_exam_results")
    .select("id")
    .eq("student_id", student.id)
    .eq("exam_year", data.exam_year)
    .eq("exam_type", data.exam_type)
    .eq("attempt_number", data.attempt_number)
    .single()

  if (existing) {
    return { error: "この年度・科目・回数の結果は既に登録されています" }
  }

  // 保存
  const { data: result, error } = await supabase
    .from("past_exam_results")
    .insert({
      student_id: student.id,
      exam_year: data.exam_year,
      exam_type: data.exam_type,
      attempt_number: data.attempt_number,
      score: data.score,
      reflection: data.reflection || null,
      taken_at: data.taken_at || new Date().toISOString().split("T")[0],
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to save past exam result:", error)
    return { error: "過去問結果の保存に失敗しました" }
  }

  revalidatePath("/student/goal")
  return { result }
}

/**
 * 過去問結果を更新（振り返りの追加・編集など）
 */
export async function updatePastExamResult(
  id: string,
  data: {
    score?: number
    reflection?: string
    taken_at?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  // スコアのバリデーション
  if (data.score !== undefined && (data.score < 0 || data.score > 100)) {
    return { error: "得点は0〜100の範囲で入力してください" }
  }

  const { data: result, error } = await supabase
    .from("past_exam_results")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("student_id", student.id)
    .select()
    .single()

  if (error) {
    console.error("Failed to update past exam result:", error)
    return { error: "過去問結果の更新に失敗しました" }
  }

  revalidatePath("/student/goal")
  return { result }
}

/**
 * 過去問結果を削除
 */
export async function deletePastExamResult(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  const { error } = await supabase
    .from("past_exam_results")
    .delete()
    .eq("id", id)
    .eq("student_id", student.id)

  if (error) {
    console.error("Failed to delete past exam result:", error)
    return { error: "過去問結果の削除に失敗しました" }
  }

  revalidatePath("/student/goal")
  return { success: true }
}

/**
 * 次に入力可能な回数を取得
 */
export async function getNextAttemptNumber(year: number, examType: ExamType) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  const { data: results } = await supabase
    .from("past_exam_results")
    .select("attempt_number")
    .eq("student_id", student.id)
    .eq("exam_year", year)
    .eq("exam_type", examType)
    .order("attempt_number", { ascending: true })

  if (!results || results.length === 0) {
    return { nextAttempt: 1 }
  }

  if (results.length >= 3) {
    return { nextAttempt: null, error: "最大3回まで入力可能です" }
  }

  // 次の空き番号を探す
  const usedNumbers = results.map((r) => r.attempt_number)
  for (let i = 1; i <= 3; i++) {
    if (!usedNumbers.includes(i)) {
      return { nextAttempt: i }
    }
  }

  return { nextAttempt: null }
}

// ============================================================================
// 保護者向け関数
// ============================================================================

/**
 * 保護者が子供の過去問結果を取得
 * RLSポリシーにより、parent_child_relationsで紐づいた子供のデータのみ取得可能
 */
export async function getChildPastExamResults(childStudentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 保護者かどうか確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "parent") {
    return { error: "保護者アカウントが必要です" }
  }

  // 子供の学年を確認（小学6年生のみ）
  const { data: childStudent } = await supabase
    .from("students")
    .select("id, grade")
    .eq("id", childStudentId)
    .single()

  if (!childStudent) {
    return { error: "生徒情報が見つかりません" }
  }

  if (childStudent.grade !== 6) {
    return { error: "過去問演習は小学6年生のみ利用可能です", notGrade6: true }
  }

  // 過去問結果を取得（RLSポリシーで権限チェック済み）
  const { data: results, error } = await supabase
    .from("past_exam_results")
    .select("*")
    .eq("student_id", childStudentId)
    .order("exam_year", { ascending: false })
    .order("exam_type", { ascending: true })
    .order("attempt_number", { ascending: true })

  if (error) {
    console.error("Failed to fetch child past exam results:", error)
    return { error: "過去問結果の取得に失敗しました" }
  }

  return { results: results as PastExamResult[], studentId: childStudentId }
}

// ============================================================================
// 指導者向け関数
// ============================================================================

/**
 * 指導者が担当生徒の過去問結果を取得
 * RLSポリシーにより、coach_student_relationsで紐づいた生徒のデータのみ取得可能
 */
export async function getStudentPastExamResultsForCoach(studentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 指導者かどうか確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
    return { error: "指導者アカウントが必要です" }
  }

  // 生徒の学年を確認（小学6年生のみ）
  const { data: student } = await supabase
    .from("students")
    .select("id, grade, full_name, nickname")
    .eq("id", studentId)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  if (student.grade !== 6) {
    return {
      error: "過去問演習は小学6年生のみ利用可能です",
      notGrade6: true,
      studentName: student.nickname || student.full_name,
      grade: student.grade
    }
  }

  // 過去問結果を取得（RLSポリシーで権限チェック済み）
  const { data: results, error } = await supabase
    .from("past_exam_results")
    .select("*")
    .eq("student_id", studentId)
    .order("exam_year", { ascending: false })
    .order("exam_type", { ascending: true })
    .order("attempt_number", { ascending: true })

  if (error) {
    console.error("Failed to fetch student past exam results for coach:", error)
    return { error: "過去問結果の取得に失敗しました" }
  }

  return {
    results: results as PastExamResult[],
    studentId,
    studentName: student.nickname || student.full_name
  }
}

/**
 * 指導者が担当する全生徒の過去問結果サマリーを取得
 */
export async function getAllStudentsPastExamSummaryForCoach() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 指導者かどうか確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
    return { error: "指導者アカウントが必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  // 担当生徒のIDを取得
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select("student_id")
    .eq("coach_id", coach.id)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { error: "担当生徒の取得に失敗しました" }
  }

  const studentIds = relations?.map((rel) => rel.student_id) || []

  if (studentIds.length === 0) {
    return { summaries: [] }
  }

  // 担当する小学6年生の生徒一覧を取得
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
      nickname,
      grade,
      past_exam_results (
        id,
        exam_year,
        exam_type,
        attempt_number,
        score
      )
    `)
    .in("id", studentIds)
    .eq("grade", 6)
    .order("full_name", { ascending: true })

  if (studentsError) {
    console.error("Failed to fetch students for coach:", studentsError)
    return { error: "生徒情報の取得に失敗しました" }
  }

  // サマリー情報を構築
  const summaries = students?.map(student => {
    const results = student.past_exam_results || []
    const tekisei1 = results.filter((r: any) => r.exam_type === "tekisei_1")
    const tekisei2 = results.filter((r: any) => r.exam_type === "tekisei_2")

    return {
      studentId: student.id,
      studentName: student.nickname || student.full_name,
      fullName: student.full_name,
      grade: student.grade,
      totalResults: results.length,
      avgTekisei1: tekisei1.length > 0
        ? Math.round(tekisei1.reduce((sum: number, r: any) => sum + r.score, 0) / tekisei1.length)
        : null,
      avgTekisei2: tekisei2.length > 0
        ? Math.round(tekisei2.reduce((sum: number, r: any) => sum + r.score, 0) / tekisei2.length)
        : null,
      maxTekisei1: tekisei1.length > 0
        ? Math.max(...tekisei1.map((r: any) => r.score))
        : null,
      maxTekisei2: tekisei2.length > 0
        ? Math.max(...tekisei2.map((r: any) => r.score))
        : null,
      yearsWithResults: [...new Set(results.map((r: any) => r.exam_year))].length,
    }
  }) || []

  return { summaries }
}
