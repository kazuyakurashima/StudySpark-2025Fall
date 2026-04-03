"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, Sparkles, User } from "lucide-react"
import { VoiceInputButton } from "@/components/ui/voice-input-button"
import { fetchSSE } from "@/lib/sse/client"
import { simulateTyping } from "@/lib/sse/typing-effect"

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface GoalNavigationChatProps {
  testScheduleId: number
  studentName: string
  studentAvatar?: string
  testName: string
  testDate: string
  targetCourse: string
  targetClass: number
  onComplete: (goalThoughts: string) => void
  onCancel: () => void
  onFallbackToDirect: () => void
}

const AVATAR_AI_COACH = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

export function GoalNavigationChat({
  testScheduleId,
  studentName,
  studentAvatar,
  testName,
  // testDate: 表示用として props に残すが、API 側は testScheduleId から DB 再構築
  targetCourse,
  targetClass,
  onComplete,
  onCancel,
  onFallbackToDirect,
}: GoalNavigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [finalThoughts, setFinalThoughts] = useState("")
  const [thoughtsFailCount, setThoughtsFailCount] = useState(0)
  const [voiceDebug, setVoiceDebug] = useState<{
    mediaRecorderDefined: boolean
    getUserMediaDefined: boolean
    supportedMimeType: string | null
  }>({
    mediaRecorderDefined: false,
    getUserMediaDefined: false,
    supportedMimeType: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  const typingCancelRef = useRef<(() => void) | null>(null)
  const msgIdRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const shouldShowVoiceInput = currentStep <= 2 && !isLoading && !isComplete

  // 条件付き自動スクロール（最下部付近にいるときのみ）
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      typingCancelRef.current?.()
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaRecorderDefined = typeof MediaRecorder !== "undefined"
    const getUserMediaDefined = typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"

    let supportedMimeType: string | null = null
    if (mediaRecorderDefined) {
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ]
      supportedMimeType =
        candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
    }

    setVoiceDebug({
      mediaRecorderDefined,
      getUserMediaDefined,
      supportedMimeType,
    })
  }, [])



  /** SSEでストリーミング取得（Steps 1-2）。失敗時は非ストリームフォールバック */
  const fetchStepMessage = async (
    step: number,
    history: { role: string; content: string }[],
  ): Promise<string | null> => {
    const controller = new AbortController()
    abortRef.current = controller

    // ref カウンタで一意ID確保（stale closure 回避）
    const placeholderId = ++msgIdRef.current

    try {
      const result = await fetchSSE(
        "/api/goal/stream",
        {
          flowType: "full",
          step,
          testScheduleId,
          targetCourse,
          targetClass,
          conversationHistory: history,
        },
        (accumulated) => {
          // ストリーミング中の逐次更新
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === placeholderId)
            if (existing) {
              return prev.map((m) =>
                m.id === placeholderId ? { ...m, content: accumulated } : m
              )
            }
            return [...prev, { id: placeholderId, role: "assistant", content: accumulated }]
          })
        },
        controller.signal,
      )
      return result.content
    } catch (e) {
      if ((e as Error).name === "AbortError") return null

      // 非ストリームフォールバック
      console.warn("[GoalNavigationChat] SSE failed, falling back to non-stream:", e)
      try {
        const res = await fetch("/api/goal/navigation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testScheduleId,
            targetCourse,
            targetClass,
            conversationHistory: history,
            currentStep: step,
          }),
        })
        const data = await res.json()
        const fallbackMsg = data.message ?? null
        if (fallbackMsg) {
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === placeholderId)
            if (existing) {
              return prev.map((m) =>
                m.id === placeholderId ? { ...m, content: fallbackMsg } : m
              )
            }
            return [...prev, { id: placeholderId, role: "assistant" as const, content: fallbackMsg }]
          })
        }
        return fallbackMsg
      } catch {
        return null
      }
    }
  }

  const startConversation = async () => {
    setIsStarted(true)
    setIsLoading(true)
    msgIdRef.current = 0

    const message = await fetchStepMessage(1, [])

    if (message) {
      // fetchStepMessage already set messages via onChunk, but ensure final state
      setMessages([{ id: msgIdRef.current, role: "assistant", content: message }])
      setIsLoading(false)
    } else {
      alert("エラーが発生しました")
      setIsStarted(false)
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return

    const newUserMessage: Message = {
      id: ++msgIdRef.current,
      role: "user",
      content: userInput.trim(),
    }

    // ローカル変数でstate競合を回避
    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setUserInput("")
    setIsLoading(true)

    const history = updatedMessages.map((m) => ({ role: m.role, content: m.content }))

    try {
      if (currentStep >= 2) {
        // Step 2回答後: 直接thoughts生成 → simulateTyping → onComplete
        // (Step 3 prompt は JSON出力専用のため navigation 経由をスキップ)
        const controller = new AbortController()
        abortRef.current = controller
        const requestId = crypto.randomUUID()

        const response = await fetch("/api/goal/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testScheduleId,
            targetCourse,
            targetClass,
            conversationHistory: history,
            currentStep: 3,
            requestId,
          }),
          signal: controller.signal,
        })

        const data = await response.json().catch(() => ({ error: `HTTP ${response.status}`, error_code: "NETWORK_ERROR" }))

        if (!response.ok || data.error) {
          console.error(`[GoalNavigationChat] thoughts API failed [${requestId}]:`, {
            status: response.status,
            error_code: data.error_code,
            error: data.error,
          })
          setThoughtsFailCount(prev => prev + 1)
          alert("まとめの生成に失敗しました。もう一度送信するか、下の「自分で入力する」をお試しください。")
          return
        }

        setThoughtsFailCount(0)

        if (data.goalThoughts) {
          // simulateTyping でまとめを表示してから完了
          const typingMsgId = ++msgIdRef.current
          setMessages((prev) => [
            ...prev,
            { id: typingMsgId, role: "assistant", content: "" },
          ])

          const { cancel, promise } = simulateTyping(
            data.goalThoughts,
            (partial) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === typingMsgId ? { ...m, content: partial } : m
                )
              )
            },
          )
          typingCancelRef.current = cancel
          await promise
          typingCancelRef.current = null

          setFinalThoughts(data.goalThoughts)
          setIsComplete(true)
        } else if (data.error) {
          alert("まとめ生成に失敗しました。もう一度入力して送信してください。")
        }
      } else {
        // Step 1 → Step 2: SSEストリーミングで次の質問を取得
        const nextStep = 2 as const
        const message = await fetchStepMessage(nextStep, history)

        if (message) {
          // fetchStepMessage が onChunk or フォールバックで placeholder を追加済み
          // msgIdRef.current が placeholder の ID
          const expectedId = msgIdRef.current
          setMessages((prev) => {
            const placeholder = prev.find((m) => m.id === expectedId)
            if (placeholder && placeholder.content !== message) {
              return prev.map((m) =>
                m.id === expectedId ? { ...m, content: message } : m
              )
            }
            if (!placeholder) {
              return [...prev, { id: expectedId, role: "assistant" as const, content: message }]
            }
            return prev
          })
          setCurrentStep(nextStep)
        } else if (message === null && !abortRef.current?.signal.aborted) {
          alert("エラーが発生しました")
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("メッセージ送信エラー:", error)
        alert("エラーが発生しました")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isStarted) {
    return (
      <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img
                src={AVATAR_AI_COACH}
                alt="AIコーチ"
                className="w-16 h-16 rounded-full border-2 border-white/30 shadow-lg"
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">目標を一緒に考えよう！</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                {studentName}さん、{testName}で{targetCourse}コース{targetClass}組を目指すんだね！
              </p>
              <p className="text-white/90 text-sm leading-relaxed mt-2">
                AIコーチと対話しながら、この目標にかける思いを整理してみよう。2つの質問に答えたら、思いをまとめるよ！
              </p>
            </div>
            <Button
              onClick={startConversation}
              disabled={isLoading}
              className="w-full bg-white text-primary hover:bg-white/90"
            >
              <Bot className="h-4 w-4 mr-2" />
              {isLoading ? "準備中..." : "AIコーチと話し始める"}
            </Button>
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full text-white/70 hover:text-white hover:bg-white/10"
            >
              あとで入力する
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AIコーチと対話中（ステップ {currentStep}/2）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={messagesContainerRef} className="bg-accent/5 rounded-lg p-4 min-h-[60dvh] max-h-[70dvh] overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {message.role === "assistant" ? (
                <img
                  src={AVATAR_AI_COACH}
                  alt="AIコーチ"
                  className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-primary/20"
                />
              ) : (
                <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-primary/20">
                  <AvatarImage src={studentAvatar} alt={studentName} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`px-4 py-3 max-w-[85%] ${
                  message.role === "user"
                    ? "bg-primary text-white rounded-2xl rounded-tr-sm shadow-md"
                    : "bg-white border border-border rounded-2xl rounded-tl-sm shadow-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <img
                src={AVATAR_AI_COACH}
                alt="AIコーチ"
                className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-primary/20"
              />
              <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
            <div className="font-semibold">DEBUG: Voice Input</div>
            <div>showInput: {String(shouldShowVoiceInput)}</div>
            <div>currentStep: {currentStep}</div>
            <div>isLoading: {String(isLoading)}</div>
            <div>isComplete: {String(isComplete)}</div>
            <div>mediaRecorderDefined: {String(voiceDebug.mediaRecorderDefined)}</div>
            <div>getUserMediaDefined: {String(voiceDebug.getUserMediaDefined)}</div>
            <div>supportedMimeType: {voiceDebug.supportedMimeType ?? "none"}</div>
          </div>
        )}

        {shouldShowVoiceInput && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="あなたの気持ちを教えてね...（Enterで改行、送信ボタンで送信）"
                className="min-h-[60px] resize-none pr-12"
                disabled={isLoading}
              />
              <VoiceInputButton
                onTranscribed={(text) => setUserInput((prev) => prev ? `${prev} ${text}` : text)}
                disabled={isLoading}
                className="absolute right-2 bottom-2"
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!userInput.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {thoughtsFailCount >= 2 && !isComplete && !isLoading && (
          <div className="text-center space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              AI によるまとめ生成がうまくいかないようです。
            </p>
            <Button
              variant="outline"
              onClick={onFallbackToDirect}
              className="w-full"
            >
              自分で入力する
            </Button>
          </div>
        )}

        {isComplete && (
          <div className="pt-2">
            <Button
              onClick={() => onComplete(finalThoughts)}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              この内容で目標を確定
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
