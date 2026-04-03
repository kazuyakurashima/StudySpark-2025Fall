"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { Heart, Star, ThumbsUp, Sparkles, MessageSquare, ChevronDown, ChevronUp, Loader2, AlertTriangle, RefreshCw, Layers } from "lucide-react"
import {
  sendCoachQuickEncouragement,
  generateCoachAIEncouragement,
  sendCoachCustomEncouragement,
} from "@/app/actions/encouragement"
import type { QuickEncouragementType } from "@/lib/openai/prompts"
import { getAvatarById } from "@/lib/constants/avatars"
import {
  useCoachStudyLogs,
  useCoachInactiveStudents,
  type StudyLogsFilters,
} from "@/lib/hooks/use-coach-encouragement"
import { groupLogsByBatch, calculateSummary, calculateAccuracy, getRepresentativeLog } from "@/lib/utils/batch-grouping"
import type { StudyLogWithBatch } from "@/lib/types/batch-grouping"
import { useMemo } from "react"
import { VoiceInputButton } from "@/components/ui/voice-input-button"

// 指導者応援用学習ログ型
interface CoachEncouragementLog extends StudyLogWithBatch {
  students?: {
    id: string
    full_name: string
    grade?: number
    profiles?: {
      avatar_id?: string | null
      nickname?: string | null
      custom_avatar_url?: string | null
    }
  } | { id: string; full_name: string; grade?: number; profiles?: any }[]
  subjects?: { name: string } | { name: string }[]
  study_sessions?: { session_number: number; grade?: number } | { session_number: number; grade?: number }[]
  study_content_types?: { content_name: string } | { content_name: string }[]
  reflection_text?: string | null
  encouragement_messages?: any[]
}

