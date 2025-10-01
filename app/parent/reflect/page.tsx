"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RotateCcw, Send, ChevronDown, ChevronUp, Clock, Filter, Lightbulb, Target, BookOpen } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const reflectRecords = [
  {
    id: "reflect1",
    childName: "太郎",
    childAvatar: "student1",
    createdDate: "2024-09-06T20:30:00",
    title: "今週の算数学習を振り返って",
    category: "学習振り返り",
    content:
      "今週は分数の計算を中心に学習しました。最初は難しく感じましたが、毎日練習することで少しずつ理解できるようになりました。特に通分の考え方が分かってきたのが嬉しかったです。",
    insights: [
      "毎日コツコツ練習することの大切さを実感した",
      "分からないところは先生に質問することで理解が深まった",
      "図を描いて考えると分かりやすい",
    ],
    nextActions: ["毎日10問の計算練習を続ける", "週末に復習テストをする", "応用問題にも挑戦してみる"],
    hasComment: true,
  },
  {
    id: "reflect2",
    childName: "太郎",
    childAvatar: "student1",
    createdDate: "2024-09-05T19:00:00",
    title: "テスト結果の振り返り",
    category: "テスト振り返り",
    content:
      "合不合判定テストの結果を見て、算数の計算ミスが多かったことに気づきました。時間に追われて焦ってしまったのが原因だと思います。次回は見直しの時間を確保したいです。",
    insights: ["焦ると計算ミスが増える", "見直しの時間を確保することが重要", "得意な理科は良い結果が出せた"],
    nextActions: ["計算問題は落ち着いて解く", "必ず見直しの時間を5分確保する", "時間配分を意識する"],
    hasComment: false,
  },
  {
    id: "reflect3",
    childName: "みかん",
    childAvatar: "student2",
    createdDate: "2024-09-06T18:45:00",
    title: "理科の実験レポートを書いて",
    category: "学習振り返り",
    content:
      "植物の光合成の実験をしました。実験の手順をしっかり観察して、結果を記録することができました。考察を書くのは少し難しかったですが、先生のアドバイスを参考にして書き上げることができました。",
    insights: ["実験は観察が大切", "結果から考察を導くのは難しいけど面白い", "図やグラフを使うと分かりやすくなる"],
    nextActions: ["次の実験も丁寧に観察する", "考察の書き方をもっと練習する", "参考書を読んで知識を深める"],
    hasComment: true,
  },
  {
    id: "reflect4",
    childName: "みかん",
    childAvatar: "student2",
    createdDate: "2024-09-04T20:15:00",
    title: "学習習慣について考えた",
    category: "学習習慣",
    content:
      "最近、毎日決まった時間に勉強する習慣がついてきました。最初は大変でしたが、今では自然に机に向かえるようになりました。勉強する時間を決めることで、他の時間も有効に使えるようになった気がします。",
    insights: ["習慣化すると勉強が楽になる", "時間を決めることで集中できる", "計画的に過ごせるようになった"],
    nextActions: ["この習慣を続ける", "休憩時間も計画的に取る", "週末の学習計画も立ててみる"],
    hasComment: false,
  },
]

const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

const categoryColors = {
  学習振り返り: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  テスト振り返り: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  学習習慣: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  目標設定: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
}

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [comment, setComment] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const toggleCard = (reflectId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(reflectId)) {
      newExpanded.delete(reflectId)
    } else {
      newExpanded.add(reflectId)
    }
    setExpandedCards(newExpanded)
  }

  const handleSendComment = async (reflectId: string) => {
    setIsSending(true)
    const reflect = reflectRecords.find((r) => r.id === reflectId)

    setTimeout(() => {
      console.log(`Sent comment: ${comment} to reflect ${reflect?.title}`)
      alert("コメントを送信しました！")
      setComment("")
      setIsSending(false)
    }, 800)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const selectedChildName = children.find((child) => child.id === selectedChild)?.name

  let filteredReflects = reflectRecords.filter((reflect) => reflect.childName === selectedChildName)

  // Filter by category
  if (filterCategory !== "all") {
    filteredReflects = filteredReflects.filter((r) => r.category === filterCategory)
  }

  // Sort reflects
  filteredReflects = [...filteredReflects].sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    } else if (sortBy === "date-asc") {
      return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
    }
    return 0
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">リフレクト</h1>
              <p className="text-sm text-slate-600">お子さんの振り返りを見てコメントを送ろう</p>
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
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="カテゴリー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="学習振り返り">学習振り返り</SelectItem>
                  <SelectItem value="テスト振り返り">テスト振り返り</SelectItem>
                  <SelectItem value="学習習慣">学習習慣</SelectItem>
                  <SelectItem value="目標設定">目標設定</SelectItem>
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
        {filteredReflects.length === 0 ? (
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">条件に合う振り返りがありません。</p>
            </CardContent>
          </Card>
        ) : (
          filteredReflects.map((reflect) => {
            const isExpanded = expandedCards.has(reflect.id)

            return (
              <Card key={reflect.id} className="border-l-4 border-l-primary">
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleCard(reflect.id)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={getAvatarSrc(reflect.childAvatar) || "/placeholder.svg"}
                          alt={reflect.childName}
                        />
                        <AvatarFallback>{reflect.childName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{reflect.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-normal flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(reflect.createdDate)}
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
                      <Badge
                        variant="outline"
                        className={
                          categoryColors[reflect.category as keyof typeof categoryColors]?.bg +
                          " " +
                          categoryColors[reflect.category as keyof typeof categoryColors]?.text +
                          " " +
                          categoryColors[reflect.category as keyof typeof categoryColors]?.border
                        }
                      >
                        {reflect.category}
                      </Badge>
                      {reflect.hasComment && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          コメント済み
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Category Badge */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          categoryColors[reflect.category as keyof typeof categoryColors]?.bg +
                          " " +
                          categoryColors[reflect.category as keyof typeof categoryColors]?.text +
                          " " +
                          categoryColors[reflect.category as keyof typeof categoryColors]?.border
                        }
                      >
                        {reflect.category}
                      </Badge>
                      {reflect.hasComment && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          コメント済み
                        </Badge>
                      )}
                    </div>

                    {/* Reflection Content */}
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">振り返り内容</span>
                      </div>
                      <p className="text-sm leading-relaxed">{reflect.content}</p>
                    </div>

                    {/* Insights */}
                    {reflect.insights && reflect.insights.length > 0 && (
                      <div className="p-4 bg-yellow-50/50 rounded-lg border border-yellow-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium">気づき</span>
                        </div>
                        <ul className="space-y-2">
                          {reflect.insights.map((insight, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-yellow-600 mt-0.5">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Actions */}
                    {reflect.nextActions && reflect.nextActions.length > 0 && (
                      <div className="p-4 bg-green-50/50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">次のアクション</span>
                        </div>
                        <ul className="space-y-2">
                          {reflect.nextActions.map((action, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Comment Section */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="text-sm font-medium">コメント</div>
                      <Textarea
                        placeholder="お子さんの振り返りにコメントを送りましょう..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[80px] text-base"
                        maxLength={200}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{comment.length}/200文字</span>
                        <Button
                          onClick={() => handleSendComment(reflect.id)}
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
