import { NextRequest, NextResponse } from "next/server"
import { generateReflectMessage } from "@/lib/openai/reflect-coaching"
import { requireAuth } from "@/lib/api/auth"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  try {
    const {
      studentName,
      weekType,
      thisWeekAccuracy,
      lastWeekAccuracy,
      accuracyDiff,
      upcomingTest,
      conversationHistory,
      turnNumber,
    } = await request.json()

    const { message, error } = await generateReflectMessage({
      studentName,
      weekType,
      thisWeekAccuracy,
      lastWeekAccuracy,
      accuracyDiff,
      upcomingTest,
      conversationHistory,
      turnNumber,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Reflect message API error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
