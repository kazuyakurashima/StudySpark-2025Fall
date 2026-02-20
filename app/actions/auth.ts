"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

/**
 * 共通ログイン (メールアドレス or 学習ID + パスワード)
 * 入力値を自動判別してログイン処理を行う
 */
export async function universalLogin(input: string, password: string) {
  const supabase = await createClient()

  let authData = null
  let authError = null

  // 1. まずメールアドレスとして認証を試行
  const emailAttempt = await supabase.auth.signInWithPassword({
    email: input,
    password,
  })

  if (emailAttempt.data?.user) {
    authData = emailAttempt.data
  } else {
    // 2. 失敗した場合、学習IDとして認証を試行
    const studentEmail = `${input}@studyspark.local`
    const studentAttempt = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password,
    })

    if (studentAttempt.data?.user) {
      authData = studentAttempt.data
    } else {
      authError = studentAttempt.error
    }
  }

  // 3. 両方失敗した場合
  if (!authData || authError) {
    return { error: "メールアドレス／IDまたはパスワードが違います" }
  }

  // 4. プロフィール確認
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, setup_completed")
    .eq("id", authData.user.id)
    .single()

  if (profileError) {
    console.error("[Login] Profile fetch error:", profileError)
    return { error: `プロフィールエラー: ${profileError.message}` }
  }

  if (!profile) {
    console.error("[Login] Profile not found for user:", authData.user.id)
    return { error: "プロフィールが見つかりません" }
  }

  console.log(`[Login] Success: role=${profile.role}`)

  // 5. ロール別リダイレクト
  const role = profile.role
  const setupCompleted = profile.setup_completed

  // セットアップ未完了の場合
  if (!setupCompleted) {
    if (role === "student") {
      redirect("/setup/avatar")
    } else if (role === "parent") {
      redirect("/setup/parent-avatar")
    }
    // coach/adminはセットアップ不要
  }

  // ロール別ダッシュボードへリダイレクト
  if (role === "student") {
    redirect("/student")
  } else if (role === "parent") {
    redirect("/parent")
  } else if (role === "coach") {
    redirect("/coach")
  } else if (role === "admin") {
    redirect("/admin")
  }

  return { error: "不明なロールです" }
}

/**
 * 生徒ログイン (ログインID + パスワード)
 * ログインIDからメールアドレスを生成して Supabase Auth で認証
 * @deprecated universalLogin を使用してください
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
        "Origin": origin,
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
    .select("role, setup_completed, display_name, avatar_id")
    .eq("id", user.id)
    .single()

  return {
    ...user,
    profile,
  }
}

/**
 * パスワードリセットメール送信 (保護者・指導者用)
 *
 * @deprecated Server Action 経由では PKCE code_verifier がブラウザ cookie に保存されず、
 * exchangeCodeForSession が失敗する。代わりに forgot-password/page.tsx で
 * ブラウザ側 createBrowserClient から直接 resetPasswordForEmail を呼ぶこと。
 */
export async function sendPasswordResetEmail(email: string) {
  const supabase = await createClient()
  const headersList = await headers()
  // NEXT_PUBLIC_APP_URL 優先（プロキシ/プレビュー環境での事故防止）
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    headersList.get("origin") ||
    "http://localhost:3000"

  // PKCE フロー: Supabase が ?code=... を /auth/callback に返す
  // callback が code をセッションに交換後、next= で reset-password へリダイレクト
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: "パスワードリセットメールを送信しました。メールをご確認ください。",
  }
}

/**
 * 生徒のパスワードリセット (保護者/指導者/管理者)
 *
 * Server Action 内で createAdminClient を直接使用し、
 * 公開 API Route を経由しない（攻撃面の排除）。
 */
export async function resetStudentPassword(
  studentId: string,
  newPassword: string
) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // ロール確認（parent / coach / admin のみ許可）
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["parent", "coach", "admin"].includes(profile.role)) {
    return { error: "権限がありません" }
  }

  // パスワードバリデーション
  if (!newPassword || newPassword.length < 6) {
    return { error: "パスワードは6文字以上で設定してください" }
  }

  // 親の場合: 親子関係を検証（parents.id 経由）
  if (profile.role === "parent") {
    const { data: parentRecord } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!parentRecord) {
      return { error: "保護者レコードが見つかりません" }
    }

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("id")
      .eq("parent_id", parentRecord.id)
      .eq("student_id", Number(studentId))
      .single()

    if (!relation) {
      return { error: "指定された生徒との親子関係が見つかりません" }
    }
  }

  // 指導者の場合: 担当関係を検証（coaches.id 経由）
  if (profile.role === "coach") {
    const { data: coachRecord } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!coachRecord) {
      return { error: "指導者レコードが見つかりません" }
    }

    const { data: relation } = await supabase
      .from("coach_student_relations")
      .select("id")
      .eq("coach_id", coachRecord.id)
      .eq("student_id", Number(studentId))
      .single()

    if (!relation) {
      return { error: "指定された生徒との担当関係が見つかりません" }
    }
  }

  // students.id → students.user_id（UUID）に変換
  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", Number(studentId))
    .single()

  if (!student) {
    return { error: "生徒が見つかりません" }
  }

  // パスワード更新（Service Role Key、auth.users.id で実行）
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(
    student.user_id,
    { password: newPassword }
  )

  if (error) {
    return { error: `パスワード更新エラー: ${error.message}` }
  }

  return {
    success: true,
    message: "生徒のパスワードを変更しました",
  }
}
