"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Heart,
  Send,
  Sparkles,
  BookOpen,
  Target,
  Calendar,
  Flame,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

// Mock data for children
const children = [
  {
    id: "child1",
    name: "みかん",
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
    name: "太郎",
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
  { id: "star", icon: Send, label: "すごい！", color: "text-yellow-500" },
  { id: "thumbs", icon: Sparkles, label: "よくできました", color: "text-blue-500" },
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

const studentDataArray = [
  {
    id: "child1",
    name: "みかん",
    avatar: "student1",
    streak: 7,
    weeklyTotal: 24,
    maxWeeklyTotal: 36,
    todayMissions: {
      completed: 4,
      total: 6,
      needsAttention: 2,
      subjects: ["算数", "国語", "理科"],
      mode: "input",
    },
    nextTest: {
      name: "第3回合不合判定テスト",
      date: "2024-09-08",
      type: "合不合判定テスト",
      course: "S",
      group: 15,
      thought: "今回は算数の図形問題を重点的に勉強したので、前回より良い結果を出したいです。",
      riskLevel: "接戦",
    },
    learningDashboard: {
      currentPeriod: "月・火",
      currentScore: 8,
      maxScore: 12,
      weeklyScore: 24,
      maxWeeklyScore: 36,
      alerts: ["未入力が2日連続"],
    },
  },
  {
    id: "child2",
    name: "太郎",
    avatar: "student2",
    streak: 5,
    weeklyTotal: 18,
    maxWeeklyTotal: 36,
    todayMissions: {
      completed: 3,
      total: 6,
      needsAttention: 3,
      subjects: ["理科", "社会", "算数"],
      mode: "review",
    },
    nextTest: {
      name: "第3回合不合判定テスト",
      date: "2024-09-08",
      type: "合不合判定テスト",
      course: "A",
      group: 12,
      thought: "理科の実験問題をもっと練習して、今度こそ良い結果を出したいです。",
      riskLevel: "危険",
    },
    learningDashboard: {
      currentPeriod: "月・火",
      currentScore: 6,
      maxScore: 12,
      weeklyScore: 18,
      maxWeeklyScore: 36,
      alerts: ["理科の理解度が低下中"],
    },
  },
]

const generateParentTip = () => {
  const tips = [
    "7日連続学習中！「毎日続けてすごいね」の一言で更にやる気アップ",
    "算数で少し苦戦中。「一緒に1問だけやってみよう」で寄り添いサポート",
    "テスト3日前。「復習は短時間で区切ろう」のアドバイスが効果的",
    "今日のミッション達成率67%。「あと少しで完璧だね」で背中を押して",
  ]
  return tips[Math.floor(Math.random() * tips.length)]
}

const encouragementTemplates = {
  praise: [
    "今日もアプリを開けたね。まずはその一歩を褒めよう。",
    "毎日コツコツ続けているのが素晴らしいです。",
    "難しい問題にもチャレンジしていて偉いね。",
  ],
  nudge: [
    "算数の「入力のみ」を「できた」に上げよう。1問だけ一緒に。",
    "今日はあと2科目で目標達成だよ。ファイト！",
    "復習は10分だけでも効果があるよ。一緒にやってみよう。",
  ],
  preTest: [
    "あと2日。復習は短く区切って「終わりを決める」のがコツ。",
    "テスト前は新しい問題より、間違えた問題の見直しを。",
    "緊張するのは当然。深呼吸して、いつも通りにやろう。",
  ],
}

const LearningHistoryCalendar = ({ selectedChild }: { selectedChild: string }) => {
  const generateLearningHistory = (childId: string) => {
    const history: { [key: string]: { subjects: string[]; understandingLevels: string[] } } = {}
    const today = new Date()

    const subjectSets =
      childId === "child1"
        ? [["算数", "国語"], ["算数", "国語", "理科"], ["国語"]]
        : [["理科", "社会"], ["理科", "社会", "算数"], ["社会"]]

    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      if (Math.random() > 0.3) {
        const subjects = subjectSets[Math.floor(Math.random() * subjectSets.length)]
        const understandingLevels = subjects.map(() => {
          const levels = ["😄バッチリ理解", "😊できた", "😐ふつう", "😟ちょっと不安", "😥むずかしかった"]
          return levels[Math.floor(Math.random() * levels.length)]
        })
        history[dateStr] = { subjects, understandingLevels }
      }
    }
    return history
  }

  const learningHistory = generateLearningHistory(selectedChild)
  const selectedChildData = children.find((child) => child.id === selectedChild)

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

  const today = new Date()
  const monthsData: { [key: string]: any } = {}

  for (let monthOffset = 1; monthOffset >= 0; monthOffset--) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`
    const monthName = `${targetMonth.getMonth() + 1}月`

    const weeks = []
    const firstDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

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
    light: "bg-blue-200 border-blue-300",
    medium: "bg-blue-400 border-blue-500",
    dark: "bg-primary border-primary",
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-primary/10 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          学習カレンダー
          <Badge className="bg-primary text-primary-foreground font-bold ml-2">
            {selectedChildData?.streak || 0}日連続
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
              <div
                key={day}
                className="text-sm font-semibold text-center text-slate-700 py-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {Object.entries(monthsData).map(([monthKey, monthData]) => (
            <div key={monthKey} className="space-y-2">
              <div className="text-base font-bold text-slate-800 text-left border-b border-slate-300 pb-2">
                {monthData.monthName}
              </div>
              {monthData.weeks.map((week: any[], weekIndex: number) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
                  {week.map((day: any, dayIndex: number) => (
                    <div
                      key={dayIndex}
                      className={`
                        w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 transition-all duration-300 hover:scale-110 cursor-pointer shadow-sm
                        ${intensityColors[day.intensity]}
                        ${!day.isCurrentMonth ? "opacity-30" : ""}
                      `}
                      title={
                        day.data && day.isCurrentMonth
                          ? `${day.date}: ${day.data.subjects.join(", ")}`
                          : `${day.date}: 学習記録なし`
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="flex items-center justify-between text-sm text-slate-600 pt-3 border-t border-slate-300">
            <span className="font-medium">少ない</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-slate-100 border-2 border-slate-200 shadow-sm"></div>
              <div className="w-4 h-4 rounded-md bg-blue-200 border-2 border-blue-300 shadow-sm"></div>
              <div className="w-4 h-4 rounded-md bg-blue-400 border-2 border-blue-500 shadow-sm"></div>
              <div className="w-4 h-4 rounded-md bg-primary border-2 border-primary shadow-sm"></div>
            </div>
            <span className="font-medium">多い</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const LearningDashboard = ({
  handleSendMessage,
  isSending,
  selectedChild,
}: {
  handleSendMessage: (message: string, isScheduled?: boolean) => void
  isSending: boolean
  selectedChild: string
}) => {
  const studentData = studentDataArray.find((data) => data.id === selectedChild) || studentDataArray[0]
  const { currentPeriod, currentScore, maxScore, weeklyScore, maxWeeklyScore, alerts } = studentData.learningDashboard

  const getRiskLevel = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return { level: "高", color: "text-primary", bgColor: "bg-primary/10" }
    if (percentage >= 60) return { level: "接戦", color: "text-yellow-600", bgColor: "bg-yellow-50" }
    return { level: "危険", color: "text-red-600", bgColor: "bg-red-50" }
  }

  const currentRisk = getRiskLevel(currentScore, maxScore)
  const weeklyRisk = getRiskLevel(weeklyScore, maxWeeklyScore)

  const generateAIEncouragement = () => {
    const percentage = (weeklyScore / maxWeeklyScore) * 100
    if (percentage >= 80) {
      return "素晴らしい！この調子で頑張っているね。継続が力になってるよ！"
    } else if (percentage >= 60) {
      return "よく頑張ってる！あと少しで目標達成だね。応援してるよ！"
    } else {
      return "今日も勉強お疲れさま。一歩ずつ進んでいこう。君ならできる！"
    }
  }

  const CircularProgress = ({ score, maxScore, size = 120, strokeWidth = 8, color = "#007BFF" }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const percentage = (score / maxScore) * 100
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800">{score}</span>
          <span className="text-sm text-slate-600">/{maxScore}点</span>
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-800">
          <Sparkles className="h-7 w-7 text-primary" />
          学習ダッシュボード
          <Badge className={`${currentRisk.bgColor} ${currentRisk.color} font-bold`}>
            到達見込み: {currentRisk.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">{alert}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-bold text-lg text-slate-800">{currentPeriod}の学習状況</h4>
          <div className="flex justify-center">
            <CircularProgress score={currentScore} maxScore={maxScore} size={140} strokeWidth={10} color="#007BFF" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 font-medium">{currentPeriod}</p>
            <p className="text-xs text-slate-500">/12点</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-lg text-slate-800">今週の学習累積</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">進捗</span>
              <span className="text-lg font-bold text-slate-800">
                {weeklyScore}/{maxWeeklyScore}点
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(weeklyScore / maxWeeklyScore) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>12</span>
              <span>24</span>
              <span>36</span>
            </div>
            <div className={`text-center p-3 rounded-lg ${weeklyRisk.bgColor}`}>
              <p className={`text-sm font-medium ${weeklyRisk.color}`}>
                {weeklyScore >= 24 ? "目標達成ペース！" : `合格ラインまであと${24 - weeklyScore}点`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h4 className="font-bold text-lg text-slate-800">推奨アクション</h4>
          <div className="space-y-2">
            <Button
              className="w-full justify-start bg-primary text-white hover:bg-primary/90 h-auto p-4 text-left"
              onClick={() => handleSendMessage(generateAIEncouragement())}
              disabled={isSending}
            >
              <Send className="h-4 w-4 mr-3 flex-shrink-0" />
              <div className="text-sm leading-relaxed">{generateAIEncouragement()}</div>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ParentDashboard() {
  const [isSending, setIsSending] = useState(false)
  const [parentAvatar, setParentAvatar] = useState<string>("parent1")
  const [selectedChild, setSelectedChild] = useState<string>("child1")

  const handleSendMessage = async (message: string, isScheduled = false) => {
    setIsSending(true)

    setTimeout(() => {
      if (isScheduled) {
        console.log(`Scheduled message for 19:00: ${message}`)
        alert(`19:00に応援メッセージを予約しました！`)
      } else {
        console.log(`Sent message: ${message}`)
        alert("応援メッセージを送信しました！")
      }
      setIsSending(false)
    }, 800)
  }

  useEffect(() => {
    const savedParentAvatar = localStorage.getItem("selectedParentAvatar")
    if (savedParentAvatar) {
      setParentAvatar(savedParentAvatar)
    }
  }, [])

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
      ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const formatTestDate = (dateString: string) => {
    const date = new Date(dateString)
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = weekdays[date.getDay()]
    return `${month}/${day}（${weekday}）`
  }

  const getDaysUntilTest = (testDate: string) => {
    const today = new Date()
    const test = new Date(testDate)
    today.setHours(0, 0, 0, 0)
    test.setHours(0, 0, 0, 0)
    const diffTime = test.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "本日！"
    if (diffDays === 1) return "明日"
    if (diffDays < 0) return "終了"
    return `${diffDays}日後`
  }

  const currentChildData = studentDataArray.find((data) => data.id === selectedChild) || studentDataArray[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      <div className="bg-card/90 backdrop-blur-sm border-b border-border/60 p-6 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-3 border-primary/30 shadow-lg">
              <AvatarImage src={getParentAvatarSrc(parentAvatar) || "/placeholder.svg"} alt="保護者" />
              <AvatarFallback className="bg-primary text-white font-bold text-lg">保</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">保護者サポート</h1>
              <p className="text-base text-muted-foreground mt-1">60秒で状況把握・応援しよう</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-primary">
              <Heart className="h-6 w-6" />
              <span className="font-bold text-2xl">完了</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">今日の応援</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {children.map((child) => (
            <Button
              key={child.id}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedChild(child.id)}
              className={`flex-1 rounded-md transition-all ${
                selectedChild === child.id
                  ? "bg-white text-primary shadow-sm font-medium"
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {child.name}
            </Button>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 shadow-2xl">
          <div className="pb-4 sm:pb-6">
            <div className="text-lg sm:text-xl font-bold flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-3 border-white/40 shadow-xl">
                  <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                  <AvatarFallback className="bg-white/20 text-white font-bold">AI</AvatarFallback>
                </Avatar>
                <span className="text-slate-900 font-bold text-base sm:text-lg bg-white px-4 py-2 rounded-full shadow-lg">
                  今日の声かけTip
                </span>
              </div>
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl">
            <p className="text-base sm:text-lg leading-relaxed text-slate-700 font-medium">{generateParentTip()}</p>
          </div>
        </div>

        <div className="xl:col-span-2">
          <LearningDashboard
            handleSendMessage={handleSendMessage}
            isSending={isSending}
            selectedChild={selectedChild}
          />
        </div>

        <div className="xl:col-span-2">
          <Card className="bg-gradient-to-br from-accent/8 to-primary/8 border-accent/30 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-bold flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
                  <span className="text-slate-800">今日のミッション！</span>
                </div>
                <Badge className="bg-accent text-accent-foreground border-accent font-bold text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2 shadow-md">
                  要対応 {currentChildData.todayMissions.needsAttention}/{currentChildData.todayMissions.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/60 shadow-lg">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-base sm:text-lg font-bold text-slate-800">
                      {currentChildData.todayMissions.mode === "input" ? "入力促進モード" : "復習促進モード"}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentChildData.todayMissions.needsAttention > 0 ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                      <span className="font-medium">
                        {currentChildData.todayMissions.completed}/{currentChildData.todayMissions.total} 完了
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {currentChildData.todayMissions.subjects.map((subject) => (
                      <Badge key={subject} className="bg-primary text-white border-primary font-medium py-1 sm:py-2">
                        {subject}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { subject: "算数", type: "授業", status: "できた" },
                      { subject: "算数", type: "宿題", status: "入力のみ" },
                      { subject: "国語", type: "授業", status: "未入力" },
                      { subject: "国語", type: "宿題", status: "バッチリ理解" },
                      { subject: "理科", type: "授業", status: "ふつう" },
                      { subject: "理科", type: "宿題", status: "未入力" },
                    ].map((panel, index) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case "未入力":
                            return "bg-slate-100 text-slate-700 border-slate-300"
                          case "入力のみ":
                            return "bg-blue-50 text-blue-800 border-blue-200"
                          case "ふつう":
                            return "bg-yellow-50 text-yellow-800 border-yellow-200"
                          case "できた":
                            return "bg-green-50 text-green-800 border-green-200"
                          case "バッチリ理解":
                            return "bg-purple-50 text-purple-800 border-purple-200"
                          default:
                            return "bg-slate-100 text-slate-700 border-slate-300"
                        }
                      }

                      const getSubjectColor = (subject: string) => {
                        switch (subject) {
                          case "算数":
                            return "border-l-4 border-l-blue-500 bg-blue-50/80"
                          case "国語":
                            return "border-l-4 border-l-green-500 bg-green-50/80"
                          case "理科":
                            return "border-l-4 border-l-purple-500 bg-purple-50/80"
                          case "社会":
                            return "border-l-4 border-l-red-500 bg-red-50/80"
                          default:
                            return "border-l-4 border-l-slate-400 bg-slate-50/80"
                        }
                      }

                      const needsAction = panel.status === "未入力" || panel.status === "入力のみ"

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-2 shadow-sm ${getSubjectColor(panel.subject)} ${
                            needsAction ? "ring-2 ring-red-200" : ""
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-800">{panel.subject}</span>
                              <Badge className={`text-xs px-2 py-1 border ${getStatusColor(panel.status)}`}>
                                {panel.status}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-700">{panel.type}</p>
                              <div className="text-xs text-slate-600">{needsAction ? "要サポート" : "順調"}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-bold flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  <span className="text-slate-800">今週の目標</span>
                </div>
                <Badge
                  className={`${
                    currentChildData.nextTest.riskLevel === "高"
                      ? "bg-primary/10 text-primary"
                      : currentChildData.nextTest.riskLevel === "接戦"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                  } font-bold`}
                >
                  到達見込み: {currentChildData.nextTest.riskLevel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/60 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="font-bold text-lg sm:text-xl text-foreground">{currentChildData.nextTest.name}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      {formatTestDate(currentChildData.nextTest.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-black text-primary">
                      {getDaysUntilTest(currentChildData.nextTest.date)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    結果目標
                  </h4>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className="font-bold text-sm sm:text-lg px-3 sm:px-4 py-2 border shadow-md rounded-md"
                      style={{ backgroundColor: "#1e3a8a", color: "#ffffff" }}
                    >
                      {currentChildData.nextTest.course}コース
                    </div>
                    <div
                      className="font-bold text-sm sm:text-lg px-3 sm:px-4 py-2 border shadow-md rounded-md"
                      style={{ backgroundColor: "#1e40af", color: "#ffffff" }}
                    >
                      {currentChildData.nextTest.group}組
                    </div>
                  </div>
                </div>

                {currentChildData.nextTest.thought && (
                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <h4 className="font-bold text-base sm:text-lg text-foreground">
                      {currentChildData.name}さんの思い
                    </h4>
                    <div className="bg-accent/10 rounded-xl p-3 sm:p-4 border border-accent/30 shadow-sm">
                      <p className="text-sm sm:text-base leading-relaxed text-slate-800">
                        {currentChildData.nextTest.thought}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <LearningHistoryCalendar selectedChild={selectedChild} />
        </div>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
