import { NextRequest, NextResponse } from "next/server"
import { generateGoalNavigationMessage } from "@/lib/openai/goal-coaching"
import { requireAuth } from "@/lib/api/auth"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

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
