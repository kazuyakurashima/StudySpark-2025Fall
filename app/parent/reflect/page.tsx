"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { AICoachChat } from "@/components/ai-coach-chat"
import {
  MessageCircle,
  History,
  Sparkles,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Headphones,
  Target,
  Eye,
  Lightbulb,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Heart,
  Map,
} from "lucide-react"

const sparkLearningHistory = [
  {
    recordedAt: "2024-09-06 20:30",
    studyDate: "2024-09-06",
    studySession: "第3回",
    subject: "算数",
    learningContent: ["類題", "基本問題"],
    correctAnswers: 8,
    totalQuestions: 10,
    correctRate: 80,
    previousCorrectRate: 65,
    reflection: "図形問題が最初は難しかったけど、先生の説明でよく分かりました。基本問題も全部解けました！",
  },
  {
    recordedAt: "2024-09-06 19:45",
    studyDate: "2024-09-06",
    studySession: "第2回",
    subject: "国語",
    learningContent: ["確認問題"],
    correctAnswers: 7,
    totalQuestions: 10,
    correctRate: 70,
    previousCorrectRate: 55,
    reflection: "漢字の読み方を復習しました。確認問題で基礎を固められて良かったです。",
  },
  {
    recordedAt: "2024-09-05 21:15",
    studyDate: "2024-09-05",
    studySession: "第1回",
    subject: "理科",
    learningContent: ["演習問題集（練習問題）", "演習問題集（発展問題）"],
    correctAnswers: 6,
    totalQuestions: 10,
    correctRate: 60,
    previousCorrectRate: 45,
    reflection: "実験の問題は理解できたけど、発展問題がまだ少し難しいです。",
  },
  {
    recordedAt: "2024-09-05 20:00",
    studyDate: "2024-09-05",
    studySession: "第4回",
    subject: "社会",
    learningContent: ["演習問題集（練習問題）"],
    correctAnswers: 5,
    totalQuestions: 10,
    correctRate: 50,
    previousCorrectRate: 30,
    reflection: "歴史の年号を覚えるのが大変でした。もう少し復習が必要です。",
  },
  {
    recordedAt: "2024-09-04 19:30",
    studyDate: "2024-09-04",
    studySession: "第5回",
    subject: "算数",
    learningContent: ["練習問題", "演習問題集（実戦演習）"],
    correctAnswers: 9,
    totalQuestions: 10,
    correctRate: 90,
    previousCorrectRate: 75,
    reflection: "分数の計算問題をたくさん練習しました。実戦演習でも良い結果が出せました。",
  },
  {
    recordedAt: "2024-09-03 18:15",
    studyDate: "2024-09-03",
    studySession: "第1回",
    subject: "算数",
    learningContent: ["類題"],
    correctAnswers: 6,
    totalQuestions: 10,
    correctRate: 60,
    previousCorrectRate: null,
    reflection: "新しい単元の類題に取り組みました。基本的な考え方は理解できました。",
  },
]

const learningContentColors = {
  類題: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  基本問題: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  練習問題: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  確認問題: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "演習問題集（基本問題）": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "演習問題集（練習問題）": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "演習問題集（発展問題）": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "演習問題集（実戦演習）": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "演習問題集（発展問題・記述問題）": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
}

const encouragementMessages = [
  {
    id: 1,
    recordedAt: "2024-09-06 18:30",
    from: "お母さん",
    avatar: "parent1",
    message: "算数の類題と基本問題、よくがんばったね！明日もファイト！",
    type: "parent",
    studentRecordedAt: "2024-09-06 20:30",
    studySession: "第3回",
    subject: "算数",
    learningContent: ["類題", "基本問題"],
    correctRate: 80,
    correctAnswers: 8,
    totalQuestions: 10,
    previousCorrectRate: 65,
    reflection: "図形問題が最初は難しかったけど、先生の説明でよく分かりました。基本問題も全部解けました！",
  },
  {
    id: 2,
    recordedAt: "2024-09-06 15:20",
    from: "田中先生",
    avatar: "coach",
    message: "理科の演習問題、着実に力がついていますね。この調子で続けましょう。",
    type: "teacher",
    studentRecordedAt: "2024-09-05 21:15",
    studySession: "第1回",
    subject: "理科",
    learningContent: ["演習問題集（練習問題）", "演習問題集（発展問題）"],
    correctRate: 60,
    correctAnswers: 6,
    totalQuestions: 10,
    previousCorrectRate: 45,
    reflection: "実験の問題は理解できたけど、発展問題がまだ少し難しいです。",
  },
  {
    id: 3,
    recordedAt: "2024-09-05 20:15",
    from: "お父さん",
    avatar: "parent2",
    message: "社会の演習問題、前回より20%も上がったね！素晴らしい成長です！",
    type: "parent",
    studentRecordedAt: "2024-09-05 20:00",
    studySession: "第4回",
    subject: "社会",
    learningContent: ["演習問題集（練習問題）"],
    correctRate: 50,
    correctAnswers: 5,
    totalQuestions: 10,
    previousCorrectRate: 30,
    reflection: "歴史の年号を覚えるのが大変でした。もう少し復習が必要です。",
  },
]

