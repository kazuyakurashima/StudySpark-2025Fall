import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * 保護者新規登録 API Route
 * Service Role Key を使用して子どもアカウントを作成
 */
export async function POST(request: NextRequest) {
  try {
    const {
      parentUserId,
      childGrade,
      childName,
      childNameKana,
      childLoginId,
      childPassword,
    } = await request.json()

    // Service Role Key を使用した Supabase クライアント
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 子どもアカウント作成（ログインID形式のメールアドレス）
    const childEmail = `${childLoginId}@studyspark.local`
    const { data: childAuthData, error: childAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
      user_metadata: {
        role: "student",
        name: childName,
        name_kana: childNameKana,
        login_id: childLoginId,
      },
    })

    if (childAuthError) {
      return NextResponse.json({ error: `子どもアカウント作成エラー: ${childAuthError.message}` }, { status: 400 })
    }

    if (!childAuthData.user) {
      return NextResponse.json({ error: "子どもアカウント作成に失敗しました" }, { status: 400 })
    }

    // 保護者レコード取得
    const { data: parentData, error: parentError } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("user_id", parentUserId)
      .single()

    if (parentError || !parentData) {
      return NextResponse.json({ error: `保護者レコードが見つかりません: ${parentError?.message}` }, { status: 400 })
    }

    // 生徒レコード作成
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from("students")
      .insert({
        user_id: childAuthData.user.id,
        name: childName,
        name_kana: childNameKana,
        grade: childGrade,
        login_id: childLoginId,
      })
      .select()
      .single()

    if (studentError) {
      return NextResponse.json({ error: `生徒レコード作成エラー: ${studentError.message}` }, { status: 400 })
    }

    // 親子関係作成
    const { error: relationError } = await supabaseAdmin.from("parent_child_relations").insert({
      parent_id: parentData.id,
      student_id: studentData.id,
    })

    if (relationError) {
      return NextResponse.json({ error: `親子関係作成エラー: ${relationError.message}` }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      studentId: studentData.id,
      childUserId: childAuthData.user.id,
    })
  } catch (error) {
    console.error("Parent signup API error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
