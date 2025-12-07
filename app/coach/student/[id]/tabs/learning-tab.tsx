"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  Bot,
  Sparkles,
  Send,
  Loader2,
  Layers,
} from "lucide-react"
import { useCoachStudentDetail, type StudyLog } from "@/lib/hooks/use-coach-student-detail"
import { sendEncouragementToStudent } from "@/app/actions/coach"
import {
  groupLogsByBatch,
  getRepresentativeLog,
  calculateSummary,
  calculateAccuracy,
  type FeedbackMaps,
  type StudyLogWithBatch,
  type GroupedLogEntry,
} from "@/lib/utils/batch-grouping"

interface LearningTabProps {
  studentId: string
}

interface AIMessage {
  type: "celebrate" | "insight" | "nextstep"
  title: string
  message: string
}

export function LearningTab({ studentId }: LearningTabProps) {
  const { student, studyLogs, batchFeedbacks, legacyFeedbacks, isLoading, mutate } =
    useCoachStudentDetail(studentId)

  const [viewMode, setViewMode] = useState<"all" | "unresponded">("all")
  const [selectedEntry, setSelectedEntry] = useState<GroupedLogEntry<StudyLogWithBatch> | null>(null)
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [customMessage, setCustomMessage] = useState("")

  // batch_idでグループ化
  const feedbackMaps: FeedbackMaps = { batchFeedbacks, legacyFeedbacks }
  const groupedLogs = groupLogsByBatch(
    studyLogs.map((log) => ({
      ...log,
      total_problems: log.total_questions,
      reflection_text: log.reflection,
    })) as StudyLogWithBatch[],
    feedbackMaps
  )

  // 未応援エントリかどうか判定
  const isUnrespondedEntry = (entry: GroupedLogEntry<StudyLogWithBatch>): boolean => {
    if (entry.type === "batch") {
      return !entry.coachFeedback
    }
    const originalLog = studyLogs.find((l) => l.id === entry.log.id)
    return originalLog ? !originalLog.hasCoachResponse : true
  }

  const unrespondedEntries = groupedLogs.filter(isUnrespondedEntry)
  const displayEntries = viewMode === "all" ? groupedLogs : unrespondedEntries

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
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const generateAIMessages = async (entry: GroupedLogEntry<StudyLogWithBatch>) => {
    setIsGeneratingAI(true)
    setSelectedEntry(entry)

    const representativeLog = getRepresentativeLog(entry)
    const originalLog = studyLogs.find((l) => l.id === representativeLog.id)
    const { totalQuestions, totalCorrect } = calculateSummary(entry)

    const subjectName =
      entry.type === "batch"
        ? entry.subjects.map(getSubjectLabel).join("・")
        : getSubjectLabel(entry.log.subject)

    try {
      const response = await fetch("/api/coach/encouragement-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: student?.nickname || student?.full_name || "",
          subject: subjectName,
          understandingLevel: 3, // understanding_levelはDB未対応のため固定値
          reflection: originalLog?.reflection || "",
          correctRate: calculateAccuracy(totalQuestions, totalCorrect),
          streak: 0,
        }),
      })

      const data = await response.json()
      if (data.error || !response.ok) {
        setAiMessages([
          {
            type: "celebrate",
            title: "成果を称える",
            message: `${student?.nickname || student?.full_name || ""}さん、${subjectName}の学習お疲れさまでした！`,
          },
        ])
      } else {
        setAiMessages(data.suggestions || [])
      }
    } catch {
      setAiMessages([
        {
          type: "celebrate",
          title: "成果を称える",
          message: "学習お疲れさまでした！継続して頑張っている姿勢が素晴らしいです。",
        },
      ])
    }

    setIsGeneratingAI(false)
  }

  const sendMessage = async (message: string) => {
    if (!selectedEntry || !student) return

    const representativeLog = getRepresentativeLog(selectedEntry)
    const result = await sendEncouragementToStudent(String(student.id), String(representativeLog.id), message)

    if (result.error) {
      alert(`エラー: ${result.error}`)
      return
    }

    alert(`${student.nickname || student.full_name}さんに応援メッセージを送信しました！`)
    mutate()
    setSelectedEntry(null)
    setAiMessages([])
    setCustomMessage("")
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            学習履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "unresponded")}>
            <TabsList>
              <TabsTrigger value="all">全履歴 ({groupedLogs.length})</TabsTrigger>
              <TabsTrigger value="unresponded" className="relative">
                未応援 ({unrespondedEntries.length})
                {unrespondedEntries.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs">
                    {unrespondedEntries.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={viewMode} className="mt-4 space-y-3">
              {displayEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {viewMode === "all" ? "学習履歴がありません" : "未応援の学習履歴はありません"}
                </div>
              ) : (
                displayEntries.map((entry) => {
                  const isUnresponded = isUnrespondedEntry(entry)
                  const { totalQuestions, totalCorrect } = calculateSummary(entry)
                  const accuracy = calculateAccuracy(totalQuestions, totalCorrect)
                  const representativeLog = getRepresentativeLog(entry)
                  const originalLog = studyLogs.find((l) => l.id === representativeLog.id)

                  return (
                    <div
                      key={entry.type === "batch" ? entry.batchId : entry.log.id}
                      className={`p-4 rounded-lg border-2 ${
                        isUnresponded
                          ? "border-l-4 border-l-orange-500 bg-orange-50"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {entry.type === "batch" ? (
                              <>
                                <Badge variant="outline" className="bg-primary/10">
                                  <Layers className="h-3 w-3 mr-1" />
                                  {entry.subjects.length}科目
                                </Badge>
                                {entry.subjects.map((s) => (
                                  <Badge key={s} variant="secondary">
                                    {getSubjectLabel(s)}
                                  </Badge>
                                ))}
                              </>
                            ) : (
                              <Badge variant="secondary">
                                {getSubjectLabel(entry.log.subject)}
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {formatDate(
                                entry.type === "batch" ? entry.latestLoggedAt : entry.log.logged_at
                              )}
                            </span>
                          </div>

                          <div className="mb-2">
                            <span className="text-sm text-muted-foreground">
                              正答率: {accuracy}% ({totalCorrect}/{totalQuestions}問)
                            </span>
                          </div>

                          {originalLog?.reflection && (
                            <p className="text-sm text-foreground mb-3">{originalLog.reflection}</p>
                          )}

                          {entry.coachFeedback && (
                            <div className="bg-blue-50 border-l-4 border-l-blue-500 p-3 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Bot className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  指導者からの応援
                                </span>
                              </div>
                              <p className="text-sm text-blue-700">{entry.coachFeedback}</p>
                            </div>
                          )}
                        </div>

                        {isUnresponded && (
                          <Button size="sm" onClick={() => generateAIMessages(entry)}>
                            <Sparkles className="h-4 w-4 mr-1" />
                            応援
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI応援メッセージ生成モーダル */}
      {selectedEntry && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI応援メッセージ生成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isGeneratingAI ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">AI応援メッセージを生成中...</p>
              </div>
            ) : aiMessages.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium">応援メッセージを選択：</h3>
                {aiMessages.map((msg, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {msg.type === "celebrate" && "🎉 成果を称える"}
                        {msg.type === "insight" && "💡 学習への気づき"}
                        {msg.type === "nextstep" && "🎯 次のステップ"}
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
                        setSelectedEntry(null)
                        setAiMessages([])
                        setCustomMessage("")
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={() => sendMessage(customMessage)}
                      disabled={!customMessage.trim()}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      送信
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
