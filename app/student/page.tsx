"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Flame, Calendar, BookOpen, Users, MessageCircle, Target } from "lucide-react"

// Mock data for demo
const mockData = {
  user: {
    name: "太郎",
    avatar: "student1",
    streak: 7,
    weeklyTotal: 5,
  },
  todayAchievements: [
    { subject: "算数", mood: "good", problems: 15, correct: 12 },
    { subject: "国語", mood: "normal", problems: 10, correct: 8 },
    { subject: "理科", mood: "good", problems: 8, correct: 7 },
  ],
  encouragementMessages: [
    { date: "今日", from: "お母さん", message: "算数がんばったね！明日もファイト！", avatar: "parent1" },
    { date: "昨日", from: "田中先生", message: "理科の実験問題、よくできていました", avatar: "coach" },
  ],
  friends: [
    { name: "花子", status: "学習中", subject: "算数", avatar: "student2" },
    { name: "次郎", status: "完了", todayScore: 85, avatar: "student3" },
  ],
  nextTest: {
    name: "第1回週テスト",
    date: "8月30日(土)",
    daysLeft: 3,
  },
}

const subjectColors = {
  算数: "bg-blue-100 text-blue-800 border-blue-200",
  国語: "bg-green-100 text-green-800 border-green-200",
  理科: "bg-purple-100 text-purple-800 border-purple-200",
  社会: "bg-orange-100 text-orange-800 border-orange-200",
}

const moodIcons = {
  good: "😊",
  normal: "😐",
  difficult: "😔",
}

export default function StudentDashboard() {
  const [userName, setUserName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")

  useEffect(() => {
    // Get user data from localStorage
    const name = localStorage.getItem("userName") || "学習者"
    const avatar = localStorage.getItem("selectedAvatar") || "student1"
    setUserName(name)
    setSelectedAvatar(avatar)
  }, [])

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
      student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
      student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
      coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coach-LENT7C1nR9yWT7UBNTHgxnWakF66Pr.png",
      parent1: "/placeholder.svg?height=40&width=40",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={getAvatarSrc(selectedAvatar) || "/placeholder.svg"} alt={userName} />
              <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold text-foreground">おかえり、{userName}さん</h1>
              <p className="text-sm text-muted-foreground">今日も一緒にがんばろう！</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-accent">
              <Flame className="h-5 w-5" />
              <span className="font-bold text-lg">{mockData.user.streak}</span>
            </div>
            <p className="text-xs text-muted-foreground">連続日数</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Learning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Streak Counter */}
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent" />
                学習継続
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-accent">{mockData.user.streak}</span>
                  <span className="text-sm text-muted-foreground">日連続</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold">{mockData.user.weeklyTotal}</span>
                  <span className="text-xs text-muted-foreground">/ 7日間</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Test */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                次回テスト
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-semibold text-sm">{mockData.nextTest.name}</p>
                <p className="text-xs text-muted-foreground">{mockData.nextTest.date}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-primary">{mockData.nextTest.daysLeft}</span>
                  <span className="text-sm text-muted-foreground">日後</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Goal */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-foreground" />
                今日の目標
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">4科目の学習</p>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">3/4 科目完了</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              今日の成果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockData.todayAchievements.map((achievement, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl">{moodIcons[achievement.mood as keyof typeof moodIcons]}</div>
                  <div className="flex-1">
                    <Badge className={`${subjectColors[achievement.subject as keyof typeof subjectColors]} mb-1`}>
                      {achievement.subject}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {achievement.correct}/{achievement.problems}問正解
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Encouragement Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-accent" />
              応援メッセージ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.encouragementMessages.map((message, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                    <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{message.from}</span>
                      <span className="text-xs text-muted-foreground">{message.date}</span>
                    </div>
                    <p className="text-sm text-foreground">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Friends Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              友だちの様子
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.friends.map((friend, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarSrc(friend.avatar) || "/placeholder.svg"} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{friend.name}</span>
                      <Badge variant={friend.status === "学習中" ? "default" : "secondary"} className="text-xs">
                        {friend.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {friend.status === "学習中"
                        ? `${friend.subject}を勉強中`
                        : `今日のスコア: ${friend.todayScore}点`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation activeTab="home" />
    </div>
  )
}
