"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Send, Bot, TrendingUp, Calendar, BookOpen, Target, MessageSquare, Sparkles } from "lucide-react"

// Mock data - 実際の実装では props や API から取得
const studentData = {
  student1: {
    id: "student1",
    name: "田中太郎",
    nickname: "たんじろう",
    avatar: "student1",
    class: "6A",
    streak: 7,
    weekRing: 8.5,
    recentScore: 85,
    subjects: ["算数", "国語"],
  },
  student2: {
    id: "student2",
    name: "佐藤花子",
    nickname: "はなちゃん",
    avatar: "student2",
    class: "6A",
    streak: 3,
    weekRing: 6.8,
    recentScore: 92,
    subjects: ["理科", "社会"],
  },
  student3: {
    id: "student3",
    name: "鈴木次郎",
    nickname: "じろう",
    avatar: "student3",
    class: "6B",
    streak: 1,
    weekRing: 4.2,
    recentScore: 68,
    subjects: ["算数"],
  },
  student4: {
    id: "student4",
    name: "高橋美咲",
    nickname: "みさき",
    avatar: "student4",
    class: "6B",
    streak: 12,
    weekRing: 9.2,
    recentScore: 96,
    subjects: ["算数", "国語", "理科"],
  },
}

const learningHistory = [
  {
    id: "history1",
    date: "2025-08-14",
    time: "19:30",
    subject: "算数",
    understanding: "😄バッチリ理解",
    reflection: "分数の計算がよく分かりました。特に約分のコツが掴めて嬉しいです。",
    hasCoachResponse: true,
    coachMessage: "約分のコツを掴めたのは素晴らしいですね！この調子で応用問題にも挑戦してみましょう。",
    hoursAgo: 2,
  },
  {
    id: "history2",
    date: "2025-08-13",
    time: "20:15",
    subject: "国語",
    understanding: "😐ふつう",
    reflection: "漢字の読み方を練習しました。難しい漢字もありましたが、頑張りました。",
    hasCoachResponse: false,
    coachMessage: "",
    hoursAgo: 26,
  },
  {
    id: "history3",
    date: "2025-08-12",
    time: "18:45",
    subject: "算数",
    understanding: "😟ちょっと不安",
    reflection: "小数の割り算が難しかったです。計算ミスが多くて困りました。",
    hasCoachResponse: false,
    coachMessage: "",
    hoursAgo: 50,
  },
  {
    id: "history4",
    date: "2025-08-11",
    time: "19:00",
    subject: "理科",
    understanding: "😄バッチリ理解",
    reflection: "植物の光合成について学習しました。実験の結果が面白かったです。",
    hasCoachResponse: true,
    coachMessage: "実験に興味を持って取り組めているのが素晴らしいです！",
    hoursAgo: 74,
  },
]

interface AIMessage {
  type: "celebrate" | "insight" | "nextstep"
  title: string
  message: string
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [activeTab, setActiveTab] = useState("all")
  const [selectedHistory, setSelectedHistory] = useState<any>(null)
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [customMessage, setCustomMessage] = useState("")

  const student = studentData[studentId as keyof typeof studentData]

