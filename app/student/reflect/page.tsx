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
  Brain,
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
    studySession: "第3回", // 学習回を追加
    subject: "算数",
    learningContent: ["授業", "宿題"],
    correctAnswers: 8, // 正答数を追加
    totalQuestions: 10, // 総問題数を追加
    correctRate: 80, // 正答率を追加（パーセント）
    understanding: "バッチリ理解",
    understandingEmoji: "😄",
    reflection: "図形問題が最初は難しかったけど、先生の説明でよく分かりました。宿題も全部解けました！",
    level: "Blaze",
  },
  {
    recordedAt: "2024-09-06 19:45",
    studyDate: "2024-09-06",
    studySession: "第2回", // 学習回を追加
    subject: "国語",
    learningContent: ["授業", "週テスト・復習ナビ"],
    correctAnswers: 7, // 正答数を追加
    totalQuestions: 10, // 総問題数を追加
    correctRate: 70, // 正答率を追加（パーセント）
    understanding: "できた",
    understandingEmoji: "😊",
    reflection: "漢字の読み方を復習しました。週テスト対策もできて良かったです。",
    level: "Flame",
  },
  {
    recordedAt: "2024-09-05 21:15",
    studyDate: "2024-09-05",
    studySession: "第1回", // 学習回を追加
    subject: "理科",
    learningContent: ["宿題", "入試対策・過去問"],
    correctAnswers: 6, // 正答数を追加
    totalQuestions: 10, // 総問題数を追加
    correctRate: 60, // 正答率を追加（パーセント）
    understanding: "ふつう",
    understandingEmoji: "😐",
    reflection: "実験の問題は理解できたけど、計算問題がまだ少し難しいです。",
    level: "Flame",
  },
  {
    recordedAt: "2024-09-05 20:00",
    studyDate: "2024-09-05",
    studySession: "第4回", // 学習回を追加
    subject: "社会",
    learningContent: ["授業"],
    correctAnswers: 5, // 正答数を追加
    totalQuestions: 10, // 総問題数を追加
    correctRate: 50, // 正答率を追加（パーセント）
    understanding: "ちょっと不安",
    understandingEmoji: "😟",
    reflection: "歴史の年号を覚えるのが大変でした。もう少し復習が必要です。",
    level: "Spark",
  },
  {
    recordedAt: "2024-09-04 19:30",
    studyDate: "2024-09-04",
    studySession: "第5回", // 学習回を追加
    subject: "算数",
    learningContent: ["授業", "宿題", "週テスト・復習ナビ"],
    correctAnswers: 9, // 正答数を追加
    totalQuestions: 10, // 総問題数を追加
    correctRate: 90, // 正答率を追加（パーセント）
    understanding: "できた",
    understandingEmoji: "😊",
    reflection: "分数の計算問題をたくさん練習しました。だんだん慣れてきた感じです。",
    level: "Flame",
  },
]

const learningContentColors = {
  授業: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  宿題: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  週テスト・復習ナビ: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  入試対策・過去問: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
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
    message: "算数がんばったね！明日もファイト！",
    type: "parent",
    studySession: "第3回",
    subject: "算数",
    learningContent: ["授業", "宿題"],
    correctRate: 80,
    correctAnswers: 8,
    totalQuestions: 10,
    reflection: "図形問題が最初は難しかったけど、先生の説明でよく分かりました。宿題も全部解けました！",
  },
  {
    id: 2,
    recordedAt: "2024-09-06 15:20",
    from: "田中先生",
    avatar: "coach",
    message: "理科の実験問題、よくできていました。この調子で続けましょう。",
    type: "teacher",
    studySession: "第1回",
    subject: "理科",
    learningContent: ["宿題", "入試対策・過去問"],
    correctRate: 60,
    correctAnswers: 6,
    totalQuestions: 10,
    reflection: "実験の問題は理解できたけど、計算問題がまだ少し難しいです。",
  },
  {
    id: 3,
    recordedAt: "2024-09-05 20:15",
    from: "お父さん",
    avatar: "parent2",
    message: "毎日コツコツ続けているのが素晴らしい！",
    type: "parent",
    studySession: "第4回",
    subject: "社会",
    learningContent: ["授業"],
    correctRate: 50,
    correctAnswers: 5,
    totalQuestions: 10,
    reflection: "歴史の年号を覚えるのが大変でした。もう少し復習が必要です。",
  },
]

