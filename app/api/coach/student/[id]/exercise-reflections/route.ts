import { NextRequest, NextResponse } from "next/server"
import { getStudentExerciseReflections } from "@/app/actions/exercise-master"

export const dynamic = "force-dynamic"

/**
 * 生徒の演習振り返り+AIフィードバック閲覧API
 * 指導者・保護者がアクセス可能（checkStudentAccess で認可）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = Number(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "生徒IDが不正です" },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const qsIdParam = searchParams.get("question_set_id")
    const questionSetId = qsIdParam ? Number(qsIdParam) : null

    if (questionSetId === null || isNaN(questionSetId)) {
      return NextResponse.json(
        { error: "question_set_id パラメータが必要です" },
        { status: 400 }
      )
    }

    const { data, error } = await getStudentExerciseReflections(studentId, questionSetId)

    if (error) {
      const status = error.includes("認証") ? 401
        : error.includes("アクセス権限") ? 403
        : 500
      return NextResponse.json({ error }, { status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] exercise-reflections error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
