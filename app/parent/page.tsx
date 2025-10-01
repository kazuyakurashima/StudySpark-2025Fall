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
  BookOpen,
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
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const subjectProgress = [
    {
      subject: "算数",
      status: "進行中",
      correctAnswers: 32,
      totalQuestions: 50,
      progressRate: 64,
      color: "blue",
      details: [
        { content: "実験", remaining: 8 },
        { content: "暗記", remaining: 7 },
      ],
    },
    {
      subject: "国語",
      status: "あと少し",
      correctAnswers: 28,
      totalQuestions: 35,
      progressRate: 80,
      color: "yellow",
      details: [
        { content: "読解", remaining: 3 },
        { content: "漢字", remaining: 4 },
      ],
    },
    {
      subject: "理科",
      status: "未着手",
      correctAnswers: 15,
      totalQuestions: 30,
      progressRate: 50,
      color: "gray",
      details: [
        { content: "実験", remaining: 8 },
        { content: "暗記", remaining: 7 },
      ],
    },
    {
      subject: "社会",
      status: "達成",
      correctAnswers: 25,
      totalQuestions: 25,
      progressRate: 100,
      color: "green",
      details: [],
    },
  ]

  const getStatusColor = (status: string) => {
    const colors = {
      進行中: "bg-blue-100 text-blue-800 border-blue-200",
      あと少し: "bg-yellow-100 text-yellow-800 border-yellow-200",
      未着手: "bg-gray-100 text-gray-800 border-gray-200",
      達成: "bg-green-100 text-green-800 border-green-200",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getProgressColor = (color: string) => {
    const colors = {
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      gray: "bg-gray-400",
      green: "bg-green-500",
    }
    return colors[color as keyof typeof colors] || "bg-gray-400"
  }

  const getProgressBgColor = (color: string) => {
    const colors = {
      blue: "bg-blue-100",
      yellow: "bg-yellow-100",
      gray: "bg-gray-100",
      green: "bg-green-100",
    }
    return colors[color as keyof typeof colors] || "bg-gray-100"
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple/20 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-purple-600" />
          今週の進捗
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjectProgress.map((subject, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-slate-800">{subject.subject}</span>
                <Badge className={`text-xs px-2 py-1 border ${getStatusColor(subject.status)}`}>{subject.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  {subject.correctAnswers}/{subject.totalQuestions}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedSubject(expandedSubject === subject.subject ? null : subject.subject)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  詳細
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`w-full h-3 rounded-full ${getProgressBgColor(subject.color)}`}>
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(subject.color)}`}
                  style={{ width: `${subject.progressRate}%` }}
                />
              </div>
            </div>

            {expandedSubject === subject.subject && subject.details.length > 0 && (
              <div className="bg-white/80 rounded-lg p-4 border border-slate-200 space-y-2">
                <h4 className="font-medium text-slate-700 mb-2">内容別残数</h4>
                {subject.details.map((detail, detailIndex) => (
                  <div key={detailIndex} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{detail.content}</span>
                    <span className="font-medium text-slate-800">{detail.remaining}問</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const RecentLearningHistoryCard = () => {
  const recentHistory = [
    {
      studentRecordTime: "今日 14:30",
      session: 2,
      subject: "算数",
      content: "類題",
      correctAnswers: 8,
      totalQuestions: 10,
      accuracy: 80,
      previousAccuracy: 65,
      reflection: "分数の計算が少しずつ分かってきました",
    },
    {
      studentRecordTime: "今日 10:15",
      session: 1,
      subject: "国語",
      content: "確認問題",
      correctAnswers: 9,
      totalQuestions: 10,
      accuracy: 90,
      previousAccuracy: null,
      reflection: "",
    },
    {
      studentRecordTime: "昨日 16:45",
      session: 3,
      subject: "理科",
      content: "演習問題集（基本問題）",
      correctAnswers: 7,
      totalQuestions: 10,
      accuracy: 70,
      previousAccuracy: 45,
      reflection: "実験の手順を覚えることができました",
    },
    {
      studentRecordTime: "昨日 09:20",
      session: 1,
      subject: "社会",
      content: "演習問題集（練習問題）",
      correctAnswers: 6,
      totalQuestions: 10,
      accuracy: 60,
      previousAccuracy: null,
      reflection: "",
    },
  ]

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "text-blue-600 bg-blue-50 border-blue-200",
      国語: "text-emerald-600 bg-emerald-50 border-emerald-200",
      理科: "text-purple-600 bg-purple-50 border-purple-200",
      社会: "text-red-600 bg-red-50 border-red-200",
    }
    return colors[subject as keyof typeof colors] || "text-slate-600 bg-slate-50 border-slate-200"
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-700 bg-green-50 border-green-200"
    if (accuracy >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200"
    return "text-red-700 bg-red-50 border-red-200"
  }

  const getImprovementDisplay = (current: number, previous: number | null) => {
    if (previous === null) return null
    const improvement = current - previous
    const isPositive = improvement > 0
    return {
      text: `${previous}% → ${current}%`,
      color: isPositive ? "text-green-600" : improvement === 0 ? "text-slate-600" : "text-red-600",
      icon: isPositive ? "↗" : improvement === 0 ? "→" : "↘",
    }
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 border-green-200/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full shadow-sm">
            <Clock className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <span className="text-slate-800">直近の学習履歴</span>
            <p className="text-sm font-normal text-slate-600 mt-1">昨日0:00〜今日23:59のスパーク機能記録</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {recentHistory.map((item, index) => (
          <div
            key={index}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`text-sm px-3 py-1 border font-medium ${getSubjectColor(item.subject)}`}>
                    {item.subject}
                  </Badge>
                  <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                    {item.studentRecordTime}
                  </span>
                  <Badge variant="outline" className="text-sm px-3 py-1 border-slate-300 bg-white">
                    {item.session}回目
                  </Badge>
                </div>
                <Badge className={`text-sm px-3 py-2 border font-bold ${getAccuracyColor(item.accuracy)}`}>
                  {item.accuracy}%
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="font-bold text-slate-800 text-lg">{item.content}</p>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-base text-slate-700">
                    正答数:{" "}
                    <span className="font-bold text-slate-800">
                      {item.correctAnswers}/{item.totalQuestions}問
                    </span>
                  </span>
                  {item.previousAccuracy !== null && (
                    <div className="flex items-center gap-1">
                      {(() => {
                        const improvement = getImprovementDisplay(item.accuracy, item.previousAccuracy)
                        return improvement ? (
                          <span
                            className={`text-sm font-bold ${improvement.color} bg-white px-3 py-1 rounded-full border shadow-sm`}
                          >
                            {improvement.icon} {improvement.text}
                          </span>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
                {item.reflection && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <span className="font-semibold">今日の振り返り:</span> {item.reflection}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const RecentEncouragementCard = () => {
  const [showAll, setShowAll] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const toggleCardExpansion = (index: number) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCards(newExpanded)
  }

  const encouragementMessages = [
    {
      recordTime: "今日 15:20",
      from: "お母さん",
      avatar: "parent1",
      message: "算数がんばったね！明日もファイト！",
      studentRecordTime: "今日 14:30",
      learningDetails: {
        session: 2,
        subject: "算数",
        content: "類題",
        correctAnswers: 8,
        totalQuestions: 10,
        accuracy: 80,
        previousAccuracy: 65,
        reflection: "分数の計算が少しずつ分かってきました",
      },
    },
    {
      recordTime: "今日 11:30",
      from: "田中先生",
      avatar: "coach",
      message: "国語の漢字、きれいに書けていますね！",
      studentRecordTime: "今日 10:15",
      learningDetails: {
        session: 1,
        subject: "国語",
        content: "確認問題",
        correctAnswers: 9,
        totalQuestions: 10,
        accuracy: 90,
        previousAccuracy: null,
        reflection: "",
      },
    },
    {
      recordTime: "昨日 17:10",
      from: "田中先生",
      avatar: "coach",
      message: "理科の実験問題、よくできていました",
      studentRecordTime: "昨日 16:45",
      learningDetails: {
        session: 3,
        subject: "理科",
        content: "演習問題集（基本問題）",
        correctAnswers: 7,
        totalQuestions: 10,
        accuracy: 70,
        previousAccuracy: 45,
        reflection: "実験の手順を覚えることができました",
      },
    },
    {
      recordTime: "昨日 10:45",
      from: "お父さん",
      avatar: "parent2",
      message: "毎日コツコツ続けてえらいね",
      studentRecordTime: "昨日 09:20",
      learningDetails: {
        session: 1,
        subject: "社会",
        content: "演習問題集（練習問題）",
        correctAnswers: 6,
        totalQuestions: 10,
        accuracy: 60,
        previousAccuracy: null,
        reflection: "",
      },
    },
  ]

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "text-blue-600 bg-blue-50 border-blue-200",
      国語: "text-emerald-600 bg-emerald-50 border-emerald-200",
      理科: "text-purple-600 bg-purple-50 border-purple-200",
      社会: "text-red-600 bg-red-50 border-red-200",
    }
    return colors[subject as keyof typeof colors] || "text-slate-600 bg-slate-50 border-slate-200"
  }

  const getImprovementDisplay = (current: number, previous: number | null) => {
    if (previous === null) return null
    const improvement = current - previous
    const isPositive = improvement > 0
    return {
      text: `${previous}% → ${current}%`,
      color: isPositive ? "text-green-600" : improvement === 0 ? "text-slate-600" : "text-red-600",
      icon: isPositive ? "↗" : improvement === 0 ? "→" : "↘",
    }
  }

  return (
    <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 border-pink-200/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-full shadow-sm">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <span className="text-slate-800">直近の応援履歴</span>
              <p className="text-sm font-normal text-slate-600 mt-1">昨日0:00〜今日23:59の保護者・指導者からの応援</p>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={showAll ? "outline" : "default"}
              size="sm"
              onClick={() => setShowAll(false)}
              className={`text-xs px-3 py-1 transition-all duration-200 ${
                !showAll
                  ? "bg-blue-500 text-white shadow-md hover:bg-blue-600"
                  : "border-pink-300 text-pink-700 hover:bg-pink-50"
              }`}
            >
              一部表示
            </Button>
            <Button
              variant={!showAll ? "outline" : "default"}
              size="sm"
              onClick={() => setShowAll(true)}
              className={`text-xs px-3 py-1 transition-all duration-200 ${
                showAll
                  ? "bg-blue-500 text-white shadow-md hover:bg-blue-600"
                  : "border-pink-300 text-pink-700 hover:bg-pink-50"
              }`}
            >
              全表示
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {encouragementMessages.map((message, index) => {
          const isExpanded = expandedCards.has(index)
          const shouldShowDetails = showAll || isExpanded

          return (
            <div
              key={index}
              className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-pink-100 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-3 border-pink-200 flex-shrink-0 shadow-md">
                  <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                  <AvatarFallback className="bg-pink-100 text-pink-700 font-bold text-lg">
                    {message.from.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-800 text-lg">{message.from}</span>
                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                      {message.recordTime}
                    </span>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-pink-500" />
                      <span className="text-xs text-pink-600 font-medium">応援</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                    <p className="text-base leading-relaxed text-slate-700 font-medium">{message.message}</p>
                  </div>

                  {shouldShowDetails && (
                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-slate-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-xs px-3 py-1 border font-medium ${getSubjectColor(message.learningDetails.subject)}`}
                        >
                          {message.learningDetails.subject}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-3 py-1 border-slate-300 bg-white">
                          {message.learningDetails.session}回目
                        </Badge>
                        <span className="text-xs text-slate-600 bg-white px-2 py-1 rounded-full border">
                          生徒記録: {message.studentRecordTime}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-800 text-base">{message.learningDetails.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-700">
                              正答数:{" "}
                              <span className="font-bold">
                                {message.learningDetails.correctAnswers}/{message.learningDetails.totalQuestions}問
                              </span>
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              正答率: <span className="text-lg">{message.learningDetails.accuracy}%</span>
                            </span>
                          </div>
                          {message.learningDetails.previousAccuracy !== null && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const improvement = getImprovementDisplay(
                                  message.learningDetails.accuracy,
                                  message.learningDetails.previousAccuracy,
                                )
                                return improvement ? (
                                  <span
                                    className={`text-sm font-bold ${improvement.color} bg-white px-2 py-1 rounded-full border shadow-sm`}
                                  >
                                    {improvement.icon} {improvement.text}
                                  </span>
                                ) : null
                              })()}
                            </div>
                          )}
                        </div>
                        {message.learningDetails.reflection && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">今日の振り返り:</span> {message.learningDetails.reflection}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!showAll && (
                    <div className="text-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(index)}
                        className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 text-sm font-medium transition-all duration-200"
                      >
                        {isExpanded ? "クリックして詳細を閉じる" : "クリックして詳細を表示"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
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
  const [aiMessages, setAiMessages] = useState<{ [key: string]: string[] }>({})
  const [selectedMessage, setSelectedMessage] = useState<{ [key: string]: string | null }>({})
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({})
  const [isGenerating, setIsGenerating] = useState<{ [key: string]: boolean }>({})

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

  const handleAIEncourage = async (subject: string) => {
    // Check if messages already exist
    if (aiMessages[subject] && aiMessages[subject].length > 0) {
      // Show existing messages
      return
    }

    setIsGenerating({ ...isGenerating, [subject]: true })

    // Simulate API call to ChatGPT
    setTimeout(() => {
      const messages = [
        `${subject}の学習、本当によく頑張りましたね！この調子で続けていきましょう！`,
        `${subject}の理解が深まっていますね。素晴らしい成長です！`,
        `${subject}に真剣に取り組む姿勢が素晴らしいです。応援しています！`,
      ]
      setAiMessages({ ...aiMessages, [subject]: messages })
      setIsGenerating({ ...isGenerating, [subject]: false })
    }, 1500)
  }

  const handleSendAIMessage = (subject: string, message: string) => {
    setSelectedMessage({ ...selectedMessage, [subject]: message })
    alert(`${subject}に「${message}」を送信しました！`)
  }

  const handleViewDetails = (subject: string) => {
    setShowDetails({ ...showDetails, [subject]: !showDetails[subject] })
  }

  const learningDetails = {
    算数: {
      studentRecordTime: "今日 14:30",
      session: 2,
      subject: "算数",
      content: "類題",
      correctAnswers: 8,
      totalQuestions: 10,
      accuracy: 80,
      previousAccuracy: 65,
      reflection: "分数の計算が少しずつ分かってきました",
    },
    国語: {
      studentRecordTime: "今日 10:15",
      session: 1,
      subject: "国語",
      content: "確認問題",
      correctAnswers: 9,
      totalQuestions: 10,
      accuracy: 90,
      previousAccuracy: null,
      reflection: "",
    },
    理科: {
      studentRecordTime: "昨日 16:45",
      session: 3,
      subject: "理科",
      content: "演習問題集（基本問題）",
      correctAnswers: 7,
      totalQuestions: 10,
      accuracy: 70,
      previousAccuracy: 45,
      reflection: "実験の手順を覚えることができました",
    },
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
                      disabled={isGenerating[panel.subject]}
                      className="w-full py-2 px-3 rounded-lg text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isGenerating[panel.subject] ? "生成中..." : "AI応援"}
                    </Button>

                    {aiMessages[panel.subject] && aiMessages[panel.subject].length > 0 && (
                      <div className="space-y-2 mt-3 p-3 bg-white/80 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-slate-700 mb-2">AI応援メッセージを選択:</p>
                        {aiMessages[panel.subject].map((msg, msgIndex) => (
                          <Button
                            key={msgIndex}
                            onClick={() => handleSendAIMessage(panel.subject, msg)}
                            variant="outline"
                            className="w-full text-xs py-2 px-2 h-auto text-left justify-start hover:bg-blue-50"
                          >
                            {msg}
                          </Button>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={() => handleViewDetails(panel.subject)}
                      variant="outline"
                      className="w-full py-2 px-3 rounded-lg text-sm font-bold border-2 border-slate-300 hover:bg-slate-50"
                    >
                      {showDetails[panel.subject] ? "詳細を閉じる" : "詳細を見る"}
                    </Button>

                    {showDetails[panel.subject] && learningDetails[panel.subject as keyof typeof learningDetails] && (
                      <div className="mt-3 p-4 bg-white/90 rounded-lg border border-slate-200 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-slate-700">生徒記録日時:</span>
                            <span className="text-slate-600">
                              {learningDetails[panel.subject as keyof typeof learningDetails].studentRecordTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-slate-700">学習回:</span>
                            <span className="text-slate-600">
                              {learningDetails[panel.subject as keyof typeof learningDetails].session}回目
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-700">科目:</span>
                            <Badge className="text-xs">
                              {learningDetails[panel.subject as keyof typeof learningDetails].subject}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-700">学習内容:</span>
                            <span className="text-slate-600">
                              {learningDetails[panel.subject as keyof typeof learningDetails].content}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-700">正答率:</span>
                            <span className="font-bold text-blue-600">
                              {learningDetails[panel.subject as keyof typeof learningDetails].accuracy}%
                            </span>
                            <span className="text-slate-600">
                              ({learningDetails[panel.subject as keyof typeof learningDetails].correctAnswers}/
                              {learningDetails[panel.subject as keyof typeof learningDetails].totalQuestions}問)
                            </span>
                          </div>
                          {learningDetails[panel.subject as keyof typeof learningDetails].previousAccuracy !== null && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold text-slate-700">変化:</span>
                              <span className="text-green-600 font-bold">
                                {learningDetails[panel.subject as keyof typeof learningDetails].previousAccuracy}% →{" "}
                                {learningDetails[panel.subject as keyof typeof learningDetails].accuracy}%
                              </span>
                            </div>
                          )}
                          {learningDetails[panel.subject as keyof typeof learningDetails].reflection && (
                            <div className="pt-2 border-t border-slate-200">
                              <span className="font-semibold text-slate-700 text-sm">今日の振り返り:</span>
                              <p className="text-sm text-slate-600 mt-1">
                                {learningDetails[panel.subject as keyof typeof learningDetails].reflection}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
