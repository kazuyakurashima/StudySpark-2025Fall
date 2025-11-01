"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Send, Bot, TrendingUp, Calendar, BookOpen, Target, MessageSquare, Sparkles } from "lucide-react"
import { getStudentDetail, getStudentLearningHistory, sendEncouragementToStudent } from "@/app/actions/coach"

interface Student {
  id: string
  full_name: string
  nickname: string | null
  avatar_id: string | null
  grade: string
  course: string | null
  streak: number
  weekRing: number
  recentScore: number
}

interface StudyLog {
  id: string
  created_at: string
  subject: string
  understanding_level: number
  reflection: string | null
  total_questions: number
  correct_count: number
  hasCoachResponse: boolean
  coachMessage: string
  encouragementId: string | null
}

interface AIMessage {
  type: "celebrate" | "insight" | "nextstep"
  title: string
  message: string
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<Student | null>(null)
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedHistory, setSelectedHistory] = useState<StudyLog | null>(null)
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [customMessage, setCustomMessage] = useState("")

  useEffect(() => {
    loadStudentData()
  }, [studentId])

  const loadStudentData = async () => {
    setLoading(true)

    // 生徒詳細を取得
    const detailResult = await getStudentDetail(studentId)
    if (detailResult.error) {
      console.error(detailResult.error)
      setLoading(false)
      return
    }

    setStudent(detailResult.student as Student)

    // 学習履歴を取得
    const historyResult = await getStudentLearningHistory(studentId, 30)
    if (historyResult.error) {
      console.error(historyResult.error)
    } else {
      setStudyLogs(historyResult.studyLogs as StudyLog[])
    }

    setLoading(false)
  }

  const getUnderstandingEmoji = (level: number) => {
    if (level >= 4) return "😄バッチリ理解"
    if (level === 3) return "😐ふつう"
    return "😟ちょっと不安"
  }

  const getSubjectLabel = (subject: string) => {
    const subjectMap: Record<string, string> = {
      math: "算数",
      japanese: "国語",
      science: "理科",
      social: "社会",
    }
    return subjectMap[subject] || subject
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getHoursAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    return diffHours
  }

  const filteredHistory = activeTab === "all" ? studyLogs : studyLogs.filter((h) => !h.hasCoachResponse)

  const generateAIMessages = async (historyItem: StudyLog) => {
    setIsGeneratingAI(true)
    setSelectedHistory(historyItem)

    try {
      const response = await fetch("/api/coach/encouragement-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: student?.nickname || student?.full_name || "",
          subject: getSubjectLabel(historyItem.subject),
          understandingLevel: historyItem.understanding_level,
          reflection: historyItem.reflection || "",
          correctRate: (historyItem.correct_count / historyItem.total_questions) * 100,
          streak: student?.streak || 0,
        }),
      })

      const data = await response.json()

      if (data.error || !response.ok) {
        console.error("AI生成エラー:", data.error)
        // フォールバック：簡易的なメッセージを生成
        setAiMessages([
          {
            type: "celebrate",
            title: "成果を称える",
            message: `${student?.nickname || student?.full_name}さん、${getSubjectLabel(historyItem.subject)}の学習お疲れさまでした！継続して頑張っている姿勢が素晴らしいです。`,
          },
          {
            type: "insight",
            title: "学習への気づき",
            message: `「${historyItem.reflection}」という振り返り、とても良い観察ですね。この調子で自分の学習を見つめ続けてください。`,
          },
          {
            type: "nextstep",
            title: "次のステップ提案",
            message: `${student?.nickname || student?.full_name}さんの${getSubjectLabel(historyItem.subject)}の取り組み、継続できていますね。次も同じペースで頑張りましょう。`,
          },
        ])
      } else {
        setAiMessages(data.suggestions || [])
      }
    } catch (error) {
      console.error("AI生成エラー:", error)
      // エラー時のフォールバック
      setAiMessages([
        {
          type: "celebrate",
          title: "成果を称える",
          message: `学習お疲れさまでした！継続して頑張っている姿勢が素晴らしいです。`,
        },
      ])
    }

    setIsGeneratingAI(false)
  }

  const sendMessage = async (message: string) => {
    if (!selectedHistory || !student) return

    const result = await sendEncouragementToStudent(student.id, selectedHistory.id, message)

    if (result.error) {
      alert(`エラー: ${result.error}`)
      return
    }

    alert(`${student.nickname || student.full_name}さんに応援メッセージを送信しました！`)

    // 学習履歴を再読み込み
    await loadStudentData()

    setSelectedHistory(null)
    setAiMessages([])
    setCustomMessage("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">生徒が見つかりません</p>
          <Button onClick={() => router.back()} className="mt-4">
            戻る
          </Button>
        </div>
      </div>
    )
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
              <AvatarImage src={student.avatar_id || "/placeholder.svg"} alt={student.full_name} />
              <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-foreground">{student.full_name}</h1>
              <p className="text-sm text-muted-foreground">
                ニックネーム: {student.nickname || "未設定"} | {student.grade} | {student.course || "未設定"}コース
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
                  <div className="text-sm text-muted-foreground">今週の学習</div>
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
                  <div className="text-2xl font-bold">{studyLogs.filter((h) => !h.hasCoachResponse).length}</div>
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
                <TabsTrigger value="all">全履歴 ({studyLogs.length})</TabsTrigger>
                <TabsTrigger value="unresponded" className="relative">
                  未応援 ({studyLogs.filter((h) => !h.hasCoachResponse).length})
                  {studyLogs.filter((h) => !h.hasCoachResponse).length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                      {studyLogs.filter((h) => !h.hasCoachResponse).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {studyLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">学習履歴がありません</div>
                ) : (
                  <div className="space-y-3">
                    {studyLogs.map((history) => (
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
                              <Badge className="bg-blue-100 text-blue-800">{getSubjectLabel(history.subject)}</Badge>
                              <span className="text-sm text-muted-foreground">{formatDate(history.created_at)}</span>
                              <span className="text-xs text-muted-foreground">{getHoursAgo(history.created_at)}時間前</span>
                            </div>
                            <div className="mb-2">
                              <span className="text-lg mr-2">{getUnderstandingEmoji(history.understanding_level)}</span>
                              <span className="text-sm text-muted-foreground">
                                正答率: {Math.round((history.correct_count / history.total_questions) * 100)}%
                              </span>
                            </div>
                            <p className="text-sm text-foreground mb-3">{history.reflection || "振り返りなし"}</p>
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
                )}
              </TabsContent>

              <TabsContent value="unresponded" className="space-y-4 mt-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">未応援の学習履歴がありません</div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistory.map((history) => (
                      <div key={history.id} className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-orange-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-blue-100 text-blue-800">{getSubjectLabel(history.subject)}</Badge>
                              <span className="text-sm text-muted-foreground">{formatDate(history.created_at)}</span>
                              <span className="text-xs text-muted-foreground">{getHoursAgo(history.created_at)}時間前</span>
                            </div>
                            <div className="mb-2">
                              <span className="text-lg mr-2">{getUnderstandingEmoji(history.understanding_level)}</span>
                              <span className="text-sm text-muted-foreground">
                                正答率: {Math.round((history.correct_count / history.total_questions) * 100)}%
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{history.reflection || "振り返りなし"}</p>
                          </div>
                          <Button size="sm" onClick={() => generateAIMessages(history)} className="ml-4">
                            <Sparkles className="h-4 w-4 mr-1" />
                            応援する
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                {getSubjectLabel(selectedHistory.subject)}の学習記録に対する個別最適化された応援メッセージ
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
