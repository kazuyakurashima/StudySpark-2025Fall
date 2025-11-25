import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoachStudentLearningRecords, getInactiveStudents } from "@/app/actions/coach"

export const dynamic = "force-dynamic"

/**
 * 指導者ダッシュボード用API Route
 * SWRのfetcher用エンドポイント
 * 学習記録と未入力生徒データを並列取得して返す
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

    // 学習記録と未入力生徒データを並列取得
    const [recordsResult, inactiveResult] = await Promise.all([
      getCoachStudentLearningRecords(50),
      getInactiveStudents(3), // 3日以上で取得し、クライアント側でフィルタリング
    ])

    // レスポンスを構築
    const response = {
      records: recordsResult?.error
        ? { records: [], error: recordsResult.error }
        : { records: recordsResult?.records || [] },
      inactiveStudents: inactiveResult?.error
        ? { students: [], error: inactiveResult.error }
        : { students: inactiveResult?.students || [] },
      fetchedAt: Date.now(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API] Coach dashboard error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
