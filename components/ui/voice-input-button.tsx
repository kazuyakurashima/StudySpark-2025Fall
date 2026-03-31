"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, Loader2, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type VoiceState = "idle" | "recording" | "processing"

interface VoiceInputButtonProps {
  onTranscribed: (text: string) => void
  disabled?: boolean
  className?: string
}

/** MediaRecorder が対応する mimeType を検出する */
function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

/** mimeType からファイル拡張子を決定 */
function getExtFromMime(mime: string | undefined): string {
  if (!mime) return "webm"
  const base = mime.split(";")[0].trim()
  if (base === "audio/mp4") return "mp4"
  return "webm"
}

const MAX_RECORDING_SEC = 60

export function VoiceInputButton({
  onTranscribed,
  disabled = false,
  className,
}: VoiceInputButtonProps) {
  const [state, setState] = useState<VoiceState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [isSupported, setIsSupported] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  // MediaRecorder 非対応ブラウザ検出（hooks の後で実行）
  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      setIsSupported(false)
    }
  }, [])

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

  // ページ遷移時のクリーンアップ
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      cleanup()
    }
  }, [cleanup])

  const sendAudio = useCallback(
    async (blob: Blob, mimeType: string | undefined) => {
      setState("processing")
      try {
        const ext = getExtFromMime(mimeType)
        const formData = new FormData()
        formData.append("file", blob, `recording.${ext}`)

        const res = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
        })

        if (res.status === 429) {
          toast({
            title: "しばらく待ってからお試しください",
            variant: "destructive",
          })
          return
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast({
            title: data.error || "音声の変換に失敗しました",
            variant: "destructive",
          })
          return
        }

        const { text } = await res.json()
        if (text && text.trim()) {
          onTranscribed(text.trim())
        }
      } catch {
        toast({
          title: "音声の変換に失敗しました",
          variant: "destructive",
        })
      } finally {
        setState("idle")
      }
    },
    [onTranscribed, toast]
  )

  const startRecording = useCallback(async () => {
    try {
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
        const actualMime = recorder.mimeType || mimeType
        const blob = new Blob(chunksRef.current, {
          type: actualMime || "audio/webm",
        })
        cleanup()
        if (blob.size > 0) {
          sendAudio(blob, actualMime)
        } else {
          setState("idle")
        }
      }

      recorder.start()
      setState("recording")
      setElapsed(0)

      // 録音時間タイマー
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (next >= MAX_RECORDING_SEC) {
            // 上限到達で自動停止
            mediaRecorderRef.current?.stop()
          }
          return next
        })
      }, 1000)
    } catch (err) {
      cleanup()
      setState("idle")

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast({
          title: "マイクの使用を許可してください",
          description: "ブラウザの設定からマイクへのアクセスを許可してください",
          variant: "destructive",
        })
      } else {
        toast({
          title: "マイクの起動に失敗しました",
          variant: "destructive",
        })
      }
    }
  }, [cleanup, sendAudio, toast])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const handleClick = useCallback(() => {
    if (state === "idle") {
      startRecording()
    } else if (state === "recording") {
      stopRecording()
    }
    // processing 中はクリック無視
  }, [state, startRecording, stopRecording])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // MediaRecorder 非対応ブラウザでは非表示
  if (!isSupported) return null

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {state === "recording" && (
        <span className="text-xs text-red-600 font-mono animate-pulse">
          {formatTime(elapsed)}
        </span>
      )}
      {state === "processing" && (
        <span className="text-xs text-slate-500">変換中...</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled || state === "processing"}
        className={cn(
          "h-8 w-8 rounded-full transition-all",
          state === "idle" && "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
          state === "recording" && "text-white bg-red-500 hover:bg-red-600 animate-pulse shadow-md",
          state === "processing" && "text-slate-400"
        )}
        title={
          state === "idle"
            ? "音声入力"
            : state === "recording"
              ? "録音を停止"
              : "変換中..."
        }
      >
        {state === "idle" && <Mic className="h-4 w-4" />}
        {state === "recording" && <Square className="h-3.5 w-3.5 fill-current" />}
        {state === "processing" && <Loader2 className="h-4 w-4 animate-spin" />}
      </Button>
    </div>
  )
}
