"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Flame, Calendar, BookOpen, Users, MessageCircle, Sparkles } from "lucide-react"

// Mock data for demo
const mockData = {
  user: {
    name: "太郎",
    avatar: "student1",
    streak: 7,
    weeklyTotal: 5,
  },
  aiCoachMessage: {
    message:
      "太郎さん、今日もStudySparkを開いてくれてありがとう！7日連続の学習、本当に素晴らしいです。君の頑張りをいつも見守っています。今日も一歩ずつ、自分のペースで進んでいきましょう。",
    personalNote: "昨日の算数の図形問題、とてもよく考えて解けていましたね。その調子で今日も挑戦してみましょう！",
    mood: "encouraging",
    tip: "継続は力なり。毎日少しずつでも学習を続けることで、必ず成長できます",
    timeBasedGreeting: getTimeBasedGreeting(),
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
  社会: "bg-sky-100 text-sky-800 border-sky-200",
}

const moodIcons = {
  good: "😊",
  normal: "😐",
  difficult: "😔",
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours()
  if (hour < 10) {
    return "おはようございます！今日も元気にスタートしましょう"
  } else if (hour < 17) {
    return "こんにちは！今日の学習はいかがですか？"
  } else {
    return "お疲れさまです！今日も一日よく頑張りましたね"
  }
}

const generateLearningHistory = () => {
  const history: { [key: string]: { subjects: string[]; understandingLevels: string[] } } = {}
  const today = new Date()

  // 過去30日分のサンプルデータを生成
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    // ランダムに学習データを生成（一部の日は学習なし）
    if (Math.random() > 0.3) {
      // 70%の確率で学習あり
      const subjectCount = Math.floor(Math.random() * 4) + 1 // 1-4科目
      const subjects = ["算数", "国語", "理科", "社会"].slice(0, subjectCount)
      const understandingLevels = subjects.map(() => {
        const levels = ["😄バッチリ理解", "😊できた", "😐ふつう", "😟ちょっと不安", "😥むずかしかった"]
        return levels[Math.floor(Math.random() * levels.length)]
      })

      history[dateStr] = { subjects, understandingLevels }
    }
  }

  return history
}

const learningHistory = generateLearningHistory()

const getLearningIntensity = (date: string) => {
  const data = learningHistory[date]
  if (!data || data.subjects.length === 0) return "none"

  if (data.subjects.length === 1) return "light"

  if (data.subjects.length >= 2) {
    const goodLevels = ["😄バッチリ理解", "😊できた"]
    const normalOrBetter = ["😄バッチリ理解", "😊できた", "😐ふつう"]

    const allGoodOrBetter = data.understandingLevels.every((level) => goodLevels.includes(level))
    const allNormalOrBetter = data.understandingLevels.every((level) => normalOrBetter.includes(level))

    if (allGoodOrBetter) return "dark"
    if (allNormalOrBetter) return "medium"
  }

  return "light"
}

