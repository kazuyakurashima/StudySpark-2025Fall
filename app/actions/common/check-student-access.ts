import { createClient } from "@/lib/supabase/server"

/**
 * 指定された生徒へのアクセス権限をチェック
 * @param userId - 現在のユーザーID
 * @param studentId - 対象生徒ID
 * @returns 権限がある場合は true、ない場合は false
 */
export async function checkStudentAccess(
  userId: string,
  studentId: string
): Promise<boolean> {
  const supabase = await createClient()

  // ロールを取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (!profile) return false

  // 生徒本人の場合
  if (profile.role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .eq("id", Number(studentId))
      .single()

    return !!student
  }

  // 保護者の場合
  if (profile.role === "parent") {
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (!parent) return false

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("id")
      .eq("parent_id", parent.id)
      .eq("student_id", Number(studentId))
      .single()

    return !!relation
  }

  // 指導者の場合
  if (profile.role === "coach") {
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (!coach) return false

    const { data: relation } = await supabase
      .from("coach_student_relations")
      .select("id")
      .eq("coach_id", coach.id)
      .eq("student_id", Number(studentId))
      .single()

    return !!relation
  }

  return false
}
