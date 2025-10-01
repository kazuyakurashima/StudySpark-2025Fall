"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Target,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  TrendingUp,
  Filter,
  CheckCircle2,
  Circle,
} from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const goalRecords = [
  {
    id: "goal1",
    childName: "太郎",
    childAvatar: "student1",
    createdDate: "2024-09-01T10:00:00",
    title: "算数の計算スピードを上げる",
    deadline: "2024-10-31",
    status: "in-progress",
    progress: 65,
    details: "毎日10問の計算問題を解いて、正確さとスピードを向上させる。目標は1問30秒以内。",
    targetDate: "2024-10-31",
    hasComment: true,
  },
  {
    id: "goal2",
    childName: "太郎",
    childAvatar: "student1",
    createdDate: "2024-08-15T14:30:00",
    title: "漢字テストで90点以上を取る",
    deadline: "2024-09-30",
    status: "completed",
    progress: 100,
    details: "毎週20個の新しい漢字を覚えて、週末にテストをする。書き順も正確に覚える。",
    targetDate: "2024-09-30",
    hasComment: false,
  },
  {
    id: "goal3",
    childName: "みかん",
    childAvatar: "student2",
    createdDate: "2024-09-05T16:00:00",
    title: "理科の実験レポートを丁寧に書く",
    deadline: "2024-10-15",
    status: "in-progress",
    progress: 40,
    details: "実験の観察をしっかり記録して、考察を深く書く。図やグラフも使って分かりやすくまとめる。",
    targetDate: "2024-10-15",
    hasComment: false,
  },
  {
    id: "goal4",
    childName: "みかん",
    childAvatar: "student2",
    createdDate: "2024-09-10T11:00:00",
    title: "社会の都道府県を全部覚える",
    deadline: "2024-11-30",
    status: "in-progress",
    progress: 25,
    details: "毎日5つずつ都道府県の位置と特徴を覚える。白地図を使って練習する。",
    targetDate: "2024-11-30",
    hasComment: true,
  },
]

const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

const statusConfig = {
  "in-progress": {
    label: "進行中",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Circle,
  },
  completed: {
    label: "達成",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
}

export default function ParentGoalNaviPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [comment, setComment] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const toggleCard = (goalId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedCards(newExpanded)
  }

  const handleSendComment = async (goalId: string) => {
    setIsSending(true)
    const goal = goalRecords.find((g) => g.id === goalId)

    setTimeout(() => {
      console.log(`Sent comment: ${comment} to goal ${goal?.title}`)
      alert("応援コメントを送信しました！")
      setComment("")
      setIsSending(false)
    }, 800)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const getDaysRemaining = (deadline: string) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const selectedChildName = children.find((child) => child.id === selectedChild)?.name

  let filteredGoals = goalRecords.filter((goal) => goal.childName === selectedChildName)

  // Filter by status
  if (filterStatus !== "all") {
    filteredGoals = filteredGoals.filter((g) => g.status === filterStatus)
  }

  // Sort goals
  filteredGoals = [...filteredGoals].sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    } else if (sortBy === "date-asc") {
      return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
    } else if (sortBy === "deadline-asc") {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    } else if (sortBy === "progress-desc") {
      return b.progress - a.progress
    }
    return 0
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">ゴールナビ</h1>
              <p className="text-sm text-slate-600">お子さんの目標達成を応援しよう</p>
            </div>
          </div>

          {/* 生徒選択タブ */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4">
            {children.map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 rounded-md transition-all ${
                  selectedChild === child.id
                    ? "bg-white text-primary shadow-sm font-medium"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                {child.name}
              </Button>
            ))}
          </div>

          {/* フィルター */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              <span>フィルター</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="達成状況" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="in-progress">進行中</SelectItem>
                  <SelectItem value="completed">達成</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">新しい順</SelectItem>
                  <SelectItem value="date-asc">古い順</SelectItem>
                  <SelectItem value="deadline-asc">期限が近い順</SelectItem>
                  <SelectItem value="progress-desc">進捗が高い順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {filteredGoals.length === 0 ? (
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">条件に合う目標がありません。</p>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal) => {
            const isExpanded = expandedCards.has(goal.id)
            const StatusIcon = statusConfig[goal.status as keyof typeof statusConfig].icon
            const daysRemaining = getDaysRemaining(goal.deadline)

            return (
              <Card key={goal.id} className="border-l-4 border-l-primary">
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleCard(goal.id)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarSrc(goal.childAvatar) || "/placeholder.svg"} alt={goal.childName} />
                        <AvatarFallback>{goal.childName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{goal.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-normal flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            設定: {formatDateTime(goal.createdDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            期限: {formatDate(goal.deadline)}
                            {goal.status === "in-progress" && (
                              <span
                                className={`ml-1 ${daysRemaining <= 7 ? "text-red-600 font-medium" : daysRemaining <= 14 ? "text-orange-600" : ""}`}
                              >
                                (残り{daysRemaining}日)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardTitle>

                  {!isExpanded && (
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className={statusConfig[goal.status as keyof typeof statusConfig].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[goal.status as keyof typeof statusConfig].label}
                      </Badge>
                      {goal.hasComment && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          応援済み
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-muted-foreground">進捗</span>
                        <span className="text-sm font-medium">{goal.progress}%</span>
                      </div>
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Status and Progress */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={statusConfig[goal.status as keyof typeof statusConfig].color}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[goal.status as keyof typeof statusConfig].label}
                        </Badge>
                        {goal.hasComment && (
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                            応援済み
                          </Badge>
                        )}
                      </div>

                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">進捗状況</span>
                          </div>
                          <span className="text-lg font-bold text-primary">{goal.progress}%</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-3">
                          <div
                            className="bg-primary h-3 rounded-full transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Goal Details */}
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="text-sm text-muted-foreground mb-2">目標の詳細</div>
                      <p className="text-sm leading-relaxed">{goal.details}</p>
                    </div>

                    {/* Target Date */}
                    <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="text-sm text-muted-foreground mb-1">達成予定日</div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">{formatDate(goal.targetDate)}</span>
                        {goal.status === "in-progress" && daysRemaining > 0 && (
                          <span className="text-xs text-muted-foreground">(あと{daysRemaining}日)</span>
                        )}
                      </div>
                    </div>

                    {/* Comment Section */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="text-sm font-medium">応援コメント</div>
                      <Textarea
                        placeholder="お子さんの目標達成を応援するコメントを書いてください..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[80px] text-base"
                        maxLength={200}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{comment.length}/200文字</span>
                        <Button
                          onClick={() => handleSendComment(goal.id)}
                          disabled={!comment.trim() || isSending}
                          size="sm"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          送信
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
