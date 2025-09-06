"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Send, MessageCircle, BookOpen, Clock, Calendar } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

const sparkRecords = [
  {
    id: "record1",
    childName: "太郎",
    childAvatar: "student1",
    recordDate: "2024-09-06T16:30:00",
    studyDate: "2024-09-06",
    subjects: [
      {
        name: "算数",
        categories: ["授業", "宿題"],
        understanding: "バッチリ理解",
        emoji: "😄",
      },
      {
        name: "国語",
        categories: ["宿題", "週テスト・復習ナビ"],
        understanding: "できた",
        emoji: "😊",
      },
    ],
    reflection: "算数の分数問題が最初は難しかったけど、先生の説明を聞いて理解できました。国語の漢字も覚えられました。",
  },
  {
    id: "record2",
    childName: "花子",
    childAvatar: "student2",
    recordDate: "2024-09-06T15:45:00",
    studyDate: "2024-09-06",
    subjects: [
      {
        name: "理科",
        categories: ["授業"],
        understanding: "バッチリ理解",
        emoji: "😄",
      },
      {
        name: "社会",
        categories: ["宿題"],
        understanding: "ふつう",
        emoji: "😐",
      },
    ],
    reflection: "理科の実験が楽しかった！社会の地理はもう少し復習が必要かも。",
  },
]

const subjectColors = {
  算数: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  国語: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  理科: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  社会: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
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

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">応援</h1>
              <p className="text-sm text-slate-600">お子さんの学習記録に応援を送ろう</p>
            </div>
          </div>

          {/* 生徒選択タブ */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
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
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {sparkRecords
          .filter((record) => record.childName === children.find((child) => child.id === selectedChild)?.name)
          .map((record) => (
            <Card key={record.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getAvatarSrc(record.childAvatar) || "/placeholder.svg"} alt={record.childName} />
                    <AvatarFallback>{record.childName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{record.childName}さんの学習記録</span>
                    </div>
                    <div className="text-sm text-muted-foreground font-normal flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        記録日時: {formatDate(record.recordDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        学習日:{" "}
                        {new Date(record.studyDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
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

                {/* Child's Reflection */}
                {record.reflection && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">振り返り</div>
                    <p className="text-sm">{record.reflection}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    AI提案メッセージ
                  </div>
                  <div className="space-y-2">
                    {generateAIMessages(record).map((message, index) => (
                      <Button
                        key={index}
                        onClick={() => handleSendMessage(message, record.id)}
                        disabled={isSending}
                        variant="outline"
                        className="w-full h-auto p-3 text-left justify-start hover:bg-accent/5 hover:border-accent/50"
                      >
                        <div className="flex items-start gap-2">
                          <Send className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                          <span className="text-sm leading-relaxed">{message}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Message */}
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
                    >
                      <Send className="h-4 w-4 mr-2" />
                      送信
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
