import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAllStudyLogsForCoach, getInactiveStudents } from "@/app/actions/encouragement"

export const dynamic = "force-dynamic"

/**
 * 指導者用応援ページAPI Route
 * SWRのfetcher用エンドポイント
 * クエリパラメータに応じて学習ログまたは未入力生徒を返す
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

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "logs" // "logs" or "inactive"

    if (type === "inactive") {
      // 未入力生徒を取得
      const threshold = parseInt(searchParams.get("threshold") || "7") as 3 | 5 | 7
      const result = await getInactiveStudents(threshold)

      return NextResponse.json({
        type: "inactive",
        students: result.success ? result.students : [],
        error: result.success ? undefined : result.error,
        fetchedAt: Date.now(),
      })
    } else {
      // 学習ログを取得
      const filters = {
        grade: (searchParams.get("grade") || "all") as "5" | "6" | "all",
        subject: searchParams.get("subject") || "all",
        encouragementType: (searchParams.get("encouragementType") || "none") as "coach" | "parent" | "none" | "all",
        sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      }

      const result = await getAllStudyLogsForCoach(filters)

      return NextResponse.json({
        type: "logs",
        logs: result.success ? result.logs : [],
        error: result.success ? undefined : result.error,
        fetchedAt: Date.now(),
      })
    }
  } catch (error) {
    console.error("[API] Coach encouragement error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
