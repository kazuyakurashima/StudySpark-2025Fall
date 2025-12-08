import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"
import { getAssessmentMasters } from "@/app/actions/class-assessment"
import type { AssessmentType, AssessmentGrade } from "@/lib/types/class-assessment"

export const dynamic = "force-dynamic"

/**
 * テストマスタ一覧API
 * GET /api/assessments/masters?grade=5年&type=math_print
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

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const grade = searchParams.get("grade") as AssessmentGrade | null
    const type = searchParams.get("type") as AssessmentType | null

    // マスタデータ取得
    const result = await getAssessmentMasters(
      grade || undefined,
      type || undefined
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      masters: result.data,
      fetchedAt: Date.now(),
    })
  } catch (error) {
    console.error("[API] Assessment masters error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
