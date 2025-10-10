"use server"

import { createClient } from "@/lib/supabase/server"

export interface CoachStudent {
  id: string
  full_name: string
  nickname: string | null
  avatar_url: string | null
  grade: string
  course: string | null
}

/**
 * 指導者が担当する生徒一覧を取得
 */
export async function getCoachStudents() {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
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

  // 担当生徒の関係を取得
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(
      `
      student_id,
      students (
        id,
        user_id,
        full_name,
        nickname,
        avatar_url,
        grade,
        course
      )
    `
    )
    .eq("coach_id", coach.id)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { error: "生徒一覧の取得に失敗しました" }
  }

  // データを整形
  const students: CoachStudent[] =
    relations
      ?.map((rel: any) => rel.students)
      .filter(Boolean)
      .map((student: any) => ({
        id: student.id,
        full_name: student.full_name,
        nickname: student.nickname,
        avatar_url: student.avatar_url,
        grade: student.grade === 5 ? "小学5年" : "小学6年",
        course: student.course,
      })) || []

  return { students }
}

/**
 * 特定の生徒の詳細情報を取得
 */
export async function getStudentDetail(studentId: string) {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
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

  // 担当生徒かチェック
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("student_id", studentId)
    .single()

  if (!relation) {
    return { error: "この生徒にアクセスする権限がありません" }
  }

  // 生徒の詳細情報を取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, user_id, full_name, nickname, avatar_url, grade, course, target_school, target_class")
    .eq("id", studentId)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  return {
    student: {
      ...student,
      grade: student.grade === 5 ? "小学5年" : "小学6年",
    },
  }
}
