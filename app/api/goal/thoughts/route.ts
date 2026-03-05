import { NextRequest, NextResponse } from "next/server"
import { generateGoalThoughts } from "@/lib/openai/goal-coaching"
import { requireAuth } from "@/lib/api/auth"
import { thoughtsSchema } from "@/lib/api/goal-schemas"
import { createClient } from "@/lib/supabase/route"
import { sanitizeForLog } from "@/lib/llm/logger"

const requestSchema = thoughtsSchema

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    )
  }

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "不正なリクエストです", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  try {
    // --- 互換レイヤー: testScheduleId の有無で経路分岐 ---
    let studentName: string
    let testName: string
    let testDate: string

    const supabase = await createClient()

    if (body.testScheduleId) {
      // 新クライアント: DB再構築
      const [studentResult, scheduleResult] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, grade")
          .eq("user_id", auth.user.id)
          .single(),
        supabase
          .from("test_schedules")
          .select(`
            id,
            test_date,
            test_types!inner ( name, grade )
          `)
          .eq("id", body.testScheduleId)
          .single(),
      ])

      if (!studentResult.data) {
        return NextResponse.json({ error: "生徒情報が見つかりません" }, { status: 404 })
      }
      const student = studentResult.data

      if (!scheduleResult.data) {
        return NextResponse.json(
          { error: "指定されたテスト日程が見つかりません" },
          { status: 404 }
        )
      }
      const schedule = scheduleResult.data

      // 学年整合チェック
      const testTypes = Array.isArray(schedule.test_types)
        ? schedule.test_types[0]
        : schedule.test_types
      if (testTypes && testTypes.grade !== student.grade) {
        return NextResponse.json(
          { error: "テストの対象学年と生徒の学年が一致しません" },
          { status: 400 }
        )
      }

      studentName = student.full_name
      testName = testTypes?.name ?? "テスト"
      testDate = schedule.test_date
    } else {
      // 旧クライアント互換（フロントエンド移行完了後に削除予定）
      console.warn(
        `[Goal thoughts compat] legacy payload used: userId=${auth.user.id}`
      )

      const studentResult = await supabase
        .from("students")
        .select("full_name")
        .eq("user_id", auth.user.id)
        .single()
      if (!studentResult.data) {
        return NextResponse.json({ error: "生徒情報が見つかりません" }, { status: 404 })
      }
      studentName = studentResult.data.full_name
      testName = body.testName ?? "テスト"
      testDate = body.testDate ?? new Date().toISOString().slice(0, 10)
    }

    const { goalThoughts, error } = await generateGoalThoughts({
      studentName,
      testName,
      testDate,
      targetCourse: body.targetCourse,
      targetClass: body.targetClass,
      conversationHistory: body.conversationHistory,
      currentStep: 3,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ goalThoughts })
  } catch (error) {
    console.error("Goal thoughts API error:", sanitizeForLog(error))
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
