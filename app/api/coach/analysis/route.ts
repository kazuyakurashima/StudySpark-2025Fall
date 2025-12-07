import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoachAnalysisData } from "@/app/actions/coach"

export const dynamic = "force-dynamic"

/**
 * 分析ページ用API Route
 * SWRのfetcher用エンドポイント
 * 学年フィルタ付きで分析データを取得
 */
export async function GET(request: NextRequest) {
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

    // クエリパラメータから学年フィルタを取得
    const searchParams = request.nextUrl.searchParams
    const gradeParam = searchParams.get("grade")
    const grade = gradeParam === "5" || gradeParam === "6" ? gradeParam : "all"

    // 分析データを取得
    const result = await getCoachAnalysisData(grade as "5" | "6" | "all")

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Coach analysis error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