const subjectColors = {
  算数: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    accent: "bg-blue-100",
    gradient: "from-blue-50 to-blue-100",
  },
  国語: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    accent: "bg-emerald-100",
    gradient: "from-emerald-50 to-emerald-100",
  },
  理科: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    accent: "bg-violet-100",
    gradient: "from-violet-50 to-violet-100",
  },
  社会: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    accent: "bg-amber-100",
    gradient: "from-amber-50 to-amber-100",
  },
}

const coachingHistory = [
  {
    recordedAt: "2024-09-06 20:45",
    coachingSummary: {
      goal: "算数の図形問題で80%以上の正答率を維持し、他科目への応用力を身につける",
      reality: "今週は図形問題の正答率が85%に向上。毎日の学習習慣も定着し、基礎力が安定してきた",
      options: "①他科目への応用練習 ②理科実験問題への挑戦 ③復習時間の調整と効率化",
      will: "来週は理科の実験問題に毎日15分取り組み、算数で学んだ論理的思考を活用する",
    },
    encouragementMessage: "今週は本当によく頑張りました！図形問題の理解が深まって、自信もついてきましたね。",
  },
  {
    recordedAt: "2024-09-01 19:30",
    coachingSummary: {
      goal: "国語の読解問題で安定した成績を保ち、時間管理スキルを向上させる",
      reality: "正答率は70%で安定している。ただし時間管理に課題があり、最後の問題まで到達できないことがある",
      options: "①速読練習の継続 ②問題文の構造分析方法の習得 ③時間配分の見直しと練習",
      will: "毎日10分間の速読練習を継続し、問題文を読む前に全体構造を把握する習慣をつける",
    },
    encouragementMessage: null,
  },
]

const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

const getAvatarSrc = (avatarId: string) => {
  const avatarMap: { [key: string]: string } = {
    student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coach-LENT7C1nR9yWT7UBNTHgxnWakF66Pr.png",
    ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
    parent1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8.png",
    parent2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-Fj9Fj9Fj9Fj9Fj9Fj9Fj9Fj9Fj9.png",
  }
  return avatarMap[avatarId] || avatarMap["student1"]
}

const isAICoachingAvailable = () => {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()

  if (day === 6 && hour >= 12) return true
  if (day === 0) return true
  if (day >= 1 && day <= 3) return true
  if (day === 4 && hour < 0) return true

  return false
}

const getProgressChange = (currentRate: number, previousRate: number | null) => {
  if (previousRate === null) return null

  const change = currentRate - previousRate
  if (change > 0) {
    return {
      text: `${previousRate}% → ${currentRate}%`,
      change: `+${change}%`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: TrendingUp,
    }
  } else if (change < 0) {
    return {
      text: `${previousRate}% → ${currentRate}%`,
      change: `${change}%`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: TrendingDown,
    }
  } else {
    return {
      text: `${previousRate}% → ${currentRate}%`,
      change: "±0%",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: Minus,
    }
  }
}