const LearningHistoryCalendar = () => {
  const today = new Date()
  const monthsData: { [key: string]: any[][] } = {}

  for (let monthOffset = 1; monthOffset >= 0; monthOffset--) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`
    const monthName = `${targetMonth.getMonth() + 1}月`

    const weeks = []
    const firstDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)

    // 月の最初の週の開始日を計算（日曜日から開始）
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // 月の最後の週の終了日を計算
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    // 週ごとにデータを生成
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const week = []
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const intensity = getLearningIntensity(dateStr)
        const isCurrentMonth = currentDate.getMonth() === targetMonth.getMonth()

        week.push({
          date: dateStr,
          day: currentDate.getDate(),
          intensity: isCurrentMonth ? intensity : "none",
          data: learningHistory[dateStr],
          isCurrentMonth,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
    }

    monthsData[monthKey] = { weeks, monthName }
  }

  const intensityColors = {
    none: "bg-slate-100 border-slate-200",
    light: "bg-sky-200 border-sky-300",
    medium: "bg-sky-400 border-sky-500",
    dark: "bg-sky-600 border-sky-700",
  }

  return (
    <Card className="bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-sky-600" />
          学習カレンダー
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-center text-slate-600 py-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {Object.entries(monthsData).map(([monthKey, monthData]) => (
            <div key={monthKey} className="space-y-2">
              <div className="text-sm font-bold text-slate-700 text-left border-b border-slate-200 pb-1">
                {monthData.monthName}
              </div>

              {monthData.weeks.map((week: any[], weekIndex: number) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
                  {week.map((day: any, dayIndex: number) => (
                    <div
                      key={dayIndex}
                      className={`
                        w-5 h-5 sm:w-6 sm:h-6 rounded-sm border transition-all duration-200 hover:scale-110 cursor-pointer
                        ${intensityColors[day.intensity]}
                        ${!day.isCurrentMonth ? "opacity-30" : ""}
                      `}
                      title={
                        day.data && day.isCurrentMonth
                          ? `${day.date}: ${day.data.subjects.join(", ")} (${day.data.understandingLevels.join(", ")})`
                          : `${day.date}: 学習記録なし`
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
            <span className="text-xs sm:text-sm">少ない</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-slate-100 border border-slate-200"></div>
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-sky-200 border border-sky-300"></div>
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-sky-400 border border-sky-500"></div>
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-sky-600 border border-sky-700"></div>
            </div>
            <span className="text-xs sm:text-sm">多い</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
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
      ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
      parent1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
      parent2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
      parent3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
      parent4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
      parent5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
      parent6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
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
              <h1 className="text-xl font-bold text-foreground">おかえり、{userName}さん</h1>
              <p className="text-sm text-muted-foreground">今日も一緒にがんばろう！</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-accent">
              <Flame className="h-5 w-5" />
              <span className="font-bold text-xl">{mockData.user.streak}</span>
            </div>
            <p className="text-xs text-muted-foreground">連続日数</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Coach Daily Message Section */}
          <div className="lg:col-span-2">
            <Card className="ai-coach-gradient border-0 shadow-xl ai-coach-glow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback className="bg-white/20 text-white font-bold">AI</AvatarFallback>
                    </Avatar>
                    <span className="text-white font-bold text-xl" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                      AIコーチからのメッセージ
                    </span>
                  </div>
                  <Sparkles className="h-6 w-6 text-white animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-lg">
                  <div className="space-y-4">
                    <p className="text-lg leading-relaxed text-slate-700 font-medium">
                      {mockData.aiCoachMessage.timeBasedGreeting}
                    </p>
                    <p className="text-lg leading-relaxed text-slate-700 font-medium">
                      {mockData.aiCoachMessage.message}
                    </p>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-base leading-relaxed text-slate-600">
                        <span className="font-bold text-slate-700">✨ 個別フィードバック：</span>
                        {mockData.aiCoachMessage.personalNote}
                      </p>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-base leading-relaxed text-slate-600">
                        <span className="font-bold text-slate-700">💪 今日の応援メッセージ：</span>
                        {mockData.aiCoachMessage.tip}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning History Calendar */}
          <div className="lg:col-span-1">
            <LearningHistoryCalendar />
          </div>
        </div>

        {/* Learning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Streak Counter */}
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" />
                学習継続
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-accent">{mockData.user.streak}</span>
                  <span className="text-base font-medium text-muted-foreground">日連続</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-foreground">{mockData.user.weeklyTotal}</span>
                  <span className="text-sm text-muted-foreground">/ 7日間</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Test */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                次回テスト
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-bold text-base text-foreground">{mockData.nextTest.name}</p>
                <p className="text-sm font-medium text-muted-foreground">{mockData.nextTest.date}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-primary">{mockData.nextTest.daysLeft}</span>
                  <span className="text-base font-medium text-muted-foreground">日後</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              今日の成果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockData.todayAchievements.map((achievement, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="text-2xl">{moodIcons[achievement.mood as keyof typeof moodIcons]}</div>
                  <div className="flex-1">
                    <Badge
                      className={`${subjectColors[achievement.subject as keyof typeof subjectColors]} mb-2 font-medium`}
                    >
                      {achievement.subject}
                    </Badge>
                    <p className="text-base font-medium text-foreground">
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
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-accent" />
              応援メッセージ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.encouragementMessages.map((message, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-accent/5 border border-accent/10">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                    <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base font-bold">{message.from}</span>
                      <span className="text-sm text-muted-foreground">{message.date}</span>
                    </div>
                    <p className="text-base leading-relaxed text-foreground">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Friends Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              友だちの様子
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.friends.map((friend, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getAvatarSrc(friend.avatar) || "/placeholder.svg"} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold">{friend.name}</span>
                      <Badge
                        variant={friend.status === "学習中" ? "default" : "secondary"}
                        className="text-sm font-medium"
                      >
                        {friend.status}
                      </Badge>
                    </div>
                    <p className="text-base text-muted-foreground">
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
