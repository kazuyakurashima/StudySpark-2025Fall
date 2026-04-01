"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, Square, Loader2 } from "lucide-react"

type PageState = "idle" | "recording" | "processing"

/** MediaRecorder が対応する mimeType を検出する */
function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

function getExtFromBlobType(blobType: string): string | null {
  const map: Record<string, string> = {
    "audio/webm": "webm", "audio/mp4": "mp4", "audio/m4a": "m4a",
    "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3", "audio/flac": "flac",
  }
  return map[blobType.split(";")[0].trim()] ?? null
}

const MAX_RECORDING_SEC = 60

export default function VoiceComparePage() {
  const [state, setState] = useState<PageState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini-transcribe")

  // Groq batch 結果
  const [groqText, setGroqText] = useState<string | null>(null)
  const [groqLatency, setGroqLatency] = useState<number | null>(null)
  const [groqError, setGroqError] = useState<string | null>(null)
  const [groqLoading, setGroqLoading] = useState(false)

  // OpenAI Realtime 結果
  const [realtimePartial, setRealtimePartial] = useState("")
  const [realtimeFinal, setRealtimeFinal] = useState<string | null>(null)
  const [realtimeFirstDelta, setRealtimeFirstDelta] = useState<number | null>(null)
  const [realtimeFinalMs, setRealtimeFinalMs] = useState<number | null>(null)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const recordingStartRef = useRef<number>(0)
  const firstDeltaReceivedRef = useRef(false)
  // item_id ごとのテキストを蓄積
  const transcriptsRef = useRef<Map<string, string>>(new Map())

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setElapsed(0)
  }, [])

  const cleanupRealtime = useCallback(() => {
    if (dcRef.current) { dcRef.current.close(); dcRef.current = null }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    setRealtimeConnected(false)
  }, [])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop()
      cleanup()
      cleanupRealtime()
    }
  }, [cleanup, cleanupRealtime])

  // ── Groq batch 送信 ──
  const sendGroqBatch = useCallback(async (blob: Blob) => {
    const ext = getExtFromBlobType(blob.type)
    if (!ext) { setGroqError("音声形式非対応"); return }

    setGroqLoading(true)
    setGroqText(null)
    setGroqError(null)
    setGroqLatency(null)

    const startMs = Date.now()
    try {
      const formData = new FormData()
      formData.append("file", blob, `recording.${ext}`)

      const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData })
      const latency = Date.now() - startMs
      setGroqLatency(latency)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setGroqError(data.error || `Error ${res.status}`)
        return
      }
      const data = await res.json()
      setGroqText(data.text || "")
    } catch {
      setGroqLatency(Date.now() - startMs)
      setGroqError("リクエスト失敗")
    } finally {
      setGroqLoading(false)
    }
  }, [])

  // ── OpenAI Realtime 接続 ──
  const startRealtime = useCallback(async (stream: MediaStream) => {
    setRealtimePartial("")
    setRealtimeFinal(null)
    setRealtimeFirstDelta(null)
    setRealtimeFinalMs(null)
    setRealtimeError(null)
    firstDeltaReceivedRef.current = false
    transcriptsRef.current.clear()

    try {
      // 1. エフェメラルトークン取得
      const tokenRes = await fetch("/api/voice/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: openaiModel }),
      })
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({}))
        setRealtimeError(data.error || "トークン取得失敗")
        return
      }
      const { token } = await tokenRes.json()
      if (!token) {
        setRealtimeError("トークンが空です")
        return
      }

      // 2. WebRTC PeerConnection
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // マイクトラック追加
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) pc.addTrack(audioTrack, stream)

      // Data channel でイベント受信
      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc

      dc.addEventListener("open", () => {
        setRealtimeConnected(true)
      })

      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data)

          if (event.type === "conversation.item.input_audio_transcription.delta") {
            const itemId = event.item_id || "default"
            const prev = transcriptsRef.current.get(itemId) || ""
            const updated = prev + (event.delta || "")
            transcriptsRef.current.set(itemId, updated)
            setRealtimePartial(updated)

            if (!firstDeltaReceivedRef.current) {
              firstDeltaReceivedRef.current = true
              setRealtimeFirstDelta(Date.now() - recordingStartRef.current)
            }
          }

          if (event.type === "conversation.item.input_audio_transcription.completed") {
            const transcript = event.transcript || ""
            setRealtimeFinal(transcript)
            setRealtimeFinalMs(Date.now() - recordingStartRef.current)
          }
        } catch { /* ignore parse errors */ }
      })

      // 3. SDP offer → OpenAI
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
      })

      if (!sdpRes.ok) {
        setRealtimeError(`SDP交換失敗: ${sdpRes.status}`)
        cleanupRealtime()
        return
      }

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpRes.text(),
      }
      await pc.setRemoteDescription(answer)

    } catch (err) {
      setRealtimeError(`接続失敗: ${err}`)
      cleanupRealtime()
    }
  }, [openaiModel, cleanupRealtime])

  // ── 録音開始 ──
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setGroqText(null); setGroqLatency(null); setGroqError(null)
      setRealtimePartial(""); setRealtimeFinal(null); setRealtimeFirstDelta(null)
      setRealtimeFinalMs(null); setRealtimeError(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      recordingStartRef.current = Date.now()

      // Realtime 接続開始（同じストリームを使う）
      startRealtime(stream)

      // MediaRecorder（Groq batch 用）
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
        if (blob.size > 0) sendGroqBatch(blob)
      }

      recorder.start()
      setState("recording")
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (next >= MAX_RECORDING_SEC) stopRecording()
          return next
        })
      }, 1000)
    } catch {
      cleanup()
      cleanupRealtime()
      setState("idle")
      setError("マイクの起動に失敗しました")
    }
  }, [cleanup, cleanupRealtime, sendGroqBatch, startRealtime])

  // ── 録音停止（安全な順序: マイク停止 → completed 待ち → 接続 close） ──
  const stopRecording = useCallback(() => {
    if (state !== "recording") return
    setState("processing")

    // 1. MediaRecorder 停止 → blob 生成 → Groq 送信
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }

    // 2. タイマー停止
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    // 3. マイクトラック停止（Realtime 側に無音→VAD が発話終了を検出→completed）
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    // 4. 少し待ってから Realtime 切断（completed を受ける猶予）
    setTimeout(() => {
      cleanupRealtime()
      setState("idle")
    }, 3000)
  }, [state, cleanupRealtime])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h1 className="text-xl sm:text-2xl font-bold text-amber-900">DEV: Groq Batch vs OpenAI Realtime</h1>
          <p className="text-sm text-amber-700 mt-1">1回録音 → 左: Groq 一括転写 / 右: OpenAI リアルタイム転写</p>
          <p className="text-xs text-amber-500 mt-1 font-mono">/dev/voice-compare</p>
        </div>

        {/* 録音コントロール */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={state === "recording" ? stopRecording : startRecording}
              disabled={state === "processing"}
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
              {state === "processing" && <Loader2 className="h-7 w-7 animate-spin" />}
            </button>
            <div>
              {state === "idle" && <p className="text-sm text-slate-500">クリックして録音開始</p>}
              {state === "recording" && (
                <div>
                  <p className="text-sm text-red-600 font-mono">録音中... {formatTime(elapsed)}</p>
                  {realtimeConnected && <p className="text-xs text-green-600">Realtime 接続中</p>}
                </div>
              )}
              {state === "processing" && <p className="text-sm text-slate-500">完了待ち...</p>}
            </div>
          </div>

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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 2列比較 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 左: Groq batch */}
          <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Groq <span className="text-xs font-normal text-slate-400">(batch)</span></h3>
              <p className="text-xs text-slate-400">whisper-large-v3-turbo · $0.04/hour</p>
            </div>

            {groqLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>転写中...</span>
              </div>
            )}

            {groqError && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-sm text-red-600">{groqError}</p>
              </div>
            )}

            {groqText !== null && !groqLoading && (
              <>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p>stop → final: <strong className="text-slate-700">{groqLatency}ms</strong></p>
                  <p>chars: <strong className="text-slate-700">{groqText.length}</strong></p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 min-h-[80px]">
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {groqText || <span className="text-slate-400 italic">（無音）</span>}
                  </p>
                </div>
              </>
            )}

            {!groqLoading && groqText === null && !groqError && (
              <div className="bg-slate-50 rounded-lg p-4 min-h-[80px] flex items-center justify-center">
                <p className="text-sm text-slate-400">録音後に結果表示</p>
              </div>
            )}
          </div>

          {/* 右: OpenAI Realtime */}
          <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">OpenAI <span className="text-xs font-normal text-slate-400">(realtime)</span></h3>
              <p className="text-xs text-slate-400">{openaiModel} · Realtime API</p>
            </div>

            {realtimeError && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-sm text-red-600">{realtimeError}</p>
              </div>
            )}

            <div className="text-xs text-slate-500 space-y-0.5">
              <p>start → first delta: <strong className="text-slate-700">
                {realtimeFirstDelta !== null ? `${realtimeFirstDelta}ms` : "—"}
              </strong></p>
              <p>start → final: <strong className="text-slate-700">
                {realtimeFinalMs !== null ? `${realtimeFinalMs}ms` : "—"}
              </strong></p>
              <p>chars: <strong className="text-slate-700">
                {realtimeFinal !== null ? realtimeFinal.length : realtimePartial.length || "—"}
              </strong></p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 min-h-[80px]">
              {realtimeFinal !== null ? (
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{realtimeFinal}</p>
              ) : realtimePartial ? (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {realtimePartial}<span className="animate-pulse text-blue-500">|</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {realtimeConnected ? "音声待ち..." : "録音後にリアルタイム表示"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
