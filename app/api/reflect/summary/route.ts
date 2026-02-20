import { NextRequest, NextResponse } from "next/server"
import { generateReflectSummary } from "@/lib/openai/reflect-coaching"
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
