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
  Calendar,
  Flame,
  AlertTriangle,
  Home,
  Bot,
  ThumbsUp,
  BarChart3,
  Clock,
} from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

// Mock data for children
const childrenData = [
  {
    id: "child1",
    name: "みかん",
    avatar: "student1",
    streak: 7,
    weeklyTotal: 5,
  },
  {
    id: "child2",
    name: "太郎",
    avatar: "student2",
    streak: 5,
    weeklyTotal: 4,
  },
]

const encouragementStamps = [
  { id: "heart", icon: Heart, label: "がんばったね", color: "text-red-500" },
  { id: "star", icon: Send, label: "すごい！", color: "text-yellow-500" },
  { id: "thumbs", icon: Sparkles, label: "よくできました", color: "text-blue-500" },
]

const aiSuggestedMessages = [
  "今日も勉強お疲れさま！算数の分数問題が難しかったけど、最後は理解できました。",
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
  const selectedChildData = childrenData.find((child) => child.id === selectedChild)

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

const WeeklySubjectProgressCard = () => {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <span className="text-slate-800">週間学習進捗</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/60 shadow-lg">
          <p className="text-lg leading-relaxed text-slate-700 font-medium">週間の学習進捗をグラフで表示します。</p>
        </div>
      </CardContent>
    </Card>
  )
}

const RecentEncouragementCard = () => {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <Heart className="h-7 w-7 text-primary" />
          <span className="text-slate-800">最近の応援</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/60 shadow-lg">
          <p className="text-lg leading-relaxed text-slate-700 font-medium">最近の応援メッセージを表示します。</p>
        </div>
      </CardContent>
    </Card>
  )
}

const RecentLearningHistoryCard = () => {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <Clock className="h-7 w-7 text-primary" />
          <span className="text-slate-800">最近の学習履歴</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/60 shadow-lg">
          <p className="text-lg leading-relaxed text-slate-700 font-medium">最近の学習履歴を表示します。</p>
        </div>
      </CardContent>
    </Card>
  )
}

