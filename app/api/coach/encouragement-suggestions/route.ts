import { NextRequest, NextResponse } from "next/server"
import { generateEncouragementSuggestions } from "@/lib/openai/encouragement"
import { requireAuth } from "@/lib/api/auth"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["coach", "admin"])
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { studentName, subject, understandingLevel, reflection, correctRate, streak } = body

    const result = await generateEncouragementSuggestions({
      studentName,
      subject,
      understandingLevel,
      reflection,
      correctRate,
      streak,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ suggestions: result.suggestions })
  } catch (error) {
    console.error("Error generating encouragement suggestions:", error)
    return NextResponse.json({ error: "応援メッセージ生成に失敗しました" }, { status: 500 })
  }
}
