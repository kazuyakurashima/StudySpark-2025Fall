"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

/**
 * 生徒ログイン (ログインID + パスワード)
 * ログインIDからメールアドレスを生成して Supabase Auth で認証
 */
export async function studentLogin(loginId: string, password: string) {
  const supabase = await createClient()

  // ログインIDからメールアドレスを生成（例: student1 -> student1@studyspark.local）
  const email = `${loginId}@studyspark.local`

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // プロフィール確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, setup_completed")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    return { error: "プロフィールが見つかりません" }
  }

  if (profile.role !== "student") {
    await supabase.auth.signOut()
    return { error: "生徒アカウントでログインしてください" }
  }

  // セットアップ完了状態に応じてリダイレクト
  if (!profile.setup_completed) {
    redirect("/setup/avatar")
  }

  redirect("/student")
}

/**
 * 保護者ログイン (メール + パスワード)
 */
export async function parentLogin(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // プロフィール確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, setup_completed")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    return { error: "プロフィールが見つかりません" }
  }

  if (profile.role !== "parent") {
    await supabase.auth.signOut()
    return { error: "保護者アカウントでログインしてください" }
  }

  // セットアップ完了状態に応じてリダイレクト
  if (!profile.setup_completed) {
    redirect("/setup/parent-avatar")
  }

  redirect("/parent")
}

/**
 * 指導者ログイン (メール + パスワード)
 */
export async function coachLogin(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // プロフィール確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    return { error: "プロフィールが見つかりません" }
  }

  if (profile.role !== "coach") {
    await supabase.auth.signOut()
    return { error: "指導者アカウントでログインしてください" }
  }

  redirect("/coach")
}

/**
 * 保護者新規登録 (メール + パスワード)
 */
export async function parentSignUp(
  email: string,
  password: string,
  parentName: string,
  parentNameKana: string,
  childGrade: number,
  childName: string,
  childNameKana: string,
  childLoginId: string,
  childPassword: string
) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get("origin") || "http://localhost:3000"

  // 保護者アカウント作成
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        role: "parent",
        name: parentName,
        name_kana: parentNameKana,
      },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "アカウント作成に失敗しました" }
  }

  // プロフィール作成（トリガーで自動作成される想定だが、念のため確認）
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .single()

  if (!profile) {
    return { error: "プロフィール作成に失敗しました" }
  }

  // 保護者レコード作成
  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: authData.user.id,
      full_name: parentName,
      furigana: parentNameKana,
    })
    .select()
    .single()

  if (parentError) {
    return { error: `保護者レコード作成エラー: ${parentError.message}` }
  }

  // 子どもアカウント作成（API Route経由でサービスロールキーを使用）
  try {
    const response = await fetch(`${origin}/api/auth/parent-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parentUserId: authData.user.id,
        childGrade,
        childName,
        childNameKana,
        childLoginId,
        childPassword,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      return { error: result.error || "子どもアカウント作成に失敗しました" }
    }

    return {
      success: true,
      message: "アカウントを作成しました。確認メールをご確認ください。",
    }
  } catch (error) {
    return { error: "サーバーエラーが発生しました" }
  }
}

/**
 * ログアウト
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, setup_completed, display_name, avatar")
    .eq("id", user.id)
    .single()

  return {
    ...user,
    profile,
  }
}
