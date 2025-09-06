"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Users,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Send,
  CheckCircle,
  Clock,
  Target,
  Bell,
  Sparkles,
  Edit3,
  PenTool,
  Heart,
  BarChart3,
} from "lucide-react"

import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

interface LearningRecord {
  id: string
  studentId: string
  studentName: string
  studentNickname: string
  studentAvatar: string
  subject: string
  understanding: string
  reflection: string
  timestamp: Date
  hoursAgo: number
  hasParentResponse: boolean
  hasCoachResponse: boolean
  priority: "urgent" | "important" | "normal"
}

interface Student {
  id: string
  name: string
  nickname: string
  avatar: string
  class: string
  streak: number
  weeklyProgress: number
  weeklyGoal: number
  lastActivity: string
  todayStatus: "completed" | "in-progress" | "not-started"
  needsAttention: boolean
  recentScore: number
  subjects: string[]
  lastMessage: string
  parentResponse: boolean
  parentEngagement: "high" | "medium" | "low"
  parentResponseCount: number
  lastLearningDate: Date
  understandingTrend: "up" | "stable" | "down"
  unresponded: number
}

// Mock student data with enhanced structure
const students: Student[] = [
  {
    id: "student1",
    name: "田中太郎",
    nickname: "たんじろう",
    avatar: "student1",
    class: "6A",
    streak: 7,
    weeklyProgress: 5,
    weeklyGoal: 5,
    lastActivity: "2時間前",
    todayStatus: "completed",
    needsAttention: false,
    recentScore: 85,
    subjects: ["算数", "国語"],
    lastMessage: "2024-08-14",
    parentResponse: true,
    parentEngagement: "high",
    parentResponseCount: 8,
    lastLearningDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    understandingTrend: "up",
    unresponded: 0,
  },
  {
    id: "student2",
    name: "佐藤花子",
    nickname: "はなちゃん",
    avatar: "student2",
    class: "6A",
    streak: 3,
    weeklyProgress: 3,
    weeklyGoal: 5,
    lastActivity: "5時間前",
    todayStatus: "in-progress",
    needsAttention: false,
    recentScore: 92,
    subjects: ["理科", "社会"],
    lastMessage: "2024-08-13",
    parentResponse: true,
    parentEngagement: "medium",
    parentResponseCount: 4,
    lastLearningDate: new Date(Date.now() - 5 * 60 * 60 * 1000),
    understandingTrend: "stable",
    unresponded: 1,
  },
  {
    id: "student3",
    name: "鈴木次郎",
    nickname: "じろう",
    avatar: "student3",
    class: "6B",
    streak: 1,
    weeklyProgress: 2,
    weeklyGoal: 5,
    lastActivity: "1日前",
    todayStatus: "not-started",
    needsAttention: true,
    recentScore: 68,
    subjects: ["算数"],
    lastMessage: "2024-08-12",
    parentResponse: false,
    parentEngagement: "low",
    parentResponseCount: 1,
    lastLearningDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    understandingTrend: "down",
    unresponded: 3,
  },
  {
    id: "student4",
    name: "高橋美咲",
    nickname: "みさき",
    avatar: "student4",
    class: "6B",
    streak: 12,
    weeklyProgress: 5,
    weeklyGoal: 5,
    lastActivity: "30分前",
    todayStatus: "completed",
    needsAttention: false,
    recentScore: 96,
    subjects: ["算数", "国語", "理科"],
    lastMessage: "2024-08-14",
    parentResponse: true,
    parentEngagement: "high",
    parentResponseCount: 12,
    lastLearningDate: new Date(Date.now() - 30 * 60 * 1000),
    understandingTrend: "up",
    unresponded: 0,
  },
]

