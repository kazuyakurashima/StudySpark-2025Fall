import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 30_000

const ALLOWED_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/flac": "flac",
}

interface ProviderResult {
  text?: string
  latencyMs: number
  model: string
  error?: string
}

/** 1つの provider に音声を送信して結果を返す */
async function transcribeWith(
  endpoint: string,
  apiKey: string,
  model: string,
  file: File,
  ext: string,
  responseFormat: string,
): Promise<ProviderResult> {
  const startMs = Date.now()

  const formData = new FormData()
  formData.append("file", file, `audio.${ext}`)
  formData.append("model", model)
  formData.append("language", "ja")
  formData.append("response_format", responseFormat)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    })

    const latencyMs = Date.now() - startMs

    if (res.status === 429) {
      return { latencyMs, model, error: "Rate limit (429)" }
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "unknown")
      return { latencyMs, model, error: `API error ${res.status}: ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    return { text: data.text?.trim() || "", latencyMs, model }
  } catch (err) {
    const latencyMs = Date.now() - startMs
    if (err instanceof DOMException && err.name === "AbortError") {
      return { latencyMs, model, error: "Timeout (30s)" }
    }
    return { latencyMs, model, error: String(err) }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  // 認証
  const auth = await requireAuth(["student", "parent", "coach"])
  if ("error" in auth) return auth.error

  // APIキー確認
  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!groqKey && !openaiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 503 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const openaiModel = (formData.get("openaiModel") as string) || "gpt-4o-mini-transcribe"

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "音声ファイルが見つかりません" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "ファイルサイズが上限（5MB）を超えています" }, { status: 413 })
    }

    const baseMime = file.type.split(";")[0].trim()
    const ext = ALLOWED_MIME[baseMime]
    if (!ext) {
      return NextResponse.json({ error: `対応していない音声形式です: ${baseMime || "不明"}` }, { status: 415 })
    }

    // 両 provider に並列送信（片方失敗してももう片方の結果を返す）
    const promises: Promise<{ provider: string; result: ProviderResult }>[] = []

    if (groqKey) {
      promises.push(
        transcribeWith(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          groqKey,
          "whisper-large-v3-turbo",
          file,
          ext,
          "verbose_json",
        ).then((result) => ({ provider: "groq", result }))
      )
    }

    if (openaiKey) {
      promises.push(
        transcribeWith(
          "https://api.openai.com/v1/audio/transcriptions",
          openaiKey,
          openaiModel,
          file,
          ext,
          "json",
        ).then((result) => ({ provider: "openai", result }))
      )
    }

    const settled = await Promise.all(promises)

    const response: Record<string, ProviderResult | { error: string }> = {}
    for (const { provider, result } of settled) {
      response[provider] = result
    }

    // 未設定の provider にはエラーを返す
    if (!groqKey) response.groq = { error: "GROQ_API_KEY not configured", latencyMs: 0, model: "-" }
    if (!openaiKey) response.openai = { error: "OPENAI_API_KEY not configured", latencyMs: 0, model: "-" }

    console.log("[voice/compare]", JSON.stringify(response))

    return NextResponse.json(response)
  } catch (error) {
    console.error("[voice/compare] Unexpected error:", error)
    return NextResponse.json({ error: "比較処理中にエラーが発生しました" }, { status: 500 })
  }
}
