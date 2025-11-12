"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send, Sparkles } from "lucide-react"
import { saveCoachingMessage, completeCoachingSession } from "@/app/actions/reflect"

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface ReflectChatProps {
  studentName: string
  sessionId: string
  weekType: "growth" | "stable" | "challenge" | "special"
  thisWeekAccuracy: number
  lastWeekAccuracy: number
  accuracyDiff: number
  upcomingTest?: { test_types: { name: string }, test_date: string } | null
  onComplete: (summary: string) => void
}

const AVATAR_AI_COACH = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

const MAX_TURNS = 6

export function ReflectChat({
  studentName,
  sessionId,
  weekType,
  thisWeekAccuracy,
  lastWeekAccuracy,
  accuracyDiff,
  upcomingTest,
  onComplete,
}: ReflectChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [turnNumber, setTurnNumber] = useState(1)
  const [isCompleted, setIsCompleted] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // クロージングメッセージを検出
  const isClosingMessage = (content: string): boolean => {
    const closingPatterns = [
      /振り返りはこれで完了/,
      /また.*土曜日.*一緒に振り返ろう/,
      /また来週も.*楽しみにしてる/,
      /決めた行動を忘れずに.*来週も/,
    ]
    return closingPatterns.some(pattern => pattern.test(content))
  }

  const scrollToBottom = () => {
    // チャットコンテナ内部のみをスクロール（ページ全体はスクロールしない）
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // 初回メッセージ取得
    fetchInitialMessage()
  }, [])

  const fetchInitialMessage = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/reflect/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          weekType,
          thisWeekAccuracy,
          lastWeekAccuracy,
          accuracyDiff,
          upcomingTest,
          conversationHistory: [],
          turnNumber: 1,
        }),
      })

      const data = await response.json()

      if (data.message) {
        const aiMessage: Message = {
          id: 1,
          role: "assistant",
          content: data.message,
        }
        setMessages([aiMessage])

        // メッセージを保存
        await saveCoachingMessage(sessionId, "assistant", data.message, 1)
      } else if (data.error) {
        alert("エラーが発生しました: " + data.error)
      }
    } catch (error) {
      console.error("初回メッセージ取得エラー:", error)
      alert("エラーが発生しました")
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
      // ユーザーメッセージを保存
      await saveCoachingMessage(sessionId, "user", newUserMessage.content, turnNumber)

      // 最大ターン数に達した場合はサマリー生成
      if (turnNumber >= MAX_TURNS) {
        const summaryResponse = await fetch("/api/reflect/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            weekType,
            thisWeekAccuracy,
            lastWeekAccuracy,
            accuracyDiff,
            upcomingTest,
            conversationHistory: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            turnNumber,
          }),
        })

        const summaryData = await summaryResponse.json()

        if (summaryData.summary) {
          const finalMessage: Message = {
            id: updatedMessages.length + 1,
            role: "assistant",
            content: `${studentName}さん、今週の振り返りお疲れさま！✨\n\n今週の振り返りをまとめたよ：\n\n「${summaryData.summary}」\n\nまた来週も一緒に頑張ろうね！`,
          }
          setMessages([...updatedMessages, finalMessage])

          // セッション完了
          await completeCoachingSession(sessionId, summaryData.summary, turnNumber)

          // 完了コールバック
          setTimeout(() => {
            onComplete(summaryData.summary)
          }, 2000)
        }
      } else {
        // 次のAIメッセージ取得
        const nextTurn = turnNumber + 1

        const response = await fetch("/api/reflect/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            weekType,
            thisWeekAccuracy,
            lastWeekAccuracy,
            accuracyDiff,
            upcomingTest,
            conversationHistory: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            turnNumber: nextTurn,
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

          // AIメッセージを保存
          await saveCoachingMessage(sessionId, "assistant", data.message, nextTurn)

          setTurnNumber(nextTurn)

          // クロージングメッセージを検出したらセッション完了
          if (isClosingMessage(data.message)) {
            setIsCompleted(true)

            // サマリー生成
            const summaryResponse = await fetch("/api/reflect/summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentName,
                weekType,
                thisWeekAccuracy,
                lastWeekAccuracy,
                accuracyDiff,
                upcomingTest,
                conversationHistory: [...updatedMessages, aiMessage].map(m => ({ role: m.role, content: m.content })),
                turnNumber: nextTurn,
              }),
            })

            const summaryData = await summaryResponse.json()

            if (summaryData.summary) {
              // セッション完了
              await completeCoachingSession(sessionId, summaryData.summary, nextTurn)

              // 完了コールバック
              setTimeout(() => {
                onComplete(summaryData.summary)
              }, 2000)
            }
          }
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

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AIコーチと週次振り返り（{turnNumber}/{MAX_TURNS}ターン目）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={messagesContainerRef} className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex items-start gap-2 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {message.role === "assistant" && (
                  <img
                    src={AVATAR_AI_COACH}
                    alt="AIコーチ"
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
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

        {!isCompleted && turnNumber <= MAX_TURNS && (
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="あなたの気持ちを教えてね...（Enterで改行、送信ボタンで送信）"
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading || isCompleted}
            />
            <Button
              onClick={sendMessage}
              disabled={!userInput.trim() || isLoading || isCompleted}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isCompleted && (
          <div className="text-center text-sm text-muted-foreground py-4">
            振り返りが完了しました。お疲れさまでした！✨
          </div>
        )}
      </CardContent>
    </Card>
  )
}
