"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Heart,
  Send,
  MessageCircle,
  BookOpen,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Sparkles,
  Flame,
  Filter,
} from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const sparkRecords = [
  {
    id: "record1",
    childName: "太郎",
    childAvatar: "student1",
    recordDate: "2025-09-06T16:30:00",
    learningSession: "第3回",
    learningPeriod: "9/14〜9/20",
    hasSupport: true,
    subjects: [
      {
        name: "算数",
        categories: ["授業", "宿題"],
        content: "分数の計算、文章題の解き方",
        accuracy: 85,
        understanding: "バッチリ理解",
        emoji: "😄",
      },
      {
        name: "国語",
        categories: ["宿題", "週テスト・復習ナビ"],
        content: "漢字の書き取り、読解問題",
        accuracy: 78,
        understanding: "できた",
        emoji: "😊",
      },
    ],
    reflection: "算数の分数問題が最初は難しかったけど、先生の説明を聞いて理解できました。国語の漢字も覚えられました。",
    change: "前回より計算スピードが上がった！",
  },
  {
    id: "record2",
    childName: "みかん",
    childAvatar: "student2",
    recordDate: "2025-09-06T15:45:00",
    learningSession: "合不合第3回",
    learningPeriod: "8/31〜9/6",
    hasSupport: false,
    subjects: [
      {
        name: "理科",
        categories: ["授業"],
        content: "植物の光合成、実験レポート",
        accuracy: 92,
        understanding: "バッチリ理解",
        emoji: "😄",
      },
      {
        name: "社会",
        categories: ["宿題"],
        content: "日本の地理、都道府県の特徴",
        accuracy: 65,
        understanding: "ふつう",
        emoji: "😐",
      },
    ],
    reflection: "理科の実験が楽しかった！社会の地理はもう少し復習が必要かも。",
    change: "理科の実験レポートの書き方が上手になった",
  },
  {
    id: "record3",
    childName: "太郎",
    childAvatar: "student1",
    recordDate: "2025-09-05T17:00:00",
    learningSession: "第2回",
    learningPeriod: "9/7〜9/13",
    hasSupport: false,
    subjects: [
      {
        name: "算数",
        categories: ["授業"],
        content: "図形の面積、角度の計算",
        accuracy: 72,
        understanding: "できた",
        emoji: "😊",
      },
    ],
    reflection: "図形問題は少し難しかったけど、頑張りました。",
    change: "図形の問題に慣れてきた",
  },
]

const subjectColors = {
  算数: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  国語: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  理科: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  社会: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
}

const categoryColors = {
  授業: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  宿題: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  週テスト・復習ナビ: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  入試対策・過去問: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
}

const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

const quickSupportIcons = [
  { icon: ThumbsUp, label: "いいね！", color: "text-blue-500" },
  { icon: Sparkles, label: "すごい！", color: "text-yellow-500" },
  { icon: Flame, label: "がんばれ！", color: "text-orange-500" },
]

const generateAIMessages = (record: (typeof sparkRecords)[0]) => {
  const goodSubjects = record.subjects.filter((s) => s.understanding === "バッチリ理解" || s.understanding === "できた")
  const needsWork = record.subjects.filter(
    (s) => s.understanding === "ちょっと不安" || s.understanding === "むずかしかった",
  )

  const messages = []

  if (goodSubjects.length > 0) {
    messages.push(`${goodSubjects.map((s) => s.name).join("と")}、よく理解できていて素晴らしいね！この調子で頑張ろう！`)
  }

  if (record.reflection) {
    messages.push("今日も振り返りをしっかり書いてくれてありがとう。自分の学習を見つめ直すのは大切だね。")
  }

  if (needsWork.length > 0) {
    messages.push(`${needsWork.map((s) => s.name).join("と")}は少し難しかったみたいだね。一緒に復習してみよう！`)
  } else {
    messages.push("毎日コツコツ勉強を続けているのが本当に偉いです。継続は力なり！")
  }

  return messages.slice(0, 3)
}