const friendsActivity = [
  {
    name: "花子",
    avatar: "student2",
    activity: "算数の学習を完了しました",
    time: "2時間前",
    subjects: ["算数"],
    score: 85,
  },
  {
    name: "次郎",
    avatar: "student3",
    activity: "今日の目標を達成しました！",
    time: "3時間前",
    subjects: ["国語", "理科"],
    score: 92,
  },
  {
    name: "美咲",
    avatar: "student4",
    activity: "理科の実験問題にチャレンジ中",
    time: "5時間前",
    subjects: ["理科"],
    score: null,
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

const courseColors = {
  goal: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    gradient: "from-slate-50 to-slate-100",
  },
  result: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    gradient: "from-blue-50 to-blue-100",
  },
}

const moodEmojis = {
  good: "😊",
  normal: "😐",
  difficult: "😔",
}

const testHistory = [
  {
    id: 1,
    name: "第3回合不合判定テスト",
    date: "2024-09-08",
    type: "合不合",
    goal: {
      course: "S",
      class: 15,
    },
    result: {
      course: "S",
      class: 12,
    },
    achieved: true,
    memo: "今回は算数の図形問題を重点的に勉強したので、前回より良い結果を出したいです。",
  },
  {
    id: 2,
    name: "第4回週テスト",
    date: "2024-09-07",
    type: "週テスト",
    goal: {
      subjects: {
        算数: 55,
        国語: 50,
        理科: 52,
        社会: 48,
      },
    },
    result: {
      subjects: {
        算数: 57,
        国語: 48,
        理科: 54,
        社会: 51,
      },
    },
    achieved: true,
    achievedCount: 3,
    totalSubjects: 4,
  },
  {
    id: 3,
    name: "第2回合不合判定テスト",
    date: "2024-08-25",
    type: "合不合",
    goal: {
      course: "A",
      class: 20,
    },
    result: {
      course: "B",
      class: 18,
    },
    achieved: false,
  },
  {
    id: 4,
    name: "第3回週テスト",
    date: "2024-08-24",
    type: "週テスト",
    goal: {
      subjects: {
        算数: 50,
        国語: 52,
        理科: 48,
        社会: 50,
      },
    },
    result: {
      subjects: {
        算数: 52,
        国語: 49,
        理科: 50,
        社会: 53,
      },
    },
    achieved: true,
    achievedCount: 3,
    totalSubjects: 4,
  },
  {
    id: 5,
    name: "第2回週テスト",
    date: "2024-08-17",
    type: "週テスト",
    goal: {
      subjects: {
        算数: 48,
        国語: 50,
        理科: 45,
        社会: 47,
      },
    },
    result: {
      subjects: {
        算数: 45,
        国語: 52,
        理科: 43,
        社会: 49,
      },
    },
    achieved: false,
    achievedCount: 2,
    totalSubjects: 4,
  },
]

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
  {
    date: "2024-08-25",
    time: "18:15",
    type: "挑戦週",
    weekType: "挑戦週",
    duration: "18分",
    topics: ["合不合判定テスト結果", "セルフコンパッション", "改善計画"],
    growSummary: {
      goal: "合不合判定テストでA組分けを目指していた",
      reality: "結果はB組分け。算数の計算ミスが多かった",
      options: "①計算練習の強化 ②見直し習慣の定着 ③基礎固めの徹底",
      will: "毎日の計算練習を10分間継続し、必ず見直しをする",
    },
    coach: "AIコーチ",
    level: "Flame",
    turnCount: 6,
  },
  {
    date: "2024-08-18",
    time: "20:00",
    type: "特別週",
    weekType: "特別週",
    duration: "10分",
    topics: ["組分けテスト対策", "具体的戦略", "メンタル準備"],
    growSummary: {
      goal: "第6回公開組分けテストで現在のクラスを維持する",
      reality: "各科目の準備状況にばらつきがある",
      options: "①弱点科目の集中対策 ②得意科目の維持 ③体調管理の徹底",
      will: "理科を重点的に復習し、前日は早めに就寝する",
    },
    coach: "AIコーチ",
    level: "Spark",
    turnCount: 4,
  },
  {
    date: "2024-08-11",
    time: "19:45",
    type: "成長週",
    weekType: "成長週",
    duration: "14分",
    topics: ["夏期講習の振り返り", "理解度確認", "継続計画"],
    growSummary: {
      goal: "夏期講習で学んだ内容を定着させる",
      reality: "社会の歴史分野で大きな成長が見られる",
      options: "①他分野への応用 ②復習スケジュールの最適化 ③応用問題への挑戦",
      will: "歴史の学習方法を地理分野にも応用する",
    },
    coach: "AIコーチ",
    level: "Flame",
    turnCount: 3,
  },
]

