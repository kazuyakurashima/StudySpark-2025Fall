import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student", "parent", "coach"])
  if ("error" in auth) return auth.error

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません" },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const model = body.model || "gpt-4o-mini-transcribe"

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-realtime-preview",
          input_audio_transcription: {
            model,
            language: "ja",
          },
          turn_detection: {
            type: "server_vad",
            silence_duration_ms: 500,
            threshold: 0.5,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text().catch(() => "unknown")
      console.error("[realtime-token] OpenAI error:", response.status, err)
      return NextResponse.json(
        { error: "トークン取得に失敗しました" },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      token: data.client_secret?.value,
      expiresAt: data.client_secret?.expires_at,
    })
  } catch (error) {
    console.error("[realtime-token] Unexpected error:", error)
    return NextResponse.json(
      { error: "トークン取得中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
