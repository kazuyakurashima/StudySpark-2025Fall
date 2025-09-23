"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  AlertTriangle,
  Send,
  Target,
  Bell,
  ChevronDown,
  ChevronUp,
  Flame,
  RotateCcw,
  UserCheck,
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
  weekRing: number // 週リング（0-10）
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
  daysToTest: number // テストまでの日数
  mathMastered: boolean // 算数マスター状況
  untouchedSubjects: string[] // 未タッチ科目
  hoursWithoutRecord: number // 未記録時間
}

const students: Student[] = [
  {
    id: "student1",
    name: "田中太郎",
    nickname: "たんじろう",
    avatar: "student1",
    class: "6A",
    streak: 7,
    weekRing: 8.5,
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
    daysToTest: 5,
    mathMastered: true,
    untouchedSubjects: [],
    hoursWithoutRecord: 2,
  },
  {
    id: "student2",
    name: "佐藤花子",
    nickname: "はなちゃん",
    avatar: "student2",
    class: "6A",
    streak: 3,
    weekRing: 6.8,
    weeklyProgress: 3,
    weeklyGoal: 5,
    lastActivity: "5時間前",
    todayStatus: "in-progress",
    needsAttention: true,
    recentScore: 92,
    subjects: ["理科", "社会"],
    lastMessage: "2024-08-13",
    parentResponse: true,
    parentEngagement: "medium",
    parentResponseCount: 4,
    lastLearningDate: new Date(Date.now() - 5 * 60 * 60 * 1000),
    understandingTrend: "stable",
    unresponded: 1,
    daysToTest: 2,
    mathMastered: false,
    untouchedSubjects: ["算数"],
    hoursWithoutRecord: 5,
  },
  {
    id: "student3",
    name: "鈴木次郎",
    nickname: "じろう",
    avatar: "student3",
    class: "6B",
    streak: 1,
    weekRing: 4.2,
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
    lastLearningDate: new Date(Date.now() - 50 * 60 * 60 * 1000),
    understandingTrend: "down",
    unresponded: 3,
    daysToTest: 3,
    mathMastered: false,
    untouchedSubjects: ["国語", "理科"],
    hoursWithoutRecord: 50,
  },
  {
    id: "student4",
    name: "高橋美咲",
    nickname: "みさき",
    avatar: "student4",
    class: "6B",
    streak: 12,
    weekRing: 9.2,
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
    lastLearningDate: new Date(Date.now() - 30 * 60 * 60 * 1000),
    understandingTrend: "up",
    unresponded: 0,
    daysToTest: 7,
    mathMastered: true,
    untouchedSubjects: [],
    hoursWithoutRecord: 0.5,
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
  const [filterStatus, setFilterStatus] = useState<
    | "all"
    | "completed"
    | "in-progress"
    | "not-started"
    | "attention"
    | "low-parent-engagement"
    | "emergency"
    | "unrecorded48h"
    | "math-unmastered"
  >("all")
  const [sortBy, setSortBy] = useState("priority")
  const [bulkMessage, setBulkMessage] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedRecord, setSelectedRecord] = useState<LearningRecord | null>(null)
  const [responseType, setResponseType] = useState<"ai-select" | "ai-edit" | "free">("ai-select")
  const [aiPatterns, setAiPatterns] = useState<AIResponsePattern[]>([])
  const [customResponse, setCustomResponse] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [showSubKPIs, setShowSubKPIs] = useState(false)

  // 主KPI計算
  const emergencyCount = students.filter((s) => s.daysToTest <= 3 && s.weekRing < 6).length
  const unrecorded48hCount = students.filter((s) => s.hoursWithoutRecord >= 48).length
  const attentionCount = students.filter(
    (s) => (s.weekRing >= 6 && s.weekRing < 8) || !s.mathMastered || s.untouchedSubjects.length > 0,
  ).length

  // 副KPI計算
  const lowStreakCount = students.filter((s) => s.streak <= 2).length
  const parentUnreadCount = students.filter((s) => !s.parentResponse).length
  const weekRingMedian = students.map((s) => s.weekRing).sort((a, b) => a - b)[Math.floor(students.length / 2)]

  const getPriorityActions = () => {
    const actions = students
      .map((student) => {
        let priority = 0
        let reason = ""
        let action = ""
        let type: "emergency" | "unrecorded" | "attention" = "attention"

        // 緊急（最優先）
        if (student.daysToTest <= 3 && student.weekRing < 6) {
          priority = 100
          reason = `テスト${student.daysToTest}日前・週リング${student.weekRing}`
          action = "テスト対策の集中学習を提案"
          type = "emergency"
        }
        // 未記録48h（2番目）
        else if (student.hoursWithoutRecord >= 48) {
          priority = 90
          reason = `${Math.floor(student.hoursWithoutRecord)}時間未記録`
          action = "学習状況の確認と励ましメッセージ"
          type = "unrecorded"
        }
        // 要注意（3番目）
        else if (
          (student.weekRing >= 6 && student.weekRing < 8) ||
          !student.mathMastered ||
          student.untouchedSubjects.length > 0
        ) {
          priority = 80
          if (!student.mathMastered) {
            reason = "算数未マスター"
            action = "算数の基礎問題3問を提案"
          } else if (student.untouchedSubjects.length > 0) {
            reason = `未タッチ科目: ${student.untouchedSubjects.join(", ")}`
            action = "未学習科目の学習開始を促す"
          } else {
            reason = `週リング${student.weekRing}（要注意域）`
            action = "学習習慣の見直しを提案"
          }
          type = "attention"
        }

        return {
          studentId: student.id,
          studentName: student.name,
          studentNickname: student.nickname,
          studentAvatar: student.avatar,
          priority,
          reason,
          action,
          type,
          weekRing: student.weekRing,
        }
      })
      .filter((action) => action.priority > 0)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10) // 1日上位10件まで

    return actions
  }

  const priorityActions = getPriorityActions()

  const handleKPIClick = (kpiType: string) => {
    switch (kpiType) {
      case "emergency":
        setFilterStatus("emergency")
        break
      case "unrecorded48h":
        setFilterStatus("unrecorded48h")
        break
      case "attention":
        setFilterStatus("attention")
        break
      default:
        setFilterStatus("all")
    }
    setActiveTab("overview")
  }

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

      switch (filterStatus) {
        case "emergency":
          return student.daysToTest <= 3 && student.weekRing < 6
        case "unrecorded48h":
          return student.hoursWithoutRecord >= 48
        case "attention":
          return (
            (student.weekRing >= 6 && student.weekRing < 8) ||
            !student.mathMastered ||
            student.untouchedSubjects.length > 0
          )
        case "math-unmastered":
          return !student.mathMastered
        case "low-parent-engagement":
          return !student.parentResponse
        case "completed":
        case "in-progress":
        case "not-started":
          return student.todayStatus === filterStatus
        default:
          return true
      }
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          // 優先度順：緊急 > 未記録48h > 要注意
          const getPriorityScore = (s: Student) => {
            if (s.daysToTest <= 3 && s.weekRing < 6) return 100
            if (s.hoursWithoutRecord >= 48) return 90
            if ((s.weekRing >= 6 && s.weekRing < 8) || !s.mathMastered || s.untouchedSubjects.length > 0) return 80
            return 0
          }
          return getPriorityScore(b) - getPriorityScore(a)
        case "unresponded":
          return b.unresponded - a.unresponded
        case "parent-engagement":
          const engagementOrder = { low: 0, medium: 1, high: 2 }
          return engagementOrder[a.parentEngagement] - engagementOrder[b.parentEngagement]
        case "last-activity":
          return a.lastLearningDate.getTime() - b.lastLearningDate.getTime()
        case "week-ring":
          return a.weekRing - b.weekRing
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

  const handleStatCardClick = (cardType: string) => {
    switch (cardType) {
      case "unresponded":
        setActiveTab("unresponded")
        break
      case "total":
        setActiveTab("overview")
        setFilterClass("all")
        setFilterStatus("all")
        break
      case "completed":
        setActiveTab("overview")
        setFilterStatus("completed")
        break
      case "attention":
        setActiveTab("overview")
        setFilterClass("all")
        setFilterStatus("attention")
        setSortBy("attention")
        break
      case "parent-engagement":
        setActiveTab("overview")
        setFilterClass("all")
        setFilterStatus("low-parent-engagement")
        setSortBy("parent-engagement")
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      <div className="ai-coach-gradient-subtle backdrop-blur-sm border-b border-primary/30 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary status-glow" />
            指導者ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">毎日これだけ見れば動ける - 行動ファースト設計</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <Card className="ai-coach-gradient-subtle border-primary/30 shadow-xl ai-coach-glow">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">主KPI（毎日これだけ見れば動ける）</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubKPIs(!showSubKPIs)}
                  className="flex items-center gap-1 hover:bg-white/50"
                >
                  {showSubKPIs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  詳しく
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant={filterStatus === "emergency" ? "default" : "outline"}
                  onClick={() => handleKPIClick("emergency")}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    emergencyCount > 0 ? "border-red-500 text-red-700 hover:bg-red-50 shadow-lg" : ""
                  }`}
                >
                  <Flame className="h-4 w-4 status-glow" />🧯 緊急
                  <Badge className="bg-red-600 text-white ml-1 shadow-md">{emergencyCount}</Badge>
                </Button>

                <Button
                  variant={filterStatus === "unrecorded48h" ? "default" : "outline"}
                  onClick={() => handleKPIClick("unrecorded48h")}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    unrecorded48hCount > 0 ? "border-orange-500 text-orange-700 hover:bg-orange-50 shadow-lg" : ""
                  }`}
                >
                  <Bell className="h-4 w-4 status-glow" />🔔 未記録48h
                  <Badge className="bg-orange-600 text-white ml-1 shadow-md">{unrecorded48hCount}</Badge>
                </Button>

                <Button
                  variant={filterStatus === "attention" ? "default" : "outline"}
                  onClick={() => handleKPIClick("attention")}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    attentionCount > 0 ? "border-yellow-500 text-yellow-700 hover:bg-yellow-50 shadow-lg" : ""
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 status-glow" />⚠ 要注意
                  <Badge className="bg-yellow-600 text-white ml-1 shadow-md">{attentionCount}</Badge>
                </Button>
              </div>

              {showSubKPIs && (
                <div className="border-t border-white/30 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">副KPI（必要に応じて展開）</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 bg-white/50 rounded-lg p-3 shadow-sm">
                      <RotateCcw className="h-4 w-4 text-blue-500" />
                      <span>🔁 連続日2日以下: </span>
                      <Badge className="bg-slate-100 text-slate-700 shadow-sm">{lowStreakCount}名</Badge>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 rounded-lg p-3 shadow-sm">
                      <UserCheck className="h-4 w-4 text-purple-500" />
                      <span>👪 保護者未既読: </span>
                      <Badge className="bg-slate-100 text-slate-700 shadow-sm">{parentUnreadCount}名</Badge>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 rounded-lg p-3 shadow-sm">
                      <Target className="h-4 w-4 text-green-500" />
                      <span>🎯 今週リング中央値: </span>
                      <Badge className="bg-slate-100 text-slate-700 shadow-sm">{weekRingMedian.toFixed(1)}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {priorityActions.length > 0 && (
          <Card className="ai-coach-gradient-subtle border-primary/30 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary status-glow" />
                今日の優先アクション
                <Badge className="bg-primary/20 text-primary border-primary/30 shadow-md">
                  {priorityActions.length}/10
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">アラート予算: 1日上位10件まで・1生徒1日1アクション</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priorityActions.map((action, index) => (
                  <div
                    key={action.studentId}
                    className={`p-4 rounded-lg border-l-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
                      action.type === "emergency"
                        ? "border-l-red-500 bg-gradient-to-r from-red-50 to-red-50/50"
                        : action.type === "unrecorded"
                          ? "border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-50/50"
                          : "border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {action.type === "emergency" && <span className="text-lg animate-pulse">🧯</span>}
                          {action.type === "unrecorded" && <span className="text-lg animate-pulse">🔔</span>}
                          {action.type === "attention" && <span className="text-lg animate-pulse">⚠</span>}
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>
                        <Avatar className="h-8 w-8 border-2 border-white shadow-md">
                          <AvatarImage
                            src={getAvatarSrc(action.studentAvatar) || "/placeholder.svg"}
                            alt={action.studentName}
                          />
                          <AvatarFallback>{action.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{action.studentName}</div>
                          <div className="text-sm text-muted-foreground">{action.reason}</div>
                        </div>
                        <Badge className="bg-white/80 text-slate-700 text-xs shadow-sm border">
                          週リング{action.weekRing}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground max-w-xs">{action.action}</span>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md">
                          <Send className="h-4 w-4 mr-1" />
                          送信
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 backdrop-blur-sm shadow-lg border border-primary/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              生徒一覧
            </TabsTrigger>
            <TabsTrigger
              value="unresponded"
              className="relative data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              未応援記録
              {totalUnresponded > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 shadow-md">{totalUnresponded}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              一括応援
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              分析
            </TabsTrigger>
            <TabsTrigger
              value="parent-engagement"
              className="relative data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              保護者連携
              {parentEngagementSummary.alertsCount > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 shadow-md">
                  {parentEngagementSummary.alertsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Student Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="ai-coach-gradient-subtle border-primary/20 shadow-lg">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="w-32 bg-white/80 backdrop-blur-sm shadow-sm">
                        <SelectValue placeholder="クラス" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全クラス</SelectItem>
                        <SelectItem value="6A">6A</SelectItem>
                        <SelectItem value="6B">6B</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm shadow-sm">
                        <SelectValue placeholder="状態" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全状態</SelectItem>
                        <SelectItem value="emergency">🧯 緊急</SelectItem>
                        <SelectItem value="unrecorded48h">🔔 未記録48h</SelectItem>
                        <SelectItem value="attention">⚠ 要注意</SelectItem>
                        <SelectItem value="math-unmastered">📐 算数未マスター</SelectItem>
                        <SelectItem value="completed">完了</SelectItem>
                        <SelectItem value="in-progress">学習中</SelectItem>
                        <SelectItem value="not-started">未開始</SelectItem>
                        <SelectItem value="low-parent-engagement">保護者低関与</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm shadow-sm">
                        <SelectValue placeholder="並び順" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">優先度順</SelectItem>
                        <SelectItem value="week-ring">週リング低い順</SelectItem>
                        <SelectItem value="unresponded">未応援の多い順</SelectItem>
                        <SelectItem value="parent-engagement">保護者関与度の低い順</SelectItem>
                        <SelectItem value="last-activity">最終学習日時順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2 shadow-sm">
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

            <Card className="ai-coach-gradient-subtle border-primary/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary status-glow" />
                  生徒一覧（優先度順・アラート疲れ防止）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStudents.map((student) => {
                    let priorityLabel = ""
                    let priorityColor = ""

                    if (student.daysToTest <= 3 && student.weekRing < 6) {
                      priorityLabel = "🧯"
                      priorityColor = "border-l-red-500 bg-gradient-to-r from-red-50 to-red-50/30"
                    } else if (student.hoursWithoutRecord >= 48) {
                      priorityLabel = "🔔"
                      priorityColor = "border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-50/30"
                    } else if (
                      (student.weekRing >= 6 && student.weekRing < 8) ||
                      !student.mathMastered ||
                      student.untouchedSubjects.length > 0
                    ) {
                      priorityLabel = "⚠"
                      priorityColor = "border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-50/30"
                    }

                    return (
                      <div
                        key={student.id}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-lg ${
                          selectedStudents.includes(student.id)
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border bg-white/80 backdrop-blur-sm"
                        } ${priorityColor ? `border-l-4 ${priorityColor} shadow-lg` : ""}`}
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

                          <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                            <AvatarImage src={getAvatarSrc(student.avatar) || "/placeholder.svg"} alt={student.name} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-8 gap-4">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {priorityLabel && <span className="text-lg animate-pulse">{priorityLabel}</span>}
                                {student.name}
                              </div>
                              <div className="text-sm text-muted-foreground">ニックネーム: {student.nickname}</div>
                              <div className="text-xs text-muted-foreground">{student.class}</div>
                            </div>

                            <div>
                              <div className="text-sm font-medium">週リング</div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-white/80 text-slate-700 text-xs shadow-sm border">
                                  {student.weekRing}/10
                                </Badge>
                                <div
                                  className={`w-6 h-6 rounded-full border-2 ${
                                    student.weekRing >= 8
                                      ? "border-green-500 bg-green-100"
                                      : student.weekRing >= 6
                                        ? "border-yellow-500 bg-yellow-100"
                                        : "border-red-500 bg-red-100"
                                  }`}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium">連続{student.streak}日</div>
                              <div className="text-xs text-muted-foreground">最終: {student.lastActivity}</div>
                              <div className="text-xs text-muted-foreground">
                                {student.hoursWithoutRecord >= 48
                                  ? `未記録${Math.floor(student.hoursWithoutRecord)}h`
                                  : "記録OK"}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium">テストまで</div>
                              <Badge
                                className={`text-xs ${
                                  student.daysToTest <= 3
                                    ? "bg-red-100 text-red-800"
                                    : student.daysToTest <= 7
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                              >
                                {student.daysToTest}日
                              </Badge>
                            </div>

                            <div>
                              <div className="text-sm font-medium">科目バッジ</div>
                              <div className="flex gap-1 flex-wrap">
                                <Badge
                                  className={`text-xs ${student.mathMastered ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                                >
                                  算{student.mathMastered ? "M" : "未M"}
                                </Badge>
                                {student.untouchedSubjects.map((subject) => (
                                  <Badge key={subject} className="text-xs bg-gray-100 text-gray-800">
                                    {subject.charAt(0)}未T
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Badge className={statusColors[student.todayStatus as keyof typeof statusColors]}>
                                {statusLabels[student.todayStatus as keyof typeof statusLabels]}
                              </Badge>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs">理解度:</span>
                                {student.understandingTrend === "up" && <span className="text-green-600">↑</span>}
                                {student.understandingTrend === "stable" && <span className="text-gray-600">→</span>}
                                {student.understandingTrend === "down" && <span className="text-red-600">↓</span>}
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

                            <div className="flex items-center gap-2">
                              {student.unresponded > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">未応援: {student.unresponded}件</Badge>
                              )}
                              <Button size="sm" variant="outline">
                                詳細
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
