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

/** Provider ごとの設定 */
function getProviderConfig(provider: VoiceProvider) {
  if (provider === "openai") {
    const model = process.env.VOICE_OPENAI_MODEL || "gpt-4o-mini-transcribe"
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

export async function POST(request: NextRequest) {
  // 1. 認証
  const auth = await requireAuth(["student", "parent", "coach"])
  if ("error" in auth) return auth.error

  // 2. Provider 判定（クエリパラメータで上書き可能、dev 比較用）
  const urlProvider = request.nextUrl.searchParams.get("provider") as VoiceProvider | null
  const provider = urlProvider || (process.env.VOICE_PROVIDER || "groq") as VoiceProvider
  const config = getProviderConfig(provider)

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
    const text = data.text?.trim() || ""

    // 11. 開発ログ（比較用）
    console.log(
      `[voice/transcribe] provider=${provider} model=${config.model} latency=${latencyMs}ms chars=${text.length}`
    )

    // 12. 空テキスト（無音）
    if (!text) {
      return NextResponse.json({ text: "", provider, latencyMs })
    }

    return NextResponse.json({ text, provider, latencyMs })
  } catch (error) {
    console.error("[voice/transcribe] Unexpected error:", error)
    return NextResponse.json(
      { error: "音声の変換中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