export default function ParentSparkPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [customMessage, setCustomMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [filterSupport, setFilterSupport] = useState<string>("all")
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const toggleCard = (recordId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId)
    } else {
      newExpanded.add(recordId)
    }
    setExpandedCards(newExpanded)
  }

  const handleQuickSupport = async (label: string, recordId: string) => {
    setIsSending(true)
    const record = sparkRecords.find((r) => r.id === recordId)

    setTimeout(() => {
      console.log(`Sent quick support: ${label} to ${record?.childName}`)
      alert(`「${label}」を送信しました！`)
      setIsSending(false)
    }, 500)
  }

  const handleSendMessage = async (message: string, recordId: string) => {
    setIsSending(true)
    const record = sparkRecords.find((r) => r.id === recordId)

    setTimeout(() => {
      console.log(`Sent message: ${message} to ${record?.childName}`)
      alert("応援メッセージを送信しました！")
      setCustomMessage("")
      setIsSending(false)
    }, 800)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const selectedChildName = children.find((child) => child.id === selectedChild)?.name

  let filteredRecords = sparkRecords.filter((record) => record.childName === selectedChildName)

  // Filter by support status
  if (filterSupport === "supported") {
    filteredRecords = filteredRecords.filter((r) => r.hasSupport)
  } else if (filterSupport === "unsupported") {
    filteredRecords = filteredRecords.filter((r) => !r.hasSupport)
  }

  // Filter by subject
  if (filterSubject !== "all") {
    filteredRecords = filteredRecords.filter((r) => r.subjects.some((s) => s.name === filterSubject))
  }

  // Sort records
  filteredRecords = [...filteredRecords].sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
    } else if (sortBy === "date-asc") {
      return new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
    }
    return 0
  })

  const shouldShowSupportOptions = (record: (typeof sparkRecords)[0]) => {
    return !record.hasSupport
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 pb-20">
      <div className="bg-white/95 backdrop-blur-md shadow-md border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl shadow-sm">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">応援</h1>
              <p className="text-sm text-slate-600">お子さんの学習記録に応援を送ろう</p>
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

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              <span>フィルター</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterSupport} onValueChange={setFilterSupport}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="応援状況" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="supported">応援済み</SelectItem>
                  <SelectItem value="unsupported">未応援</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="科目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="算数">算数</SelectItem>
                  <SelectItem value="国語">国語</SelectItem>
                  <SelectItem value="理科">理科</SelectItem>
                  <SelectItem value="社会">社会</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">新しい順</SelectItem>
                  <SelectItem value="date-asc">古い順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {filteredRecords.length === 0 ? (
          <Card className="border-l-4 border-l-pink-400 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">条件に合う学習記録がありません。</p>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const isExpanded = expandedCards.has(record.id)

            return (
              <Card
                key={record.id}
                className="border-l-4 border-l-pink-400 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleCard(record.id)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={getAvatarSrc(record.childAvatar) || "/placeholder.svg"}
                          alt={record.childName}
                        />
                        <AvatarFallback>{record.childName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{record.childName}さん</span>
                          {record.hasSupport && (
                            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                              応援済み
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(record.recordDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {record.learningSession}
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
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <span className="font-medium">学習内容</span>
                      </div>
                      {record.subjects.map((subject, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${subjectColors[subject.name as keyof typeof subjectColors]?.bg} ${subjectColors[subject.name as keyof typeof subjectColors]?.border}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${subjectColors[subject.name as keyof typeof subjectColors]?.bg} ${subjectColors[subject.name as keyof typeof subjectColors]?.text} border-0`}
                              >
                                {subject.name}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{subject.emoji}</span>
                                <span className="text-sm font-medium">{subject.understanding}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="text-xs text-muted-foreground mb-1">学習内容</div>
                            <p className="text-sm">{subject.content}</p>
                          </div>

                          <div className="mb-3">
                            <div className="text-xs text-muted-foreground mb-1">正答率</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-white rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{ width: `${subject.accuracy}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{subject.accuracy}%</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {subject.categories.map((category, catIndex) => (
                              <Badge
                                key={catIndex}
                                variant="outline"
                                className={`${categoryColors[category as keyof typeof categoryColors]?.bg} ${categoryColors[category as keyof typeof categoryColors]?.text} ${categoryColors[category as keyof typeof categoryColors]?.border}`}
                              >
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {record.reflection && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">今日の振り返り</div>
                        <p className="text-sm">{record.reflection}</p>
                      </div>
                    )}

                    {record.change && (
                      <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                        <div className="text-sm text-muted-foreground mb-2">変化</div>
                        <p className="text-sm font-medium">{record.change}</p>
                      </div>
                    )}

                    {shouldShowSupportOptions(record) && (
                      <>
                        <div className="space-y-3">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <Heart className="h-4 w-4 text-pink-600" />
                            クイック応援
                          </div>
                          <div className="flex gap-2">
                            {quickSupportIcons.map((item, index) => {
                              const Icon = item.icon
                              return (
                                <Button
                                  key={index}
                                  onClick={() => handleQuickSupport(item.label, record.id)}
                                  disabled={isSending}
                                  variant="outline"
                                  className="flex-1 h-auto py-3 hover:bg-pink-50 hover:border-pink-300 transition-all duration-200"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <Icon className={`h-6 w-6 ${item.color}`} />
                                    <span className="text-xs">{item.label}</span>
                                  </div>
                                </Button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-pink-600" />
                            AI応援メッセージ
                          </div>
                          <div className="space-y-2">
                            {generateAIMessages(record).map((message, index) => (
                              <Button
                                key={index}
                                onClick={() => handleSendMessage(message, record.id)}
                                disabled={isSending}
                                variant="outline"
                                className="w-full h-auto p-3 text-left justify-start hover:bg-pink-50 hover:border-pink-300 transition-all duration-200"
                              >
                                <div className="flex items-start gap-2">
                                  <Send className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                                  <span className="text-sm leading-relaxed">{message}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {!record.hasSupport && (
                          <div className="space-y-3">
                            <div className="text-sm font-medium">カスタムメッセージ</div>
                            <Textarea
                              placeholder="お子さんへの応援メッセージを自由に書いてください..."
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              className="min-h-[80px] text-base"
                              maxLength={200}
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{customMessage.length}/200文字</span>
                              <Button
                                onClick={() => handleSendMessage(customMessage, record.id)}
                                disabled={!customMessage.trim() || isSending}
                                size="sm"
                                className="bg-pink-500 hover:bg-pink-600 text-white"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                送信
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {!shouldShowSupportOptions(record) && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                        <p className="text-sm text-green-700 font-medium">この学習記録には既に応援を送信済みです</p>
                      </div>
                    )}
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
