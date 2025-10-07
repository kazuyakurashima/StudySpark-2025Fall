import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password, parentName, studentLoginId } = await request.json()

    // バリデーション
    if (!email || !password || !parentName || !studentLoginId) {
      return NextResponse.json(
        { error: "すべての項目を入力してください" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. 学習IDに対応する生徒を検索
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, user_id, full_name")
      .eq("login_id", studentLoginId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "入力された学習IDは存在しません。お子様の学習IDをご確認ください。" },
        { status: 400 }
      )
    }

    // 2. 保護者アカウント作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
        data: {
          role: "parent",
          full_name: parentName,
        },
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "アカウント作成に失敗しました" },
        { status: 500 }
      )
    }

    // 3. profilesテーブルの確認（トリガーで自動作成される）
    let retries = 0
    let profileData = null
    while (retries < 5) {
      const { data } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", authData.user.id)
        .single()

      if (data) {
        profileData = data
        break
      }

      retries++
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (!profileData) {
      return NextResponse.json(
        { error: "プロフィール作成に失敗しました" },
        { status: 500 }
      )
    }

    // 4. parentsテーブルにレコード作成
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .insert({
        user_id: authData.user.id,
        full_name: parentName,
      })
      .select()
      .single()

    if (parentError || !parentData) {
      return NextResponse.json(
        { error: "保護者情報の作成に失敗しました" },
        { status: 500 }
      )
    }

    // 5. 親子関係作成
    const { error: relationError } = await supabase
      .from("parent_child_relations")
      .insert({
        parent_id: parentData.id,
        student_id: student.id,
      })

    if (relationError) {
      return NextResponse.json(
        { error: "親子関係の作成に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "登録が完了しました。ログインしてください。",
    })
  } catch (error) {
    console.error("Parent registration error:", error)
    return NextResponse.json(
      { error: "登録処理中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
