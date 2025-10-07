import { NextRequest, NextResponse } from "next/server"
import { generateGoalNavigationMessage } from "@/lib/openai/goal-coaching"

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

    const { message, error } = await generateGoalNavigationMessage({
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

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Goal navigation API error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
