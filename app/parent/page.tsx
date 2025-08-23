"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Star, ThumbsUp, Send, Sparkles, Clock, BookOpen, Target } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

// Mock data for children
const children = [
  {
    id: "child1",
    name: "太郎",
    avatar: "student1",
    todayRecord: {
      subjects: ["算数", "国語"],
      totalProblems: 25,
      totalCorrect: 20,
      mood: "good",
      reflection: "算数の分数問題が難しかったけど、最後は理解できました。",
      studyTime: "45分",
    },
    streak: 7,
    weeklyGoal: 5,
    weeklyProgress: 4,
  },
  {
    id: "child2",
    name: "花子",
    avatar: "student2",
    todayRecord: {
      subjects: ["理科", "社会"],
      totalProblems: 18,
      totalCorrect: 16,
      mood: "good",
      reflection: "理科の実験が楽しかった！",
      studyTime: "30分",
    },
    streak: 5,
    weeklyGoal: 4,
    weeklyProgress: 3,
  },
]

const encouragementStamps = [
  { id: "heart", icon: Heart, label: "がんばったね", color: "text-red-500" },
  { id: "star", icon: Star, label: "すごい！", color: "text-yellow-500" },
  { id: "thumbs", icon: ThumbsUp, label: "よくできました", color: "text-blue-500" },
]

const aiSuggestedMessages = [
  "今日も勉強お疲れさま！算数がんばったね。明日もファイト！",
  "毎日コツコツ続けているのが素晴らしいです。この調子で頑張ろう！",
  "難しい問題にもチャレンジしていて偉いね。きっと力になってるよ！",
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

const getParentAvatarSrc = (avatarId: string) => {
  const parentAvatarMap: { [key: string]: string } = {
    parent1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
    parent2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
    parent3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
    parent4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
    parent5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
    parent6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
  }
  return parentAvatarMap[avatarId] || parentAvatarMap["parent1"]
}

const getAvatarSrc = (avatarId: string) => {
  const avatarMap: { [key: string]: string } = {
    student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
  }
  return avatarMap[avatarId] || avatarMap["student1"]
}

const handleSendStamp = async (stampId: string, setIsSending: any, currentChild: any) => {
  setIsSending(true)
  const stamp = encouragementStamps.find((s) => s.id === stampId)

  // Simulate sending
  setTimeout(() => {
    console.log(`Sent stamp: ${stamp?.label} to ${currentChild.name}`)
    alert(`${stamp?.label} を送信しました！`)
    setIsSending(false)
  }, 500)
}

const handleSendMessage = async (message: string, setIsSending: any, setCustomMessage: any, currentChild: any) => {
  setIsSending(true)

  // Simulate sending
  setTimeout(() => {
    console.log(`Sent message: ${message} to ${currentChild.name}`)
    alert("応援メッセージを送信しました！")
    setCustomMessage("")
    setIsSending(false)
  }, 800)
}

export default function ParentDashboard() {
  const [selectedChild, setSelectedChild] = useState(children[0].id)
  const [customMessage, setCustomMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [parentAvatar, setParentAvatar] = useState<string>("")

  const currentChild = children.find((child) => child.id === selectedChild) || children[0]

  useEffect(() => {
    const savedParentAvatar = localStorage.getItem("selectedParentAvatar")
    if (savedParentAvatar) {
      setParentAvatar(savedParentAvatar)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {parentAvatar && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getParentAvatarSrc(parentAvatar) || "/placeholder.svg"} alt="保護者" />
                  <AvatarFallback>保</AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">保護者サポート</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  1日10秒で応援しよう
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">今日の応援</div>
              <div className="font-bold text-accent">完了</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Child Selection (if multiple children) */}
        {children.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <Tabs value={selectedChild} onValueChange={setSelectedChild}>
                <TabsList className="grid w-full grid-cols-2">
                  {children.map((child) => (
                    <TabsTrigger key={child.id} value={child.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={getAvatarSrc(child.avatar) || "/placeholder.svg"} alt={child.name} />
                        <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {child.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Child's Today Summary */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={getAvatarSrc(currentChild.avatar) || "/placeholder.svg"} alt={currentChild.name} />
                <AvatarFallback>{currentChild.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span>{currentChild.name}さんの今日</span>
                  <div className="text-2xl">{moodEmojis[currentChild.todayRecord.mood as keyof typeof moodEmojis]}</div>
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  学習時間: {currentChild.todayRecord.studyTime}
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
                    {currentChild.todayRecord.subjects.map((subject) => (
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
                    {Math.round((currentChild.todayRecord.totalCorrect / currentChild.todayRecord.totalProblems) * 100)}
                    %
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">連続学習</div>
                  <div className="font-bold text-lg text-primary">{currentChild.streak}日</div>
                </div>
              </div>
            </div>

            {/* Child's Reflection */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">今日の振り返り</div>
              <p className="text-sm">{currentChild.todayRecord.reflection}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Encouragement Stamps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              クイック応援
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {encouragementStamps.map((stamp) => {
                const Icon = stamp.icon
                return (
                  <Button
                    key={stamp.id}
                    onClick={() => handleSendStamp(stamp.id, setIsSending, currentChild)}
                    disabled={isSending}
                    variant="outline"
                    className="h-16 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <Icon className={`h-6 w-6 ${stamp.color}`} />
                    <span className="text-sm font-medium">{stamp.label}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Suggested Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI提案メッセージ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiSuggestedMessages.map((message, index) => (
              <Button
                key={index}
                onClick={() => handleSendMessage(message, setIsSending, setCustomMessage, currentChild)}
                disabled={!message.trim() || isSending}
                variant="outline"
                className="w-full h-auto p-4 text-left justify-start hover:bg-accent/5 hover:border-accent/50"
              >
                <div className="flex items-start gap-3">
                  <Send className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{message}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Custom Message */}
        <Card>
          <CardHeader>
            <CardTitle>カスタムメッセージ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="お子さんへの応援メッセージを自由に書いてください..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px] text-base"
              maxLength={200}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{customMessage.length}/200文字</span>
              <Button
                onClick={() => handleSendMessage(customMessage, setIsSending, setCustomMessage, currentChild)}
                disabled={!customMessage.trim() || isSending}
                className="px-6"
              >
                <Send className="h-4 w-4 mr-2" />
                送信
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>今週の進捗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">週間目標</span>
                <span className="font-medium">
                  {currentChild.weeklyProgress}/{currentChild.weeklyGoal}日
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((currentChild.weeklyProgress / currentChild.weeklyGoal) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {currentChild.weeklyProgress >= currentChild.weeklyGoal
                  ? "今週の目標達成！素晴らしいです！"
                  : `あと${currentChild.weeklyGoal - currentChild.weeklyProgress}日で目標達成`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
