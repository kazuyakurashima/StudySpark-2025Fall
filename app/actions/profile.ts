"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserProfile, UpdateProfileInput } from "@/lib/types/profile"

/**
 * プロフィール情報を更新（アバター選択）
 */
export async function updateAvatar(avatar: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証されていません" }
  }

  const { error } = await supabase.from("profiles").update({ avatar_id: avatar }).eq("id", user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * プロフィール情報を更新（名前・学年）
 */
export async function updateProfile(data: {
  displayName: string
  realName?: string
  grade?: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証されていません" }
  }

  // プロフィール更新
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: data.displayName,
      setup_completed: true,
    })
    .eq("id", user.id)

  if (profileError) {
    return { error: profileError.message }
  }

  // ロールを取得
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile) {
    return { error: "プロフィールが見つかりません" }
  }

  // 生徒の場合は students テーブルも更新
  if (profile.role === "student" && data.realName && data.grade) {
    const { error: studentError } = await supabase
      .from("students")
      .update({
        full_name: data.realName,
        grade: data.grade,
      })
      .eq("user_id", user.id)

    if (studentError) {
      return { error: studentError.message }
    }
  }

  // 保護者の場合は parents テーブルも更新
  if (profile.role === "parent" && data.realName) {
    const { error: parentError } = await supabase
      .from("parents")
      .update({
        full_name: data.realName,
      })
      .eq("user_id", user.id)

    if (parentError) {
      return { error: parentError.message }
    }
  }

  return { success: true }
}

/**
 * セットアップ完了後のリダイレクト
 */
export async function completeSetup() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile) {
    redirect("/")
  }

  // ロール別にリダイレクト
  switch (profile.role) {
    case "student":
      redirect("/student")
    case "parent":
      redirect("/parent")
    case "coach":
      redirect("/coach")
    case "admin":
      redirect("/admin")
    default:
      redirect("/")
  }
}

/**
 * プロフィール情報を取得
 */
export async function getProfile(): Promise<{ profile: UserProfile | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { profile: null, error: "認証されていません" }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  // 生徒ロールの場合は生徒情報も取得
  if (profile.role === "student") {
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, grade, course")
      .eq("user_id", user.id)
      .single()

    if (!studentError && student) {
      return {
        profile: {
          ...profile,
          student: {
            id: student.id,
            grade: student.grade,
            course: student.course as "A" | "B" | "C" | "S",
          },
        } as UserProfile,
      }
    }
  }

  return { profile: profile as UserProfile }
}

/**
 * プロフィールカスタマイズ情報を更新
 */
export async function updateProfileCustomization(
  input: UpdateProfileInput
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "認証されていません" }
  }

  const updateData: Record<string, any> = {}

  if (input.avatar_id !== undefined) updateData.avatar_id = input.avatar_id
  if (input.nickname !== undefined) updateData.nickname = input.nickname
  if (input.theme_color !== undefined) updateData.theme_color = input.theme_color

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, profile: profile as UserProfile }
}

/**
 * コース情報を更新
 */
export async function updateCourse(
  course: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "認証されていません" }
  }

  // studentsテーブルのcourseを更新
  const { error } = await supabase
    .from("students")
    .update({ course })
    .eq("user_id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
