import { NextRequest, NextResponse } from "next/server"
import { generateReflectSummary } from "@/lib/openai/reflect-coaching"

export async function POST(request: NextRequest) {
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

    const { summary, error } = await generateReflectSummary({
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

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Reflect summary API error:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}
