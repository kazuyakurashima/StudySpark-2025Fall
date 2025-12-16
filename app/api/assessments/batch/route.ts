import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"
import { batchCreateAssessments } from "@/app/actions/class-assessment"
import type { BatchAssessmentInput } from "@/lib/types/class-assessment"

export const dynamic = "force-dynamic"

/**
 * テスト結果バッチ登録API
 * POST /api/assessments/batch
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディ取得
    const body = await request.json()
    const inputs: BatchAssessmentInput[] = body.inputs

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: "入力データが必要です" },
        { status: 400 }
      )
    }

    // Server Actionを呼び出し
    const result = await batchCreateAssessments(inputs)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          inserted: result.inserted,
          updated: result.updated,
          errors: result.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
    })
  } catch (error) {
    console.error("[API] Batch create assessments error:", error)
    return NextResponse.json(
      { error: "テスト結果の登録に失敗しました" },
      { status: 500 }
    )
  }
}
