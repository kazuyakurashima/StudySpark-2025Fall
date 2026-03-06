"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, Sparkles, User } from "lucide-react"
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
}: GoalNavigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const typingCancelRef = useRef<(() => void) | null>(null)
  const msgIdRef = useRef(0)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      typingCancelRef.current?.()
    }
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
        // SSE の onChunk が呼ばれなかったので placeholder を手動追加
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
      if (currentStep === 3) {
        // Step 3: thoughts生成 → simulateTyping → onComplete
        const controller = new AbortController()
        abortRef.current = controller

        const response = await fetch("/api/goal/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testScheduleId,
            targetCourse,
            targetClass,
            conversationHistory: history,
            currentStep: 3,
          }),
          signal: controller.signal,
        })

        const data = await response.json()

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

          onComplete(data.goalThoughts)
        } else if (data.error) {
          alert("エラーが発生しました: " + data.error)
        }
      } else {
        // Step 1-2: SSEストリーミング
        const nextStep = (currentStep + 1) as 2 | 3

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
                AIコーチと対話しながら、この目標にかける思いを整理してみよう。3つの質問に答えていくよ！
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
          AIコーチと対話中（ステップ {currentStep}/3）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex items-start gap-2 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {message.role === "assistant" ? (
                  <img
                    src={AVATAR_AI_COACH}
                    alt="AIコーチ"
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                ) : (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={studentAvatar} alt={studentName} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`px-3 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2 max-w-[80%]">
                <img
                  src={AVATAR_AI_COACH}
                  alt="AIコーチ"
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div className="px-3 py-2 rounded-lg bg-background border border-border">
                  <p className="text-sm text-muted-foreground">考え中...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {currentStep <= 3 && !isLoading && (
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="あなたの気持ちを教えてね...（Enterで改行、送信ボタンで送信）"
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
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
      </CardContent>
    </Card>
  )
}