const testSchedule = {
  grade5: [
    { name: "第５回公開組分けテスト", date: "2024-08-31" },
    { name: "第６回公開組分けテスト", date: "2024-10-05" },
    { name: "第７回公開組分けテスト", date: "2024-11-09" },
    { name: "第８回公開組分けテスト", date: "2024-12-14" },
    { name: "新６年公開組分けテスト", date: "2025-01-25" },
  ],
  grade6: [
    { name: "第3回合不合判定テスト", date: "2024-09-07" },
    { name: "第4回合不合判定テスト", date: "2024-10-05" },
    { name: "第5回合不合判定テスト", date: "2024-11-16" },
    { name: "第6回合不合判定テスト", date: "2024-12-07" },
  ],
}

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
    parent3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-Gk0Gk0Gk0Gk0Gk0Gk0Gk0Gk0Gk0.png",
    parent4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-Hl1Hl1Hl1Hl1Hl1Hl1Hl1Hl1Hl1.png",
    parent5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-Im2Im2Im2Im2Im2Im2Im2Im2Im2.png",
    parent6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-Jn3Jn3Jn3Jn3Jn3Jn3Jn3Jn3Jn3.png",
  }
  return avatarMap[avatarId] || avatarMap["student1"]
}

const getSubjectDelta = (goal: number, result: number) => {
  const delta = result - goal
  if (delta > 0) return { value: `+${delta}`, color: "text-green-600", icon: TrendingUp }
  if (delta < 0) return { value: `${delta}`, color: "text-red-600", icon: TrendingDown }
  return { value: "±0", color: "text-gray-600", icon: Minus }
}

const getCourseOrder = (course: string) => {
  const order = { S: 4, C: 3, B: 2, A: 1 }
  return order[course as keyof typeof order] || 0
}

const isTestAchieved = (test: any) => {
  if (test.type === "合不合") {
    const goalCourseOrder = getCourseOrder(test.goal.course)
    const resultCourseOrder = getCourseOrder(test.result.course)
    return resultCourseOrder >= goalCourseOrder && test.result.class <= test.goal.class
  }
  return test.achieved
}

const displayedTests = testHistory.slice(0, 5)

const isAICoachingAvailable = () => {
  const now = new Date()
  const day = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = now.getHours()

  // Saturday 12:00 to Wednesday 23:59
  if (day === 6 && hour >= 12) return true // Saturday from 12:00
  if (day === 0) return true // Sunday all day
  if (day >= 1 && day <= 3) return true // Monday to Wednesday all day
  if (day === 4 && hour < 0) return true // Thursday before midnight (never true, but for completeness)

  return false
}