const TodayStatusCard = ({ childName }: { childName: string }) => {
  const todayStatus = `今日${childName}さんは算数と国語の学習を完了しました。特に算数の正答率が前回より10%向上しています。この調子で頑張っていますね！`

  return (
    <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-bold flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 border-3 border-white/30 shadow-2xl ring-2 ring-white/20">
              <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
              <AvatarFallback className="bg-white/20 text-white font-bold text-lg">AI</AvatarFallback>
            </Avatar>
            <span className="text-slate-800 font-bold text-xl bg-white/95 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-sm">
              今日の{childName}さん
            </span>
          </div>
          <Bot className="h-8 w-8 text-white sophisticated-scale" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-2xl">
          <p className="text-lg leading-relaxed text-slate-700 font-medium">{todayStatus}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const TodayMissionCard = ({ childName }: { childName: string }) => {
  const getTodayWeekday = () => {
    const today = new Date()
    return today.getDay()
  }

  const getCurrentHour = () => {
    const now = new Date()
    return now.getHours()
  }

  const getSubjectBlock = (weekday: number) => {
    const blocks = {
      1: ["算数", "国語", "社会"],
      2: ["算数", "国語", "社会"],
      3: ["算数", "国語", "理科"],
      4: ["算数", "国語", "理科"],
      5: ["算数", "理科", "社会"],
      6: ["算数", "理科", "社会"],
    }
    return blocks[weekday as keyof typeof blocks] || []
  }

  const getMissionMode = (weekday: number, hour: number) => {
    if (weekday === 0) return "sunday"
    if (weekday === 6 && hour >= 12) return "special"
    if ([1, 3, 5].includes(weekday)) return "input"
    if ([2, 4, 6].includes(weekday)) return "review"
    return "input"
  }

  const todayWeekday = getTodayWeekday()
  const currentHour = getCurrentHour()
  const mode = getMissionMode(todayWeekday, currentHour)
  const subjects = getSubjectBlock(todayWeekday)

  const panels = subjects.map((subject) => {
    const isStudentCompleted = Math.random() > 0.5 // デモ用：実際はAPIから取得
    const isParentEncouraged = Math.random() > 0.7 // デモ用：実際はAPIから取得

    return {
      subject,
      isStudentCompleted,
      isParentEncouraged,
      correctRate: isStudentCompleted ? Math.floor(Math.random() * 30) + 70 : null,
    }
  })

  const completedCount = panels.filter((p) => p.isParentEncouraged).length

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "border-l-4 border-l-blue-500 bg-blue-50/80",
      国語: "border-l-4 border-l-emerald-500 bg-emerald-50/80",
      理科: "border-l-4 border-l-purple-500 bg-purple-50/80",
      社会: "border-l-4 border-l-red-500 bg-red-50/80",
    }
    return colors[subject as keyof typeof colors] || "border-l-4 border-l-slate-400 bg-slate-50/80"
  }

  const handleEncourage = (subject: string) => {
    console.log(`応援する: ${subject}`)
    alert(`${subject}の応援メッセージを送信しました！`)
  }

  const handleAIEncourage = (subject: string) => {
    console.log(`AI応援: ${subject}`)
    alert(`${subject}のAI応援メッセージを生成しました！`)
  }

  const handleViewDetails = (subject: string) => {
    console.log(`詳細を見る: ${subject}`)
    // 実際の実装では応援機能へ遷移
  }

  return (
    <Card className="bg-gradient-to-br from-primary/8 to-accent/8 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <Home className="h-7 w-7 text-primary" />
            <span className="text-slate-800">今日のミッション！</span>
          </CardTitle>
          <Badge className="bg-primary text-primary-foreground border-primary font-bold text-base px-4 py-2 shadow-md">
            {completedCount}/{panels.length}完了
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {panels.map((panel, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border-2 shadow-sm transition-all duration-300 hover:shadow-md ${getSubjectColor(panel.subject)}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-slate-800">{panel.subject}</span>
                  {panel.isStudentCompleted && panel.correctRate !== null && (
                    <Badge className="text-xs px-2 py-1 border bg-green-100 text-green-800 border-green-200">
                      進捗率{panel.correctRate}%
                    </Badge>
                  )}
                </div>

                {!panel.isStudentCompleted ? (
                  <Button
                    disabled
                    className="w-full py-3 px-4 rounded-lg text-sm font-bold bg-slate-200 text-slate-500 cursor-not-allowed"
                  >
                    未完了
                  </Button>
                ) : panel.isParentEncouraged ? (
                  <div className="w-full py-3 px-4 rounded-lg text-sm font-bold bg-green-100 text-green-800 text-center border-2 border-green-300">
                    応援完了！
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleEncourage(panel.subject)}
                      className="w-full py-2 px-3 rounded-lg text-sm font-bold bg-pink-500 text-white hover:bg-pink-600 shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      頑張ったね！
                    </Button>
                    <Button
                      onClick={() => handleAIEncourage(panel.subject)}
                      className="w-full py-2 px-3 rounded-lg text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI応援
                    </Button>
                    <Button
                      onClick={() => handleViewDetails(panel.subject)}
                      variant="outline"
                      className="w-full py-2 px-3 rounded-lg text-sm font-bold border-2 border-slate-300 hover:bg-slate-50"
                    >
                      詳細を見る
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const getGreetingMessage = (userName: string, streak: number) => {
  if (streak === 1) {
    return `はじめまして、${userName}さん`
  }

  const lastLoginDays = 0
  if (lastLoginDays > 7) {
    return `お久しぶり、${userName}さん`
  }

  return `おかえりなさい、${userName}さん`
}

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

export default function ParentDashboard() {
  const [parentName, setParentName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const [selectedChild, setSelectedChild] = useState<string>("child1")

  useEffect(() => {
    const name = localStorage.getItem("parentName") || "保護者"
    const avatar = localStorage.getItem("selectedParentAvatar") || "parent1"
    setParentName(name)
    setSelectedAvatar(avatar)
  }, [])

  const greetingMessage = getGreetingMessage(parentName, 7)
  const currentChild = childrenData.find((child) => child.id === selectedChild) || childrenData[0]

  return (
    <div className="min-h-screen bg-background pb-20 elegant-fade-in">
      <div className="surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-6 shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-3 border-primary/20 shadow-xl ring-2 ring-primary/10">
              <AvatarImage src={getAvatarSrc(selectedAvatar) || "/placeholder.svg"} alt={parentName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {parentName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{greetingMessage}</h1>
              <p className="text-lg text-muted-foreground mt-1 font-medium">お子さんの学習を見守りましょう</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2 bg-primary/10 rounded-full">
                <Flame className="h-7 w-7" />
              </div>
              <span className="font-bold text-3xl">{currentChild.streak}</span>
            </div>
            <p className="text-sm text-muted-foreground font-semibold mt-1">連続学習日数</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {childrenData.length > 1 && (
          <div className="flex gap-2 bg-slate-100 p-2 rounded-xl shadow-sm">
            {childrenData.map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 rounded-lg transition-all duration-200 ${
                  selectedChild === child.id
                    ? "bg-white text-primary shadow-md font-bold"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={getAvatarSrc(child.avatar) || "/placeholder.svg"} alt={child.name} />
                  <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {child.name}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-8 lg:space-y-0">
          <div className="lg:hidden space-y-8">
            <TodayStatusCard childName={currentChild.name} />
            <TodayMissionCard childName={currentChild.name} />
            <LearningHistoryCalendar selectedChild={selectedChild} />
            <WeeklySubjectProgressCard />
            <RecentEncouragementCard />
            <RecentLearningHistoryCard />
          </div>

          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-8">
              <TodayStatusCard childName={currentChild.name} />
              <TodayMissionCard childName={currentChild.name} />
              <RecentEncouragementCard />
              <RecentLearningHistoryCard />
            </div>

            <div className="lg:col-span-1 space-y-8">
              <LearningHistoryCalendar selectedChild={selectedChild} />
              <WeeklySubjectProgressCard />
            </div>
          </div>
        </div>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
