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
      { error: "リクエストの解析に失敗しました", error_code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "不正なリクエストです", error_code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: "生徒情報が見つかりません", error_code: "VALIDATION_ERROR" }, { status: 404 })
    }
    const student = studentResult.data

    if (!scheduleResult.data) {
      return NextResponse.json(
        { error: "指定されたテスト日程が見つかりません", error_code: "VALIDATION_ERROR" },
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
        { error: "テストの対象学年と生徒の学年が一致しません", error_code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const studentName = student.full_name
    const testName = testTypes?.name ?? "テスト"
    const testDate = schedule.test_date

    const requestId = body.requestId
    const result = await generateGoalThoughts({
      studentName,
      testName,
      testDate,
      targetCourse: body.targetCourse,
      targetClass: body.targetClass,
      conversationHistory: body.conversationHistory,
      currentStep: 3,
    })

    if (result.error) {
      const errorCode = result.error_code ?? "MODEL_ERROR"
      console.error(`[thoughts] error_code=${errorCode} requestId=${requestId ?? "none"}:`, result.error)
      return NextResponse.json({ error: "まとめの生成に失敗しました", error_code: errorCode }, { status: 400 })
    }
    const { goalThoughts } = result

    console.info(`[thoughts] success requestId=${requestId ?? "none"}`)
    return NextResponse.json({ goalThoughts })
  } catch (error) {
    console.error("[thoughts] SERVER_ERROR:", sanitizeForLog(error))
    return NextResponse.json({ error: "サーバーエラーが発生しました", error_code: "SERVER_ERROR" }, { status: 500 })
  }
}
