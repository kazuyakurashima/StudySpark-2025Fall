"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { AICoachChat } from "@/components/ai-coach-chat"
import { MessageCircle, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react"

// Declare variables and functions here
const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

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
  // Declare variables and functions here
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-8">
          {/* ... existing tabs list ... */}

          <TabsContent value="history" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-slate-200/60 shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">学習履歴</h2>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={learningSubjectFilter}
                      onChange={(e) => setLearningSubjectFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>全科目</option>
                      <option>算数</option>
                      <option>国語</option>
                      <option>理科</option>
                      <option>社会</option>
                    </select>
                    <select
                      value={learningPeriodFilter}
                      onChange={(e) => setLearningPeriodFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>1週間</option>
                      <option>1ヶ月</option>
                      <option>3ヶ月</option>
                    </select>
                    <select
                      value={learningSortBy}
                      onChange={(e) => setLearningSortBy(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>記録日時</option>
                      <option>学習回</option>
                      <option>正答率</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedLearningHistory.map((record, index) => {
                    const subjectColor = subjectColors[record.subject as keyof typeof subjectColors]
                    const progressChange = getProgressChange(record.correctRate, record.previousCorrectRate)

                    return (
                      <Card
                        key={index}
                        className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  className={`${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border font-semibold px-3 py-1`}
                                >
                                  {record.subject}
                                </Badge>
                                <Badge variant="outline" className="font-medium">
                                  {record.studySession}
                                </Badge>
                                <span className="text-sm text-slate-500">
                                  {new Date(record.studyDate).toLocaleDateString("ja-JP", {
                                    month: "numeric",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {record.learningContent.map((content, idx) => {
                                  const contentColor =
                                    learningContentColors[content as keyof typeof learningContentColors]
                                  return (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className={`${contentColor.bg} ${contentColor.text} ${contentColor.border} border text-xs`}
                                    >
                                      {content}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                                  {record.correctRate}%
                                </div>
                                <div className="text-sm text-slate-500">
                                  {record.correctAnswers}/{record.totalQuestions}問正解
                                </div>
                              </div>
                              {progressChange && (
                                <Badge
                                  className={`${progressChange.bgColor} ${progressChange.color} ${progressChange.borderColor} border font-semibold px-3 py-1 flex items-center gap-1`}
                                >
                                  <progressChange.icon className="h-3 w-3" />
                                  {progressChange.change}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {record.reflection && (
                            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100">
                              <p className="text-sm text-slate-700 leading-relaxed">{record.reflection}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-slate-200/60 shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">応援メッセージ履歴</h2>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>全科目</option>
                      <option>算数</option>
                      <option>国語</option>
                      <option>理科</option>
                      <option>社会</option>
                    </select>
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>1週間</option>
                      <option>1ヶ月</option>
                      <option>3ヶ月</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>記録日時</option>
                      <option>学習回</option>
                      <option>正答率</option>
                    </select>
                    <select
                      value={displayMode}
                      onChange={(e) => setDisplayMode(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>一部表示</option>
                      <option>全て表示</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedMessages.map((message) => {
                    const isExpanded = expandedMessages.has(message.id)
                    const subjectColor = subjectColors[message.subject as keyof typeof subjectColors]
                    const progressChange = getProgressChange(message.correctRate, message.previousCorrectRate)

                    return (
                      <Card
                        key={message.id}
                        className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white shadow-md">
                              <AvatarImage
                                src={getAvatarSrc(message.avatar) || "/placeholder.svg"}
                                alt={message.from}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                                {message.from[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">{message.from}</span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      message.type === "parent"
                                        ? "bg-pink-50 text-pink-700 border-pink-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }
                                  >
                                    {message.type === "parent" ? "保護者" : "先生"}
                                  </Badge>
                                </div>
                                <span className="text-sm text-slate-500">
                                  {new Date(message.recordedAt).toLocaleDateString("ja-JP", {
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{message.message}</p>
                              {displayMode === "全て表示" || isExpanded ? (
                                <div className="space-y-3 mt-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      className={`${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border font-semibold`}
                                    >
                                      {message.subject}
                                    </Badge>
                                    <Badge variant="outline">{message.studySession}</Badge>
                                    <span className="text-sm text-slate-500">
                                      {new Date(message.studentRecordedAt).toLocaleDateString("ja-JP", {
                                        month: "numeric",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {message.learningContent.map((content, idx) => {
                                      const contentColor =
                                        learningContentColors[content as keyof typeof learningContentColors]
                                      return (
                                        <Badge
                                          key={idx}
                                          variant="outline"
                                          className={`${contentColor.bg} ${contentColor.text} ${contentColor.border} border text-xs`}
                                        >
                                          {content}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-2xl font-bold text-slate-800">{message.correctRate}%</div>
                                    <div className="text-sm text-slate-500">
                                      {message.correctAnswers}/{message.totalQuestions}問正解
                                    </div>
                                    {progressChange && (
                                      <Badge
                                        className={`${progressChange.bgColor} ${progressChange.color} ${progressChange.borderColor} border font-semibold flex items-center gap-1`}
                                      >
                                        <progressChange.icon className="h-3 w-3" />
                                        {progressChange.change}
                                      </Badge>
                                    )}
                                  </div>
                                  {message.reflection && (
                                    <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100">
                                      <p className="text-sm text-slate-700 leading-relaxed">{message.reflection}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleMessageExpansion(message.id)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  学習記録を見る
                                </Button>
                              )}
                              {displayMode === "一部表示" && isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleMessageExpansion(message.id)}
                                  className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                                >
                                  閉じる
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-slate-200/60 shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">コーチング履歴</h2>
                  <select
                    value={coachingPeriodFilter}
                    onChange={(e) => setCoachingPeriodFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option>1週間</option>
                    <option>1ヶ月</option>
                    <option>3ヶ月</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {filteredCoachingHistory.map((session, index) => (
                    <Card
                      key={index}
                      className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white shadow-md">
                              <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                                AI
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-800">AIコーチング</div>
                              <div className="text-sm text-slate-500">
                                {new Date(session.recordedAt).toLocaleDateString("ja-JP", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                            <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">🎯</span>
                              Goal（目標）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.goal}</p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                            <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">📊</span>
                              Reality（現状）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.reality}</p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                            <div className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">💡</span>
                              Options（選択肢）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.options}</p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                            <div className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">🚀</span>
                              Will（意志）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.will}</p>
                          </div>
                        </div>

                        {session.encouragementMessage && (
                          <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                            <div className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              応援メッセージ
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.encouragementMessage}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
