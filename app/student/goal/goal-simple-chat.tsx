"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send, Sparkles, User, ArrowLeft } from "lucide-react"
import { VoiceInputButton } from "@/components/ui/voice-input-button"
import { fetchSSE } from "@/lib/sse/client"
import { simulateTyping } from "@/lib/sse/typing-effect"

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface GoalSimpleChatProps {
  testScheduleId: number
  studentName: string
  testName: string
  testDate: string
  targetCourse: string
  targetClass: number
  initialThoughts?: string
  onComplete: (goalThoughts: string) => void
  onBack: () => void
}

const AVATAR_AI_COACH = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

const getAvatarSrc = (avatarId?: string | null) => {
  if (avatarId && avatarId.startsWith("http")) {
    return avatarId
  }

  const avatarMap: Record<string, string> = {
    student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
  }

  return avatarMap[avatarId || ""] || avatarMap.student1
}

export function GoalSimpleChat({
  testScheduleId,
  studentName,
  // testName, testDate: API 側は testScheduleId から DB 再構築するため不使用
  targetCourse,
  targetClass,
  initialThoughts,
  onComplete,
  onBack,
}: GoalSimpleChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [generatedThoughts, setGeneratedThoughts] = useState("")
  const [studentAvatar, setStudentAvatar] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const typingCancelRef = useRef<(() => void) | null>(null)

  // 条件付き自動スクロール（最下部付近にいるときのみ）
  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      return
    }
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const loadStudentAvatar = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_id")
          .eq("id", user.id)
          .single()

        setStudentAvatar(getAvatarSrc(profile?.avatar_id))
      } else {
        setStudentAvatar(getAvatarSrc())
      }
    } catch (error) {
      console.error("アバター読み込みエラー:", error)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // React 18 Strict Mode 対応: useEffect 内で ignore フラグを使い、
  // 開発時の unmount→remount で stale な結果を無視する
  useEffect(() => {
    let ignore = false

    if (initialThoughts) {
      setGeneratedThoughts(initialThoughts)
    }
    loadStudentAvatar()

    // 自動開始（startConversation をインラインにして ignore を共有）
    ;(async () => {
      setIsLoading(true)

      const message = await fetchStepMessage(1, [], 1)
      if (ignore) return

      if (message) {
        setMessages([{ id: 1, role: "assistant", content: message }])
        setIsLoading(false)

        // 3秒後に自動でStep2へ進む
        timeoutRef.current = setTimeout(async () => {
          setIsLoading(true)
          const msg2 = await fetchStepMessage(2, [], 2)
          if (ignore) return
          if (msg2) {
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === 2)
              if (existing) {
                return prev.map((m) => (m.id === 2 ? { ...m, content: msg2 } : m))
              }
              return [...prev, { id: 2, role: "assistant", content: msg2 }]
            })
            setCurrentStep(2)
          }
          setIsLoading(false)
        }, 3000)
      } else {
        alert("エラーが発生しました")
        setIsLoading(false)
      }
    })()

    return () => {
      ignore = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      abortRef.current?.abort()
      typingCancelRef.current?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** SSEでストリーミング取得。失敗時は非ストリームフォールバック */
  const fetchStepMessage = async (
    step: number,
    history: { role: string; content: string }[],
    msgIdBase: number,
  ): Promise<string | null> => {
    const controller = new AbortController()
    abortRef.current = controller
    const placeholderId = msgIdBase

    try {
      const result = await fetchSSE(
        "/api/goal/stream",
        {
          flowType: "simple",
          step,
          testScheduleId,
          targetCourse,
          targetClass,
          conversationHistory: history,
        },
        (accumulated) => {
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
      console.warn("[GoalSimpleChat] SSE failed, falling back to non-stream:", e)
      try {
        const res = await fetch("/api/goal/simple-navigation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testScheduleId,
            targetCourse,
            targetClass,
            step,
            conversationHistory: history,
          }),
        })
        const data = await res.json()
        return data.message ?? null
      } catch {
        return null
      }
    }
  }

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return

    const maxLength = currentStep === 2 ? 80 : 120
    if (userInput.length > maxLength) {
      alert(`${maxLength}文字以内で入力してください`)
      return
    }

    const newUserMessage: Message = {
      id: messages.length + 1,
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
      // Step2の回答後 → Step3の質問をSSEで取得
      if (currentStep === 2) {
        const msgId = updatedMessages.length + 1
        const message = await fetchStepMessage(3, history, msgId)

        if (message) {
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === msgId)
            if (existing) {
              return prev.map((m) => (m.id === msgId ? { ...m, content: message } : m))
            }
            return [...prev, { id: msgId, role: "assistant", content: message }]
          })
          setCurrentStep(3)
        } else if (!abortRef.current?.signal.aborted) {
          alert("対話に失敗しました")
        }
      }
      // Step3の回答後 → まとめ生成 + simulateTyping
      else if (currentStep === 3) {
        const controller = new AbortController()
        abortRef.current = controller

        const response = await fetch("/api/goal/simple-thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testScheduleId,
            targetCourse,
            targetClass,
            conversationHistory: history,
          }),
          signal: controller.signal,
        })

        const data = await response.json()

        if (data.thoughts) {
          setGeneratedThoughts(data.thoughts)

          // simulateTyping で疑似タイピング表示
          const summaryText = `素敵な思いをありがとう！\n\nあなたの気持ちを「今回の思い」にまとめたよ。\n\n---\n\n${data.thoughts}\n\n---\n\nこの内容でよければ「この内容で保存」を押してね。`
          const typingMsgId = updatedMessages.length + 1

          setMessages((prev) => [
            ...prev,
            { id: typingMsgId, role: "assistant", content: "" },
          ])

          const { cancel, promise } = simulateTyping(
            summaryText,
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

          setCurrentStep(4)
        } else {
          alert("まとめ生成に失敗しました")
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

  const handleComplete = () => {
    if (generatedThoughts) {
      onComplete(generatedThoughts)
    }
  }

  const getMaxLength = () => {
    if (currentStep === 2) return 80
    if (currentStep === 3) return 120
    return 300
  }

  const getStepLabel = () => {
    if (currentStep === 1) return "目標確認"
    if (currentStep === 2) return "ステップ 1 / 2"
    if (currentStep === 3) return "ステップ 2 / 2"
    return "まとめ"
  }

  return (
    <Card className="card-elevated shadow-xl flex flex-col h-[calc(100dvh-200px)]">
      <CardHeader className="shrink-0 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AIコーチと対話</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">{getStepLabel()}</span>
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
        {/* メッセージエリア */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-accent/5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {message.role === "assistant" ? (
                <div className="flex-shrink-0">
                  <img
                    src={AVATAR_AI_COACH}
                    alt="AIコーチ"
                    className="w-10 h-10 rounded-full border-2 border-primary/20"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0">
                  {studentAvatar ? (
                    <img
                      src={studentAvatar}
                      alt={studentName}
                      className="w-10 h-10 rounded-full border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              )}
              <div
                className={`flex-1 px-4 py-3 max-w-[85%] ${
                  message.role === "assistant"
                    ? "bg-white border border-border rounded-2xl rounded-tl-sm shadow-sm"
                    : "bg-primary text-white rounded-2xl rounded-tr-sm shadow-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <img
                  src={AVATAR_AI_COACH}
                  alt="AIコーチ"
                  className="w-10 h-10 rounded-full border-2 border-primary/20"
                />
              </div>
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

        {/* 入力エリア（Step2とStep3のみ） */}
        {currentStep >= 2 && currentStep < 4 && (
          <div
            className="shrink-0 border-t bg-background p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  placeholder="あなたの気持ちを自由に書いてね...（Enterで改行、送信ボタンで送信）"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="min-h-[80px] resize-none pr-12"
                  maxLength={getMaxLength()}
                  disabled={isLoading}
                />
                <VoiceInputButton
                  onTranscribed={(text) => {
                    const max = getMaxLength()
                    const newText = userInput ? `${userInput} ${text}` : text
                    setUserInput(newText.slice(0, max))
                  }}
                  disabled={isLoading}
                  className="absolute right-2 bottom-2"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {userInput.length}/{getMaxLength()}文字
                </span>
                <Button
                  onClick={sendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  送信
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 完了ボタン */}
        {currentStep === 4 && (
          <div
            className="shrink-0 border-t bg-background p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Button
              onClick={handleComplete}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              この内容で保存
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
