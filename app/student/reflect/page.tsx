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
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            リフレクト
          </h1>
          <p className="text-sm text-muted-foreground">1週間の学習を振り返り、仲間との交流</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* AI Coach Button (Saturday 12:00 to Wednesday 23:59) */}
        {isAICoachingAvailable() && (
          <Card className="mb-6 bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 border-accent/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-primary/5 animate-pulse" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="h-4 w-4 text-accent animate-bounce" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AIコーチング</h3>
                    <p className="text-sm text-muted-foreground">
                      土曜日12時〜水曜日23時59分限定！1週間の学習を一緒に振り返ろう
                    </p>
                    <Badge className="mt-1 bg-accent/20 text-accent border-accent/30 text-xs">土曜日限定</Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAIChat(true)}
                  className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white font-medium px-6 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  週間振り返りを始める
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              学習履歴
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              応援メッセージ
            </TabsTrigger>
            <TabsTrigger value="coaching" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              コーチング履歴
            </TabsTrigger>
          </TabsList>

          {/* Learning History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  スパーク機能で記録した学習履歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sparkLearningHistory.map((record, index) => (
                    <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>記録日時: {record.recordedAt}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary">学習回: {record.studySession}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${levelColors[record.level as keyof typeof levelColors].bg} ${levelColors[record.level as keyof typeof levelColors].text} ${levelColors[record.level as keyof typeof levelColors].border}`}
                          >
                            {record.level}
                          </Badge>
                        </div>
                      </div>

                      <div className="mb-3">
                        <Badge
                          className={`${subjectColors[record.subject as keyof typeof subjectColors].bg} ${subjectColors[record.subject as keyof typeof subjectColors].text} ${subjectColors[record.subject as keyof typeof subjectColors].border} text-base px-3 py-1`}
                        >
                          {record.subject}
                        </Badge>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">学習内容</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {record.learningContent.map((content) => (
                            <Badge
                              key={content}
                              variant="outline"
                              className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border}`}
                            >
                              {content}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">正答率</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-primary">{record.correctRate}%</span>
                            <span className="text-sm text-muted-foreground">
                              ({record.correctAnswers}/{record.totalQuestions}問正解)
                            </span>
                          </div>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all duration-300"
                              style={{ width: `${record.correctRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">理解度</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{record.understandingEmoji}</span>
                          <span className="font-medium">{record.understanding}</span>
                        </div>
                      </div>

                      {record.reflection && (
                        <div className="p-3 bg-background rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">今日の振り返り</div>
                          <p className="text-sm">{record.reflection}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Encouragement Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  応援メッセージ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">科目:</span>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="px-3 py-1 text-sm border rounded-md bg-background"
                    >
                      <option value="全科目">全科目</option>
                      <option value="算数">算数</option>
                      <option value="国語">国語</option>
                      <option value="理科">理科</option>
                      <option value="社会">社会</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">期間:</span>
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="px-3 py-1 text-sm border rounded-md bg-background"
                    >
                      <option value="1週間">1週間</option>
                      <option value="1ヶ月">1ヶ月</option>
                      <option value="全て">全て</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">並び替え:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-1 text-sm border rounded-md bg-background"
                    >
                      <option value="記録日時">記録日時</option>
                      <option value="学習回">学習回</option>
                      <option value="正答率">正答率</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 rounded-lg bg-accent/5 border border-accent/10 cursor-pointer hover:bg-accent/10 transition-colors"
                      onClick={() => toggleMessageExpansion(message.id)}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                          <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">記録日時: {message.recordedAt}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{message.from}</span>
                            <Badge variant={message.type === "parent" ? "secondary" : "default"} className="text-xs">
                              {message.type === "parent" ? "保護者" : "指導者"}
                            </Badge>
                          </div>
                          <div className="mb-3">
                            <div className="text-sm font-medium text-muted-foreground mb-1">表示内容</div>
                            <p className="text-sm text-foreground bg-background p-3 rounded-lg">{message.message}</p>
                          </div>

                          {expandedMessages.has(message.id) && (
                            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">学習回</div>
                                  <span className="text-sm">{message.studySession}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">科目</div>
                                  <Badge
                                    className={`${subjectColors[message.subject as keyof typeof subjectColors].bg} ${subjectColors[message.subject as keyof typeof subjectColors].text} ${subjectColors[message.subject as keyof typeof subjectColors].border}`}
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
                                      className={`${learningContentColors[content as keyof typeof learningContentColors].bg} ${learningContentColors[content as keyof typeof learningContentColors].text} ${learningContentColors[content as keyof typeof learningContentColors].border}`}
                                    >
                                      {content}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-2">正答率</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <span className="text-lg font-bold text-primary">{message.correctRate}%</span>
                                    <span className="text-sm text-muted-foreground">
                                      ({message.correctAnswers}/{message.totalQuestions}問正解)
                                    </span>
                                  </div>
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2 transition-all duration-300"
                                      style={{ width: `${message.correctRate}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {message.reflection && (
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">今日の振り返り</div>
                                  <p className="text-sm bg-background p-3 rounded-lg">{message.reflection}</p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-2 text-xs text-muted-foreground">
                            {expandedMessages.has(message.id) ? "クリックして詳細を閉じる" : "クリックして詳細を表示"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coaching History Tab */}
          <TabsContent value="coaching" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-accent" />
                  コーチング履歴
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  過去のAIコーチングの会話記録を時系列で表示し、成長の軌跡を可視化
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">期間:</span>
                    <select
                      value={coachingPeriodFilter}
                      onChange={(e) => setCoachingPeriodFilter(e.target.value)}
                      className="px-3 py-1 text-sm border rounded-md bg-background"
                    >
                      <option value="1週間">1週間</option>
                      <option value="1ヶ月">1ヶ月</option>
                      <option value="全て">全て</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredCoachingHistory.map((session, index) => (
                    <div key={index} className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">記録日時: {session.date}</span>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">{session.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${weekTypeColors[session.weekType as keyof typeof weekTypeColors].bg} ${weekTypeColors[session.weekType as keyof typeof weekTypeColors].text} ${weekTypeColors[session.weekType as keyof typeof weekTypeColors].border}`}
                            >
                              {session.weekType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {session.duration}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {session.turnCount}往復
                            </Badge>
                            <Badge
                              className={`${levelColors[session.level as keyof typeof levelColors].bg} ${levelColors[session.level as keyof typeof levelColors].text} ${levelColors[session.level as keyof typeof levelColors].border}`}
                            >
                              {session.level}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt={session.coach} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{session.coach}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">コーチングサマリー（GROWモデル）</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-background rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">Goal（目標）</span>
                            </div>
                            <p className="text-sm text-foreground">{session.growSummary.goal}</p>
                          </div>
                          <div className="p-3 bg-background rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-medium text-blue-700">Reality（現実）</span>
                            </div>
                            <p className="text-sm text-foreground">{session.growSummary.reality}</p>
                          </div>
                          <div className="p-3 bg-background rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="h-4 w-4 text-orange-600" />
                              <span className="text-xs font-medium text-orange-700">Options（選択肢）</span>
                            </div>
                            <p className="text-sm text-foreground">{session.growSummary.options}</p>
                          </div>
                          <div className="p-3 bg-background rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-purple-600" />
                              <span className="text-xs font-medium text-purple-700">Will（意志・行動）</span>
                            </div>
                            <p className="text-sm text-foreground">{session.growSummary.will}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">話し合ったトピック</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {session.topics.map((topic, topicIndex) => (
                            <Badge key={topicIndex} variant="secondary" className="text-xs">
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
