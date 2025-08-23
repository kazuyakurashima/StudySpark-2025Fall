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
import { Users, AlertTriangle, MessageSquare, TrendingUp, Send, CheckCircle, Clock, Target } from "lucide-react"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"

// Mock student data
const students = [
  {
    id: "student1",
    name: "田中太郎", // 本名（非公開）
    nickname: "たんじろう", // ニックネーム（公開）を追加
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
  },
  {
    id: "student2",
    name: "佐藤花子", // 本名（非公開）
    nickname: "はなちゃん", // ニックネーム（公開）を追加
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
  },
  {
    id: "student3",
    name: "鈴木次郎", // 本名（非公開）
    nickname: "じろう", // ニックネーム（公開）を追加
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
  },
  {
    id: "student4",
    name: "高橋美咲", // 本名（非公開）
    nickname: "みさき", // ニックネーム（公開）を追加
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
  },
]

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

const quickMessages = [
  "今日もよく頑張りましたね！この調子で続けましょう。",
  "難しい問題にもチャレンジしていて素晴らしいです。",
  "毎日コツコツと学習を続けているのが立派です。",
  "理解が深まってきているのが分かります。頑張って！",
]

export default function CoachDashboard() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [filterClass, setFilterClass] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [bulkMessage, setBulkMessage] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const filteredStudents = students.filter((student) => {
    if (filterClass !== "all" && student.class !== filterClass) return false
    if (filterStatus !== "all" && student.todayStatus !== filterStatus) return false
    return true
  })

  const needsAttentionCount = students.filter((s) => s.needsAttention).length
  const completedTodayCount = students.filter((s) => s.todayStatus === "completed").length
  const noParentResponseCount = students.filter((s) => !s.parentResponse).length

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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{noParentResponseCount}</div>
                  <div className="text-sm text-muted-foreground">保護者未応答</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">生徒一覧</TabsTrigger>
            <TabsTrigger value="feedback">フィードバック</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
          </TabsList>

          {/* Student Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Filters and Actions */}
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
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">全選択</span>
                    <span className="text-sm text-muted-foreground">({selectedStudents.length}名選択中)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student List */}
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
                          onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                        />

                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getAvatarSrc(student.avatar) || "/placeholder.svg"} alt={student.name} />
                          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
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
                            <div className="text-xs text-muted-foreground">最終メッセージ</div>
                            <div className="text-sm">{student.lastMessage}</div>
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

          {/* Feedback Tab */}
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
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