export default function CoachEncouragementPage() {
  const [activeTab, setActiveTab] = useState<"encouragement" | "inactive">("encouragement")
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // フィルター状態
  const [filters, setFilters] = useState<StudyLogsFilters>({
    grade: "all",
    subject: "all",
    encouragementType: "none",
    sortOrder: "desc",
  })
  const [inactiveThreshold, setInactiveThreshold] = useState<3 | 5 | 7>(7)

  // SWRフックでデータを取得（フィルターごとにキャッシュ）
  const {
    studyLogs,
    isLoading: logsLoading,
    isValidating: logsValidating,
    mutate: mutateLogs,
  } = useCoachStudyLogs(filters)

  const {
    inactiveStudents,
    isLoading: inactiveLoading,
    isValidating: inactiveValidating,
    mutate: mutateInactive,
  } = useCoachInactiveStudents(inactiveThreshold)

  // 学習ログをバッチグループ化
  const groupedEntries = useMemo(() => {
    if (!studyLogs || studyLogs.length === 0) return []

    // subjectフィールドを追加（groupLogsByBatchが必要とする）
    const logsWithSubject = studyLogs.map((log: any) => ({
      ...log,
      subject: Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name || "不明",
    })) as CoachEncouragementLog[]

    // ソートオプション（sortBy は "date" 固定、sortOrder は filters から取得）
    return groupLogsByBatch(logsWithSubject, {
      batchFeedbacks: {},
      legacyFeedbacks: {},
    }, { sortBy: "date", sortOrder: filters.sortOrder })
  }, [studyLogs, filters.sortOrder])

  // AI応援ダイアログ状態
  const [aiDialogOpen, setAiDialogOpen] = useState<{ studentId: string; logId: string } | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiDraftMessage, setAiDraftMessage] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [editingMessage, setEditingMessage] = useState("")
  const [aiContext, setAiContext] = useState("")

  // カスタム応援ダイアログ状態
  const [customDialogOpen, setCustomDialogOpen] = useState<{ studentId: string; logId: string | null } | null>(null)
  const [customMessage, setCustomMessage] = useState("")

  const toggleCard = (logId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedCards(newExpanded)
  }

  const handleQuickEncouragement = async (studentId: string, studyLogId: string, quickType: QuickEncouragementType) => {
    const result = await sendCoachQuickEncouragement(studentId, studyLogId, quickType)
    if (result.success) {
      mutateLogs()
    } else {
      alert(result.error)
    }
  }

  const handleGenerateAI = async (studentId: string, studyLogId: string, context?: string) => {
    setAiDialogOpen({ studentId, logId: studyLogId })
    setAiLoading(true)
    setAiMessage(null)
    setAiDraftMessage(null)
    setEditingMessage("")

    const result = await generateCoachAIEncouragement(studentId, studyLogId, context || undefined)
    setAiLoading(false)

    if (result.success) {
      setAiMessage(result.message)
      setAiDraftMessage(result.message)
      setEditingMessage(result.message)
    } else {
      alert(result.error)
      setAiDialogOpen(null)
    }
  }

  const handleOpenAIDialog = (studentId: string, studyLogId: string) => {
    setAiDialogOpen({ studentId, logId: studyLogId })
    setAiMessage(null)
    setAiDraftMessage(null)
    setEditingMessage("")
    setAiContext("")
    setAiLoading(false)
  }

  const handleSendAIMessage = async () => {
    if (!aiDialogOpen || !editingMessage) return

    const result = await sendCoachCustomEncouragement(
      aiDialogOpen.studentId,
      aiDialogOpen.logId,
      editingMessage,
      "ai",
      {
        aiDraftMessage: aiDraftMessage || undefined,
        userContext: aiContext || undefined,
      }
    )
    if (result.success) {
      setAiDialogOpen(null)
      mutateLogs()
    } else {
      alert(result.error)
    }
  }

  const handleSendCustomMessage = async () => {
    if (!customDialogOpen || !customMessage) return

    const result = await sendCoachCustomEncouragement(customDialogOpen.studentId, customDialogOpen.logId, customMessage, "custom")
    if (result.success) {
      setCustomDialogOpen(null)
      setCustomMessage("")
      // SWRキャッシュを再取得
      if (activeTab === "encouragement") {
        mutateLogs()
      } else {
        mutateInactive()
      }
    } else {
      alert(result.error)
    }
  }

  // 現在のタブに応じたローディング状態
  const isLoading = activeTab === "encouragement" ? logsLoading : inactiveLoading
  const isValidating = activeTab === "encouragement" ? logsValidating : inactiveValidating

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-20">
      <UserProfileHeader />
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">応援</h1>
            <p className="text-sm text-slate-600 mt-1">生徒の学習を応援しましょう</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => activeTab === "encouragement" ? mutateLogs() : mutateInactive()}
            disabled={isValidating}
            title="データを更新"
          >
            <RefreshCw className={`h-5 w-5 ${isValidating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <div className="bg-white border-b border-slate-200 px-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="encouragement">応援一覧</TabsTrigger>
            <TabsTrigger value="inactive">未入力生徒</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="encouragement" className="m-0">
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select value={filters.grade} onValueChange={(value: any) => setFilters({ ...filters, grade: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全学年</SelectItem>
                  <SelectItem value="5">小学5年</SelectItem>
                  <SelectItem value="6">小学6年</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.subject} onValueChange={(value) => setFilters({ ...filters, subject: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全科目</SelectItem>
                  <SelectItem value="算数">算数</SelectItem>
                  <SelectItem value="国語">国語</SelectItem>
                  <SelectItem value="理科">理科</SelectItem>
                  <SelectItem value="社会">社会</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.encouragementType} onValueChange={(value: any) => setFilters({ ...filters, encouragementType: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">応援なし</SelectItem>
                  <SelectItem value="coach">指導者応援済み</SelectItem>
                  <SelectItem value="parent">保護者応援済み</SelectItem>
                  <SelectItem value="all">全表示</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sortOrder} onValueChange={(value: any) => setFilters({ ...filters, sortOrder: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降順</SelectItem>
                  <SelectItem value="asc">昇順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {logsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : groupedEntries.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-600"><p>該当する学習記録がありません</p></CardContent></Card>
            ) : (
              groupedEntries.map((entry) => {
                // エントリから情報を取得
                const isBatch = entry.type === "batch"
                const representativeLog = getRepresentativeLog(entry)
                const summary = calculateSummary(entry)
                const accuracy = calculateAccuracy(summary.totalQuestions, summary.totalCorrect)
                const entryKey = isBatch ? `batch-${entry.batchId}` : `single-${entry.log.id}`
                const isExpanded = expandedCards.has(entryKey)

                // 指導者応援済み判定
                const hasCoachEncouragement = isBatch
                  ? entry.logs.some(log => Array.isArray(log.encouragement_messages) && log.encouragement_messages.some((msg: any) => msg.sender_role === "coach"))
                  : Array.isArray(representativeLog.encouragement_messages) && representativeLog.encouragement_messages.some((msg: any) => msg.sender_role === "coach")

                // 生徒情報（代表ログから取得）
                const student = Array.isArray(representativeLog.students) ? representativeLog.students[0] : representativeLog.students
                const profile = student?.profiles
                const fullName = student?.full_name || "生徒"
                const nickname = profile?.nickname
                const displayName = nickname && nickname !== fullName ? `${fullName}（${nickname}）` : fullName
                const avatarId = profile?.avatar_id
                const customAvatarUrl = profile?.custom_avatar_url
                const avatarSrc = customAvatarUrl || (avatarId ? getAvatarById(avatarId)?.src || "/placeholder.svg" : "/placeholder.svg")

                // 科目表示
                const subjectName = isBatch
                  ? entry.subjects.join(" · ")
                  : (Array.isArray(representativeLog.subjects) ? representativeLog.subjects[0]?.name : representativeLog.subjects?.name) || "科目不明"

                // 代表ログID（応援送信用）
                const representativeLogId = String(representativeLog.id)
                const studentId = String(student?.id || representativeLog.student_id)

                // 日付表示
                const displayDate = isBatch
                  ? new Date(entry.latestLoggedAt).toLocaleDateString("ja-JP")
                  : new Date(representativeLog.logged_at || representativeLog.study_date).toLocaleDateString("ja-JP")

                // セッション番号
                const sessionNum = Array.isArray(representativeLog.study_sessions)
                  ? representativeLog.study_sessions[0]?.session_number
                  : representativeLog.study_sessions?.session_number || 0

                return (
                  <Card key={entryKey} className={hasCoachEncouragement ? "border-green-200 bg-green-50" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarSrc} alt={displayName} />
                            <AvatarFallback>{fullName?.[0] || "生"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base">{displayName}</CardTitle>
                              {student?.grade && <Badge variant="outline" className="text-xs">小{student.grade}</Badge>}
                              {isBatch && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                  <Layers className="h-3 w-3 mr-1" />{entry.subjects.length}科目
                                </Badge>
                              )}
                              {hasCoachEncouragement && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">応援済み</Badge>}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {subjectName} · 第{sessionNum}回
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-600">{displayDate}</div>
                          <div className="text-lg font-semibold text-primary">{accuracy}%</div>
                          <div className="text-xs text-slate-500">{summary.totalCorrect}/{summary.totalQuestions}問</div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* バッチの場合は科目別内訳 */}
                      {isBatch && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {entry.logs.map((log) => {
                            const logAccuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
                            const logSubject = Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name
                            return (
                              <div key={log.id} className="text-xs p-2 bg-muted/50 rounded border">
                                <div className="font-medium">{logSubject}</div>
                                <div className="text-muted-foreground">{logAccuracy}% ({log.correct_count}/{log.total_problems})</div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* クイック応援ボタン */}
                      {!hasCoachEncouragement && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleQuickEncouragement(studentId, representativeLogId, "heart")} className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-50">
                            <Heart className="h-4 w-4 mr-1" />頑張ったね
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleQuickEncouragement(studentId, representativeLogId, "star")} className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                            <Star className="h-4 w-4 mr-1" />すごい！
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleQuickEncouragement(studentId, representativeLogId, "thumbsup")} className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                            <ThumbsUp className="h-4 w-4 mr-1" />よくできました
                          </Button>
                        </div>
                      )}

                      <Button variant="ghost" onClick={() => toggleCard(entryKey)} className="w-full">
                        {isExpanded ? (<><ChevronUp className="h-4 w-4 mr-1" />詳細を閉じる</>) : (<><ChevronDown className="h-4 w-4 mr-1" />詳細を表示</>)}
                      </Button>

                      {isExpanded && (
                        <div className="space-y-4 pt-4 border-t">
                          {/* 詳細表示 */}
                          {isBatch ? (
                            entry.logs.map((log) => (
                              <div key={log.id} className="text-sm space-y-2 p-3 bg-muted/30 rounded">
                                <div className="font-medium">{Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><span className="text-slate-600">学習内容:</span> {Array.isArray(log.study_content_types) ? log.study_content_types[0]?.content_name : log.study_content_types?.content_name || "不明"}</div>
                                  <div><span className="text-slate-600">正答:</span> {log.correct_count}/{log.total_problems}問</div>
                                </div>
                                {log.reflection_text && (
                                  <div className="text-xs"><span className="text-slate-600">振り返り:</span><p className="mt-1 p-2 bg-background rounded">{log.reflection_text}</p></div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-600">学習内容:</span>
                                <p className="font-medium">{Array.isArray(representativeLog.study_content_types) ? representativeLog.study_content_types[0]?.content_name : representativeLog.study_content_types?.content_name || "不明"}</p>
                              </div>
                              <div><span className="text-slate-600">正答数:</span><p className="font-medium">{representativeLog.correct_count} / {representativeLog.total_problems}問</p></div>
                              {representativeLog.reflection_text && (
                                <div className="col-span-2 text-sm"><span className="text-slate-600">今日の振り返り:</span><p className="mt-1 p-3 bg-slate-50 rounded-lg">{representativeLog.reflection_text}</p></div>
                              )}
                            </div>
                          )}

                          {/* 応援履歴 */}
                          {(isBatch ? entry.logs : [representativeLog]).some(log => Array.isArray(log.encouragement_messages) && log.encouragement_messages.length > 0) && (
                            <div className="text-sm"><span className="text-slate-600">応援履歴:</span>
                              <div className="mt-2 space-y-2">
                                {(isBatch ? entry.logs : [representativeLog]).flatMap((log) =>
                                  (log.encouragement_messages || []).map((msg: any, idx: number) => (
                                    <div key={`${log.id}-${idx}`} className={`p-3 rounded-lg ${msg.sender_role === "coach" ? "bg-green-50 border border-green-200" : "bg-pink-50 border border-pink-200"}`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <Badge variant="outline" className={msg.sender_role === "coach" ? "bg-green-100 text-green-700 border-green-300" : "bg-pink-100 text-pink-700 border-pink-300"}>
                                          {msg.sender_role === "coach" ? "指導者" : "保護者"}
                                        </Badge>
                                        <span className="text-xs text-slate-500">{new Date(msg.created_at).toLocaleString("ja-JP")}</span>
                                      </div>
                                      <p className="text-sm">{msg.message}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* AI/カスタム応援ボタン */}
                          {!hasCoachEncouragement && (
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => handleOpenAIDialog(studentId, representativeLogId)} className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                                <Sparkles className="h-4 w-4 mr-1" />AI応援
                              </Button>
                              <Button variant="outline" onClick={() => setCustomDialogOpen({ studentId, logId: representativeLogId })} className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50">
                                <MessageSquare className="h-4 w-4 mr-1" />カスタム応援
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="inactive" className="m-0">
          <div className="p-4 bg-white border-b border-slate-200">
            <Select value={String(inactiveThreshold)} onValueChange={(value) => setInactiveThreshold(parseInt(value) as 3 | 5 | 7)}>
              <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3日以上未入力</SelectItem>
                <SelectItem value="5">5日以上未入力</SelectItem>
                <SelectItem value="7">7日以上未入力</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 space-y-4">
            {inactiveLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : inactiveStudents.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-600"><p>未入力の生徒はいません</p></CardContent></Card>
            ) : (
              inactiveStudents.map((student) => {
                const isWarning = student.daysInactive >= 7
                const profile = student.profiles
                const fullName = student.full_name || "生徒"
                const nickname = profile?.nickname
                const displayName = nickname && nickname !== fullName ? `${fullName}（${nickname}）` : fullName
                const avatarId = profile?.avatar_id
                const customAvatarUrl = profile?.custom_avatar_url
                const avatarSrc = customAvatarUrl || (avatarId ? getAvatarById(avatarId)?.src || "/placeholder.svg" : "/placeholder.svg")

                return (
                  <Card key={student.id} className={isWarning ? "border-red-300 bg-red-50" : "border-yellow-300 bg-yellow-50"}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarSrc} alt={displayName} />
                            <AvatarFallback>{fullName?.[0] || "生"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{displayName}</CardTitle>
                              {student.grade && <Badge variant="outline" className="text-xs">小{student.grade}</Badge>}
                              {isWarning && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />警告</Badge>}
                            </div>
                            <div className="text-sm text-slate-700 mt-1">
                              最終入力: {student.lastInputDate || "未入力"} · {student.daysInactive}日間未入力
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-slate-600">
                          <p>この生徒に連絡を取り、学習状況を確認してください。</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setCustomDialogOpen({ studentId: student.id, logId: null })}
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          応援メッセージを送る
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {aiDialogOpen && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200" onClick={() => !aiLoading && setAiDialogOpen(null)}>
          <div className="bg-gradient-to-br from-white via-purple-50/30 to-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-purple-100/50 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl blur-md opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 p-2.5 rounded-xl shadow-lg">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  AI応援メッセージ
                </h3>
              </div>
              <button
                onClick={() => setAiDialogOpen(null)}
                disabled={aiLoading}
                className="group relative w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                <span className="text-slate-400 group-hover:text-slate-600 text-2xl font-light transition-colors">✕</span>
              </button>
            </div>

            {/* コンテキスト入力（生成前） */}
            {!aiMessage && !aiLoading && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50 rounded-2xl p-4 border border-purple-100">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <span className="font-semibold text-purple-700">一言コンテキスト</span>を入力すると、それを踏まえたメッセージを生成します。<br />
                    <span className="text-xs text-slate-600">空欄でも学習データから自動生成します。</span>
                  </p>
                </div>
                <input
                  type="text"
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="例：今週の授業で集中できていました"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200"
                  maxLength={100}
                />
                <Button
                  onClick={() => handleGenerateAI(aiDialogOpen.studentId, aiDialogOpen.logId, aiContext)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-700 text-white font-bold shadow-lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />生成する
                </Button>
                <Button onClick={() => setAiDialogOpen(null)} variant="ghost" className="w-full text-slate-500">
                  キャンセル
                </Button>
              </div>
            )}

            {aiLoading && (
              <div className="py-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative animate-spin inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
                </div>
                <p className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  AI応援メッセージを生成中...
                </p>
                <p className="text-sm text-slate-500 mt-2">あなたのスタイルを踏まえて考えています</p>
              </div>
            )}

            {aiMessage && !aiLoading && (
              <div className="space-y-4 sm:space-y-5">
                <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-4 sm:p-5 border border-purple-100/50">
                  <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    生成されたメッセージ（編集できます）
                  </label>
                  <div className="relative">
                    <Textarea value={editingMessage} onChange={(e) => setEditingMessage(e.target.value)} rows={4} maxLength={200} className="resize-none w-full p-4 pr-12 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200" />
                    <VoiceInputButton
                      onTranscribed={(text) => {
                        const newText = editingMessage ? `${editingMessage} ${text}` : text
                        setEditingMessage(newText.slice(0, 200))
                      }}
                      className="absolute right-2 bottom-2"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-slate-500">{editingMessage.length}/200文字</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAiMessage(null)
                    setAiDraftMessage(null)
                    setEditingMessage("")
                  }}
                  className="w-full text-sm text-slate-500 hover:text-purple-600 transition-colors py-2 flex items-center justify-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  コンテキストを変えて再生成
                </button>

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => setAiDialogOpen(null)}
                    className="flex-1 py-3 px-6 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-200"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSendAIMessage}
                    disabled={!editingMessage.trim()}
                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    送信する
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {customDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>カスタム応援メッセージ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="生徒への応援メッセージを入力してください" rows={6} maxLength={200} className="resize-none pr-12" />
                <VoiceInputButton
                  onTranscribed={(text) => {
                    const newText = customMessage ? `${customMessage} ${text}` : text
                    setCustomMessage(newText.slice(0, 200))
                  }}
                  className="absolute right-2 bottom-2"
                />
              </div>
              <p className="text-xs text-slate-500 text-right">{customMessage.length} / 200文字</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCustomDialogOpen(null); setCustomMessage("") }} className="flex-1">キャンセル</Button>
                <Button onClick={handleSendCustomMessage} disabled={!customMessage.trim()} className="flex-1">送信</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <CoachBottomNavigation />
    </div>
  )
}
