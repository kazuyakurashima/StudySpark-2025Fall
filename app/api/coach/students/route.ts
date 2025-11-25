import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoachStudents } from "@/app/actions/coach"

export const dynamic = "force-dynamic"

/**
 * 指導者用生徒一覧API Route
 * SWRのfetcher用エンドポイント
 * 担当生徒一覧を取得して返す
 */
export async function GET() {
  try {
    // 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    // 指導者ロールの確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "指導者アカウントが必要です" },
        { status: 403 }
      )
    }

    // 生徒一覧を取得
    const result = await getCoachStudents()

    // レスポンスを構築
    const response = {
      students: result?.error
        ? { students: [], error: result.error }
        : { students: result?.students || [] },
      fetchedAt: Date.now(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API] Coach students list error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
