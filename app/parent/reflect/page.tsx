"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { AICoachChat } from "@/components/ai-coach-chat"
import { MessageCircle, History, Sparkles, TrendingUp, TrendingDown, Minus, Headphones, Filter } from "lucide-react"

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

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [showAIChat, setShowAIChat] = useState(false)
  const [activeTab, setActiveTab] = useState("history")
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [learningSubjectFilter, setLearningSubjectFilter] = useState("全科目")
  const [learningPeriodFilter, setLearningPeriodFilter] = useState("1ヶ月")
  const [learningSortBy, setLearningSortBy] = useState("記録日時")
  const [subjectFilter, setSubjectFilter] = useState("全科目")
  const [periodFilter, setPeriodFilter] = useState("1ヶ月")
  const [sortBy, setSortBy] = useState("記録日時")
  const [displayMode, setDisplayMode] = useState("一部表示")
  const [coachingPeriodFilter, setCoachingPeriodFilter] = useState("1ヶ月")

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
          <TabsList className="grid w-full grid-cols-3 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-xl p-1.5 rounded-2xl h-14 sm:h-16 lg:h-18">
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
            {/* ... existing code from student reflect page ... */}
          </TabsContent>

          <TabsContent value="coaching" className="space-y-6">
            {/* ... existing code from student reflect page ... */}
          </TabsContent>
        </Tabs>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
