import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"

export const runtime = "nodejs"

/** ファイルサイズ上限: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** upstream タイムアウト: 30秒 */
const UPSTREAM_TIMEOUT_MS = 30_000

/** 許可する MIME type → ファイル拡張子 */
const ALLOWED_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/flac": "flac",
}

type VoiceProvider = "groq" | "openai"
type VoicePostprocess = "none" | "llama" | "openai"

const GROQ_POLISH_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
const OPENAI_POLISH_MODEL = process.env.VOICE_OPENAI_POLISH_MODEL || "gpt-4o-mini"

/** Provider ごとの設定 */
function getProviderConfig(provider: VoiceProvider, modelOverride?: string | null) {
  if (provider === "openai") {
    const model = modelOverride || process.env.VOICE_OPENAI_MODEL || "gpt-4o-mini-transcribe"
    return {
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: "https://api.openai.com/v1/audio/transcriptions",
      model,
      label: `OpenAI ${model}`,
    }
  }
  return {
    apiKey: process.env.GROQ_API_KEY,
    endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
    model: "whisper-large-v3-turbo",
    label: "Groq whisper-large-v3-turbo",
  }
}

async function polishWithGroqLlama(text: string, apiKey: string, model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  const startMs = Date.now()

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You lightly polish Japanese speech-to-text output. Preserve meaning and wording. Only add natural punctuation, remove filler words when obvious, and fix minor spacing. Return only the polished Japanese text.",
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
      signal: controller.signal,
    })

    const latencyMs = Date.now() - startMs

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown")
      return {
        text,
        latencyMs,
        error: `Postprocess error ${res.status}: ${errorBody.slice(0, 200)}`,
      }
    }

    const data = await res.json()
    const polishedText = data.choices?.[0]?.message?.content?.trim() || text
    return { text: polishedText, latencyMs }
  } catch (error) {
    const latencyMs = Date.now() - startMs
    if (error instanceof DOMException && error.name === "AbortError") {
      return { text, latencyMs, error: "Postprocess timeout" }
    }
    return {
      text,
      latencyMs,
      error: error instanceof Error ? error.message : "Postprocess failed",
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function polishWithOpenAI(text: string, apiKey: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  const startMs = Date.now()

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_POLISH_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You lightly polish Japanese speech-to-text output. Preserve meaning and wording. Only add natural punctuation, remove filler words when obvious, and fix minor spacing. Return only the polished Japanese text.",
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
      signal: controller.signal,
    })

    const latencyMs = Date.now() - startMs

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "unknown")
      return {
        text,
        latencyMs,
        error: `Postprocess error ${res.status}: ${errorBody.slice(0, 200)}`,
      }
    }

    const data = await res.json()
    const polishedText = data.choices?.[0]?.message?.content?.trim() || text
    return { text: polishedText, latencyMs }
  } catch (error) {
    const latencyMs = Date.now() - startMs
    if (error instanceof DOMException && error.name === "AbortError") {
      return { text, latencyMs, error: "Postprocess timeout" }
    }
    return {
      text,
      latencyMs,
      error: error instanceof Error ? error.message : "Postprocess failed",
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  // 1. 認証
  const auth = await requireAuth(["student", "parent", "coach"])
  if ("error" in auth) return auth.error

  // 2. Provider 判定（クエリパラメータで上書き可能、dev 比較用）
  const urlProvider = request.nextUrl.searchParams.get("provider") as VoiceProvider | null
  const modelOverride = request.nextUrl.searchParams.get("model")
  const postprocess = request.nextUrl.searchParams.get("postprocess") as VoicePostprocess | null
  const polishModelOverride = request.nextUrl.searchParams.get("polishModel")
  const provider = urlProvider || (process.env.VOICE_PROVIDER || "groq") as VoiceProvider
  const config = getProviderConfig(provider, modelOverride)

  // 3. APIキー確認
  if (!config.apiKey) {
    console.error(`[voice/transcribe] API key not configured for ${config.label}`)
    return NextResponse.json(
      { error: "音声認識サービスが設定されていません" },
      { status: 503 }
    )
  }

  try {
    // 4. リクエストからファイルを取得
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "音声ファイルが見つかりません" },
        { status: 400 }
      )
    }

    // 5. ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズが上限（5MB）を超えています" },
        { status: 413 }
      )
    }

    // 6. MIME type チェック
    const baseMime = file.type.split(";")[0].trim()
    const ext = ALLOWED_MIME[baseMime]
    if (!ext) {
      return NextResponse.json(
        { error: `対応していない音声形式です: ${baseMime || "不明"}` },
        { status: 415 }
      )
    }

    // 7. 転送用 FormData 構築
    const upstreamFormData = new FormData()
    upstreamFormData.append("file", file, `audio.${ext}`)
    upstreamFormData.append("model", config.model)
    upstreamFormData.append("language", "ja")
    // Groq は verbose_json 対応、OpenAI transcribe モデルは json を使用
    upstreamFormData.append(
      "response_format",
      provider === "groq" ? "verbose_json" : "json"
    )

    // 8. API に転送（タイムアウト付き）
    const startMs = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    let apiRes: Response
    try {
      apiRes = await fetch(config.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: upstreamFormData,
        signal: controller.signal,
      })
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        console.error(`[voice/transcribe] ${config.label} timeout`)
        return NextResponse.json(
          { error: "音声の変換がタイムアウトしました" },
          { status: 504 }
        )
      }
      throw fetchError
    } finally {
      clearTimeout(timeout)
    }

    const latencyMs = Date.now() - startMs

    // 9. Rate limit
    if (apiRes.status === 429) {
      return NextResponse.json(
        { error: "しばらく待ってからお試しください" },
        { status: 429 }
      )
    }

    // 10. API エラー
    if (!apiRes.ok) {
      const errorBody = await apiRes.text().catch(() => "unknown")
      console.error(
        `[voice/transcribe] ${config.label} error: ${apiRes.status}`,
        errorBody
      )
      return NextResponse.json(
        { error: "音声の変換に失敗しました" },
        { status: 502 }
      )
    }

    const data = await apiRes.json()
    const rawText = data.text?.trim() || ""
    let text = rawText
    let postprocessModel: string | null = null
    let postprocessLatencyMs: number | null = null
    let postprocessError: string | null = null

    // postprocess=llama を明示指定、または VOICE_CORRECTION_ENABLED=true の時に Llama 校正を実行
    const correctionByEnv =
      process.env.VOICE_CORRECTION_ENABLED === "true" && provider === "groq" && postprocess !== "none"
    const runLlama =
      rawText && provider === "groq" && (postprocess === "llama" || correctionByEnv)

    if (runLlama) {
      postprocessModel = polishModelOverride || GROQ_POLISH_MODEL
      console.log(`[voice/transcribe] Llama postprocess: model=${postprocessModel}, textLen=${rawText.length}`)
      const polished = await polishWithGroqLlama(rawText, config.apiKey, postprocessModel)
      text = polished.text
      postprocessLatencyMs = polished.latencyMs
      postprocessError = polished.error || null
      if (postprocessError) {
        console.error(`[voice/transcribe] Llama postprocess error: ${postprocessError}`)
      } else {
        console.log(`[voice/transcribe] Llama postprocess ok: ${postprocessLatencyMs}ms`)
      }
    } else if (rawText && provider === "openai" && postprocess === "openai") {
      postprocessModel = OPENAI_POLISH_MODEL
      const polished = await polishWithOpenAI(rawText, config.apiKey)
      text = polished.text
      postprocessLatencyMs = polished.latencyMs
      postprocessError = polished.error || null
    }

    const totalLatencyMs = Date.now() - startMs

    // 11. 空テキスト（無音）
    if (!text) {
      return NextResponse.json({
        text: "",
        rawText,
        provider,
        latencyMs: totalLatencyMs,
        transcriptionLatencyMs: latencyMs,
        postprocessModel,
        postprocessLatencyMs,
        postprocessError,
      })
    }

    return NextResponse.json({
      text,
      rawText,
      provider,
      latencyMs: totalLatencyMs,
      transcriptionLatencyMs: latencyMs,
      postprocessModel,
      postprocessLatencyMs,
      postprocessError,
    })
  } catch (error) {
    console.error("[voice/transcribe] Unexpected error:", error)
    return NextResponse.json(
      { error: "音声の変換中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
