"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, Sparkles, User } from "lucide-react"

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface GoalNavigationChatProps {
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
  studentName,
  studentAvatar,
  testName,
  testDate,
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

  const startConversation = async () => {
    setIsStarted(true)
    setIsLoading(true)

    try {
      const response = await fetch("/api/goal/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          testName,
          testDate,
          targetCourse,
          targetClass,
          conversationHistory: [],
          currentStep: 1,
        }),
      })

      const data = await response.json()

      if (data.message) {
        setMessages([{ id: 1, role: "assistant", content: data.message }])
      } else if (data.error) {
        alert("エラーが発生しました: " + data.error)
        setIsStarted(false)
      }
    } catch (error) {
      console.error("AI対話開始エラー:", error)
      alert("エラーが発生しました")
      setIsStarted(false)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return

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
      // Step 3（まとめ生成）の場合
      if (currentStep === 3) {
        const response = await fetch("/api/goal/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            testName,
            testDate,
            targetCourse,
            targetClass,
            conversationHistory: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            currentStep: 3,
          }),
        })

        const data = await response.json()

        if (data.goalThoughts) {
          // 最終メッセージを表示せず、すぐに完了
          onComplete(data.goalThoughts)
        } else if (data.error) {
          alert("エラーが発生しました: " + data.error)
        }
      } else {
        // Step 1-2（通常の対話）
        const nextStep = (currentStep + 1) as 2 | 3

        const response = await fetch("/api/goal/navigation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            testName,
            testDate,
            targetCourse,
            targetClass,
            conversationHistory: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            currentStep: nextStep,
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
          setCurrentStep(nextStep)
        } else if (data.error) {
          alert("エラーが発生しました: " + data.error)
        }
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      alert("エラーが発生しました")
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
