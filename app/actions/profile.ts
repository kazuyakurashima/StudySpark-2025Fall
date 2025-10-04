"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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

  const { error } = await supabase.from("profiles").update({ avatar }).eq("id", user.id)

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
        name: data.realName,
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
        name: data.realName,
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