const achievementMapData = {
  grade5: {
    算数: {
      learningContents: ["類題", "基本問題", "練習問題", "演習問題集（実戦演習）"],
      courses: ["A", "A", "B", "C"],
      sessions: [
        { session: "第1回", period: "9/1〜9/7", problems: [7, 16, 12, 10], correctRates: [85, 75, 60, 50] },
        { session: "第2回", period: "9/8〜9/14", problems: [7, 10, 11, 12], correctRates: [90, 80, 70, 55] },
        { session: "第3回", period: "9/15〜9/21", problems: [5, 10, 11, 9], correctRates: [100, 85, 75, 60] },
        { session: "第4回", period: "9/22〜9/28", problems: [8, 15, 14, 13], correctRates: [75, 70, 65, 45] },
        { session: "第5回", period: "9/29〜10/5", problems: [0, 31, 12, 0], correctRates: [0, 90, 80, 0] },
      ],
    },
    国語: {
      learningContents: ["確認問題"],
      courses: ["A"],
      sessions: [
        { session: "第1回", period: "9/1〜9/7", problems: [40], correctRates: [70] },
        { session: "第2回", period: "9/8〜9/14", problems: [40], correctRates: [75] },
        { session: "第3回", period: "9/15〜9/21", problems: [40], correctRates: [80] },
        { session: "第4回", period: "9/22〜9/28", problems: [40], correctRates: [85] },
        { session: "第5回", period: "9/29〜10/5", problems: [80], correctRates: [90] },
      ],
    },
    理科: {
      learningContents: ["演習問題集（基本問題）", "演習問題集（練習問題）", "演習問題集（発展問題）"],
      courses: ["A", "B", "C"],
      sessions: [
        { session: "第1回", period: "9/1〜9/7", problems: [12, 15, 4], correctRates: [80, 70, 50] },
        { session: "第2回", period: "9/8〜9/14", problems: [13, 21, 3], correctRates: [85, 75, 55] },
        { session: "第3回", period: "9/15〜9/21", problems: [14, 17, 5], correctRates: [90, 80, 60] },
        { session: "第4回", period: "9/22〜9/28", problems: [15, 14, 4], correctRates: [75, 70, 45] },
        { session: "第5回", period: "9/29〜10/5", problems: [0, 34, 16], correctRates: [0, 85, 65] },
      ],
    },
    社会: {
      learningContents: ["演習問題集（練習問題）", "演習問題集（発展問題・記述問題）"],
      courses: ["A", "B"],
      sessions: [
        { session: "第1回", period: "9/1〜9/7", problems: [9, 6], correctRates: [75, 60] },
        { session: "第2回", period: "9/8〜9/14", problems: [9, 7], correctRates: [80, 65] },
        { session: "第3回", period: "9/15〜9/21", problems: [11, 6], correctRates: [85, 70] },
        { session: "第4回", period: "9/22〜9/28", problems: [15, 5], correctRates: [70, 55] },
        { session: "第5回", period: "9/29〜10/5", problems: [19, 19], correctRates: [90, 75] },
      ],
    },
  },
}

