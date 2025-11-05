"use client"

import { useState, useEffect } from "react"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ParentBottomNavigation } from "@/components/parent-bottom-navigation"
import { Heart, Star, ThumbsUp, Sparkles, MessageSquare, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import {
  getStudyLogsForEncouragement,
  sendQuickEncouragement,
  generateAIEncouragement,
  sendCustomEncouragement,
} from "@/app/actions/encouragement"
import type { QuickEncouragementType } from "@/lib/openai/prompts"
import { UserProfileProvider, useUserProfile } from "@/lib/hooks/use-user-profile"

function ParentEncouragementPageInner() {
  const { profile, children, setSelectedChildId: setProviderChildId } = useUserProfile()
  const [selectedChild, setSelectedChild] = useState("student1")
  const [studyLogs, setStudyLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [encouragementStatus, setEncouragementStatus] = useState<{ [childId: number]: boolean }>({})

  // フィルター・ソート状態
  const [filters, setFilters] = useState({
    hasEncouragement: "not_sent" as "all" | "sent" | "not_sent",
    subject: "all" as string,
    period: "1month" as "1week" | "1month" | "all",
    sortBy: "date" as "date" | "session" | "accuracy",
    sortOrder: "desc" as "asc" | "desc",
  })

  // AI応援ダイアログ状態
  const [aiDialogOpen, setAiDialogOpen] = useState<string | null>(null)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedAiMessage, setSelectedAiMessage] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState("")

  // カスタム応援ダイアログ状態
  const [customDialogOpen, setCustomDialogOpen] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState("")

  // Daily Spark の応援状態をチェック
  useEffect(() => {
    const checkEncouragementStatus = async () => {
      if (!children || children.length === 0 || !profile?.id) return

      const { getDailySparkLevel } = await import("@/app/actions/daily-spark")
      const statusMap: { [childId: number]: boolean } = {}

      for (const child of children) {
        const childIdNumber = parseInt(child.id, 10)
        const level = await getDailySparkLevel(childIdNumber, profile.id)
        statusMap[childIdNumber] = level === "parent" || level === "both"
      }

      setEncouragementStatus(statusMap)
    }

    checkEncouragementStatus()
  }, [children, profile?.id])

  // 最初の子供が読み込まれたらProviderにも設定
  useEffect(() => {
    if (children && children.length > 0 && selectedChild === "student1") {
      const firstChildId = parseInt(children[0].id, 10)
      setSelectedChild(children[0].id)
      setProviderChildId(firstChildId)
    }
  }, [children, selectedChild, setProviderChildId])

  useEffect(() => {
    loadStudyLogs()
  }, [selectedChild, filters])

  const loadStudyLogs = async () => {
    setLoading(true)
    const result = await getStudyLogsForEncouragement(selectedChild, filters)

    if (result.success) {
      let logs = result.logs

      // 1ヶ月フィルターで5件未満の場合、全期間に自動変更
      if (filters.period === "1month" && logs.length < 5) {
        const allResult = await getStudyLogsForEncouragement(selectedChild, {
          ...filters,
          period: "all",
        })
        if (allResult.success) {
          logs = allResult.logs
        }
      }

      setStudyLogs(logs)
    }
    setLoading(false)
  }

  const toggleCard = (logId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedCards(newExpanded)
  }

  const handleQuickEncouragement = async (studyLogId: string, quickType: QuickEncouragementType) => {
    const result = await sendQuickEncouragement(selectedChild, studyLogId, quickType)
    if (result.success) {
      // 即座にハートバッジを更新
      setEncouragementStatus(prev => ({ ...prev, [Number(selectedChild)]: true }))
      await loadStudyLogs()
    } else {
      alert(result.error)
    }
  }

  const handleOpenAIDialog = async (studyLogId: string) => {
    setAiDialogOpen(studyLogId)
    setAiLoading(true)
    setAiMessages([])
    setSelectedAiMessage(null)
    setEditingMessage("")

    const result = await generateAIEncouragement(selectedChild, studyLogId)
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

    const result = await sendCustomEncouragement(selectedChild, aiDialogOpen, editingMessage, "ai")
    if (result.success) {
      // 即座にハートバッジを更新
      setEncouragementStatus(prev => ({ ...prev, [Number(selectedChild)]: true }))
      setAiDialogOpen(null)
      await loadStudyLogs()
    } else {
      alert(result.error)
    }
  }

  const handleSendCustomMessage = async () => {
    if (!customDialogOpen || !customMessage) return

    const result = await sendCustomEncouragement(selectedChild, customDialogOpen, customMessage, "custom")
    if (result.success) {
      // 即座にハートバッジを更新
      setEncouragementStatus(prev => ({ ...prev, [Number(selectedChild)]: true }))
      setCustomDialogOpen(null)
      setCustomMessage("")
      await loadStudyLogs()
    } else {
      alert(result.error)
    }
  }

  return (
    <>
      <UserProfileHeader encouragementStatus={encouragementStatus} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Heart}
          title="応援履歴"
          subtitle="送った応援メッセージを確認"
          variant="parent"
        />

      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* フィルター・ソート */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-md border">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Select
            value={filters.hasEncouragement}
            onValueChange={(value: any) => setFilters({ ...filters, hasEncouragement: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_sent">未応援</SelectItem>
              <SelectItem value="sent">応援済み</SelectItem>
              <SelectItem value="all">全表示</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.subject} onValueChange={(value) => setFilters({ ...filters, subject: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全科目</SelectItem>
              <SelectItem value="算数">算数</SelectItem>
              <SelectItem value="国語">国語</SelectItem>
              <SelectItem value="理科">理科</SelectItem>
              <SelectItem value="社会">社会</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.period} onValueChange={(value: any) => setFilters({ ...filters, period: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1week">1週間</SelectItem>
              <SelectItem value="1month">1ヶ月</SelectItem>
              <SelectItem value="all">全て</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sortBy} onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">記録日時</SelectItem>
              <SelectItem value="session">学習回</SelectItem>
              <SelectItem value="accuracy">正答率</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortOrder}
            onValueChange={(value: any) => setFilters({ ...filters, sortOrder: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">降順</SelectItem>
              <SelectItem value="asc">昇順</SelectItem>
            </SelectContent>
          </Select>
            </div>
          </CardContent>
        </Card>

        {/* 学習記録一覧 */}
        <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : studyLogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-600">
              <p>該当する学習記録がありません</p>
            </CardContent>
          </Card>
        ) : (
          studyLogs.map((log) => {
            const isExpanded = expandedCards.has(log.id)
            const accuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
            const hasEncouragement =
              Array.isArray(log.encouragement_messages) && log.encouragement_messages.length > 0

            return (
              <Card key={log.id} className={hasEncouragement ? "border-green-200 bg-green-50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name || "科目不明"}
                      </CardTitle>
                      {hasEncouragement && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          応援済み
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(log.study_date).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                    <span>
                      第
                      {Array.isArray(log.study_sessions)
                        ? log.study_sessions[0]?.session_number
                        : log.study_sessions?.session_number || "?"}
                      回
                    </span>
                    <span className="font-semibold text-primary">正答率 {accuracy}%</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* クイック応援ボタン（常に表示） */}
                  {!hasEncouragement && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickEncouragement(log.id, "heart")}
                        className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-50"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        いつも頑張っているね
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickEncouragement(log.id, "star")}
                        className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      >
                        <Star className="h-4 w-4 mr-1" />
                        すごい！
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickEncouragement(log.id, "thumbsup")}
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        よくできました
                      </Button>
                    </div>
                  )}

                  {/* 詳細表示切り替えボタン */}
                  <Button variant="ghost" onClick={() => toggleCard(log.id)} className="w-full">
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        詳細を閉じる
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        詳細を表示
                      </>
                    )}
                  </Button>

                  {/* 詳細表示（展開時） */}
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
                        <div>
                          <span className="text-slate-600">正答数:</span>
                          <p className="font-medium">
                            {log.correct_count} / {log.total_problems}問
                          </p>
                        </div>
                      </div>

                      {log.reflection_text && (
                        <div className="text-sm">
                          <span className="text-slate-600">今日の振り返り:</span>
                          <p className="mt-1 p-3 bg-slate-50 rounded-lg">{log.reflection_text}</p>
                        </div>
                      )}

                      {/* AI応援・カスタム応援ボタン（詳細展開時のみ） */}
                      {!hasEncouragement && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenAIDialog(log.id)}
                            className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            AI応援
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setCustomDialogOpen(log.id)}
                            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            カスタム応援
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

        {/* AI応援ダイアログ */}
      {aiDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>AI応援メッセージ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-slate-600">応援メッセージを生成中...</p>
                </div>
              ) : (
                <>
                  {aiMessages.map((message, index) => (
                    <Button
                      key={index}
                      variant={selectedAiMessage === message ? "default" : "outline"}
                      onClick={() => handleSelectAIMessage(message)}
                      className="w-full text-left h-auto p-4 whitespace-normal"
                    >
                      {message}
                    </Button>
                  ))}

                  {selectedAiMessage && (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-600">メッセージを編集できます:</label>
                      <Textarea
                        value={editingMessage}
                        onChange={(e) => setEditingMessage(e.target.value)}
                        rows={4}
                        maxLength={200}
                        className="resize-none"
                      />
                      <p className="text-xs text-slate-500 text-right">{editingMessage.length} / 200文字</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setAiDialogOpen(null)} className="flex-1">
                      キャンセル
                    </Button>
                    <Button onClick={handleSendAIMessage} disabled={!editingMessage} className="flex-1">
                      送信
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* カスタム応援ダイアログ */}
      {customDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>カスタム応援メッセージ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="お子さんへの応援メッセージを入力してください"
                rows={6}
                maxLength={200}
                className="resize-none"
              />
              <p className="text-xs text-slate-500 text-right">{customMessage.length} / 200文字</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomDialogOpen(null)
                    setCustomMessage("")
                  }}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button onClick={handleSendCustomMessage} disabled={!customMessage.trim()} className="flex-1">
                  送信
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>

      <ParentBottomNavigation activeTab="encouragement" />
    </div>
    </>
  )
}

/**
 * 保護者応援履歴ページ（Context Provider付き）
 */
export default function ParentEncouragementPage() {
  return (
    <UserProfileProvider>
      <ParentEncouragementPageInner />
    </UserProfileProvider>
  )
}
