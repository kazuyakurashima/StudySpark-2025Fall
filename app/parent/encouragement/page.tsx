"use client"

import { useState, useEffect } from "react"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ParentBottomNavigation } from "@/components/parent-bottom-navigation"
import { Heart, Star, ThumbsUp, Sparkles, ChevronDown, ChevronUp, Loader2, MessageSquare } from "lucide-react"
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
                  {/* 応援済みメッセージ表示 - ホーム機能と同じフォーマット */}
                  {hasEncouragement && log.encouragement_messages && log.encouragement_messages.length > 0 && (
                    <div className="space-y-3">
                      {log.encouragement_messages.map((msg: any, msgIndex: number) => {
                        const getAvatarSrc = (avatarId: string | null | undefined) => {
                          if (!avatarId) return null
                          if (avatarId.startsWith("http")) return avatarId

                          // 保護者アバター
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
                        const sentAt = new Date(msg.sent_at).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })

                        return (
                          <div
                            key={msgIndex}
                            className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-pink-100 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12 border-3 border-pink-200 flex-shrink-0 shadow-md">
                                <AvatarImage src={getAvatarSrc(senderAvatar) || "/placeholder.svg"} alt={senderName} />
                                <AvatarFallback className="bg-pink-100 text-pink-700 font-bold text-lg">
                                  {senderName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-bold text-slate-800 text-lg">{senderName}</span>
                                  <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                                    {sentAt}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-4 w-4 text-pink-500" />
                                    <span className="text-xs text-pink-600 font-medium">応援</span>
                                  </div>
                                </div>
                                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                                  <p className="text-base leading-relaxed text-slate-700 font-medium">
                                    {msg.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* クイック応援ボタン + AI応援ボタン - 常に表示 */}
                  {!hasEncouragement && (
                    <div className="space-y-2.5">
                      <Button
                        onClick={() => handleQuickEncouragement(log.id, "heart")}
                        className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                          bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100
                          hover:from-rose-100 hover:via-pink-100 hover:to-rose-200
                          text-rose-700 border border-rose-200/50 shadow-sm hover:shadow-md
                          transform hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300 ease-out
                          flex items-center justify-center gap-2"
                      >
                        <Heart className="h-4 w-4 group-hover:scale-110 transition-transform duration-300 fill-rose-500" />
                        <span>がんばったね</span>
                      </Button>
                      <Button
                        onClick={() => handleQuickEncouragement(log.id, "star")}
                        className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                          bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100
                          hover:from-amber-100 hover:via-yellow-100 hover:to-amber-200
                          text-amber-700 border border-amber-200/50 shadow-sm hover:shadow-md
                          transform hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300 ease-out
                          flex items-center justify-center gap-2"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">⭐</span>
                        <span>すごい！</span>
                      </Button>
                      <Button
                        onClick={() => handleQuickEncouragement(log.id, "thumbsup")}
                        className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                          bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100
                          hover:from-sky-100 hover:via-blue-100 hover:to-sky-200
                          text-sky-700 border border-sky-200/50 shadow-sm hover:shadow-md
                          transform hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300 ease-out
                          flex items-center justify-center gap-2"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">👍</span>
                        <span>よくできました</span>
                      </Button>
                      {/* AI応援ボタン - デフォルト表示 */}
                      <Button
                        onClick={() => handleOpenAIDialog(log.id)}
                        className="group relative w-full py-3.5 px-4 rounded-xl text-sm overflow-hidden
                          bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100
                          hover:from-violet-100 hover:via-purple-100 hover:to-violet-200
                          text-violet-700 border border-violet-200/50 shadow-sm hover:shadow-md
                          transform hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300 ease-out
                          flex items-center justify-center gap-2"
                      >
                        {/* シマー効果 */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent
                          translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                        <Sparkles className="h-4 w-4 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 fill-violet-500" />
                        <span className="relative z-10 tracking-wide">AI応援メッセージ</span>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
        </div>

        {/* AI応援ダイアログ - プレミアムデザイン */}
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

            {aiLoading ? (
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
                        checked={selectedAiMessage === message}
                        onChange={() => handleSelectAIMessage(message)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`message-${index}`}
                        className={`block p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                          selectedAiMessage === message
                            ? "border-purple-400 bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 shadow-lg scale-[1.02]"
                            : "border-slate-200 bg-white hover:border-purple-200 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            selectedAiMessage === message
                              ? "border-purple-500 bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg scale-110"
                              : "border-slate-300 group-hover:border-purple-300"
                          }`}>
                            {selectedAiMessage === message && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${
                                selectedAiMessage === message
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
                {selectedAiMessage && (
                  <div className="mt-6 sm:mt-8 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-4 sm:p-5 border border-purple-100/50">
                    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      メッセージを編集（任意）
                    </label>
                    <textarea
                      value={editingMessage}
                      onChange={(e) => setEditingMessage(e.target.value)}
                      placeholder="選択したメッセージを編集できます..."
                      className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-sm sm:text-base resize-none"
                      rows={4}
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-slate-500">{editingMessage.length}/200文字</span>
                    </div>
                  </div>
                )}

                {/* 送信ボタン - プレミアムデザイン */}
                <div className="flex gap-3 mt-6 sm:mt-8">
                  <Button
                    onClick={() => setAiDialogOpen(null)}
                    className="flex-1 py-3 px-6 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-200"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSendAIMessage}
                    disabled={!editingMessage}
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
