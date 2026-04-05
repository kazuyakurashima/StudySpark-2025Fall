"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ParentBottomNavigation } from "@/components/parent-bottom-navigation"
import { Heart, Star, ThumbsUp, Sparkles, ChevronDown, ChevronUp, Loader2, MessageSquare, Layers } from "lucide-react"
import {
  getStudyLogsForEncouragement,
  sendQuickEncouragement,
  generateAIEncouragement,
  sendCustomEncouragement,
} from "@/app/actions/encouragement"
import type { QuickEncouragementType } from "@/lib/openai/prompts"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { groupLogsByBatch, calculateSummary, calculateAccuracy, getRepresentativeLog } from "@/lib/utils/batch-grouping"
import type { GroupedLogEntry, StudyLogWithBatch } from "@/lib/types/batch-grouping"
import { VoiceInputButton } from "@/components/ui/voice-input-button"

// 応援用学習ログ型
interface EncouragementLog extends StudyLogWithBatch {
  subjects?: { name: string } | { name: string }[]
  study_sessions?: { session_number: number } | { session_number: number }[]
  study_content_types?: { content_name: string } | { content_name: string }[]
  reflection_text?: string | null
  encouragement_messages?: any[]
}

export default function ParentEncouragementPage() {
  const searchParams = useSearchParams()
  const { profile, children, setSelectedChildId: setProviderChildId, selectedChildId: providerSelectedChildId } = useUserProfile()

  // URLパラメータから child ID を取得
  const childParam = searchParams?.get("child") ?? null

  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [entries, setEntries] = useState<GroupedLogEntry<EncouragementLog>[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [encouragementStatus, setEncouragementStatus] = useState<{ [childId: number]: boolean }>({})

  // フィルター・ソート状態（期間と正答率を削除）
  const [filters, setFilters] = useState({
    hasEncouragement: "not_sent" as "all" | "sent" | "not_sent",
    subject: "all" as string,
    sortBy: "date" as "date" | "session",
    sortOrder: "desc" as "asc" | "desc",
  })

  // AI応援ダイアログ状態
  const [aiDialogOpen, setAiDialogOpen] = useState<string | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiDraftMessage, setAiDraftMessage] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [editingMessage, setEditingMessage] = useState("")
  const [aiContext, setAiContext] = useState("")

  // Daily Spark の応援状態をチェック
  // ページ表示時にも再取得（他ページで応援送信後の反映のため）
  useEffect(() => {
    const checkEncouragementStatus = async () => {
      if (!children || children.length === 0 || !profile?.id) return

      const { getDailySparkLevel } = await import("@/app/actions/daily-spark")
      const statusMap: { [childId: number]: boolean } = {}

      for (const child of children) {
        const level = await getDailySparkLevel(child.id)
        statusMap[child.id] = level === "parent" || level === "both"
      }

      setEncouragementStatus(statusMap)
    }

    // 初回実行
    checkEncouragementStatus()

    // ページがフォーカスされた時に再チェック（他ページで応援送信後の更新用）
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkEncouragementStatus()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [children, profile?.id])

  // URL パラメータの child ID をプロバイダーに反映（初回のみ）
  useEffect(() => {
    if (childParam && children && children.length > 0) {
      const childId = parseInt(childParam, 10)
      const child = children.find(c => c.id === childId)
      if (child) {
        setProviderChildId(childId)
      }
    }
  }, [childParam, children, setProviderChildId])

  // プロバイダーの selectedChildId が確定したら、選択中の子どもを設定
  useEffect(() => {
    if (!children || children.length === 0) return

    if (providerSelectedChildId !== null) {
      // プロバイダーから取得したIDで子どもを選択
      const child = children.find(c => c.id === providerSelectedChildId)
      if (child) {
        setSelectedChild(String(child.id))
      }
    } else if (!selectedChild) {
      // プロバイダーにまだ値がない場合で、selectedChildもない場合は最初の子どもを設定
      const firstChildId = children[0].id
      setSelectedChild(String(children[0].id))
      setProviderChildId(firstChildId)
    }
  }, [providerSelectedChildId, children, selectedChild, setProviderChildId])

  useEffect(() => {
    if (selectedChild) {
      loadStudyLogs(true)
    }
  }, [selectedChild, filters])

  // 生ログ数（ページネーション用）
  const [rawLogCount, setRawLogCount] = useState(0)

  const loadStudyLogs = async (reset = true) => {
    if (!selectedChild) {
      return
    }

    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    const offset = reset ? 0 : rawLogCount
    const result = await getStudyLogsForEncouragement(selectedChild, {
      ...filters,
      limit: 30, // バッチグループ化を考慮して多めに取得
      offset,
    })

    if (result.success) {
      // ログにsubjectフィールドを追加（groupLogsByBatchが必要とする）
      const logsWithSubject = result.logs.map((log: any) => ({
        ...log,
        subject: Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name || "不明",
      }))

      // ソートオプション
      const sortOptions = { sortBy: filters.sortBy, sortOrder: filters.sortOrder }

      if (reset) {
        // バッチグループ化
        const grouped = groupLogsByBatch(logsWithSubject as EncouragementLog[], {
          batchFeedbacks: {},
          legacyFeedbacks: {},
        }, sortOptions)
        setEntries(grouped)
        setRawLogCount(result.logs.length)
      } else {
        // 追加読み込み: 既存ログ + 新規ログを結合してから再グループ化
        setEntries((prev) => {
          const existingLogs = prev.flatMap((entry) =>
            entry.type === "batch" ? entry.logs : [entry.log]
          )
          const allLogs = [...existingLogs, ...logsWithSubject] as EncouragementLog[]
          return groupLogsByBatch(allLogs, {
            batchFeedbacks: {},
            legacyFeedbacks: {},
          }, sortOptions)
        })
        setRawLogCount((prev) => prev + result.logs.length)
      }
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
    } else {
      console.error('[応援機能] エラー:', result.error)
    }

    setLoading(false)
    setLoadingMore(false)
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
    if (!selectedChild) return
    const result = await sendQuickEncouragement(selectedChild, studyLogId, quickType)
    if (result.success) {
      // 即座にハートバッジを更新
      setEncouragementStatus(prev => ({ ...prev, [Number(selectedChild)]: true }))
      await loadStudyLogs(true)
    } else {
      alert(result.error)
    }
  }

  const handleGenerateAI = async (studyLogId: string, context?: string) => {
    if (!selectedChild) return
    setAiDialogOpen(studyLogId)
    setAiLoading(true)
    setAiMessage(null)
    setAiDraftMessage(null)
    setEditingMessage("")

    const result = await generateAIEncouragement(selectedChild, studyLogId, context || undefined)
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

  const handleOpenAIDialog = (studyLogId: string) => {
    if (!selectedChild) return
    setAiDialogOpen(studyLogId)
    setAiMessage(null)
    setAiDraftMessage(null)
    setEditingMessage("")
    setAiContext("")
    setAiLoading(false)
  }

  const handleSendAIMessage = async () => {
    if (!aiDialogOpen || !editingMessage || !selectedChild) return

    const result = await sendCustomEncouragement(selectedChild, aiDialogOpen, editingMessage, "ai", {
      aiDraftMessage: aiDraftMessage || undefined,
      userContext: aiContext || undefined,
    })
    if (result.success) {
      setEncouragementStatus(prev => ({ ...prev, [Number(selectedChild)]: true }))
      setAiDialogOpen(null)
      await loadStudyLogs(true)
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

              <Select value={filters.sortBy} onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">記録日時</SelectItem>
                  <SelectItem value="session">学習回</SelectItem>
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

            {/* 総件数表示 */}
            {totalCount > 0 && (
              <div className="text-xs text-slate-600 mt-3">
                全{totalCount}件中 {rawLogCount}件を表示（{entries.length}グループ）
              </div>
            )}
          </CardContent>
        </Card>

        {/* 学習記録一覧 */}
        <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-600">
              <p>該当する学習記録がありません</p>
            </CardContent>
          </Card>
        ) : (
          <>
          {entries.map((entry) => {
            // エントリから情報を取得
            const isBatch = entry.type === "batch"
            const representativeLog = getRepresentativeLog(entry)
            const summary = calculateSummary(entry)
            const accuracy = calculateAccuracy(summary.totalQuestions, summary.totalCorrect)
            const entryKey = isBatch ? `batch-${entry.batchId}` : `single-${entry.log.id}`
            const isExpanded = expandedCards.has(entryKey)

            // 応援済み判定（どれか1つでも応援があれば応援済み）
            const hasEncouragement = isBatch
              ? entry.logs.some(log => Array.isArray(log.encouragement_messages) && log.encouragement_messages.length > 0)
              : Array.isArray(representativeLog.encouragement_messages) && representativeLog.encouragement_messages.length > 0

            // 代表ログID（応援送信用）
            const representativeLogId = String(representativeLog.id)

            // 科目表示
            const subjectName = isBatch
              ? entry.subjects.join(" · ")
              : (Array.isArray(representativeLog.subjects) ? representativeLog.subjects[0]?.name : representativeLog.subjects?.name) || "科目不明"

            // 日付表示
            const displayDate = isBatch
              ? new Date(entry.latestLoggedAt).toLocaleDateString("ja-JP")
              : new Date(representativeLog.logged_at || representativeLog.study_date).toLocaleDateString("ja-JP")

            // セッション番号
            const sessionNum = Array.isArray(representativeLog.study_sessions)
              ? representativeLog.study_sessions[0]?.session_number
              : representativeLog.study_sessions?.session_number || 0

            return (
              <Card key={entryKey} className={hasEncouragement ? "border-green-200 bg-green-50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isBatch && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          <Layers className="h-3 w-3 mr-1" />
                          {entry.subjects.length}科目
                        </Badge>
                      )}
                      <CardTitle className="text-lg">{subjectName}</CardTitle>
                      {hasEncouragement && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          応援済み
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">{displayDate}</div>
                      <div className="text-lg font-semibold text-primary">{accuracy}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                    <span>第{sessionNum}回</span>
                    <span className="text-xs">
                      {summary.totalCorrect}/{summary.totalQuestions}問
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* バッチの場合は科目別内訳 */}
                  {isBatch && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {entry.logs.map((log) => {
                        const logAccuracy = log.total_problems > 0
                          ? Math.round((log.correct_count / log.total_problems) * 100)
                          : 0
                        const logSubject = Array.isArray(log.subjects) ? log.subjects[0]?.name : log.subjects?.name
                        return (
                          <div key={log.id} className="text-xs p-2 bg-muted/50 rounded border">
                            <div className="font-medium">{logSubject}</div>
                            <div className="text-muted-foreground">
                              {logAccuracy}% ({log.correct_count}/{log.total_problems})
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 応援済みメッセージ表示 */}
                  {hasEncouragement && (
                    <div className="space-y-3">
                      {(isBatch ? entry.logs : [representativeLog]).flatMap((log) =>
                        (log.encouragement_messages || []).map((msg: any, msgIndex: number) => {
                          const getAvatarSrc = (avatarId: string | null | undefined) => {
                            if (!avatarId) return null
                            if (avatarId.startsWith("http")) return avatarId
                            const parentAvatarMap: Record<string, string> = {
                              "parent1": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
                              "parent2": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
                              "parent3": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
                              "parent4": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
                              "parent5": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
                              "parent6": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
                            }
                            if (parentAvatarMap[avatarId]) return parentAvatarMap[avatarId]
                            return `/avatars/${avatarId}.png`
                          }
                          const senderName = msg.sender_profile?.nickname || msg.sender_profile?.display_name || "送信者"
                          const senderAvatar = msg.sender_profile?.avatar_id
                          const sentAt = new Date(msg.sent_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })

                          return (
                            <div key={`${log.id}-${msgIndex}`} className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-pink-100 shadow-lg">
                              <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12 border-3 border-pink-200 flex-shrink-0 shadow-md">
                                  <AvatarImage src={getAvatarSrc(senderAvatar) || "/placeholder.svg"} alt={senderName} />
                                  <AvatarFallback className="bg-pink-100 text-pink-700 font-bold text-lg">{senderName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-bold text-slate-800 text-lg">{senderName}</span>
                                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{sentAt}</span>
                                    <div className="flex items-center gap-1">
                                      <Heart className="h-4 w-4 text-pink-500" />
                                      <span className="text-xs text-pink-600 font-medium">応援</span>
                                    </div>
                                  </div>
                                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                                    <p className="text-base leading-relaxed text-slate-700 font-medium">{msg.message}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* クイック応援ボタン（未応援の場合のみ） */}
                  {!hasEncouragement && (
                    <div className="space-y-2.5">
                      <Button
                        onClick={() => handleQuickEncouragement(representativeLogId, "heart")}
                        className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 hover:from-rose-100 hover:via-pink-100 hover:to-rose-200 text-rose-700 border border-rose-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out flex items-center justify-center gap-2"
                      >
                        <Heart className="h-4 w-4 group-hover:scale-110 transition-transform duration-300 fill-rose-500" />
                        <span>がんばったね</span>
                      </Button>
                      <Button
                        onClick={() => handleQuickEncouragement(representativeLogId, "star")}
                        className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 hover:from-amber-100 hover:via-yellow-100 hover:to-amber-200 text-amber-700 border border-amber-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out flex items-center justify-center gap-2"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">⭐</span>
                        <span>すごい！</span>
                      </Button>
                      <Button
                        onClick={() => handleQuickEncouragement(representativeLogId, "thumbsup")}
                        className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 hover:from-sky-100 hover:via-blue-100 hover:to-sky-200 text-sky-700 border border-sky-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out flex items-center justify-center gap-2"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">👍</span>
                        <span>よくできました</span>
                      </Button>
                      <Button
                        onClick={() => handleOpenAIDialog(representativeLogId)}
                        className="group relative w-full py-3.5 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100 hover:from-violet-100 hover:via-purple-100 hover:to-violet-200 text-violet-700 border border-violet-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out flex items-center justify-center gap-2"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                        <Sparkles className="h-4 w-4 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 fill-violet-500" />
                        <span className="relative z-10 tracking-wide">AI応援メッセージ</span>
                      </Button>
                    </div>
                  )}

                  {/* 詳細表示切り替えボタン */}
                  <Button variant="ghost" onClick={() => toggleCard(entryKey)} className="w-full">
                    {isExpanded ? (
                      <><ChevronUp className="h-4 w-4 mr-1" />詳細を閉じる</>
                    ) : (
                      <><ChevronDown className="h-4 w-4 mr-1" />詳細を表示</>
                    )}
                  </Button>

                  {/* 詳細表示（展開時） */}
                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t">
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
                          <div>
                            <span className="text-slate-600">正答数:</span>
                            <p className="font-medium">{representativeLog.correct_count} / {representativeLog.total_problems}問</p>
                          </div>
                          {representativeLog.reflection_text && (
                            <div className="col-span-2 text-sm">
                              <span className="text-slate-600">今日の振り返り:</span>
                              <p className="mt-1 p-3 bg-slate-50 rounded-lg">{representativeLog.reflection_text}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* さらに表示ボタン */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => loadStudyLogs(false)} disabled={loadingMore} variant="outline" className="w-full max-w-md py-3">
                {loadingMore ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />読み込み中...</>) : (<><ChevronDown className="h-4 w-4 mr-2" />さらに表示</>)}
              </Button>
            </div>
          )}
          </>
        )}
        </div>

        {/* AI応援ダイアログ - パーソナライズ対応 */}
      {aiDialogOpen && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200" onClick={() => !aiLoading && setAiDialogOpen(null)}>
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
                  placeholder="例：最近よく頑張っているね"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200"
                  maxLength={100}
                />
                <Button
                  onClick={() => handleGenerateAI(aiDialogOpen, aiContext)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-700 text-white font-bold shadow-lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />生成する
                </Button>
                <Button
                  onClick={() => setAiDialogOpen(null)}
                  variant="ghost"
                  className="w-full text-slate-500"
                >
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
                {/* 生成されたメッセージ編集 */}
                <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-4 sm:p-5 border border-purple-100/50">
                  <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    生成されたメッセージ（編集できます）
                  </label>
                  <div className="relative">
                    <textarea
                      value={editingMessage}
                      onChange={(e) => setEditingMessage(e.target.value)}
                      className="w-full p-4 pr-12 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-sm sm:text-base resize-none"
                      rows={4}
                      maxLength={200}
                    />
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

                {/* 再生成ボタン */}
                <button
                  onClick={() => {
                    setAiMessage(null)
                    setAiDraftMessage(null)
                    setEditingMessage("")
                  }}
                  className="w-full text-sm text-slate-500 hover:text-purple-600 transition-colors py-2 flex items-center justify-center gap-1"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  コンテキストを変えて再生成
                </button>

                {/* 送信ボタン */}
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
      </div>

      <ParentBottomNavigation activeTab="encouragement" selectedChildId={providerSelectedChildId} />
    </div>
    </>
  )
}