const subjectColorSchemes = {
  算数: {
    base: "bg-blue-500",
    light: "bg-blue-200",
    medium: "bg-blue-400",
    dark: "bg-blue-600",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  国語: {
    base: "bg-red-500",
    light: "bg-red-200",
    medium: "bg-red-400",
    dark: "bg-red-600",
    text: "text-red-700",
    border: "border-red-300",
  },
  理科: {
    base: "bg-orange-500",
    light: "bg-orange-200",
    medium: "bg-orange-400",
    dark: "bg-orange-600",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  社会: {
    base: "bg-green-500",
    light: "bg-green-200",
    medium: "bg-green-400",
    dark: "bg-green-600",
    text: "text-green-700",
    border: "border-green-300",
  },
}

const getColorByCorrectRate = (rate: number, subject: keyof typeof subjectColorSchemes) => {
  const colors = subjectColorSchemes[subject]
  if (rate === 0) return "bg-white border border-slate-200"
  if (rate < 50) return colors.light
  if (rate < 80) return colors.medium
  return colors.dark
}

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [showAIChat, setShowAIChat] = useState(false)
  const [activeTab, setActiveTab] = useState("achievement")
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [learningSubjectFilter, setLearningSubjectFilter] = useState("全科目")
  const [learningPeriodFilter, setLearningPeriodFilter] = useState("1ヶ月")
  const [learningSortBy, setLearningSortBy] = useState("記録日時")
  const [subjectFilter, setSubjectFilter] = useState("全科目")
  const [periodFilter, setPeriodFilter] = useState("1ヶ月")
  const [sortBy, setSortBy] = useState("記録日時")
  const [displayMode, setDisplayMode] = useState("一部表示")
  const [coachingPeriodFilter, setCoachingPeriodFilter] = useState("1ヶ月")
  const [achievementSubject, setAchievementSubject] = useState<keyof typeof achievementMapData.grade5>("算数")
  const [selectedCell, setSelectedCell] = useState<{
    session: string
    content: string
    rate: number
    problems: number
  } | null>(null)

  const toggleMessageExpansion = (messageId: number) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const filteredAndSortedMessages = encouragementMessages
    .filter((message) => {
      if (subjectFilter !== "全科目" && message.subject !== subjectFilter) return false

      const messageDate = new Date(message.recordedAt)
      const now = new Date()

      if (periodFilter === "1週間") {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return messageDate >= oneWeekAgo
      } else if (periodFilter === "1ヶ月") {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const filteredByMonth = encouragementMessages.filter(
          (msg) =>
            (subjectFilter === "全科目" || msg.subject === subjectFilter) && new Date(msg.recordedAt) >= oneMonthAgo,
        )
        if (filteredByMonth.length < 5) {
          return true
        }
        return messageDate >= oneMonthAgo
      } else if (periodFilter === "3ヶ月") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        const filteredByThreeMonths = encouragementMessages.filter(
          (msg) =>
            (subjectFilter === "全科目" || msg.subject === subjectFilter) && new Date(msg.recordedAt) >= threeMonthsAgo,
        )
        if (filteredByThreeMonths.length < 5) {
          return true
        }
        return messageDate >= threeMonthsAgo
      }

      return true
    })
    .sort((a, b) => {
      if (sortBy === "記録日時") {
        return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      } else if (sortBy === "学習回") {
        return a.studySession.localeCompare(b.studySession)
      } else if (sortBy === "正答率") {
        return b.correctRate - a.correctRate
      }
      return 0
    })

  const filteredCoachingHistory = coachingHistory.filter((session) => {
    const sessionDate = new Date(session.recordedAt)
    const now = new Date()

    if (coachingPeriodFilter === "1週間") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return sessionDate >= oneWeekAgo
    } else if (coachingPeriodFilter === "1ヶ月") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const filteredByMonth = coachingHistory.filter((session) => new Date(session.recordedAt) >= oneMonthAgo)
      if (filteredByMonth.length < 5) {
        return true
      }
      return sessionDate >= oneMonthAgo
    } else if (coachingPeriodFilter === "3ヶ月") {
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const filteredByThreeMonths = coachingHistory.filter((session) => new Date(session.recordedAt) >= threeMonthsAgo)
      if (filteredByThreeMonths.length < 5) {
        return true
      }
      return sessionDate >= threeMonthsAgo
    }

    return true
  })

  const filteredAndSortedLearningHistory = sparkLearningHistory
    .filter((record) => {
      if (learningSubjectFilter !== "全科目" && record.subject !== learningSubjectFilter) return false

      const recordDate = new Date(record.recordedAt)
      const now = new Date()

      if (learningPeriodFilter === "1週間") {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return recordDate >= oneWeekAgo
      } else if (learningPeriodFilter === "1ヶ月") {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const filteredByMonth = sparkLearningHistory.filter(
          (record) =>
            (learningSubjectFilter === "全科目" || record.subject === learningSubjectFilter) &&
            new Date(record.recordedAt) >= oneMonthAgo,
        )
        if (filteredByMonth.length < 5) {
          return true
        }
        return recordDate >= oneMonthAgo
      } else if (learningPeriodFilter === "3ヶ月") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        const filteredByThreeMonths = sparkLearningHistory.filter(
          (record) =>
            (learningSubjectFilter === "全科目" || record.subject === learningSubjectFilter) &&
            new Date(record.recordedAt) >= threeMonthsAgo,
        )
        if (filteredByThreeMonths.length < 5) {
          return true
        }
        return recordDate >= threeMonthsAgo
      }

      return true
    })
    .sort((a, b) => {
      if (learningSortBy === "記録日時") {
        return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      } else if (learningSortBy === "学習回") {
        return a.studySession.localeCompare(b.studySession)
      } else if (learningSortBy === "正答率") {
        return b.correctRate - a.correctRate
      }
      return 0
    })

  if (showAIChat) {
    return <AICoachChat onClose={() => setShowAIChat(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
      <div className="bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur-md border-b border-slate-200/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border border-blue-300 shadow-sm">
                  <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
                </div>
                リフレクト
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-medium">
                お子さんの学習を振り返り、成長の軌跡を確認しましょう
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm text-slate-500">今週の振り返り</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                進行中
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-lg">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  selectedChild === child.id
                    ? "bg-white text-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {isAICoachingAvailable() && (
          <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 border-blue-200/60 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20 animate-pulse" />
            <CardContent className="p-4 sm:p-6 lg:p-8 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-ping" />
                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 border-4 border-white/80 shadow-xl relative z-10">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-lg sm:text-xl lg:text-2xl">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -right-2 z-20">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-purple-500 animate-bounce" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl sm:text-2xl lg:text-3xl text-slate-800">AIコーチング</h3>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed">
                      土曜日12時〜水曜日23時59分限定！
                      <br className="hidden sm:block" />
                      1週間の学習を一緒に振り返り、成長をサポートします
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAIChat(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 text-base sm:text-lg lg:text-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto rounded-xl"
                >
                  週間振り返りを始める
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-8">
          <TabsList className="grid w-full grid-cols-4 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-xl p-1.5 rounded-2xl h-14 sm:h-16 lg:h-18">
            <TabsTrigger
              value="achievement"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50 text-xs sm:text-sm lg:text-base"
            >
              <Map className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">達成マップ</span>
              <span className="sm:hidden">達成</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50 text-xs sm:text-sm lg:text-base"
            >
              <History className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">学習履歴</span>
              <span className="sm:hidden">学習</span>
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50 text-xs sm:text-sm lg:text-base"
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">応援履歴</span>
              <span className="sm:hidden">応援</span>
            </TabsTrigger>
            <TabsTrigger
              value="coaching"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50 text-xs sm:text-sm lg:text-base"
            >
              <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">コーチング履歴</span>
              <span className="sm:hidden">コーチ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievement" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm border-slate-200/60 shadow-2xl">
              <CardHeader className="pb-4 sm:pb-6 lg:pb-8">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl lg:text-3xl text-slate-800">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl border border-purple-300 shadow-sm">
                    <Map className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-purple-600" />
                  </div>
                  達成マップ
                </CardTitle>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600">
                  お子さんの各科目の習得具合を一覧で確認できます。色が濃いほど正答率が高いことを示します。
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8">
                {/* Subject tabs */}
                <Tabs
                  value={achievementSubject}
                  onValueChange={(v) => setAchievementSubject(v as keyof typeof achievementMapData.grade5)}
                  className="space-y-6"
                >
                  <TabsList className="grid w-full grid-cols-4 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-lg p-1.5 rounded-xl h-12 sm:h-14">
                    <TabsTrigger
                      value="算数"
                      className="flex items-center justify-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm"
                    >
                      算数
                    </TabsTrigger>
                    <TabsTrigger
                      value="国語"
                      className="flex items-center justify-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm"
                    >
                      国語
                    </TabsTrigger>
                    <TabsTrigger
                      value="理科"
                      className="flex items-center justify-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm"
                    >
                      理科
                    </TabsTrigger>
                    <TabsTrigger
                      value="社会"
                      className="flex items-center justify-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-300 text-xs sm:text-sm"
                    >
                      社会
                    </TabsTrigger>
                  </TabsList>

                  {Object.keys(achievementMapData.grade5).map((subject) => (
                    <TabsContent key={subject} value={subject} className="space-y-6">
                      <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-inner">
                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                          <span className="text-sm font-medium text-slate-700">正答率:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white border border-slate-200 rounded"></div>
                            <span className="text-xs text-slate-600">未修</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 ${subjectColorSchemes[subject as keyof typeof subjectColorSchemes].light} rounded`}
                            ></div>
                            <span className="text-xs text-slate-600">0-49%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 ${subjectColorSchemes[subject as keyof typeof subjectColorSchemes].medium} rounded`}
                            ></div>
                            <span className="text-xs text-slate-600">50-79%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 ${subjectColorSchemes[subject as keyof typeof subjectColorSchemes].dark} rounded`}
                            ></div>
                            <span className="text-xs text-slate-600">80-100%</span>
                          </div>
                        </div>

                        {/* Heatmap */}
                        <div className="overflow-x-auto">
                          <div className="min-w-max">
                            {/* Header row with learning contents */}
                            <div className="flex gap-2 mb-2">
                              <div className="w-24 sm:w-32"></div>
                              {achievementMapData.grade5[
                                subject as keyof typeof achievementMapData.grade5
                              ].learningContents.map((content, idx) => (
                                <div key={idx} className="flex-1 min-w-[80px] sm:min-w-[100px]">
                                  <div className="text-xs sm:text-sm font-medium text-slate-700 text-center mb-1">
                                    {content}
                                  </div>
                                  <div className="text-xs text-slate-500 text-center">
                                    (コース
                                    {
                                      achievementMapData.grade5[subject as keyof typeof achievementMapData.grade5]
                                        .courses[idx]
                                    }
                                    )
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Data rows */}
                            {achievementMapData.grade5[subject as keyof typeof achievementMapData.grade5].sessions.map(
                              (session, sessionIdx) => (
                                <div key={sessionIdx} className="flex gap-2 mb-2">
                                  <div className="w-24 sm:w-32 flex flex-col justify-center">
                                    <div className="text-xs sm:text-sm font-semibold text-slate-800">
                                      {session.session}
                                    </div>
                                    <div className="text-xs text-slate-500">{session.period}</div>
                                  </div>
                                  {session.correctRates.map((rate, contentIdx) => (
                                    <div key={contentIdx} className="flex-1 min-w-[80px] sm:min-w-[100px]">
                                      <button
                                        onClick={() =>
                                          setSelectedCell({
                                            session: session.session,
                                            content:
                                              achievementMapData.grade5[
                                                subject as keyof typeof achievementMapData.grade5
                                              ].learningContents[contentIdx],
                                            rate,
                                            problems: session.problems[contentIdx],
                                          })
                                        }
                                        className={`w-full h-16 sm:h-20 rounded-lg ${getColorByCorrectRate(rate, subject as keyof typeof subjectColorSchemes)} hover:ring-2 hover:ring-offset-2 hover:ring-${subject === "算数" ? "blue" : subject === "国語" ? "red" : subject === "理科" ? "orange" : "green"}-400 transition-all duration-200 flex flex-col items-center justify-center shadow-sm hover:shadow-md`}
                                      >
                                        {rate > 0 && (
                                          <>
                                            <span className="text-sm sm:text-base font-bold text-white drop-shadow-md">
                                              {rate}%
                                            </span>
                                            <span className="text-xs text-white/90 drop-shadow-sm">
                                              {session.problems[contentIdx]}問
                                            </span>
                                          </>
                                        )}
                                        {rate === 0 && <span className="text-xs text-slate-400">未修</span>}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Selected cell details */}
                        {selectedCell && (
                          <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg sm:text-xl font-bold text-slate-800">詳細情報</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCell(null)}
                                className="text-slate-600 hover:text-slate-800"
                              >
                                閉じる
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-slate-600 mb-1">学習回</div>
                                <div className="text-base sm:text-lg font-semibold text-slate-800">
                                  {selectedCell.session}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-600 mb-1">学習内容</div>
                                <div className="text-base sm:text-lg font-semibold text-slate-800">
                                  {selectedCell.content}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-600 mb-1">正答率</div>
                                <div className="text-base sm:text-lg font-semibold text-blue-600">
                                  {selectedCell.rate}%
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-600 mb-1">問題数</div>
                                <div className="text-base sm:text-lg font-semibold text-slate-800">
                                  {selectedCell.problems}問
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm border-slate-200/60 shadow-2xl">
              <CardHeader className="pb-4 sm:pb-6 lg:pb-8">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl lg:text-3xl text-slate-800">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border border-blue-300 shadow-sm">
                    <History className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-blue-600" />
                  </div>
                  学習履歴
                </CardTitle>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600">
                  スパーク機能で記録した学習データを時系列で確認できます
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-slate-100/60 to-slate-50/60 rounded-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-slate-200/60 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 sm:mb-6">
                    <Filter className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <span className="font-bold text-base sm:text-lg lg:text-xl text-slate-800">
                      フィルター・並び替え
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm sm:text-base font-medium text-slate-700">科目</label>
                      <select
                        value={learningSubjectFilter}
                        onChange={(e) => setLearningSubjectFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="全科目">全科目</option>
                        <option value="算数">算数</option>
                        <option value="国語">国語</option>
                        <option value="理科">理科</option>
                        <option value="社会">社会</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm sm:text-base font-medium text-slate-700">期間</label>
                      <select
                        value={learningPeriodFilter}
                        onChange={(e) => setLearningPeriodFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="1週間">1週間</option>
                        <option value="1ヶ月">1ヶ月</option>
                        <option value="3ヶ月">3ヶ月</option>
                        <option value="全て">全て</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm sm:text-base font-medium text-slate-700">並び替え</label>
                      <select
                        value={learningSortBy}
                        onChange={(e) => setLearningSortBy(e.target.value)}
                        className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="記録日時">記録日時（降順）</option>
                        <option value="学習回">学習回</option>
                        <option value="正答率">正答率</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  {filteredAndSortedLearningHistory.map((record, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-white/95 via-white/90 to-slate-50/90 border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] sm:hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200/60">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 border-2 border-white/80 shadow-lg">
                            <AvatarImage src={getAvatarSrc("student1") || "/placeholder.svg"} alt="Student" />
                            <AvatarFallback className="bg-slate-200 text-slate-800 font-bold text-sm sm:text-base lg:text-lg">
                              S
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800">
                              {record.subject}
                            </h2>
                            <p className="text-sm sm:text-base lg:text-lg text-slate-600">
                              {record.studySession} - {record.studyDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`bg-${learningContentColors[record.learningContent[0]].bg} text-${learningContentColors[record.learningContent[0]].text} border-${learningContentColors[record.learningContent[0]].border}`}
                          >
                            {record.learningContent[0]}
                          </Badge>
                          {record.previousCorrectRate !== null && (
                            <Badge
                              className={`bg-${getProgressChange(record.correctRate, record.previousCorrectRate)?.bgColor} text-${getProgressChange(record.correctRate, record.previousCorrectRate)?.color} border-${getProgressChange(record.correctRate, record.previousCorrectRate)?.borderColor}`}
                            >
                              {getProgressChange(record.correctRate, record.previousCorrectRate)?.change}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4 sm:p-6 lg:p-8">
                        <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed">
                          {record.learningContent.join(", ")}を学びました。
                        </p>
                        <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed">
                          正答率: {record.correctRate}%
                        </p>
                        <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed">
                          {record.reflection}
                        </p>
                      </CardContent>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm border-slate-200/60 shadow-2xl">
              <CardHeader className="pb-4 sm:pb-6 lg:pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl lg:text-3xl text-slate-800">
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl border border-pink-300 shadow-sm">
                        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-pink-600" />
                      </div>
                      応援履歴
                    </CardTitle>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-600 mt-2">
                      保護者・指導者からの温かいメッセージを確認できます
                    </p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      variant={displayMode === "全表示" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayMode("全表示")}
                      className="text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 sm:py-3 font-medium"
                    >
                      全表示
                    </Button>
                    <Button
                      variant={displayMode === "一部表示" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayMode("一部表示")}
                      className="text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 sm:py-3 font-medium"
                    >
                      一部表示
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-slate-100/60 to-slate-50/60 rounded-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-slate-200/60 shadow-inner">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <Filter className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <span className="font-bold text-base sm:text-lg lg:text-xl text-slate-800">
                      フィルター・並び替え
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm sm:text-base font-medium text-slate-700">科目</label>
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="全科目">全科目</option>
                        <option value="算数">算数</option>
                        <option value="国語">国語</option>
                        <option value="理科">理科</option>
                        <option value="社会">社会</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm sm:text-base font-medium text-slate-700">期間</label>
                      <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="1週間">1週間</option>
                        <option value="1ヶ月">1ヶ月</option>
                        <option value="3ヶ月">3ヶ月</option>
                        <option value="全て">全て</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm sm:text-base font-medium text-slate-700">並び替え</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="記録日時">記録日時（降順）</option>
                        <option value="学習回">学習回</option>
                        <option value="正答率">正答率</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  {filteredAndSortedMessages.map((message) => (
                    <div
                      key={message.id}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-white/95 via-white/90 to-pink-50/30 border border-pink-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] sm:hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/20 via-transparent to-rose-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
                        <div className="flex items-start gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 border-2 border-pink-200/60 shadow-md">
                            <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                            <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700 font-bold text-sm sm:text-base lg:text-lg">
                              {message.from.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 text-sm sm:text-base text-slate-600">
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span>記録日時: {message.recordedAt}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <span className="font-bold text-base sm:text-lg lg:text-xl text-slate-800">
                                {message.from}
                              </span>
                              <Badge
                                variant={message.type === "parent" ? "secondary" : "default"}
                                className="text-xs sm:text-sm font-medium bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 border-pink-300 px-2 sm:px-3 py-1"
                              >
                                {message.type === "parent" ? "保護者" : "指導者"}
                              </Badge>
                            </div>
                            <div className="mb-3 sm:mb-4 flex items-start gap-3 sm:gap-4">
                              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500 mt-1 flex-shrink-0" />
                              <p className="text-sm sm:text-base lg:text-lg text-slate-800 bg-white/80 p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-pink-200/60 leading-relaxed font-medium shadow-sm">
                                {message.message}
                              </p>
                            </div>

                            {(displayMode === "全表示" || expandedMessages.has(message.id)) && (
                              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-pink-200/60 space-y-4 sm:space-y-6">
                                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 text-sm sm:text-base text-slate-600">
                                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                                  <span className="font-medium">生徒記録日時:</span>
                                  <span className="font-mono text-slate-800">{message.studentRecordedAt}</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                  <div>
                                    <div className="text-sm sm:text-base font-medium text-slate-600 mb-1 sm:mb-2">
                                      学習回
                                    </div>
                                    <span className="text-base sm:text-lg lg:text-xl font-semibold text-blue-600">
                                      {message.studySession}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm sm:text-base font-medium text-slate-600 mb-1 sm:mb-2">
                                      科目
                                    </div>
                                    <Badge
                                      className={`${subjectColors[message.subject as keyof typeof subjectColors].bg} ${subjectColors[message.subject as keyof typeof subjectColors].text} ${subjectColors[message.subject as keyof typeof subjectColors].border} text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2 font-semibold`}
                                    >
                                      {message.subject}
                                    </Badge>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm sm:text-base font-medium text-slate-600 mb-2 sm:mb-3">
                                    学習内容
                                  </div>
                                  <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {message.learningContent.map((content) => (
                                      <Badge
                                        key={content}
                                        className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border} text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 font-medium`}
                                      >
                                        {content}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm sm:text-base font-medium text-slate-600 mb-2 sm:mb-3">
                                    正答率
                                  </div>
                                  <div className="space-y-3 sm:space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                      <div className="flex items-baseline gap-1 sm:gap-2">
                                        <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">
                                          {message.correctRate}%
                                        </span>
                                        <span className="text-sm sm:text-base text-slate-600">
                                          ({message.correctAnswers}/{message.totalQuestions}問正解)
                                        </span>
                                      </div>
                                      <div className="flex-1 bg-slate-200 rounded-full h-2.5 sm:h-3">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-2.5 sm:h-3 transition-all duration-300"
                                          style={{ width: `${message.correctRate}%` }}
                                        />
                                      </div>
                                    </div>

                                    {(() => {
                                      const progressChange = getProgressChange(
                                        message.correctRate,
                                        message.previousCorrectRate,
                                      )
                                      if (!progressChange) return null

                                      const IconComponent = progressChange.icon
                                      return (
                                        <div
                                          className={`inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 ${progressChange.bgColor} ${progressChange.borderColor} border rounded-lg sm:rounded-xl text-xs sm:text-sm`}
                                        >
                                          <IconComponent className={`h-3 w-3 sm:h-4 sm:w-4 ${progressChange.color}`} />
                                          <span className="font-medium text-slate-700">変化:</span>
                                          <span className="font-mono text-slate-600">{progressChange.text}</span>
                                          <span className={`font-bold ${progressChange.color}`}>
                                            ({progressChange.change})
                                          </span>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </div>

                                {message.reflection && (
                                  <div>
                                    <div className="text-sm sm:text-base font-medium text-slate-600 mb-1 sm:mb-2">
                                      今日の振り返り
                                    </div>
                                    <p className="text-sm sm:text-base lg:text-lg text-slate-800 bg-white/80 p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border border-blue-200/60 leading-relaxed">
                                      {message.reflection}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {displayMode === "一部表示" && (
                          <div className="mt-4 sm:mt-6 flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleMessageExpansion(message.id)}
                              className="flex items-center gap-2 text-sm sm:text-base text-slate-600 bg-white/60 hover:bg-white/80 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-slate-200/60 transition-all duration-200"
                            >
                              {expandedMessages.has(message.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                                  クリックして詳細を閉じる
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                                  クリックして詳細を表示
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm border-slate-200/60 shadow-2xl">
              <CardHeader className="pb-4 sm:pb-6 lg:pb-8">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl lg:text-3xl text-slate-800">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl border border-purple-300 shadow-sm">
                    <Headphones className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-purple-600" />
                  </div>
                  コーチング履歴
                </CardTitle>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600">
                  過去のAIコーチングの会話記録を時系列で表示し、成長の軌跡を可視化します
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-slate-100/60 to-slate-50/60 rounded-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-slate-200/60 shadow-inner">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <span className="font-bold text-base sm:text-lg lg:text-xl text-slate-800">期間フィルター</span>
                  </div>
                  <select
                    value={coachingPeriodFilter}
                    onChange={(e) => setCoachingPeriodFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 text-sm sm:text-base border border-slate-300/60 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="1週間">1週間</option>
                    <option value="1ヶ月">1ヶ月</option>
                    <option value="3ヶ月">3ヶ月</option>
                    <option value="全て">全て</option>
                  </select>
                </div>

                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  {filteredCoachingHistory.map((session, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-white/95 via-white/90 to-purple-50/30 border border-purple-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] sm:hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 via-transparent to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="relative p-4 sm:p-6 lg:p-8 xl:p-10">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                              <span className="font-medium text-sm sm:text-base lg:text-lg text-slate-800">
                                記録日時: {session.recordedAt}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-2 border-purple-200/60">
                              <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                              <AvatarFallback className="bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 font-bold text-sm sm:text-base">
                                AI
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm sm:text-base lg:text-lg text-slate-800">AIコーチ</span>
                          </div>
                        </div>

                        <div className="mb-4 sm:mb-6 lg:mb-8">
                          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                            <span className="text-base sm:text-lg lg:text-xl font-bold text-slate-800">
                              コーチングサマリー（GROWモデル）
                            </span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-green-200 shadow-sm">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
                                <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
                                <span className="text-sm sm:text-base lg:text-lg font-bold text-green-700">
                                  Goal（目標）
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm lg:text-base text-slate-800 leading-relaxed">
                                {session.coachingSummary.goal}
                              </p>
                            </div>
                            <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-blue-200 shadow-sm">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                                <span className="text-sm sm:text-base lg:text-lg font-bold text-blue-700">
                                  Reality（現実）
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm lg:text-base text-slate-800 leading-relaxed">
                                {session.coachingSummary.reality}
                              </p>
                            </div>
                            <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-orange-200 shadow-sm">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
                                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
                                <span className="text-sm sm:text-base lg:text-lg font-bold text-orange-700">
                                  Options（選択肢）
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm lg:text-base text-slate-800 leading-relaxed">
                                {session.coachingSummary.options}
                              </p>
                            </div>
                            <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-purple-200 shadow-sm">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
                                <span className="text-sm sm:text-base lg:text-lg font-bold text-purple-700">
                                  Will（意志・行動）
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm lg:text-base text-slate-800 leading-relaxed">
                                {session.coachingSummary.will}
                              </p>
                            </div>
                          </div>
                        </div>

                        {session.encouragementMessage && (
                          <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-pink-50/80 to-rose-50/80 rounded-lg sm:rounded-xl lg:rounded-2xl border border-pink-200/60 shadow-sm">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
                              <span className="text-sm sm:text-base lg:text-lg font-bold text-pink-700">
                                応援メッセージ
                              </span>
                            </div>
                            <p className="text-sm sm:text-base lg:text-lg text-slate-700 leading-relaxed font-medium">
                              {session.encouragementMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
