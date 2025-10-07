"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Bot, User, Sparkles, CheckCircle, MessageCircle } from "lucide-react"

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
    new Date("2025-10-05"), // 第６回公開組分けテスト
    new Date("2025-11-09"), // 第７回公開組分けテスト
    new Date("2025-12-14"), // 第８回公開組分けテスト
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-3 border-white shadow-xl">
                  <AvatarImage src={getAvatarSrc("ai") || "/placeholder.svg"} alt="AIコーチ" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="h-7 w-7" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1.5 shadow-lg animate-pulse">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  AIコーチ
                  <MessageCircle className="h-6 w-6 text-blue-500" />
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-600 font-medium">週間振り返りサポート</p>
                  <Badge
                    className={`${weekTypeColors[weekType as keyof typeof weekTypeColors]} font-semibold px-3 py-1.5 shadow-sm`}
                  >
                    {weekType}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="ml-auto text-right bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">
                {turnCount}/{maxTurns}
              </div>
              <div className="text-sm text-slate-500 font-medium">ターン</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="h-12 w-12 flex-shrink-0 shadow-lg border-2 border-white">
                <AvatarImage src={getAvatarSrc(message.sender) || "/placeholder.svg"} alt={message.sender} />
                <AvatarFallback
                  className={
                    message.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                  }
                >
                  {message.sender === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>

              <div
                className={`max-w-[75%] ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl rounded-br-lg shadow-lg"
                    : "bg-white border border-slate-200 rounded-3xl rounded-bl-lg shadow-lg"
                } p-5 transition-all duration-200 hover:shadow-xl`}
              >
                <p
                  className={`text-base leading-relaxed whitespace-pre-line ${
                    message.sender === "user" ? "text-white" : "text-slate-700"
                  }`}
                >
                  {message.content}
                </p>

                {message.options && (
                  <div className="mt-4 space-y-2">
                    {message.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 rounded-xl transition-all duration-200"
                        onClick={() => setInputMessage(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}

                <div className={`text-xs mt-3 ${message.sender === "user" ? "text-blue-100" : "text-slate-400"}`}>
                  {message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <Avatar className="h-12 w-12 shadow-lg border-2 border-white">
                <AvatarImage src={getAvatarSrc("ai") || "/placeholder.svg"} alt="AIコーチ" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border border-slate-200 p-5 rounded-3xl rounded-bl-lg shadow-lg">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-slate-400 rounded-full animate-bounce" />
                  <div
                    className="w-3 h-3 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-3 h-3 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-200/60 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-4xl mx-auto p-6">
          {turnCount >= maxTurns ? (
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200/60 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="bg-green-500 rounded-full p-2">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-xl font-bold text-green-700">今週の振り返りは終了です</p>
                </div>
                <p className="text-base text-slate-600 mb-6 leading-relaxed">
                  GROWモデルに基づいた振り返りが完了しました。
                  <br />
                  来週も一緒に頑張りましょう！
                </p>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-4 py-2 text-base font-bold shadow-lg">
                    🏆 振り返り完了バッジ獲得！
                  </Badge>
                </div>
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200"
                >
                  リフレクトに戻る
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="メッセージを入力してください..."
                  maxLength={maxCharacters}
                  className="flex-1 h-14 text-base rounded-2xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 shadow-sm"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="lg"
                  className="h-14 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">AIコーチと一緒に1週間を振り返ろう（{weekType}）</span>
                </div>
                <span className="text-slate-500 font-medium">
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
