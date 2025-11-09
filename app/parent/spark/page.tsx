"use client"

import { useState } from "react"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Heart,
  Send,
  BookOpen,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Filter,
} from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

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
  { type: "heart", label: "がんばったね", emoji: null, icon: Heart },
  { type: "star", label: "すごい！", emoji: "⭐", icon: null },
  { type: "thumbsup", label: "よくできました", emoji: "👍", icon: null },
]


function ParentSparkPageInner() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [isSending, setIsSending] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [filterSupport, setFilterSupport] = useState<string>("all")
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState<string>("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

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

  const handleOpenAIDialog = async (recordId: string) => {
    setCurrentRecordId(recordId)
    setShowAIDialog(true)
    setIsGeneratingAI(true)
    setAiMessages([])
    setSelectedMessage("")

    const record = sparkRecords.find((r) => r.id === recordId)

    // モックのAIメッセージ生成
    setTimeout(() => {
      const messages = []
      const goodSubjects = record?.subjects.filter((s) => s.understanding === "バッチリ理解" || s.understanding === "できた") || []

      if (goodSubjects.length > 0) {
        messages.push(`${goodSubjects.map((s) => s.name).join("と")}、よく理解できていて素晴らしいね！この調子で頑張ろう！`)
      }

      if (record?.reflection) {
        messages.push("今日も振り返りをしっかり書いてくれてありがとう。自分の学習を見つめ直すのは大切だね。")
      }

      messages.push("毎日コツコツ勉強を続けているのが本当に偉いです。継続は力なり！")

      setAiMessages(messages.slice(0, 3))
      setSelectedMessage(messages[0] || "")
      setIsGeneratingAI(false)
    }, 1500)
  }

  const handleSendMessage = async () => {
    if (!currentRecordId || !selectedMessage.trim()) {
      return
    }

    setIsSending(true)
    const record = sparkRecords.find((r) => r.id === currentRecordId)

    setTimeout(() => {
      console.log(`Sent message: ${selectedMessage} to ${record?.childName}`)
      alert("応援メッセージを送信しました！")
      setShowAIDialog(false)
      setSelectedMessage("")
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
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Heart}
          title="応援メッセージ"
          subtitle="お子さんの頑張りを応援しましょう"
          variant="parent"
        />

        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Card className="bg-white/95 backdrop-blur-md shadow-md border border-pink-100">
            <CardContent className="p-4 sm:p-6">
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
            </CardContent>
          </Card>

      <div className="space-y-4">
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
                          <div className="space-y-2.5">
                            {quickSupportIcons.map((item, index) => {
                              const Icon = item.icon
                              const isHeart = item.type === "heart"
                              const isStar = item.type === "star"
                              const isThumbsUp = item.type === "thumbsup"

                              return (
                                <Button
                                  key={index}
                                  onClick={() => handleQuickSupport(item.label, record.id)}
                                  disabled={isSending}
                                  className={`group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                                    ${isHeart ? "bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 hover:from-rose-100 hover:via-pink-100 hover:to-rose-200 text-rose-700 border border-rose-200/50" : ""}
                                    ${isStar ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 hover:from-amber-100 hover:via-yellow-100 hover:to-amber-200 text-amber-700 border border-amber-200/50" : ""}
                                    ${isThumbsUp ? "bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 hover:from-sky-100 hover:via-blue-100 hover:to-sky-200 text-sky-700 border border-sky-200/50" : ""}
                                    shadow-sm hover:shadow-md
                                    transform hover:scale-[1.02] active:scale-[0.98]
                                    transition-all duration-300 ease-out
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                                    flex items-center justify-center gap-2`}
                                >
                                  {Icon && <Icon className={`h-4 w-4 group-hover:scale-110 transition-transform duration-300 ${isHeart ? "fill-rose-500" : ""}`} />}
                                  {item.emoji && <span className="text-lg group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>}
                                  <span>{item.label}</span>
                                </Button>
                              )
                            })}
                          </div>
                        </div>

                        {/* AI応援ボタン - ホーム機能と同じデザイン */}
                        <Button
                          onClick={() => handleOpenAIDialog(record.id)}
                          disabled={isSending}
                          className="group relative w-full py-3.5 px-4 rounded-xl text-sm overflow-hidden
                            bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100
                            hover:from-violet-100 hover:via-purple-100 hover:to-violet-200
                            text-violet-700 border border-violet-200/50 shadow-sm hover:shadow-md
                            transform hover:scale-[1.02] active:scale-[0.98]
                            transition-all duration-300 ease-out
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                            flex items-center justify-center gap-2"
                        >
                          {/* シマー効果 */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent
                            translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                          <Sparkles className="h-4 w-4 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 fill-violet-500" />
                          <span className="relative z-10 tracking-wide">AI応援メッセージ</span>
                        </Button>
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
        </div>

        {/* AI応援メッセージダイアログ - ホーム機能と同じプレミアムデザイン */}
        {showAIDialog && (
          <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200" onClick={() => !isGeneratingAI && !isSending && setShowAIDialog(false)}>
            <div className="bg-gradient-to-br from-white via-purple-50/30 to-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-purple-100/50 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl blur-md opacity-50 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 p-2.5 rounded-xl shadow-lg">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                    <span className="hidden xs:inline">AI応援メッセージ</span>
                    <span className="xs:hidden">AI応援</span>
                  </h3>
                </div>
                <button
                  onClick={() => setShowAIDialog(false)}
                  disabled={isGeneratingAI || isSending}
                  className="group relative w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="text-slate-400 group-hover:text-slate-600 text-2xl font-light transition-colors">✕</span>
                </button>
              </div>

              {isGeneratingAI ? (
                <div className="py-16 text-center">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative animate-spin inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                    AI応援メッセージを生成中...
                  </p>
                  <p className="text-sm text-slate-500 mt-2">心を込めて考えています</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  <div className="bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50 rounded-2xl p-4 border border-purple-100">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      <span className="font-semibold text-purple-700">✨ 3つの応援メッセージ</span>から選んでください。<br />
                      <span className="text-xs text-slate-600">メッセージは自由に編集できます。</span>
                    </p>
                  </div>

                  {/* 3つのメッセージ選択肢 - プレミアムデザイン */}
                  <div className="space-y-3 sm:space-y-4">
                    {aiMessages.map((message, index) => (
                      <div key={index} className="relative group">
                        <input
                          type="radio"
                          id={`message-${index}`}
                          name="ai-message"
                          checked={selectedMessage === message}
                          onChange={() => setSelectedMessage(message)}
                          className="sr-only"
                        />
                        <label
                          htmlFor={`message-${index}`}
                          className={`block p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            selectedMessage === message
                              ? "border-purple-400 bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 shadow-lg scale-[1.02]"
                              : "border-slate-200 bg-white hover:border-purple-200 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              selectedMessage === message
                                ? "border-purple-500 bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg scale-110"
                                : "border-slate-300 group-hover:border-purple-300"
                            }`}>
                              {selectedMessage === message && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${
                                  selectedMessage === message
                                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md"
                                    : "bg-purple-100 text-purple-700"
                                }`}>
                                  {index === 0 ? "💪 励まし型" : index === 1 ? "🤝 共感型" : "🌟 次への期待型"}
                                </span>
                              </div>
                              <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-words">{message}</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* メッセージ編集エリア - エレガントデザイン */}
                  <div className="mt-6 sm:mt-8 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-4 sm:p-5 border border-purple-100/50">
                    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Send className="h-4 w-4 text-purple-600" />
                      メッセージを編集（任意）
                    </label>
                    <textarea
                      value={selectedMessage}
                      onChange={(e) => setSelectedMessage(e.target.value)}
                      placeholder="選択したメッセージを編集できます..."
                      className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-sm sm:text-base resize-none"
                      rows={4}
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-slate-500">{selectedMessage.length}/200文字</span>
                    </div>
                  </div>

                  {/* 送信ボタン - プレミアムデザイン */}
                  <div className="flex gap-3 mt-6 sm:mt-8">
                    <Button
                      onClick={() => setShowAIDialog(false)}
                      disabled={isSending}
                      className="flex-1 py-3 px-6 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-200 disabled:opacity-50"
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!selectedMessage.trim() || isSending}
                      className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {isSending ? (
                        <>
                          <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          送信中...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          送信する
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <ParentBottomNavigation />
      </div>
    </>
  )
}

/**
 * 保護者応援ページ（Context Provider付き）
 */
export default function ParentSparkPage() {
  return (
    <UserProfileProvider>
      <ParentSparkPageInner />
    </UserProfileProvider>
  )
}
