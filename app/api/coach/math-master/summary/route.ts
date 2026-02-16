import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"

export const dynamic = "force-dynamic"

function mapRpcErrorStatus(message: string): number {
  if (message.includes("Unauthorized")) return 403
  if (message.includes("Invalid grade") || message.includes("not found")) return 400
  return 500
}

/**
 * 算数マスタープリント サマリーAPI
 * 学年別の各回平均点・提出状況を取得
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
    const gradeParam = searchParams.get("grade")
    const grade = gradeParam === "5" || gradeParam === "6" ? Number(gradeParam) : null

    if (grade === null) {
      return NextResponse.json(
        { error: "grade パラメータが必要です（5 or 6）" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc("get_math_master_summary", {
      p_grade: grade,
    })

    if (error) {
      console.error("[API] math-master summary RPC error:", error)
      const status = mapRpcErrorStatus(error.message)
      return NextResponse.json(
        { error: status === 500 ? "データの取得に失敗しました" : error.message },
        { status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] math-master summary error:", error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    )
  }
}
