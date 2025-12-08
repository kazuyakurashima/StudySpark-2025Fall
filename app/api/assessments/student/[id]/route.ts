import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"
import { getStudentAssessments } from "@/app/actions/class-assessment"
import type { AssessmentType } from "@/lib/types/class-assessment"

export const dynamic = "force-dynamic"

/**
 * 生徒のテスト結果一覧API
 * GET /api/assessments/student/[id]?type=math_print&limit=10
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id, 10)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "無効な生徒IDです" },
        { status: 400 }
      )
    }

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
    const type = searchParams.get("type") as AssessmentType | null
    const limitStr = searchParams.get("limit")
    const limit = limitStr ? parseInt(limitStr, 10) : undefined
    const includeResubmissions = searchParams.get("includeResubmissions") === "true"

    // テスト結果取得
    const result = await getStudentAssessments(studentId, {
      type: type || undefined,
      limit,
      includeResubmissions,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      assessments: result.data,
      fetchedAt: Date.now(),
    })
  } catch (error) {
    console.error("[API] Student assessments error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
