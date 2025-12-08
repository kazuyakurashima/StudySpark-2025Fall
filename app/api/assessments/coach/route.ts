import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"
import { getCoachAssessments } from "@/app/actions/class-assessment"
import type { AssessmentType, AssessmentGrade } from "@/lib/types/class-assessment"

export const dynamic = "force-dynamic"

/**
 * 指導者用テスト結果一覧API
 * GET /api/assessments/coach?grade=5年&type=math_print&masterId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // ロールチェック
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["coach", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const grade = searchParams.get("grade") as AssessmentGrade | null
    const type = searchParams.get("type") as AssessmentType | null
    const masterId = searchParams.get("masterId")

    // 指導者のテスト結果取得
    const result = await getCoachAssessments({
      grade: grade || undefined,
      type: type || undefined,
      masterId: masterId || undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      students: result.data,
      fetchedAt: Date.now(),
    })
  } catch (error) {
    console.error("[API] Coach assessments error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
