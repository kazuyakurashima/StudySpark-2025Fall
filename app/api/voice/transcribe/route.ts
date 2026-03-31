import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"

export const runtime = "nodejs"

/** ファイルサイズ上限: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** upstream タイムアウト: 30秒 */
const UPSTREAM_TIMEOUT_MS = 30_000

/** 許可する MIME type → Groq に送るファイル拡張子 */
const ALLOWED_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/flac": "flac",
}

export async function POST(request: NextRequest) {
  // 1. 認証
  const auth = await requireAuth(["student", "parent", "coach"])
  if ("error" in auth) return auth.error

  // 2. APIキー確認
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error("[voice/transcribe] GROQ_API_KEY is not configured")
    return NextResponse.json(
      { error: "音声認識サービスが設定されていません" },
      { status: 503 }
    )
  }

  try {
    // 3. リクエストからファイルを取得
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "音声ファイルが見つかりません" },
        { status: 400 }
      )
    }

    // 4. ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズが上限（5MB）を超えています" },
        { status: 413 }
      )
    }

    // 5. MIME type チェック
    const baseMime = file.type.split(";")[0].trim()
    const ext = ALLOWED_MIME[baseMime]
    if (!ext) {
      return NextResponse.json(
        { error: `対応していない音声形式です: ${baseMime || "不明"}` },
        { status: 415 }
      )
    }

    // 6. Whisper API に転送（タイムアウト付き）
    const whisperFormData = new FormData()
    whisperFormData.append("file", file, `audio.${ext}`)
    whisperFormData.append("model", "whisper-large-v3-turbo")
    whisperFormData.append("language", "ja")
    whisperFormData.append("response_format", "verbose_json")

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    let whisperRes: Response
    try {
      whisperRes = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: whisperFormData,
          signal: controller.signal,
        }
      )
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        console.error("[voice/transcribe] Groq API timeout")
        return NextResponse.json(
          { error: "音声の変換がタイムアウトしました" },
          { status: 504 }
        )
      }
      throw fetchError
    } finally {
      clearTimeout(timeout)
    }

    // 7. Rate limit
    if (whisperRes.status === 429) {
      return NextResponse.json(
        { error: "しばらく待ってからお試しください" },
        { status: 429 }
      )
    }

    // 8. API エラー
    if (!whisperRes.ok) {
      const errorBody = await whisperRes.text().catch(() => "unknown")
      console.error(
        `[voice/transcribe] Groq API error: ${whisperRes.status}`,
        errorBody
      )
      return NextResponse.json(
        { error: "音声の変換に失敗しました" },
        { status: 502 }
      )
    }

    const whisperData = await whisperRes.json()
    const text = whisperData.text?.trim() || ""

    // 9. 空テキスト（無音）
    if (!text) {
      return NextResponse.json({ text: "" })
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error("[voice/transcribe] Unexpected error:", error)
    return NextResponse.json(
      { error: "音声の変換中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