  if (!student) {
    return <div>生徒が見つかりません</div>
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

  const filteredHistory = activeTab === "all" ? learningHistory : learningHistory.filter((h) => !h.hasCoachResponse)

  const generateAIMessages = async (historyItem: any) => {
    setIsGeneratingAI(true)
    setSelectedHistory(historyItem)

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const messages: AIMessage[] = [
      {
        type: "celebrate",
        title: "成果を称える",
        message: `${student.nickname}さん、${historyItem.subject}の学習お疲れさまでした！${historyItem.understanding.includes("バッチリ") ? "完璧な理解ですね。" : historyItem.understanding.includes("ふつう") ? "しっかりと取り組めていますね。" : "難しい内容にもチャレンジしていて立派です。"}継続して頑張っている姿勢が素晴らしいです。`,
      },
      {
        type: "insight",
        title: "学習への気づき",
        message: `「${historyItem.reflection}」という振り返り、とても良い観察ですね。${historyItem.subject}では${historyItem.understanding.includes("不安") ? "苦手な部分を明確にできているのが成長の証拠です。" : "理解が深まってきているのが分かります。"}この調子で自分の学習を見つめ続けてください。`,
      },
      {
        type: "nextstep",
        title: "次のステップ提案",
        message: `${student.nickname}さんの${historyItem.subject}の取り組み、${student.streak}日連続の学習習慣が身についていますね。${historyItem.understanding.includes("不安") ? "次は基礎問題を3問だけ復習してみましょう。" : historyItem.understanding.includes("ふつう") ? "応用問題にも挑戦してみる準備ができていそうです。" : "今の理解度なら、さらに発展的な内容も楽しめそうですね。"}`,
      },
    ]

    setAiMessages(messages)
    setIsGeneratingAI(false)
  }

  const sendMessage = (message: string) => {
    console.log("Sending message to student:", {
      studentId: student.id,
      studentName: student.name,
      message,
      historyId: selectedHistory?.id,
    })

    alert(`${student.nickname}さんに応援メッセージを送信しました！`)

    // Update history item as responded
    if (selectedHistory) {
      const historyIndex = learningHistory.findIndex((h) => h.id === selectedHistory.id)
      if (historyIndex !== -1) {
        learningHistory[historyIndex].hasCoachResponse = true
        learningHistory[historyIndex].coachMessage = message
      }
    }

    setSelectedHistory(null)
    setAiMessages([])
    setCustomMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-12 w-12">
              <AvatarImage src={getAvatarSrc(student.avatar) || "/placeholder.svg"} alt={student.name} />
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-foreground">{student.name}</h1>
              <p className="text-sm text-muted-foreground">
                ニックネーム: {student.nickname} | {student.class}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Student Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{student.streak}</div>
                  <div className="text-sm text-muted-foreground">連続日数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{student.weekRing}</div>
                  <div className="text-sm text-muted-foreground">週リング</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{student.recentScore}%</div>
                  <div className="text-sm text-muted-foreground">最新スコア</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{filteredHistory.filter((h) => !h.hasCoachResponse).length}</div>
                  <div className="text-sm text-muted-foreground">未応援</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning History Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              学習履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">全履歴 ({learningHistory.length})</TabsTrigger>
                <TabsTrigger value="unresponded" className="relative">
                  未応援 ({learningHistory.filter((h) => !h.hasCoachResponse).length})
                  {learningHistory.filter((h) => !h.hasCoachResponse).length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                      {learningHistory.filter((h) => !h.hasCoachResponse).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {learningHistory.map((history) => (
                    <div
                      key={history.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        !history.hasCoachResponse
                          ? "border-l-4 border-l-orange-500 bg-orange-50"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-100 text-blue-800">{history.subject}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {history.date} {history.time}
                            </span>
                            <span className="text-xs text-muted-foreground">{history.hoursAgo}時間前</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-lg mr-2">{history.understanding}</span>
                          </div>
                          <p className="text-sm text-foreground mb-3">{history.reflection}</p>
                          {history.hasCoachResponse && (
                            <div className="bg-blue-50 border-l-4 border-l-blue-500 p-3 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Bot className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">指導者からの応援</span>
                              </div>
                              <p className="text-sm text-blue-700">{history.coachMessage}</p>
                            </div>
                          )}
                        </div>
                        {!history.hasCoachResponse && (
                          <Button size="sm" onClick={() => generateAIMessages(history)} className="ml-4">
                            <Sparkles className="h-4 w-4 mr-1" />
                            応援する
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="unresponded" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {filteredHistory.map((history) => (
                    <div key={history.id} className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-orange-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-100 text-blue-800">{history.subject}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {history.date} {history.time}
                            </span>
                            <span className="text-xs text-muted-foreground">{history.hoursAgo}時間前</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-lg mr-2">{history.understanding}</span>
                          </div>
                          <p className="text-sm text-foreground">{history.reflection}</p>
                        </div>
                        <Button size="sm" onClick={() => generateAIMessages(history)} className="ml-4">
                          <Sparkles className="h-4 w-4 mr-1" />
                          応援する
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* AI Message Generation Modal */}
        {selectedHistory && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI応援メッセージ生成
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedHistory.subject}の学習記録に対する個別最適化された応援メッセージ
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGeneratingAI ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">AI応援メッセージを生成中...</p>
                </div>
              ) : aiMessages.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium">3つの応援メッセージから選択してください：</h3>
                  {aiMessages.map((msg, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {msg.type === "celebrate" && "🎉 成果を称える"}
                          {msg.type === "insight" && "💡 学習への気づき"}
                          {msg.type === "nextstep" && "🎯 次のステップ提案"}
                        </Badge>
                        <Button size="sm" onClick={() => sendMessage(msg.message)}>
                          <Send className="h-4 w-4 mr-1" />
                          送信
                        </Button>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  ))}

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">カスタムメッセージ：</h4>
                    <Textarea
                      placeholder="独自の応援メッセージを入力..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedHistory(null)
                          setAiMessages([])
                          setCustomMessage("")
                        }}
                      >
                        キャンセル
                      </Button>
                      <Button onClick={() => sendMessage(customMessage)} disabled={!customMessage.trim()}>
                        <Send className="h-4 w-4 mr-1" />
                        カスタム送信
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
