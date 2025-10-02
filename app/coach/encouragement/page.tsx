"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Heart } from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

interface EncouragementHistory {
  id: string
  type: "coach" | "parent"
  senderName: string
  senderAvatar: string
  studentName: string
  studentAvatar: string
  content: string
  encouragementType: "stamp" | "ai-message" | "custom-message"
  learningRecordSummary: string
  timestamp: Date
}

const encouragementHistory: EncouragementHistory[] = [
  {
    id: "enc1",
    type: "coach",
    senderName: "山田先生",
    senderAvatar: "coach1",
    studentName: "田中太郎",
    studentAvatar: "student1",
    content: "よく頑張りましたね！この調子で続けましょう。",
    encouragementType: "ai-message",
    learningRecordSummary: "算数の分数計算を学習",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "enc2",
    type: "parent",
    senderName: "佐藤母",
    senderAvatar: "parent1",
    studentName: "佐藤花子",
    studentAvatar: "student2",
    content: "👍",
    encouragementType: "stamp",
    learningRecordSummary: "国語の漢字練習",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "enc3",
    type: "coach",
    senderName: "鈴木先生",
    senderAvatar: "coach2",
    studentName: "鈴木次郎",
    studentAvatar: "student3",
    content: "理科の実験、とても良い観察ができていますね。",
    encouragementType: "custom-message",
    learningRecordSummary: "理科の光合成実験",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
]

export default function EncouragementListPage() {
  const [coachFilter, setCoachFilter] = useState("all")
  const [parentFilter, setParentFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [displayCount, setDisplayCount] = useState(10)

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const coachHistory = encouragementHistory.filter((h) => h.type === "coach")
  const parentHistory = encouragementHistory.filter((h) => h.type === "parent")

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Heart className="h-6 w-6" />
              応援一覧
            </h1>
            <p className="text-muted-foreground">指導者と保護者の応援履歴を確認</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="coach" className="space-y-6">
          <TabsList className="bg-muted w-full md:w-auto">
            <TabsTrigger
              value="coach"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 md:flex-none"
            >
              指導者タブ
              <Badge className="ml-2 bg-primary/10 text-primary">{coachHistory.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="parent"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 md:flex-none"
            >
              保護者タブ
              <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {parentHistory.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Coach Tab */}
          <TabsContent value="coach" className="space-y-4">
            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-md border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <Select value={coachFilter} onValueChange={setCoachFilter}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
                      <SelectValue placeholder="指導者" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="yamada">山田先生</SelectItem>
                      <SelectItem value="suzuki">鈴木先生</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
                      <SelectValue placeholder="期間" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="today">今日</SelectItem>
                      <SelectItem value="week">今週</SelectItem>
                      <SelectItem value="month">今月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* History List */}
            <div className="space-y-4">
              {coachHistory.slice(0, displayCount).map((history) => (
                <Card
                  key={history.id}
                  className="bg-white shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                        <AvatarImage
                          src={getAvatarSrc(history.senderAvatar) || "/placeholder.svg"}
                          alt={history.senderName}
                        />
                        <AvatarFallback>{history.senderName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{history.senderName}</div>
                            <div className="text-sm text-muted-foreground">→ {history.studentName}さんへ</div>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {history.timestamp.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground mb-1">
                            対象: {history.learningRecordSummary}
                          </div>
                          <div className="text-sm font-medium">{history.content}</div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {history.encouragementType === "stamp"
                              ? "スタンプ"
                              : history.encouragementType === "ai-message"
                                ? "AI提案"
                                : "個別作成"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {coachHistory.length > displayCount && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setDisplayCount(displayCount + 10)}
                >
                  さらに10件表示
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Parent Tab */}
          <TabsContent value="parent" className="space-y-4">
            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-md border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <Select value={parentFilter} onValueChange={setParentFilter}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
                      <SelectValue placeholder="保護者" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="tanaka">田中母</SelectItem>
                      <SelectItem value="sato">佐藤母</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
                      <SelectValue placeholder="期間" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="today">今日</SelectItem>
                      <SelectItem value="week">今週</SelectItem>
                      <SelectItem value="month">今月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* History List */}
            <div className="space-y-4">
              {parentHistory.slice(0, displayCount).map((history) => (
                <Card
                  key={history.id}
                  className="bg-white shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                        <AvatarImage
                          src={getAvatarSrc(history.senderAvatar) || "/placeholder.svg"}
                          alt={history.senderName}
                        />
                        <AvatarFallback>{history.senderName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{history.senderName}</div>
                            <div className="text-sm text-muted-foreground">→ {history.studentName}さんへ</div>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {history.timestamp.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground mb-1">
                            対象: {history.learningRecordSummary}
                          </div>
                          <div className="text-sm font-medium">{history.content}</div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {history.encouragementType === "stamp"
                              ? "スタンプ"
                              : history.encouragementType === "ai-message"
                                ? "AI提案"
                                : "個別作成"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {parentHistory.length > displayCount && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setDisplayCount(displayCount + 10)}
                >
                  さらに10件表示
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