export default function ReflectPage() {
  const [showAIChat, setShowAIChat] = useState(false)
  const [activeTab, setActiveTab] = useState("history")
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [expandedCoaching, setExpandedCoaching] = useState<Set<number>>(new Set())
  const [subjectFilter, setSubjectFilter] = useState("全科目")
  const [periodFilter, setPeriodFilter] = useState("1ヶ月")
  const [sortBy, setSortBy] = useState("記録日時")
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

  if (showAIChat) {
    return <AICoachChat onClose={() => setShowAIChat(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      <div className="bg-gradient-to-r from-card/95 to-card/90 backdrop-blur-md border-b border-border/30 shadow-lg">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                リフレクト
              </h1>
              <p className="text-base text-muted-foreground font-medium">
                1週間の学習を振り返り、成長の軌跡を確認しましょう
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">今週の振り返り</div>
              <div className="text-2xl font-bold text-primary">進行中</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {isAICoachingAvailable() && (
          <Card className="mb-8 bg-gradient-to-r from-primary/8 via-accent/8 to-primary/8 border-primary/20 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 animate-pulse" />
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <Avatar className="w-16 h-16 border-4 border-white/60 shadow-xl relative z-10">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback className="bg-primary text-white font-bold text-xl">AI</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -right-2 z-20">
                      <Sparkles className="h-6 w-6 text-accent animate-bounce" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-2xl text-foreground">AIコーチング</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      土曜日12時〜水曜日23時59分限定！
                      <br />
                      1週間の学習を一緒に振り返り、成長をサポートします
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent/20 text-accent border-accent/30 font-medium">土曜日限定</Badge>
                      <Badge className="bg-primary/20 text-primary border-primary/30 font-medium">GROWモデル</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAIChat(true)}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  週間振り返りを始める
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-card/60 backdrop-blur-sm border border-border/30 shadow-lg p-2 rounded-xl">
            <TabsTrigger
              value="history"
              className="flex items-center gap-3 data-[state=active]:bg-primary data-[state=active]:text-white font-medium px-6 py-3 rounded-lg transition-all duration-300"
            >
              <History className="h-5 w-5" />
              学習履歴
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="flex items-center gap-3 data-[state=active]:bg-primary data-[state=active]:text-white font-medium px-6 py-3 rounded-lg transition-all duration-300"
            >
              <MessageCircle className="h-5 w-5" />
              応援メッセージ
            </TabsTrigger>
            <TabsTrigger
              value="coaching"
              className="flex items-center gap-3 data-[state=active]:bg-primary data-[state=active]:text-white font-medium px-6 py-3 rounded-lg transition-all duration-300"
            >
              <Headphones className="h-5 w-5" />
              コーチング履歴
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/30 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                    <History className="h-6 w-6 text-primary" />
                  </div>
                  スパーク機能で記録した学習履歴
                </CardTitle>
                <p className="text-muted-foreground">日々の学習記録を時系列で確認できます</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {sparkLearningHistory.map((record, index) => (
                    <div
                      key={index}
                      className="p-6 rounded-xl bg-gradient-to-r from-background/90 to-muted/30 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>記録日時: {record.recordedAt}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary text-lg">学習回: {record.studySession}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${levelColors[record.level as keyof typeof levelColors].bg} ${levelColors[record.level as keyof typeof levelColors].text} ${levelColors[record.level as keyof typeof levelColors].border} font-medium`}
                          >
                            {record.level}
                          </Badge>
                        </div>
                      </div>

                      <div className="mb-4">
                        <Badge
                          className={`${subjectColors[record.subject as keyof typeof subjectColors].bg} ${subjectColors[record.subject as keyof typeof subjectColors].text} ${subjectColors[record.subject as keyof typeof subjectColors].border} text-base px-4 py-2 font-semibold`}
                        >
                          {record.subject}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">学習内容</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {record.learningContent.map((content) => (
                            <Badge
                              key={content}
                              variant="outline"
                              className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border} text-xs px-3 py-1`}
                            >
                              {content}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">正答率</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary">{record.correctRate}%</span>
                            <span className="text-sm text-muted-foreground">
                              ({record.correctAnswers}/{record.totalQuestions}問正解)
                            </span>
                          </div>
                          <div className="flex-1 bg-muted rounded-full h-2.5">
                            <div
                              className="bg-primary rounded-full h-2.5 transition-all duration-300"
                              style={{ width: `${record.correctRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">理解度</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{record.understandingEmoji}</span>
                          <span className="font-medium text-lg">{record.understanding}</span>
                        </div>
                      </div>

                      {record.reflection && (
                        <div className="p-3 bg-background/70 rounded-lg border border-border/30">
                          <div className="text-xs text-muted-foreground mb-1">今日の振り返り</div>
                          <p className="text-sm text-foreground leading-relaxed">{record.reflection}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/30 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                    <MessageCircle className="h-6 w-6 text-accent" />
                  </div>
                  応援メッセージ
                </CardTitle>
                <p className="text-muted-foreground">保護者・指導者からの温かいメッセージを確認できます</p>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-6 mb-8 border border-border/30 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg text-foreground">フィルター・並び替え</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">科目</label>
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                        className="w-full px-4 py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                        className="w-full px-4 py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      >
                        <option value="記録日時">記録日時</option>
                        <option value="学習回">学習回</option>
                        <option value="正答率">正答率</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {filteredAndSortedMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-6 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 cursor-pointer hover:from-accent/10 hover:to-accent/15 transition-all duration-300 shadow-lg hover:shadow-xl"
                      onClick={() => toggleMessageExpansion(message.id)}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border-2 border-accent/30">
                          <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                          <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>記録日時: {message.recordedAt}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold text-lg text-foreground">{message.from}</span>
                            <Badge
                              variant={message.type === "parent" ? "secondary" : "default"}
                              className="text-xs font-medium"
                            >
                              {message.type === "parent" ? "保護者" : "指導者"}
                            </Badge>
                          </div>
                          <div className="mb-3">
                            <p className="text-base text-foreground bg-background/70 p-4 rounded-lg border border-border/30 leading-relaxed">
                              {message.message}
                            </p>
                          </div>

                          {expandedMessages.has(message.id) && (
                            <div className="mt-4 pt-4 border-t border-accent/20 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                      variant="outline"
                                      className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border} text-xs px-3 py-1`}
                                    >
                                      {content}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-2">正答率</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-primary">{message.correctRate}%</span>
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
                              </div>

                              {message.reflection && (
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">今日の振り返り</div>
                                  <p className="text-base text-foreground bg-background/70 p-3 rounded-lg border border-border/30 leading-relaxed">
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
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                    <Headphones className="h-6 w-6 text-accent" />
                  </div>
                  コーチング履歴
                </CardTitle>
                <p className="text-muted-foreground">
                  過去のAIコーチングの会話記録を時系列で表示し、成長の軌跡を可視化します
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-6 mb-8 border border-border/30 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg text-foreground">期間フィルター</span>
                  </div>
                  <select
                    value={coachingPeriodFilter}
                    onChange={(e) => setCoachingPeriodFilter(e.target.value)}
                    className="w-full md:w-auto px-4 py-3 text-sm border border-border/40 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  >
                    <option value="1週間">1週間</option>
                    <option value="1ヶ月">1ヶ月</option>
                    <option value="全て">全て</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {filteredCoachingHistory.map((session, index) => (
                    <div
                      key={index}
                      className="p-6 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">記録日時: {session.date}</span>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">{session.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
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
                          <Avatar className="h-10 w-10 border-2 border-accent/30">
                            <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt={session.coach} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{session.coach}</span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Brain className="h-5 w-5 text-primary" />
                          <span className="text-lg font-bold text-foreground">コーチングサマリー（GROWモデル）</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Target className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-bold text-green-700">Goal（目標）</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{session.growSummary.goal}</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Eye className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-bold text-blue-700">Reality（現実）</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{session.growSummary.reality}</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb className="h-5 w-5 text-orange-600" />
                              <span className="text-sm font-bold text-orange-700">Options（選択肢）</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{session.growSummary.options}</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-5 w-5 text-purple-600" />
                              <span className="text-sm font-bold text-purple-700">Will（意志・行動）</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{session.growSummary.will}</p>
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
