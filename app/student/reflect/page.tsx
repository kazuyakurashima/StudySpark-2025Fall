"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BottomNavigation } from "@/components/bottom-navigation"
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
  BookOpen,
  Headphones,
  Target,
  Eye,
  Lightbulb,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react"

// Mock data
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
    level: "Blaze",
  },
  {
    recordedAt: "2024-09-06 19:45",
    studyDate: "2024-09-06",
    studySession: "第2回",
    subject: "国語",
    learningContent: ["確認問題", "演習問題集（基本問題）"],
    correctAnswers: 7,
    totalQuestions: 10,
    correctRate: 70,
    previousCorrectRate: 55,
    reflection: "漢字の読み方を復習しました。確認問題で基礎を固められて良かったです。",
    level: "Flame",
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
    level: "Flame",
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
    level: "Spark",
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
    level: "Flame",
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
    level: "Spark",
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

const levelColors = {
  Spark: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Flame: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  Blaze: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
}

const encouragementMessages = [
  {
    id: 1,
    recordedAt: "2024-09-06 18:30",
    from: "お母さん",
    avatar: "parent1",
    message: "算数の類題と基本問題、よくがんばったね！明日もファイト！",
    type: "parent",
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
    date: "2024-09-06",
    time: "20:45",
    type: "成長週",
    weekType: "成長週",
    duration: "15分",
    topics: ["算数の図形問題", "学習習慣の改善", "次週の目標設定"],
    growSummary: {
      goal: "算数の図形問題で80%以上の正答率を維持する",
      reality: "今週は図形問題の正答率が85%に向上。毎日の学習習慣も定着",
      options: "①他科目への応用 ②理科実験問題への挑戦 ③復習時間の調整",
      will: "来週は理科の実験問題に毎日15分取り組む",
    },
    coach: "AIコーチ",
    level: "Blaze",
    turnCount: 4,
  },
  {
    date: "2024-09-01",
    time: "19:30",
    type: "安定週",
    weekType: "安定週",
    duration: "12分",
    topics: ["国語の読解問題", "時間管理", "新しい挑戦"],
    growSummary: {
      goal: "国語の読解問題で安定した成績を保つ",
      reality: "正答率は70%で安定。時間管理に課題あり",
      options: "①速読練習 ②問題文の構造分析 ③時間配分の見直し",
      will: "毎日10分間の速読練習を継続する",
    },
    coach: "AIコーチ",
    level: "Flame",
    turnCount: 5,
  },
]

const weekTypeColors = {
  成長週: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  安定週: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  挑戦週: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  特別週: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
}

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

export default function ReflectPage() {
  const [showAIChat, setShowAIChat] = useState(false)
  const [activeTab, setActiveTab] = useState("history")
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [expandedCoaching, setExpandedCoaching] = useState<Set<number>>(new Set())
  const [learningSubjectFilter, setLearningSubjectFilter] = useState("全科目")
  const [learningPeriodFilter, setLearningPeriodFilter] = useState("全て")
  const [learningSortBy, setLearningSortBy] = useState("記録日時")
  const [subjectFilter, setSubjectFilter] = useState("全科目")
  const [periodFilter, setPeriodFilter] = useState("全て")
  const [sortBy, setSortBy] = useState("記録日時")
  const [coachingPeriodFilter, setCoachingPeriodFilter] = useState("全て")

  const toggleMessageExpansion = (messageId: number) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const toggleCoachingExpansion = (sessionIndex: number) => {
    const newExpanded = new Set(expandedCoaching)
    if (newExpanded.has(sessionIndex)) {
      newExpanded.delete(sessionIndex)
    } else {
      newExpanded.add(sessionIndex)
    }
    setExpandedCoaching(newExpanded)
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
        return messageDate >= oneMonthAgo
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
    const sessionDate = new Date(session.date)
    const now = new Date()

    if (coachingPeriodFilter === "1週間") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return sessionDate >= oneWeekAgo
    } else if (coachingPeriodFilter === "1ヶ月") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return sessionDate >= oneMonthAgo
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
        return recordDate >= oneMonthAgo
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      <div className="bg-gradient-to-r from-card/95 to-card/90 backdrop-blur-md border-b border-border/30 shadow-lg">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                  <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                リフレクト
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                1週間の学習を振り返り、成長の軌跡を確認しましょう
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm text-muted-foreground">今週の振り返り</div>
              <div className="text-xl sm:text-2xl font-bold text-primary">進行中</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {isAICoachingAvailable() && (
          <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-primary/8 via-accent/8 to-primary/8 border-primary/20 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 animate-pulse" />
            <CardContent className="p-6 sm:p-8 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/60 shadow-xl relative z-10">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback className="bg-primary text-white font-bold text-lg sm:text-xl">AI</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -right-2 z-20">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent animate-bounce" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl sm:text-2xl text-foreground">AIコーチング</h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      土曜日12時〜水曜日23時59分限定！
                      <br />
                      1週間の学習を一緒に振り返り、成長をサポートします
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAIChat(true)}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                >
                  週間振り返りを始める
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-card/80 backdrop-blur-md border border-border/20 shadow-xl p-1.5 rounded-2xl h-14 sm:h-16">
            <TabsTrigger
              value="history"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 hover:bg-muted/50 text-xs sm:text-sm"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">学習履歴</span>
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 hover:bg-muted/50 text-xs sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">応援メッセージ</span>
            </TabsTrigger>
            <TabsTrigger
              value="coaching"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 hover:bg-muted/50 text-xs sm:text-sm"
            >
              <Headphones className="h-4 w-4" />
              <span className="hidden sm:inline">コーチング履歴</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/30 shadow-xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                    <History className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  スパーク機能で記録した学習履歴
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">日々の学習記録を時系列で確認できます</p>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-border/30 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base sm:text-lg text-foreground">フィルター・並び替え</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">科目</label>
                      <select
                        value={learningSubjectFilter}
                        onChange={(e) => setLearningSubjectFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="全科目">全科目</option>
                        <option value="算数">算数</option>
                        <option value="国語">国語</option>
                        <option value="理科">理科</option>
                        <option value="社会">社会</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">期間</label>
                      <select
                        value={learningPeriodFilter}
                        onChange={(e) => setLearningPeriodFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="1週間">1週間</option>
                        <option value="1ヶ月">1ヶ月</option>
                        <option value="全て">全て</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">並び替え</label>
                      <select
                        value={learningSortBy}
                        onChange={(e) => setLearningSortBy(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="記録日時">記録日時（降順）</option>
                        <option value="学習回">学習回</option>
                        <option value="正答率">正答率</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {filteredAndSortedLearningHistory.map((record, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-gray-50/90 border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.01] sm:hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-transparent to-accent/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="relative p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-full">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">記録日時</span>
                              </div>
                              <span className="font-mono text-gray-800 text-xs sm:text-sm">{record.recordedAt}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                                <span className="font-bold text-primary text-base sm:text-lg">学習回</span>
                                <span className="font-bold text-primary text-lg sm:text-xl">{record.studySession}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`${levelColors[record.level as keyof typeof levelColors].bg} ${levelColors[record.level as keyof typeof levelColors].text} ${levelColors[record.level as keyof typeof levelColors].border} font-bold px-3 sm:px-4 py-1.5 sm:py-2 text-sm shadow-sm`}
                            >
                              {record.level}
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-4 sm:mb-6">
                          <Badge
                            className={`${subjectColors[record.subject as keyof typeof subjectColors].bg} ${subjectColors[record.subject as keyof typeof subjectColors].text} ${subjectColors[record.subject as keyof typeof subjectColors].border} text-base sm:text-lg px-4 sm:px-6 py-2 sm:py-3 font-bold shadow-sm`}
                          >
                            {record.subject}
                          </Badge>
                        </div>

                        <div className="mb-4 sm:mb-6">
                          <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-full">
                              <BookOpen className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-bold text-gray-700">学習内容</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {record.learningContent.map((content) => (
                              <Badge
                                key={content}
                                className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border} text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 font-medium shadow-sm hover:shadow-md transition-shadow duration-200`}
                              >
                                {content}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mb-4 sm:mb-6">
                          <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-full">
                              <TrendingUp className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-bold text-gray-700">正答率</span>
                            </div>
                          </div>

                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-bold text-primary">
                                  {record.correctRate}%
                                </span>
                                <span className="text-xs sm:text-sm text-gray-600 font-medium">
                                  ({record.correctAnswers}/{record.totalQuestions}問正解)
                                </span>
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2.5 sm:h-3 shadow-inner">
                                <div
                                  className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-2.5 sm:h-3 transition-all duration-700 shadow-sm"
                                  style={{ width: `${record.correctRate}%` }}
                                />
                              </div>
                            </div>

                            {(() => {
                              const progressChange = getProgressChange(record.correctRate, record.previousCorrectRate)
                              if (!progressChange) return null

                              const IconComponent = progressChange.icon
                              return (
                                <div
                                  className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 ${progressChange.bgColor} ${progressChange.borderColor} border rounded-lg sm:rounded-xl shadow-sm`}
                                >
                                  <IconComponent className={`h-4 w-4 ${progressChange.color}`} />
                                  <span className="text-xs sm:text-sm font-medium text-gray-700">前回からの変化:</span>
                                  <span className="font-mono text-xs sm:text-sm text-gray-600">
                                    {progressChange.text}
                                  </span>
                                  <span className={`font-bold text-xs sm:text-sm ${progressChange.color}`}>
                                    ({progressChange.change})
                                  </span>
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {record.reflection && (
                          <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-lg sm:rounded-xl border border-blue-200/60 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-bold text-blue-700">今日の振り返り</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{record.reflection}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/30 shadow-xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                  </div>
                  応援メッセージ
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  保護者・指導者からの温かいメッセージを確認できます
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-border/30 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base sm:text-lg text-foreground">フィルター・並び替え</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">科目</label>
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="全科目">全科目</option>
                        <option value="算数">算数</option>
                        <option value="国語">国語</option>
                        <option value="理科">理科</option>
                        <option value="社会">社会</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">期間</label>
                      <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="1週間">1週間</option>
                        <option value="1ヶ月">1ヶ月</option>
                        <option value="全て">全て</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">並び替え</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="記録日時">記録日時</option>
                        <option value="学習回">学習回</option>
                        <option value="正答率">正答率</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {filteredAndSortedMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 cursor-pointer hover:from-accent/10 hover:to-accent/15 transition-all duration-300 shadow-lg hover:shadow-xl"
                      onClick={() => toggleMessageExpansion(message.id)}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-accent/30">
                          <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                          <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>記録日時: {message.recordedAt}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold text-base sm:text-lg text-foreground">{message.from}</span>
                            <Badge
                              variant={message.type === "parent" ? "secondary" : "default"}
                              className="text-xs font-medium"
                            >
                              {message.type === "parent" ? "保護者" : "指導者"}
                            </Badge>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm sm:text-base text-foreground bg-background/70 p-3 sm:p-4 rounded-lg border border-border/30 leading-relaxed">
                              {message.message}
                            </p>
                          </div>

                          {expandedMessages.has(message.id) && (
                            <div className="mt-4 pt-4 border-t border-accent/20 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">学習回</div>
                                  <span className="text-base font-semibold text-primary">{message.studySession}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">科目</div>
                                  <Badge
                                    className={`${subjectColors[message.subject as keyof typeof subjectColors].bg} ${subjectColors[message.subject as keyof typeof subjectColors].text} ${subjectColors[message.subject as keyof typeof subjectColors].border} text-base px-3 py-1 font-semibold`}
                                  >
                                    {message.subject}
                                  </Badge>
                                </div>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-2">学習内容</div>
                                <div className="flex flex-wrap gap-2">
                                  {message.learningContent.map((content) => (
                                    <Badge
                                      key={content}
                                      className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border} text-xs px-3 py-1 font-medium`}
                                    >
                                      {content}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-2">正答率</div>
                                <div className="space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl sm:text-2xl font-bold text-primary">
                                        {message.correctRate}%
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        ({message.correctAnswers}/{message.totalQuestions}問正解)
                                      </span>
                                    </div>
                                    <div className="flex-1 bg-muted rounded-full h-2.5">
                                      <div
                                        className="bg-primary rounded-full h-2.5 transition-all duration-300"
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
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 ${progressChange.bgColor} ${progressChange.borderColor} border rounded-lg text-xs`}
                                      >
                                        <IconComponent className={`h-3 w-3 ${progressChange.color}`} />
                                        <span className="font-medium text-gray-700">前回からの変化:</span>
                                        <span className="font-mono text-gray-600">{progressChange.text}</span>
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
                                  <div className="text-sm font-medium text-muted-foreground mb-1">今日の振り返り</div>
                                  <p className="text-sm sm:text-base text-foreground bg-background/70 p-3 rounded-lg border border-border/30 leading-relaxed">
                                    {message.reflection}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/60 px-4 py-2 rounded-full">
                          {expandedMessages.has(message.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              クリックして詳細を閉じる
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              クリックして詳細を表示
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-6">
            <Card className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/30 shadow-xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                    <Headphones className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                  </div>
                  コーチング履歴
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  過去のAIコーチングの会話記録を時系列で表示し、成長の軌跡を可視化します
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-border/30 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base sm:text-lg text-foreground">期間フィルター</span>
                  </div>
                  <select
                    value={coachingPeriodFilter}
                    onChange={(e) => setCoachingPeriodFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  >
                    <option value="1週間">1週間</option>
                    <option value="1ヶ月">1ヶ月</option>
                    <option value="全て">全て</option>
                  </select>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {filteredCoachingHistory.map((session, index) => (
                    <div
                      key={index}
                      className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">記録日時: {session.date}</span>
                            <Clock className="h-4 w-4 text-muted-foreground sm:ml-2" />
                            <span className="text-sm text-muted-foreground">{session.time}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={`${weekTypeColors[session.weekType as keyof typeof weekTypeColors].bg} ${weekTypeColors[session.weekType as keyof typeof weekTypeColors].text} ${weekTypeColors[session.weekType as keyof typeof weekTypeColors].border} font-medium`}
                            >
                              {session.weekType}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-medium">
                              {session.duration}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-medium">
                              {session.turnCount}往復
                            </Badge>
                            <Badge
                              className={`${levelColors[session.level as keyof typeof levelColors].bg} ${levelColors[session.level as keyof typeof levelColors].text} ${levelColors[session.level as keyof typeof levelColors].border} font-medium`}
                            >
                              {session.level}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-accent/30">
                            <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt={session.coach} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{session.coach}</span>
                        </div>
                      </div>

                      <div className="mb-4 sm:mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Target className="h-5 w-5 text-primary" />
                          <span className="text-base sm:text-lg font-bold text-foreground">
                            コーチングサマリー（GROWモデル）
                          </span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl border-2 border-green-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                              <span className="text-sm font-bold text-green-700">Goal（目標）</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                              {session.growSummary.goal}
                            </p>
                          </div>
                          <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl border-2 border-blue-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                              <span className="text-sm font-bold text-blue-700">Reality（現実）</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                              {session.growSummary.reality}
                            </p>
                          </div>
                          <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl border-2 border-orange-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                              <span className="text-sm font-bold text-orange-700">Options（選択肢）</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                              {session.growSummary.options}
                            </p>
                          </div>
                          <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl border-2 border-purple-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                              <span className="text-sm font-bold text-purple-700">Will（意志・行動）</span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                              {session.growSummary.will}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">話し合ったトピック</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {session.topics.map((topic, topicIndex) => (
                            <Badge key={topicIndex} variant="secondary" className="text-xs font-medium">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation activeTab="reflect" />
    </div>
  )
}
