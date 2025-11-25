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
import { Heart, Star, ThumbsUp, Sparkles, MessageSquare, ChevronDown, ChevronUp, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
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

  // AI応援ダイアログ状態
  const [aiDialogOpen, setAiDialogOpen] = useState<{ studentId: string; logId: string } | null>(null)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedAiMessage, setSelectedAiMessage] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState("")

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

  const handleOpenAIDialog = async (studentId: string, studyLogId: string) => {
    setAiDialogOpen({ studentId, logId: studyLogId })
    setAiLoading(true)
    setAiMessages([])
    setSelectedAiMessage(null)
    setEditingMessage("")

    const result = await generateCoachAIEncouragement(studentId, studyLogId)
    setAiLoading(false)

    if (result.success) {
      setAiMessages(result.messages)
    } else {
      alert(result.error)
      setAiDialogOpen(null)
    }
  }

  const handleSelectAIMessage = (message: string) => {
    setSelectedAiMessage(message)
    setEditingMessage(message)
  }

  const handleSendAIMessage = async () => {
    if (!aiDialogOpen || !editingMessage) return

    const result = await sendCoachCustomEncouragement(aiDialogOpen.studentId, aiDialogOpen.logId, editingMessage, "ai")
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
            ) : studyLogs.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-600"><p>該当する学習記録がありません</p></CardContent></Card>
            ) : (
              studyLogs.map((log) => {
                const isExpanded = expandedCards.has(log.id)
                const accuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
                const hasCoachEncouragement = Array.isArray(log.encouragement_messages) && log.encouragement_messages.some((msg: any) => msg.sender_role === "coach")
                const student = Array.isArray(log.students) ? log.students[0] : log.students
                const profile = student?.profiles
                const fullName = student?.full_name || "生徒"
                const nickname = profile?.nickname
                const displayName = nickname && nickname !== fullName ? `${fullName}（${nickname}）` : fullName
                const avatarId = profile?.avatar_id
                const avatarSrc = avatarId ? getAvatarById(avatarId)?.src || "/placeholder.svg" : "/placeholder.svg"

                return (
                  <Card key={log.id} className={hasCoachEncouragement ? "border-green-200 bg-green-50" : ""}>
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
                              {student?.grade && <Badge variant="outline" className="text-xs">小{student.grade}</Badge>}
                              {hasCoachEncouragement && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">応援済み</Badge>}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name || "科目不明"} · 第{Array.isArray(log.study_sessions) ? log.study_sessions[0]?.session_number : log.study_sessions?.session_number || "?"}回
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">{new Date(log.study_date).toLocaleDateString("ja-JP")}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-primary">正答率 {accuracy}%</span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {!hasCoachEncouragement && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleQuickEncouragement(student.id, log.id, "heart")} className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-50">
                            <Heart className="h-4 w-4 mr-1" />頑張ったね
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleQuickEncouragement(student.id, log.id, "star")} className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                            <Star className="h-4 w-4 mr-1" />すごい！
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleQuickEncouragement(student.id, log.id, "thumbsup")} className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                            <ThumbsUp className="h-4 w-4 mr-1" />よくできました
                          </Button>
                        </div>
                      )}

                      <Button variant="ghost" onClick={() => toggleCard(log.id)} className="w-full">
                        {isExpanded ? (<><ChevronUp className="h-4 w-4 mr-1" />詳細を閉じる</>) : (<><ChevronDown className="h-4 w-4 mr-1" />詳細を表示</>)}
                      </Button>

                      {isExpanded && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">学習内容:</span>
                              <p className="font-medium">
                                {Array.isArray(log.study_content_types)
                                  ? log.study_content_types[0]?.content_name
                                  : log.study_content_types?.content_name || "不明"}
                              </p>
                            </div>
                            <div><span className="text-slate-600">正答数:</span><p className="font-medium">{log.correct_count} / {log.total_problems}問</p></div>
                          </div>

                          {log.reflection_text && (
                            <div className="text-sm"><span className="text-slate-600">今日の振り返り:</span><p className="mt-1 p-3 bg-slate-50 rounded-lg">{log.reflection_text}</p></div>
                          )}

                          {Array.isArray(log.encouragement_messages) && log.encouragement_messages.length > 0 && (
                            <div className="text-sm"><span className="text-slate-600">応援履歴:</span>
                              <div className="mt-2 space-y-2">
                                {log.encouragement_messages.map((msg: any, idx: number) => (
                                  <div key={idx} className={`p-3 rounded-lg ${msg.sender_role === "coach" ? "bg-green-50 border border-green-200" : "bg-pink-50 border border-pink-200"}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant="outline" className={msg.sender_role === "coach" ? "bg-green-100 text-green-700 border-green-300" : "bg-pink-100 text-pink-700 border-pink-300"}>
                                        {msg.sender_role === "coach" ? "指導者" : "保護者"}
                                      </Badge>
                                      <span className="text-xs text-slate-500">{new Date(msg.created_at).toLocaleString("ja-JP")}</span>
                                    </div>
                                    <p className="text-sm">{msg.message}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!hasCoachEncouragement && (
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => handleOpenAIDialog(student.id, log.id)} className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                                <Sparkles className="h-4 w-4 mr-1" />AI応援
                              </Button>
                              <Button variant="outline" onClick={() => setCustomDialogOpen({ studentId: student.id, logId: log.id })} className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50">
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
                const avatarSrc = avatarId ? getAvatarById(avatarId)?.src || "/placeholder.svg" : "/placeholder.svg"

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader><CardTitle>AI応援メッセージ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {aiLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-slate-600">応援メッセージを生成中...</p>
                </div>
              ) : (
                <>
                  {aiMessages.map((message, index) => (
                    <Button key={index} variant={selectedAiMessage === message ? "default" : "outline"} onClick={() => handleSelectAIMessage(message)} className="w-full text-left h-auto p-4 whitespace-normal">
                      {message}
                    </Button>
                  ))}

                  {selectedAiMessage && (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-600">メッセージを編集できます:</label>
                      <Textarea value={editingMessage} onChange={(e) => setEditingMessage(e.target.value)} rows={4} maxLength={200} className="resize-none" />
                      <p className="text-xs text-slate-500 text-right">{editingMessage.length} / 200文字</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setAiDialogOpen(null)} className="flex-1">キャンセル</Button>
                    <Button onClick={handleSendAIMessage} disabled={!editingMessage} className="flex-1">送信</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {customDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>カスタム応援メッセージ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="生徒への応援メッセージを入力してください" rows={6} maxLength={200} className="resize-none" />
              <p className="text-xs text-slate-500 text-right">{customMessage.length} / 200文字</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCustomDialogOpen(null); setCustomMessage("") }} className="flex-1">キャンセル</Button>
                <Button onClick={handleSendCustomMessage} disabled={!customMessage.trim()} className="flex-1">送信</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <CoachBottomNavigation activeTab="encouragement" />
    </div>
  )
}
