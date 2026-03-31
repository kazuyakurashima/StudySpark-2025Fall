"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
type RecordingState = "idle" | "recording" | "comparing"

interface ProviderResult {
  text?: string
  latencyMs: number
  model: string
  error?: string
}

interface CompareResult {
  groq?: ProviderResult
  openai?: ProviderResult
}

/** MediaRecorder が対応する mimeType を検出する */
function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

function getExtFromBlobType(blobType: string): string | null {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/flac": "flac",
  }
  const base = blobType.split(";")[0].trim()
  return map[base] ?? null
}

const MAX_RECORDING_SEC = 60

export default function VoiceComparePage() {
  const [state, setState] = useState<RecordingState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini-transcribe")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setElapsed(0)
  }, [])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      cleanup()
    }
  }, [cleanup])

  const sendToCompare = useCallback(
    async (blob: Blob) => {
      setState("comparing")
      setResult(null)
      setError(null)

      const ext = getExtFromBlobType(blob.type)
      if (!ext) {
        setError("この端末の音声形式に対応していません")
        setState("idle")
        return
      }

      try {
        const formData = new FormData()
        formData.append("file", blob, `recording.${ext}`)
        formData.append("openaiModel", openaiModel)

        const res = await fetch("/api/voice/compare", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || `エラー: ${res.status}`)
          setState("idle")
          return
        }

        const data: CompareResult = await res.json()
        setResult(data)
      } catch {
        setError("比較リクエストに失敗しました")
      } finally {
        setState("idle")
      }
    },
    [openaiModel]
  )

  const startRecording = useCallback(async () => {
    try {
      setResult(null)
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mimeType || ""
        const blob = new Blob(chunksRef.current, { type: actualMime })
        cleanup()
        if (blob.size > 0) {
          sendToCompare(blob)
        } else {
          setState("idle")
        }
      }

      recorder.start()
      setState("recording")
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (next >= MAX_RECORDING_SEC) {
            mediaRecorderRef.current?.stop()
          }
          return next
        })
      }, 1000)
    } catch {
      cleanup()
      setState("idle")
      setError("マイクの起動に失敗しました")
    }
  }, [cleanup, sendToCompare])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">音声認識 比較検証</h1>
          <p className="text-sm text-slate-500 mt-1">同一音声を Groq と OpenAI に同時送信して結果を比較します（dev-only）</p>
        </div>

        {/* 録音コントロール */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={state === "recording" ? stopRecording : startRecording}
              disabled={state === "comparing"}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                state === "idle"
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  : state === "recording"
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-slate-200 text-slate-400"
              }`}
            >
              {state === "idle" && <Mic className="h-7 w-7" />}
              {state === "recording" && <Square className="h-6 w-6 fill-current" />}
              {state === "comparing" && <Loader2 className="h-7 w-7 animate-spin" />}
            </button>
            <div>
              {state === "idle" && <p className="text-sm text-slate-500">クリックして録音開始</p>}
              {state === "recording" && (
                <p className="text-sm text-red-600 font-mono">録音中... {formatTime(elapsed)}</p>
              )}
              {state === "comparing" && <p className="text-sm text-slate-500">Groq / OpenAI に同時送信中...</p>}
            </div>
          </div>

          {/* OpenAI モデル選択 */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500 font-medium">OpenAI モデル:</label>
            <select
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              disabled={state !== "idle"}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe ($0.003/min)</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe ($0.006/min)</option>
            </select>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 結果比較 */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Groq */}
            <ResultCard
              title="Groq"
              subtitle="whisper-large-v3-turbo"
              cost="$0.04/hour"
              result={result.groq}
            />

            {/* OpenAI */}
            <ResultCard
              title="OpenAI"
              subtitle={result.openai?.model || openaiModel}
              cost={openaiModel === "gpt-4o-mini-transcribe" ? "$0.003/min" : "$0.006/min"}
              result={result.openai}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ResultCard({
  title,
  subtitle,
  cost,
  result,
}: {
  title: string
  subtitle: string
  cost: string
  result?: ProviderResult
}) {
  if (!result) return null

  const hasError = !!result.error

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 space-y-3 ${hasError ? "border-red-200" : ""}`}>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">
          {subtitle} · {cost}
        </p>
      </div>

      {hasError ? (
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-sm text-red-600">{result.error}</p>
          <p className="text-xs text-red-400 mt-1">latency: {result.latencyMs}ms</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>latency: <strong className="text-slate-700">{result.latencyMs}ms</strong></span>
            <span>chars: <strong className="text-slate-700">{result.text?.length || 0}</strong></span>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 min-h-[80px]">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {result.text || <span className="text-slate-400 italic">（無音）</span>}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
