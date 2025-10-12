"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send, Sparkles, User, ArrowLeft } from "lucide-react"

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface GoalSimpleChatProps {
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
  studentName,
  testName,
  testDate,
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
  const hasStartedRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadStudentAvatar = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single()

        setStudentAvatar(getAvatarSrc(profile?.avatar_url))
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

  useEffect(() => {
    if (initialThoughts) {
      setCurrentThoughts(initialThoughts)
    }
    if (!hasStartedRef.current) {
      startConversation()
      loadStudentAvatar()
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startConversation = async () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    setIsLoading(true)

    try {
      const response = await fetch("/api/goal/simple-navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          testName,
          testDate,
          targetCourse,
          targetClass,
          step: 1,
        }),
      })

      const data = await response.json()

      if (data.message) {
        setMessages([{ id: 1, role: "assistant", content: data.message }])
        setIsLoading(false)

        // 3秒後に自動でStep2へ進む
        timeoutRef.current = setTimeout(async () => {
          setIsLoading(true)
          try {
            const response2 = await fetch("/api/goal/simple-navigation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentName,
                testName,
                testDate,
                targetCourse,
                targetClass,
                step: 2,
              }),
            })

            const data2 = await response2.json()

            if (data2.message) {
              setMessages((prev) => [
                ...prev,
                { id: prev.length + 1, role: "assistant", content: data2.message },
              ])
              setCurrentStep(2)
            }
          } catch (error) {
            console.error("Step2遷移エラー:", error)
          } finally {
            setIsLoading(false)
          }
        }, 3000)
      } else if (data.error) {
        alert("エラーが発生しました: " + data.error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error("AI対話開始エラー:", error)
      alert("エラーが発生しました")
      setIsLoading(false)
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

    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setUserInput("")
    setIsLoading(true)

    try {
      // Step2の回答後 → Step3の質問を取得
      if (currentStep === 2) {
        const response = await fetch("/api/goal/simple-navigation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            testName,
            testDate,
            targetCourse,
            targetClass,
            step: 3,
            previousAnswer: newUserMessage.content,
          }),
        })

        const data = await response.json()

        if (data.message) {
          const aiMessage: Message = {
            id: updatedMessages.length + 1,
            role: "assistant",
            content: data.message,
          }
          setMessages([...updatedMessages, aiMessage])
          setCurrentStep(3)
        } else {
          alert("対話に失敗しました")
        }
      }
      // Step3の回答後 → まとめ生成
      else if (currentStep === 3) {
        const response = await fetch("/api/goal/simple-thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            testName,
            testDate,
            targetCourse,
            targetClass,
            conversationHistory: updatedMessages,
          }),
        })

        const data = await response.json()

        if (data.thoughts) {
          setGeneratedThoughts(data.thoughts)
          const aiMessage: Message = {
            id: updatedMessages.length + 1,
            role: "assistant",
            content: `素敵な思いをありがとう！\n\nあなたの気持ちを「今回の思い」にまとめたよ。\n\n---\n\n${data.thoughts}\n\n---\n\nこの内容でよければ「この内容で保存」を押してね。`,
          }
          setMessages([...updatedMessages, aiMessage])
          setCurrentStep(4)
        } else {
          alert("まとめ生成に失敗しました")
        }
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      alert("エラーが発生しました")
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
    <Card className="card-elevated shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
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
      <CardContent className="p-0">
        {/* メッセージエリア */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-accent/5">
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
                className={`flex-1 px-4 py-3 rounded-2xl max-w-[80%] ${
                  message.role === "assistant"
                    ? "bg-white border border-border shadow-sm"
                    : "bg-primary text-white shadow-md"
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
              <div className="bg-white border border-border rounded-2xl px-4 py-3 shadow-sm">
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
          <div className="p-4 border-t bg-background">
            <div className="space-y-2">
              <Textarea
                placeholder="あなたの気持ちを自由に書いてね...（Enterで改行、送信ボタンで送信）"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={getMaxLength()}
                disabled={isLoading}
              />
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
          <div className="p-4 border-t bg-background">
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
