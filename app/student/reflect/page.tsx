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
} from "lucide-react"

// Mock data
const sparkLearningHistory = [
  {
    recordedAt: "2024-09-06 20:30",
    studyDate: "2024-09-06",
    subject: "算数",
    learningContent: ["授業", "宿題"],
    understanding: "バッチリ理解",
    understandingEmoji: "😄",
    reflection: "図形問題が最初は難しかったけど、先生の説明でよく分かりました。宿題も全部解けました！",
    level: "Blaze",
  },
  {
    recordedAt: "2024-09-06 19:45",
    studyDate: "2024-09-06",
    subject: "国語",
    learningContent: ["授業", "週テスト・復習ナビ"],
    understanding: "できた",
    understandingEmoji: "😊",
    reflection: "漢字の読み方を復習しました。週テスト対策もできて良かったです。",
    level: "Flame",
  },
  {
    recordedAt: "2024-09-05 21:15",
    studyDate: "2024-09-05",
    subject: "理科",
    learningContent: ["宿題", "入試対策・過去問"],
    understanding: "ふつう",
    understandingEmoji: "😐",
    reflection: "実験の問題は理解できたけど、計算問題がまだ少し難しいです。",
    level: "Flame",
  },
  {
    recordedAt: "2024-09-05 20:00",
    studyDate: "2024-09-05",
    subject: "社会",
    learningContent: ["授業"],
    understanding: "ちょっと不安",
    understandingEmoji: "😟",
    reflection: "歴史の年号を覚えるのが大変でした。もう少し復習が必要です。",
    level: "Spark",
  },
  {
    recordedAt: "2024-09-04 19:30",
    studyDate: "2024-09-04",
    subject: "算数",
    learningContent: ["授業", "宿題", "週テスト・復習ナビ"],
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
    from: "お母さん",
    avatar: "parent1",
    message: "算数がんばったね！明日もファイト！",
    time: "今日 18:30",
    type: "parent",
  },
  {
    from: "田中先生",
    avatar: "coach",
    message: "理科の実験問題、よくできていました。この調子で続けましょう。",
    time: "今日 15:20",
    type: "teacher",
  },
  {
    from: "お父さん",
    avatar: "parent2",
    message: "毎日コツコツ続けているのが素晴らしい！",
    time: "昨日 20:15",
    type: "parent",
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
    type: "週間振り返り",
    duration: "15分",
    topics: ["算数の図形問題", "学習習慣の改善", "次週の目標設定"],
    summary:
      "図形問題の理解が深まってきています。毎日の学習習慣も定着してきているので、この調子で続けましょう。来週は理科の実験問題にも挑戦してみましょう。",
    coach: "AIコーチ",
    level: "Blaze",
  },
  {
    date: "2024-09-01",
    time: "19:30",
    type: "学習相談",
    duration: "12分",
    topics: ["国語の読解問題", "時間管理", "モチベーション向上"],
    summary:
      "読解問題で時間がかかりすぎる傾向があります。まずは問題文を素早く読み取る練習をしましょう。毎日少しずつでも続けることが大切です。",
    coach: "AIコーチ",
    level: "Flame",
  },
  {
    date: "2024-08-25",
    time: "18:15",
    type: "テスト振り返り",
    duration: "18分",
    topics: ["合不合判定テスト結果", "弱点分析", "改善計画"],
    summary:
      "テスト結果を詳しく分析しました。算数の計算ミスが目立つので、見直しの習慣をつけましょう。理科は良くできているので、この調子で続けてください。",
    coach: "AIコーチ",
    level: "Flame",
  },
  {
    date: "2024-08-18",
    time: "20:00",
    type: "学習計画相談",
    duration: "10分",
    topics: ["夏休み後の学習計画", "科目バランス", "目標設定"],
    summary:
      "夏休み明けの学習リズムを整えるための計画を立てました。各科目のバランスを考えて、無理のないペースで進めていきましょう。",
    coach: "AIコーチ",
    level: "Spark",
  },
  {
    date: "2024-08-11",
    time: "19:45",
    type: "週間振り返り",
    duration: "14分",
    topics: ["夏期講習の振り返り", "理解度確認", "次週の予定"],
    summary:
      "夏期講習での学習内容をしっかり振り返りました。特に社会の歴史分野で成長が見られます。来週からは復習に重点を置いて進めましょう。",
    coach: "AIコーチ",
    level: "Flame",
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

export default function ReflectPage() {
  const [showAIChat, setShowAIChat] = useState(false)
  const [activeTab, setActiveTab] = useState("history")

  const isAICoachingAvailable = () => {
    const now = new Date()
    const day = now.getDay() // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日
    const hour = now.getHours()
    const minute = now.getMinutes()

    // 土曜日12時以降
    if (day === 6 && hour >= 12) return true

    // 日曜日、月曜日、火曜日は終日
    if (day === 0 || day === 1 || day === 2) return true

    // 水曜日23時59分まで
    if (day === 3 && (hour < 23 || (hour === 23 && minute <= 59))) return true

    return false
  }

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
        {/* AI Coach Button (Weekend Only) */}
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
                  </div>
                </div>
                <Button
                  onClick={() => setShowAIChat(true)}
                  className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white font-medium px-6"
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
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">学習日: {record.studyDate}</span>
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
                          <div className="text-xs text-muted-foreground mb-1">振り返り</div>
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
                <div className="space-y-4">
                  {encouragementMessages.map((message, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-accent/5 border border-accent/10"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                        <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{message.from}</span>
                          <Badge variant={message.type === "parent" ? "secondary" : "default"} className="text-xs">
                            {message.type === "parent" ? "保護者" : "先生"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{message.time}</span>
                        </div>
                        <p className="text-sm text-foreground">{message.message}</p>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coachingHistory.map((session, index) => (
                    <div key={index} className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{session.date}</span>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">{session.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              {session.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {session.duration}
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

                      <div className="p-3 bg-background rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">コーチングサマリー</div>
                        <p className="text-sm">{session.summary}</p>
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
