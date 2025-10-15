import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

interface ChildData {
  grade: number
  fullName: string
  fullNameKana: string
  loginId: string
  password: string
}

interface ParentData {
  fullName: string
  fullNameKana: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const { parent, children }: { parent: ParentData; children: ChildData[] } = await request.json()

    // バリデーション
    if (!parent || !parent.email || !parent.password || !parent.fullName || !parent.fullNameKana) {
      return NextResponse.json(
        { error: "保護者のすべての項目を入力してください" },
        { status: 400 }
      )
    }

    if (!children || children.length === 0) {
      return NextResponse.json(
        { error: "お子様の情報を入力してください" },
        { status: 400 }
      )
    }

    // 子ども情報のバリデーション
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (!child.grade || !child.fullName || !child.fullNameKana || !child.loginId || !child.password) {
        return NextResponse.json(
          { error: `お子様${i + 1}のすべての項目を入力してください` },
          { status: 400 }
        )
      }
    }

    const supabase = createAdminClient()

    // 1. ログインIDの重複チェック
    const loginIds = children.map((child) => child.loginId)
    const { data: existingStudents } = await supabase
      .from("students")
      .select("login_id")
      .in("login_id", loginIds)

    if (existingStudents && existingStudents.length > 0) {
      const duplicateIds = existingStudents.map((s) => s.login_id).join(", ")
      return NextResponse.json(
        { error: `次のログインIDは既に使用されています: ${duplicateIds}` },
        { status: 400 }
      )
    }

    // 2. 保護者アカウント作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: parent.email,
      password: parent.password,
      email_confirm: true, // メール確認を自動的に完了
      user_metadata: {
        role: "parent",
        full_name: parent.fullName,
        full_name_kana: parent.fullNameKana,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: `保護者アカウント作成エラー: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "保護者アカウント作成に失敗しました" },
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
        full_name: parent.fullName,
        furigana: parent.fullNameKana,
      })
      .select()
      .single()

    if (parentError || !parentData) {
      return NextResponse.json(
        { error: `保護者情報の作成に失敗しました: ${parentError?.message}` },
        { status: 500 }
      )
    }

    // 5. 子どもアカウント作成（複数対応）
    const createdStudents: any[] = []

    for (const child of children) {
      // 5-1. 子どもユーザーアカウント作成（ログインID/パスワード認証用）
      const { data: childAuthData, error: childAuthError } = await supabase.auth.admin.createUser({
        email: `${child.loginId}@studyspark.local`, // 内部用ダミーメール
        password: child.password,
        email_confirm: true,
        user_metadata: {
          role: "student",
          full_name: child.fullName,
          full_name_kana: child.fullNameKana,
          login_id: child.loginId,
        },
      })

      if (childAuthError || !childAuthData.user) {
        return NextResponse.json(
          { error: `お子様アカウント作成エラー (${child.loginId}): ${childAuthError?.message}` },
          { status: 500 }
        )
      }

      // 5-2. studentsテーブルにレコード作成
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert({
          user_id: childAuthData.user.id,
          full_name: child.fullName,
          furigana: child.fullNameKana,
          login_id: child.loginId,
          grade: child.grade,
        })
        .select()
        .single()

      if (studentError || !studentData) {
        return NextResponse.json(
          { error: `お子様情報の作成に失敗しました (${child.loginId}): ${studentError?.message}` },
          { status: 500 }
        )
      }

      createdStudents.push(studentData)

      // 5-3. 親子関係作成
      const { error: relationError } = await supabase
        .from("parent_child_relations")
        .insert({
          parent_id: parentData.id,
          student_id: studentData.id,
        })

      if (relationError) {
        return NextResponse.json(
          { error: `親子関係の作成に失敗しました (${child.loginId}): ${relationError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `登録が完了しました。${children.length}名のお子様のアカウントを作成しました。`,
      data: {
        parentId: parentData.id,
        studentIds: createdStudents.map((s) => s.id),
      },
    })
  } catch (error) {
    console.error("Parent registration error:", error)
    return NextResponse.json(
      { error: "登録処理中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
