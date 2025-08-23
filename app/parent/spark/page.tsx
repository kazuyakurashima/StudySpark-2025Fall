"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Star, ThumbsUp, Send, Sparkles, BookOpen, Target } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

// Mock data for today's records
const todayRecords = [
  {
    id: "record1",
    childName: "太郎",
    childAvatar: "student1",
    subjects: ["算数", "国語"],
    totalProblems: 25,
    totalCorrect: 20,
    mood: "good",
    reflection: "算数の分数問題が難しかったけど、最後は理解できました。",
    studyTime: "45分",
    timestamp: "16:30",
  },
  {
    id: "record2",
    childName: "花子",
    childAvatar: "student2",
    subjects: ["理科", "社会"],
    totalProblems: 18,
    totalCorrect: 16,
    mood: "good",
    reflection: "理科の実験が楽しかった！",
    studyTime: "30分",
    timestamp: "15:45",
  },
]

const encouragementStamps = [
  { id: "heart", icon: Heart, label: "がんばったね", color: "text-red-500" },
  { id: "star", icon: Star, label: "すごい！", color: "text-yellow-500" },
  { id: "thumbs", icon: ThumbsUp, label: "よくできました", color: "text-blue-500" },
]

const aiSuggestedMessages = [
  "今日も勉強お疲れさま！この調子で頑張ろう！",
  "毎日コツコツ続けているのが素晴らしいです。",
  "難しい問題にもチャレンジしていて偉いね！",
]

const subjectColors = {
  算数: "bg-blue-100 text-blue-800",
  国語: "bg-green-100 text-green-800",
  理科: "bg-purple-100 text-purple-800",
  社会: "bg-orange-100 text-orange-800",
}

const moodEmojis = {
  good: "😊",
  normal: "😐",
  difficult: "😔",
}

export default function ParentSparkPage() {
  const [customMessage, setCustomMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const handleSendStamp = async (stampId: string, recordId: string) => {
    setIsSending(true)
    const stamp = encouragementStamps.find((s) => s.id === stampId)
    const record = todayRecords.find((r) => r.id === recordId)

    setTimeout(() => {
      console.log(`Sent stamp: ${stamp?.label} to ${record?.childName}`)
      alert(`${stamp?.label} を送信しました！`)
      setIsSending(false)
    }, 500)
  }

  const handleSendMessage = async (message: string, recordId: string) => {
    setIsSending(true)
    const record = todayRecords.find((r) => r.id === recordId)

    setTimeout(() => {
      console.log(`Sent message: ${message} to ${record?.childName}`)
      alert("応援メッセージを送信しました！")
      setCustomMessage("")
      setIsSending(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            応援スパーク
          </h1>
          <p className="text-sm text-muted-foreground">お子さんの今日の学習記録に応援を送ろう</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {todayRecords.map((record) => (
          <Card key={record.id} className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getAvatarSrc(record.childAvatar) || "/placeholder.svg"} alt={record.childName} />
                  <AvatarFallback>{record.childName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span>{record.childName}さんの学習記録</span>
                    <div className="text-2xl">{moodEmojis[record.mood as keyof typeof moodEmojis]}</div>
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {record.timestamp} • 学習時間: {record.studyTime}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Study Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">学習科目</div>
                    <div className="flex gap-1">
                      {record.subjects.map((subject) => (
                        <Badge key={subject} className={subjectColors[subject as keyof typeof subjectColors]}>
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-sm text-muted-foreground">正答率</div>
                    <div className="font-bold text-lg text-accent">
                      {Math.round((record.totalCorrect / record.totalProblems) * 100)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">問題数</div>
                    <div className="font-bold text-lg text-primary">
                      {record.totalCorrect}/{record.totalProblems}問
                    </div>
                  </div>
                </div>
              </div>

              {/* Child's Reflection */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">振り返り</div>
                <p className="text-sm">{record.reflection}</p>
              </div>

              {/* Quick Encouragement Stamps */}
              <div className="space-y-3">
                <div className="text-sm font-medium">クイック応援</div>
                <div className="grid grid-cols-3 gap-2">
                  {encouragementStamps.map((stamp) => {
                    const Icon = stamp.icon
                    return (
                      <Button
                        key={stamp.id}
                        onClick={() => handleSendStamp(stamp.id, record.id)}
                        disabled={isSending}
                        variant="outline"
                        className="h-12 flex flex-col gap-1 hover:bg-primary/5 hover:border-primary/50"
                      >
                        <Icon className={`h-4 w-4 ${stamp.color}`} />
                        <span className="text-xs">{stamp.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* AI Suggested Messages */}
              <div className="space-y-3">
                <div className="text-sm font-medium">AI提案メッセージ</div>
                <div className="space-y-2">
                  {aiSuggestedMessages.map((message, index) => (
                    <Button
                      key={index}
                      onClick={() => handleSendMessage(message, record.id)}
                      disabled={isSending}
                      variant="outline"
                      className="w-full h-auto p-3 text-left justify-start hover:bg-accent/5 hover:border-accent/50"
                    >
                      <div className="flex items-start gap-2">
                        <Send className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{message}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-3">
                <div className="text-sm font-medium">カスタムメッセージ</div>
                <Textarea
                  placeholder="お子さんへの応援メッセージを自由に書いてください..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[80px] text-base"
                  maxLength={200}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{customMessage.length}/200文字</span>
                  <Button
                    onClick={() => handleSendMessage(customMessage, record.id)}
                    disabled={!customMessage.trim() || isSending}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    送信
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
