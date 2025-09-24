"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Bot, User, Sparkles, CheckCircle } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  options?: string[]
}

interface AICoachChatProps {
  onClose: () => void
}

const getWeekType = () => {
  // Mock logic to determine week type based on performance
  const mockPerformanceChange = Math.random() * 30 - 10 // -10 to +20
  if (mockPerformanceChange >= 10) return "成長週"
  if (mockPerformanceChange <= -10) return "挑戦週"
  if (isSpecialTestWeek()) return "特別週"
  return "安定週"
}

const isSpecialTestWeek = () => {
  // Check if it's near a test date
  const now = new Date()
  const testDates = [
    new Date("2024-10-05"), // 第６回公開組分けテスト
    new Date("2024-11-09"), // 第７回公開組分けテスト
    new Date("2024-12-14"), // 第８回公開組分けテスト
  ]

  return testDates.some((testDate) => {
    const diffDays = Math.abs((testDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  })
}

const getAIResponsesByWeekType = (weekType: string, phase: number) => {
  const responses = {
    成長週: {
      opening: [
        "今週は算数を5回も取り組んだね！特に水曜の正答率85%はすごい。どんな工夫をした？",
        "今週の成長ぶりが素晴らしいね！何が一番うまくいったと思う？",
        "データを見ると今週は大きく伸びているね。自分でも実感はある？",
      ],
      deepening: [
        "その調子を他の科目にも活かすなら、どんなことができそう？",
        "成功の秘訣を教えて！他の人にもアドバイスできそうだね。",
        "この成長を続けるために、来週はどんなことを意識したい？",
      ],
      goalSetting: [
        "来週も同じペースで続けられそう？それとも新しい挑戦をしてみる？",
        "①得意分野をさらに伸ばす ②苦手分野に挑戦 ③バランスよく学習 どれが良さそう？",
      ],
    },
    安定週: {
      opening: [
        "今週お疲れさま！率直に、今週の調子はどうだった？",
        "安定したペースで学習できているね。今の気持ちを聞かせて？",
        "今週は着実に進められたね。何か新しいことに挑戦してみたい気分？",
      ],
      deepening: [
        "一番時間をかけた科目の手応えは？",
        "今の学習リズムで満足？それとも何か変えてみたい？",
        "新しいことに挑戦するとしたら、何が面白そう？",
      ],
      goalSetting: [
        "来週は何か新しいことにチャレンジしてみる？",
        "①新しい問題集に挑戦 ②学習時間を増やす ③復習に重点を置く どれが良い？",
      ],
    },
    挑戦週: {
      opening: [
        "今週は大変だったね。でも記録を見ると○○は確実に進歩してるよ",
        "そう感じるんだね。でも継続して学習していることがすでにすごいよ",
        "今週お疲れさま。大変だった中で、1つでも「できた」と思えることは？",
      ],
      deepening: [
        "大変だった中で、1つでも「できた」と思えることは？",
        "今週の経験から学んだことはある？",
        "こういう時こそ成長のチャンス。どんな小さなことでも良いから、頑張れたことを教えて？",
      ],
      goalSetting: [
        "来週は無理をしないで、小さな目標から始めよう。何なら続けられそう？",
        "①基礎問題を確実に ②短時間でも毎日継続 ③好きな科目から始める どれが良い？",
      ],
    },
    特別週: {
      opening: [
        "来週はテストだね！準備の調子はどう？",
        "テスト前の今、一番気になっていることは？",
        "テストに向けて、今の気持ちを聞かせて？",
      ],
      deepening: [
        "各科目の準備状況はどんな感じ？",
        "一番自信がある科目と、もう少し頑張りたい科目は？",
        "テスト当日に向けて、何か不安なことはある？",
      ],
      goalSetting: [
        "テストまでの残り時間、何を重点的にやる？",
        "①弱点科目の集中対策 ②得意科目の維持 ③体調管理の徹底 どれを優先する？",
      ],
    },
  }

  const weekResponses = responses[weekType as keyof typeof responses] || responses["安定週"]

  if (phase === 1) return weekResponses.opening
  if (phase === 2) return weekResponses.deepening
  return weekResponses.goalSetting
}

export function AICoachChat({ onClose }: AICoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [turnCount, setTurnCount] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(1)
  const [weekType] = useState(getWeekType())
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const maxTurns = weekType === "挑戦週" ? 6 : weekType === "安定週" ? 5 : 4
  const maxCharacters = 500

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isInitialized) {
      const openingResponses = getAIResponsesByWeekType(weekType, 1)
      const randomOpening = openingResponses[Math.floor(Math.random() * openingResponses.length)]

      const initialMessage: Message = {
        id: "1",
        content: randomOpening,
        sender: "ai",
        timestamp: new Date(),
      }

      setMessages([initialMessage])
      setTurnCount(1)
      setIsInitialized(true)
    }
  }, [isInitialized, weekType])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || turnCount >= maxTurns) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsTyping(true)

    // Simulate AI response delay
    setTimeout(() => {
      let aiResponse = ""
      let options: string[] | undefined

      if (turnCount >= maxTurns - 2) {
        // Goal setting phase
        const goalResponses = getAIResponsesByWeekType(weekType, 3)
        aiResponse = goalResponses[Math.floor(Math.random() * goalResponses.length)]

        if (turnCount === maxTurns - 1) {
          // Final message with GROW summary
          aiResponse = `今日の振り返りをまとめると：
          
🎯 Goal: ${getGoalSummary()}
👁️ Reality: ${getRealitySummary()}  
💡 Options: ${getOptionsSummary()}
✅ Will: ${getWillSummary()}

来週も一緒に頑張ろう！この調子で続けていけば必ず成長できるよ。`
        }
      } else if (turnCount >= 2) {
        // Deepening phase
        const deepeningResponses = getAIResponsesByWeekType(weekType, 2)
        aiResponse = deepeningResponses[Math.floor(Math.random() * deepeningResponses.length)]
      } else {
        // Opening phase continues
        const openingResponses = getAIResponsesByWeekType(weekType, 1)
        aiResponse = openingResponses[Math.floor(Math.random() * openingResponses.length)]
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: "ai",
        timestamp: new Date(),
        options,
      }

      setMessages((prev) => [...prev, aiMessage])
      setTurnCount((prev) => prev + 1)
      setIsTyping(false)
    }, 1500)
  }

  const getGoalSummary = () => "来週の学習目標を明確にする"
  const getRealitySummary = () => "今週の学習状況と成果を振り返る"
  const getOptionsSummary = () => "複数の学習方法から最適なものを選択"
  const getWillSummary = () => "具体的な行動計画を決定"

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getAvatarSrc = (type: "user" | "ai") => {
    if (type === "ai") {
      return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"
    }
    // Get user avatar from localStorage
    const selectedAvatar = localStorage.getItem("selectedAvatar") || "student1"
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
      student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
      student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
    }
    return avatarMap[selectedAvatar] || avatarMap["student1"]
  }

  const weekTypeColors = {
    成長週: "bg-green-100 text-green-800 border-green-200",
    安定週: "bg-blue-100 text-blue-800 border-blue-200",
    挑戦週: "bg-orange-100 text-orange-800 border-orange-200",
    特別週: "bg-purple-100 text-purple-800 border-purple-200",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getAvatarSrc("ai") || "/placeholder.svg"} alt="AIコーチ" />
                <AvatarFallback>
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent animate-bounce" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">AIコーチ</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">週間振り返りサポート</p>
                <Badge className={weekTypeColors[weekType as keyof typeof weekTypeColors]}>{weekType}</Badge>
              </div>
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm font-medium text-primary">
              {turnCount}/{maxTurns}
            </div>
            <div className="text-xs text-muted-foreground">ターン</div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={getAvatarSrc(message.sender) || "/placeholder.svg"} alt={message.sender} />
                <AvatarFallback>
                  {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                {message.options && (
                  <div className="mt-2 space-y-1">
                    {message.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start text-xs bg-transparent"
                        onClick={() => setInputMessage(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAvatarSrc("ai") || "/placeholder.svg"} alt="AIコーチ" />
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border p-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm p-4">
        <div className="max-w-2xl mx-auto">
          {turnCount >= maxTurns ? (
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <p className="text-sm text-accent font-medium">今週の振り返りは終了です</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  GROWモデルに基づいた振り返りが完了しました。来週も一緒に頑張りましょう！
                </p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Badge className="bg-accent/20 text-accent border-accent/30">振り返り完了バッジ獲得！</Badge>
                </div>
                <Button onClick={onClose} className="w-full">
                  リフレクトに戻る
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="メッセージを入力..."
                  maxLength={maxCharacters}
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="px-3 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>AIコーチと一緒に1週間を振り返ろう（{weekType}）</span>
                <span>
                  {inputMessage.length}/{maxCharacters}文字
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
