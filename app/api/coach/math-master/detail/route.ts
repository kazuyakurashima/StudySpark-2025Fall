import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"

export const dynamic = "force-dynamic"

/**
 * 算数マスタープリント 詳細API
 * 指定セットの設問×生徒 正誤マトリクスを取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

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

    const searchParams = request.nextUrl.searchParams
    const qsIdParam = searchParams.get("question_set_id")
    const questionSetId = qsIdParam ? Number(qsIdParam) : null

    if (questionSetId === null || isNaN(questionSetId)) {
      return NextResponse.json(
        { error: "question_set_id パラメータが必要です" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc("get_math_master_detail", {
      p_question_set_id: questionSetId,
    })

    if (error) {
      console.error("[API] math-master detail RPC error:", error)
      return NextResponse.json(
        { error: "データの取得に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] math-master detail error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
