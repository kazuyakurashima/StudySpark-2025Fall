import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStudentDetail, getStudentLearningHistory } from "@/app/actions/coach"

export const dynamic = "force-dynamic"

/**
 * 指導者用生徒詳細API Route
 * SWRのfetcher用エンドポイント
 * 生徒詳細と学習履歴を並列取得して返す
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id

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

    // 生徒詳細と学習履歴を並列取得
    const [detailResult, historyResult] = await Promise.all([
      getStudentDetail(studentId),
      getStudentLearningHistory(studentId, 30),
    ])

    // レスポンスを構築
    const response = {
      student: detailResult?.error
        ? { error: detailResult.error }
        : detailResult?.student || null,
      studyLogs: historyResult?.error
        ? { studyLogs: [], batchFeedbacks: {}, legacyFeedbacks: {}, error: historyResult.error }
        : {
            studyLogs: historyResult?.studyLogs || [],
            batchFeedbacks: historyResult?.batchFeedbacks || {},
            legacyFeedbacks: historyResult?.legacyFeedbacks || {},
          },
      fetchedAt: Date.now(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API] Coach student detail error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