const unrespondedRecords: LearningRecord[] = [
  {
    id: "record1",
    studentId: "student3",
    studentName: "鈴木次郎",
    studentNickname: "じろう",
    studentAvatar: "student3",
    subject: "算数",
    understanding: "😟ちょっと不安",
    reflection: "分数の計算が難しかったです。約分のところでよく間違えてしまいます。",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
    hoursAgo: 18,
    hasParentResponse: false,
    hasCoachResponse: false,
    priority: "urgent",
  },
  {
    id: "record2",
    studentId: "student2",
    studentName: "佐藤花子",
    studentNickname: "はなちゃん",
    studentAvatar: "student2",
    subject: "理科",
    understanding: "😐ふつう",
    reflection: "植物の光合成について学習しました。実験の結果が面白かったです。",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    hoursAgo: 8,
    hasParentResponse: true,
    hasCoachResponse: false,
    priority: "important",
  },
  {
    id: "record3",
    studentId: "student1",
    studentName: "田中太郎",
    studentNickname: "たんじろう",
    studentAvatar: "student1",
    subject: "国語",
    understanding: "😄バッチリ理解",
    reflection: "漢字の読み方がよく分かりました。特に熟語の意味が理解できて嬉しいです。",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    hoursAgo: 4,
    hasParentResponse: true,
    hasCoachResponse: false,
    priority: "normal",
  },
]

interface ParentEngagementMetrics {
  studentId: string
  studentName: string
  weeklyResponseCount: number
  responseRate: number // 応援数/記録数
  averageResponseTime: number // 時間単位
  messageTypes: {
    aiSuggested: number
    freeForm: number
  }
  childReactionRate: number // 既読率
  lastResponseDate: Date
  alerts: {
    noResponseFor3Days: boolean
    lowResponseRate: boolean // 30%以下
    childNeedsHelp: boolean
  }
}

const parentEngagementData: ParentEngagementMetrics[] = [
  {
    studentId: "student1",
    studentName: "田中太郎",
    weeklyResponseCount: 8,
    responseRate: 0.89,
    averageResponseTime: 2.5,
    messageTypes: { aiSuggested: 5, freeForm: 3 },
    childReactionRate: 0.95,
    lastResponseDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    alerts: { noResponseFor3Days: false, lowResponseRate: false, childNeedsHelp: false },
  },
  {
    studentId: "student2",
    studentName: "佐藤花子",
    weeklyResponseCount: 4,
    responseRate: 0.67,
    averageResponseTime: 4.2,
    messageTypes: { aiSuggested: 3, freeForm: 1 },
    childReactionRate: 0.75,
    lastResponseDate: new Date(Date.now() - 8 * 60 * 60 * 1000),
    alerts: { noResponseFor3Days: false, lowResponseRate: false, childNeedsHelp: false },
  },
  {
    studentId: "student3",
    studentName: "鈴木次郎",
    weeklyResponseCount: 1,
    responseRate: 0.25,
    averageResponseTime: 12.5,
    messageTypes: { aiSuggested: 1, freeForm: 0 },
    childReactionRate: 0.5,
    lastResponseDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    alerts: { noResponseFor3Days: true, lowResponseRate: true, childNeedsHelp: true },
  },
  {
    studentId: "student4",
    studentName: "高橋美咲",
    weeklyResponseCount: 12,
    responseRate: 0.92,
    averageResponseTime: 1.8,
    messageTypes: { aiSuggested: 7, freeForm: 5 },
    childReactionRate: 0.98,
    lastResponseDate: new Date(Date.now() - 30 * 60 * 1000),
    alerts: { noResponseFor3Days: false, lowResponseRate: false, childNeedsHelp: false },
  },
]

interface AIResponsePattern {
  type: "celebrate" | "insight" | "nextstep"
  title: string
  message: string
}

const statusColors = {
  completed: "bg-green-100 text-green-800 border-green-200",
  "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "not-started": "bg-red-100 text-red-800 border-red-200",
}

const statusLabels = {
  completed: "完了",
  "in-progress": "学習中",
  "not-started": "未開始",
}

const priorityColors = {
  urgent: "border-l-red-500 bg-red-50",
  important: "border-l-orange-500 bg-orange-50",
  normal: "border-l-blue-500 bg-blue-50",
}

const engagementColors = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
}

const engagementLabels = {
  high: "高",
  medium: "中",
  low: "低",
}

