import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * 生徒パスワードリセット API Route
 * Service Role Key を使用してパスワードを更新
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "ユーザーIDと新しいパスワードが必要です" },
        { status: 400 }
      )
    }

    // パスワードの最小長チェック（6文字以上）
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で設定してください" },
        { status: 400 }
      )
    }

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

    // パスワード更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: `パスワード更新エラー: ${error.message}` },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "パスワードを変更しました",
    })
  } catch (error) {
    console.error("Reset student password API error:", error)
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    )
  }
}
