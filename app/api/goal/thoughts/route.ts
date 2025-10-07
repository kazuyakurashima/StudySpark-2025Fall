import { NextRequest, NextResponse } from "next/server"
import { generateGoalThoughts } from "@/lib/openai/goal-coaching"

export async function POST(request: NextRequest) {
  try {
    const {
      studentName,
      testName,
      testDate,
      targetCourse,
      targetClass,
      conversationHistory,
      currentStep,
    } = await request.json()

    const { goalThoughts, error } = await generateGoalThoughts({
      studentName,
      testName,
      testDate,
      targetCourse,
      targetClass,
      conversationHistory,
      currentStep,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ goalThoughts })
  } catch (error) {
    console.error("Goal thoughts API error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