const quickMessages = ["今日も素晴らしい一日を！", "頑張っていますね！", "明日も一緒に頑張りましょう！"]

export default function CoachDashboard() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [filterClass, setFilterClass] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("unresponded")
  const [bulkMessage, setBulkMessage] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedRecord, setSelectedRecord] = useState<LearningRecord | null>(null)
  const [responseType, setResponseType] = useState<"ai-select" | "ai-edit" | "free">("ai-select")
  const [aiPatterns, setAiPatterns] = useState<AIResponsePattern[]>([])
  const [customResponse, setCustomResponse] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const parentEngagementSummary = {
    totalParents: parentEngagementData.length,
    highEngagement: parentEngagementData.filter((p) => p.responseRate >= 0.8).length,
    mediumEngagement: parentEngagementData.filter((p) => p.responseRate >= 0.5 && p.responseRate < 0.8).length,
    lowEngagement: parentEngagementData.filter((p) => p.responseRate < 0.5).length,
    alertsCount: parentEngagementData.filter(
      (p) => p.alerts.noResponseFor3Days || p.alerts.lowResponseRate || p.alerts.childNeedsHelp,
    ).length,
    averageResponseRate: parentEngagementData.reduce((sum, p) => sum + p.responseRate, 0) / parentEngagementData.length,
    averageResponseTime:
      parentEngagementData.reduce((sum, p) => sum + p.averageResponseTime, 0) / parentEngagementData.length,
  }

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const generateAIPatterns = async (record: LearningRecord) => {
    setIsGeneratingAI(true)

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const student = students.find((s) => s.id === record.studentId)

    const patterns: AIResponsePattern[] = [
      {
        type: "celebrate",
        title: "成果を称える",
        message: `${record.studentNickname}さん、${record.subject}の学習お疲れさまでした！${record.understanding.includes("バッチリ") ? "完璧な理解ですね。" : record.understanding.includes("ふつう") ? "しっかりと取り組めていますね。" : "難しい内容にもチャレンジしていて立派です。"}継続して頑張っている姿勢が素晴らしいです。`,
      },
      {
        type: "insight",
        title: "学習への気づき",
        message: `${record.reflection}という振り返り、とても良い観察ですね。${record.subject}では${record.understanding.includes("不安") ? "苦手な部分を明確にできているのが成長の証拠です。" : "理解が深まってきているのが分かります。"}この調子で自分の学習を見つめ続けてください。`,
      },
      {
        type: "nextstep",
        title: "次のステップ提案",
        message: `${record.studentNickname}さんの${record.subject}の取り組み、${student?.streak}日連続の学習習慣が身についていますね。${record.understanding.includes("不安") ? "次は基礎問題を3問だけ復習してみましょう。" : record.understanding.includes("ふつう") ? "応用問題にも挑戦してみる準備ができていそうです。" : "今の理解度なら、さらに発展的な内容も楽しめそうですね。"}`,
      },
    ]

    setAiPatterns(patterns)
    setIsGeneratingAI(false)
  }

  const getSortedStudents = (students: Student[]) => {
    const filtered = students.filter((student) => {
      if (filterClass !== "all" && student.class !== filterClass) return false
      if (filterStatus !== "all" && student.todayStatus !== filterStatus) return false
      return true
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "unresponded":
          return b.unresponded - a.unresponded
        case "parent-engagement":
          const engagementOrder = { low: 0, medium: 1, high: 2 }
          return engagementOrder[a.parentEngagement] - engagementOrder[b.parentEngagement]
        case "last-activity":
          return a.lastLearningDate.getTime() - b.lastLearningDate.getTime()
        case "attention":
          return (b.needsAttention ? 1 : 0) - (a.needsAttention ? 1 : 0)
        default:
          return 0
      }
    })
  }

  const filteredStudents = getSortedStudents(students)
  const needsAttentionCount = students.filter((s) => s.needsAttention).length
  const completedTodayCount = students.filter((s) => s.todayStatus === "completed").length
  const noParentResponseCount = students.filter((s) => !s.parentResponse).length
  const totalUnresponded = unrespondedRecords.length
  const urgentCount = unrespondedRecords.filter((r) => r.priority === "urgent").length

  const handleSendResponse = async (record: LearningRecord, message: string) => {
    console.log("Sending coach response:", {
      recordId: record.id,
      studentId: record.studentId,
      message,
      type: responseType,
    })

    // Update the record as responded
    const recordIndex = unrespondedRecords.findIndex((r) => r.id === record.id)
    if (recordIndex !== -1) {
      unrespondedRecords[recordIndex].hasCoachResponse = true
    }

    // Update student unresponded count
    const student = students.find((s) => s.id === record.studentId)
    if (student && student.unresponded > 0) {
      student.unresponded -= 1
    }

    alert(`${record.studentNickname}さんに応援メッセージを送信しました！`)
    setSelectedRecord(null)
    setCustomResponse("")
    setAiPatterns([])
  }

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, studentId])
    } else {
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map((s) => s.id))
    } else {
      setSelectedStudents([])
    }
  }

  const handleSendBulkMessage = () => {
    if (selectedStudents.length === 0 || !bulkMessage.trim()) return

    console.log("Sending bulk message:", {
      students: selectedStudents,
      message: bulkMessage,
    })

    alert(`${selectedStudents.length}名の生徒にメッセージを送信しました！`)
    setBulkMessage("")
    setSelectedStudents([])
  }

  const handleQuickMessage = (message: string) => {
    if (selectedStudents.length === 0) return

    console.log("Sending quick message:", {
      students: selectedStudents,
      message,
    })

    alert(`${selectedStudents.length}名の生徒にメッセージを送信しました！`)
    setSelectedStudents([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            指導者ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">生徒の学習状況を管理し、効果的なサポートを提供</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Bell className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{totalUnresponded}</div>
                  <div className="text-sm text-muted-foreground">未応援記録</div>
                  {urgentCount > 0 && <div className="text-xs text-red-600">緊急: {urgentCount}件</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{students.length}</div>
                  <div className="text-sm text-muted-foreground">総生徒数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{completedTodayCount}</div>
                  <div className="text-sm text-muted-foreground">今日完了</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{needsAttentionCount}</div>
                  <div className="text-sm text-muted-foreground">要注意</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{noParentResponseCount}</div>
                  <div className="text-sm text-muted-foreground">保護者低関与</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">生徒一覧</TabsTrigger>
            <TabsTrigger value="unresponded" className="relative">
              未応援記録
              {totalUnresponded > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">{totalUnresponded}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback">一括応援</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
            {/*  保護者連携タブを追加 */}
            <TabsTrigger value="parent-engagement" className="relative">
              保護者連携
              {parentEngagementSummary.alertsCount > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5">
                  {parentEngagementSummary.alertsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Student Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="クラス" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全クラス</SelectItem>
                        <SelectItem value="6A">6A</SelectItem>
                        <SelectItem value="6B">6B</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="状態" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全状態</SelectItem>
                        <SelectItem value="completed">完了</SelectItem>
                        <SelectItem value="in-progress">学習中</SelectItem>
                        <SelectItem value="not-started">未開始</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="並び順" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unresponded">未応援の多い順</SelectItem>
                        <SelectItem value="parent-engagement">保護者関与度の低い順</SelectItem>
                        <SelectItem value="last-activity">最終学習日時順</SelectItem>
                        <SelectItem value="attention">要注意度順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents(filteredStudents.map((s) => s.id))
                        } else {
                          setSelectedStudents([])
                        }
                      }}
                    />
                    <span className="text-sm">全選択</span>
                    <span className="text-sm text-muted-foreground">({selectedStudents.length}名選択中)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>生徒一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedStudents.includes(student.id)
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background"
                      } ${student.needsAttention ? "border-l-4 border-l-red-500" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudents((prev) => [...prev, student.id])
                            } else {
                              setSelectedStudents((prev) => prev.filter((id) => id !== student.id))
                            }
                          }}
                        />

                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getAvatarSrc(student.avatar) || "/placeholder.svg"} alt={student.name} />
                          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-4">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">ニックネーム: {student.nickname}</div>
                            <div className="text-xs text-muted-foreground">{student.class}</div>
                          </div>

                          <div>
                            <Badge className={statusColors[student.todayStatus as keyof typeof statusColors]}>
                              {statusLabels[student.todayStatus as keyof typeof statusLabels]}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">{student.lastActivity}</div>
                          </div>

                          <div>
                            <div className="text-sm font-medium">連続{student.streak}日</div>
                            <div className="text-xs text-muted-foreground">
                              週間: {student.weeklyProgress}/{student.weeklyGoal}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs">理解度:</span>
                              {student.understandingTrend === "up" && <span className="text-green-600">↑</span>}
                              {student.understandingTrend === "stable" && <span className="text-gray-600">→</span>}
                              {student.understandingTrend === "down" && <span className="text-red-600">↓</span>}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium">スコア: {student.recentScore}%</div>
                            <div className="flex gap-1 mt-1">
                              {student.subjects.slice(0, 2).map((subject) => {
                                const subjectColors: { [key: string]: string } = {
                                  算数: "bg-blue-100 text-blue-800",
                                  国語: "bg-green-100 text-green-800",
                                  理科: "bg-purple-100 text-purple-800",
                                  社会: "bg-orange-100 text-orange-800",
                                }
                                return (
                                  <Badge
                                    key={subject}
                                    className={`text-xs ${subjectColors[subject] || "bg-gray-100 text-gray-800"}`}
                                  >
                                    {subject}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground">保護者関与度</div>
                            <Badge className={`text-xs ${engagementColors[student.parentEngagement]}`}>
                              {engagementLabels[student.parentEngagement]}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              今週: {student.parentResponseCount}回
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground">最終メッセージ</div>
                            <div className="text-sm">{student.lastMessage}</div>
                            {student.unresponded > 0 && (
                              <Badge className="bg-red-500 text-white text-xs mt-1">
                                未応援: {student.unresponded}件
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {student.needsAttention && (
                              <AlertTriangle className="h-4 w-4 text-red-500" title="要注意" />
                            )}
                            {!student.parentResponse && (
                              <Clock className="h-4 w-4 text-yellow-500" title="保護者未応答" />
                            )}
                            <Button size="sm" variant="outline">
                              詳細
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unresponded" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-red-500" />
                  未応援記録一覧
                  <Badge className="bg-red-500 text-white">
                    {unrespondedRecords.filter((r) => !r.hasCoachResponse).length}件
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {unrespondedRecords
                    .filter((r) => !r.hasCoachResponse)
                    .sort((a, b) => b.hoursAgo - a.hoursAgo)
                    .map((record) => (
                      <div
                        key={record.id}
                        className={`p-4 rounded-lg border-l-4 ${priorityColors[record.priority]} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={getAvatarSrc(record.studentAvatar) || "/placeholder.svg"}
                              alt={record.studentName}
                            />
                            <AvatarFallback>{record.studentName.charAt(0)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{record.studentName}</span>
                              <span className="text-sm text-muted-foreground">({record.studentNickname})</span>
                              <Badge variant="outline" className="text-xs">
                                {record.subject}
                              </Badge>
                              <Badge className="text-xs bg-gray-100 text-gray-800">{record.understanding}</Badge>
                              <span className="text-xs text-muted-foreground">{record.hoursAgo}時間前</span>
                              {record.hasParentResponse && (
                                <Badge className="text-xs bg-blue-100 text-blue-800">保護者応援済み</Badge>
                              )}
                            </div>

                            <div className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded">{record.reflection}</div>

                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedRecord(record)}
                                    className="bg-primary hover:bg-primary/90"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    応援する
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={getAvatarSrc(record.studentAvatar) || "/placeholder.svg"} />
                                        <AvatarFallback>{record.studentName.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {record.studentNickname}さんへの応援メッセージ
                                    </DialogTitle>
                                  </DialogHeader>

                                  <div className="space-y-4">
                                    <div className="bg-gray-50 p-3 rounded">
                                      <div className="text-sm font-medium mb-1">学習記録</div>
                                      <div className="text-sm text-gray-600">
                                        科目: {record.subject} | 理解度: {record.understanding}
                                      </div>
                                      <div className="text-sm mt-2">{record.reflection}</div>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex gap-2">
                                        <Button
                                          variant={responseType === "ai-select" ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => {
                                            setResponseType("ai-select")
                                            if (selectedRecord) generateAIPatterns(selectedRecord)
                                          }}
                                        >
                                          <Sparkles className="h-4 w-4 mr-1" />
                                          AI提案選択
                                        </Button>
                                        <Button
                                          variant={responseType === "ai-edit" ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => {
                                            setResponseType("ai-edit")
                                            if (selectedRecord) generateAIPatterns(selectedRecord)
                                          }}
                                        >
                                          <Edit3 className="h-4 w-4 mr-1" />
                                          AI提案編集
                                        </Button>
                                        <Button
                                          variant={responseType === "free" ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setResponseType("free")}
                                        >
                                          <PenTool className="h-4 w-4 mr-1" />
                                          自由記述
                                        </Button>
                                      </div>

                                      {responseType === "ai-select" && (
                                        <div className="space-y-3">
                                          {isGeneratingAI ? (
                                            <div className="text-center py-8">
                                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                              <div className="text-sm text-muted-foreground">
                                                AI応援メッセージを生成中...
                                              </div>
                                            </div>
                                          ) : (
                                            aiPatterns.map((pattern, index) => (
                                              <div
                                                key={index}
                                                className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                                              >
                                                <div className="font-medium text-sm mb-1">{pattern.title}</div>
                                                <div className="text-sm text-gray-700 mb-2">{pattern.message}</div>
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleSendResponse(record, pattern.message)}
                                                >
                                                  この応援を送信
                                                </Button>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}

                                      {responseType === "ai-edit" && (
                                        <div className="space-y-3">
                                          {isGeneratingAI ? (
                                            <div className="text-center py-8">
                                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                              <div className="text-sm text-muted-foreground">
                                                AI応援メッセージを生成中...
                                              </div>
                                            </div>
                                          ) : aiPatterns.length > 0 ? (
                                            <div>
                                              <div className="text-sm font-medium mb-2">AI提案を編集してください</div>
                                              <Textarea
                                                value={customResponse || aiPatterns[0]?.message || ""}
                                                onChange={(e) => setCustomResponse(e.target.value)}
                                                className="min-h-[100px]"
                                                maxLength={400}
                                              />
                                              <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                  {(customResponse || aiPatterns[0]?.message || "").length}/400文字
                                                </span>
                                                <Button
                                                  onClick={() =>
                                                    handleSendResponse(
                                                      record,
                                                      customResponse || aiPatterns[0]?.message || "",
                                                    )
                                                  }
                                                  disabled={!(customResponse || aiPatterns[0]?.message)}
                                                >
                                                  応援を送信
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <Button onClick={() => generateAIPatterns(record)}>AI提案を生成</Button>
                                          )}
                                        </div>
                                      )}

                                      {responseType === "free" && (
                                        <div>
                                          <div className="text-sm font-medium mb-2">自由に応援メッセージを作成</div>
                                          <Textarea
                                            value={customResponse}
                                            onChange={(e) => setCustomResponse(e.target.value)}
                                            placeholder={`${record.studentNickname}さんへの応援メッセージを入力してください...`}
                                            className="min-h-[120px]"
                                            maxLength={400}
                                          />
                                          <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs text-muted-foreground">
                                              {customResponse.length}/400文字
                                            </span>
                                            <Button
                                              onClick={() => handleSendResponse(record, customResponse)}
                                              disabled={!customResponse.trim()}
                                            >
                                              応援を送信
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button size="sm" variant="outline">
                                後で対応
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bulk Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    一括メッセージ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">選択中: {selectedStudents.length}名の生徒</div>

                  <Textarea
                    placeholder="生徒たちへのメッセージを入力してください..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    className="min-h-[120px]"
                    maxLength={300}
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{bulkMessage.length}/300文字</span>
                    <Button
                      onClick={handleSendBulkMessage}
                      disabled={selectedStudents.length === 0 || !bulkMessage.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      送信
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Messages */}
              <Card>
                <CardHeader>
                  <CardTitle>クイックメッセージ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-3">選択中: {selectedStudents.length}名の生徒</div>

                  {quickMessages.map((message, index) => (
                    <Button
                      key={index}
                      onClick={() => handleQuickMessage(message)}
                      disabled={selectedStudents.length === 0}
                      variant="outline"
                      className="w-full h-auto p-3 text-left justify-start"
                    >
                      <div className="flex items-start gap-2">
                        <Send className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{message}</span>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    クラス別進捗
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>6A (2名)</span>
                      <span className="font-medium">平均 88.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>6B (2名)</span>
                      <span className="font-medium">平均 82.0%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    今週の目標達成率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">75%</div>
                    <div className="text-sm text-muted-foreground">3/4名が目標達成</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/*  保護者連携タブの内容を追加 */}
          <TabsContent value="parent-engagement" className="space-y-6">
            {/* 保護者関与度サマリー */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{parentEngagementSummary.highEngagement}</div>
                      <div className="text-sm text-muted-foreground">高関与保護者</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(parentEngagementSummary.averageResponseRate * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">平均応援率</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(parentEngagementSummary.averageResponseTime * 10) / 10}h
                      </div>
                      <div className="text-sm text-muted-foreground">平均応答時間</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{parentEngagementSummary.alertsCount}</div>
                      <div className="text-sm text-muted-foreground">要注意保護者</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 保護者関与度詳細リスト */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  保護者関与度ダッシュボード
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parentEngagementData.map((parent) => (
                    <div key={parent.studentId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{parent.studentName}</div>
                          {(parent.alerts.noResponseFor3Days ||
                            parent.alerts.lowResponseRate ||
                            parent.alerts.childNeedsHelp) && (
                            <div className="flex gap-1">
                              {parent.alerts.noResponseFor3Days && (
                                <Badge className="bg-red-100 text-red-800 text-xs">3日間応援なし</Badge>
                              )}
                              {parent.alerts.lowResponseRate && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">応援率30%以下</Badge>
                              )}
                              {parent.alerts.childNeedsHelp && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  子どもが助けを求めている
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          保護者に連絡
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">応援回数/週</div>
                          <div className="font-medium">{parent.weeklyResponseCount}回</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">応援率</div>
                          <div className="font-medium">{Math.round(parent.responseRate * 100)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">平均応答時間</div>
                          <div className="font-medium">{parent.averageResponseTime}時間</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">AI提案/自由記述</div>
                          <div className="font-medium">
                            {parent.messageTypes.aiSuggested}/{parent.messageTypes.freeForm}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">子どもの反応率</div>
                          <div className="font-medium">{Math.round(parent.childReactionRate * 100)}%</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          最終応援:{" "}
                          {parent.lastResponseDate.toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            応援履歴
                          </Button>
                          <Button size="sm" variant="outline">
                            効果分析
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 保護者サポート機能 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">状況共有</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">保護者応援が少ない場合の通知機能</div>
                    <Button className="w-full bg-transparent" variant="outline">
                      保護者に状況を共有
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">役割分担</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">保護者/指導者の応援バランス表示</div>
                    <div className="text-xs">
                      保護者: {Math.round(parentEngagementSummary.averageResponseRate * 100)}% / 指導者: 85%
                    </div>
                    <Button className="w-full bg-transparent" variant="outline">
                      バランス調整
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">効果分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">保護者応援と成績の相関表示</div>
                    <div className="text-xs text-green-600">相関係数: +0.73 (強い正の相関)</div>
                    <Button className="w-full bg-transparent" variant="outline">
                      詳細レポート
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/*  existing code ... */}
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
