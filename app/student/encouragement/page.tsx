"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, ChevronDown, ChevronUp, Loader2, ArrowLeft } from "lucide-react"
import { getAllEncouragementMessages, markEncouragementAsRead } from "@/app/actions/encouragement"
import Link from "next/link"

export default function StudentEncouragementPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const [filters, setFilters] = useState({
    senderRole: "all" as "parent" | "coach" | "all",
    subject: "all" as string,
    period: "1month" as "1week" | "1month" | "all",
    sortOrder: "desc" as "asc" | "desc",
  })

  useEffect(() => {
    loadMessages()
  }, [filters])

  const loadMessages = async () => {
    setLoading(true)
    const result = await getAllEncouragementMessages(filters)

    if (result.success) {
      setMessages(result.messages)
    }
    setLoading(false)
  }

  const toggleCard = (index: number) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCards(newExpanded)
  }

  const handleCardClick = async (messageId: string, index: number) => {
    // 既読処理
    await markEncouragementAsRead(messageId)

    // カード展開
    toggleCard(index)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "今日"
    if (diffDays === 1) return "昨日"
    if (diffDays < 7) return `${diffDays}日前`

    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
  }

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coach-LENT7C1nR9yWT7UBNTHgxnWakF66Pr.png",
      ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
      parent1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
      parent2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
      parent3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
      parent4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
      parent5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
      parent6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
    }
    return avatarMap[avatarId] || avatarMap["parent1"]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 pb-6">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <Link href="/student">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Heart className="h-6 w-6 text-pink-500" />
              応援メッセージ
            </h1>
            <p className="text-sm text-slate-600 mt-1">保護者・指導者からの応援</p>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            value={filters.senderRole}
            onValueChange={(value: any) => setFilters({ ...filters, senderRole: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全員</SelectItem>
              <SelectItem value="parent">保護者</SelectItem>
              <SelectItem value="coach">指導者</SelectItem>
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

          <Select
            value={filters.sortOrder}
            onValueChange={(value: any) => setFilters({ ...filters, sortOrder: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">新しい順</SelectItem>
              <SelectItem value="asc">古い順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-600">
              <Heart className="h-12 w-12 mx-auto mb-4 text-pink-300" />
              <p>応援メッセージがありません</p>
              <p className="text-sm mt-2">保護者や指導者からの応援を待ちましょう！</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((msg, index) => {
            const isExpanded = expandedCards.has(index)
            const senderProfile = msg.sender_profile
            const studyLog = msg.study_logs

            const accuracy =
              studyLog && studyLog.total_problems > 0
                ? Math.round((studyLog.correct_count / studyLog.total_problems) * 100)
                : null

            return (
              <Card
                key={msg.id}
                className={`transition-all ${!msg.is_read ? "border-pink-300 bg-pink-50/50" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                        <AvatarImage src={getAvatarSrc(senderProfile?.avatar || "parent1")} />
                        <AvatarFallback>{senderProfile?.nickname?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{senderProfile?.nickname || "応援者"}</CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              msg.sender_role === "coach"
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-pink-100 text-pink-700 border-pink-300"
                            }
                          >
                            {msg.sender_role === "coach" ? "指導者" : "保護者"}
                          </Badge>
                          {!msg.is_read && (
                            <Badge variant="default" className="bg-pink-500">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">{formatDate(msg.sent_at)}</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 応援メッセージ */}
                  <div className="bg-white p-4 rounded-lg border border-pink-100">
                    <p className="text-slate-800 whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {/* 詳細表示切り替え */}
                  {studyLog && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => handleCardClick(msg.id, index)}
                        className="w-full text-sm"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            学習記録を閉じる
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            学習記録を見る
                          </>
                        )}
                      </Button>

                      {/* 詳細表示 */}
                      {isExpanded && (
                        <div className="space-y-3 pt-3 border-t border-slate-200">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-50 p-3 rounded-lg">
                              <span className="text-slate-600">科目:</span>
                              <p className="font-medium text-slate-800 mt-1">
                                {Array.isArray(studyLog.subjects)
                                  ? studyLog.subjects[0]?.name
                                  : studyLog.subjects?.name || "不明"}
                              </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                              <span className="text-slate-600">学習回:</span>
                              <p className="font-medium text-slate-800 mt-1">
                                第
                                {Array.isArray(studyLog.study_sessions)
                                  ? studyLog.study_sessions[0]?.session_number
                                  : studyLog.study_sessions?.session_number || "?"}
                                回
                              </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                              <span className="text-slate-600">学習内容:</span>
                              <p className="font-medium text-slate-800 mt-1">
                                {Array.isArray(studyLog.study_content_types)
                                  ? studyLog.study_content_types[0]?.name
                                  : studyLog.study_content_types?.name || "不明"}
                              </p>
                            </div>
                            {accuracy !== null && (
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="text-slate-600">正答率:</span>
                                <p className="font-medium text-primary mt-1">{accuracy}%</p>
                              </div>
                            )}
                          </div>

                          {studyLog.reflection_text && (
                            <div className="bg-slate-50 p-3 rounded-lg text-sm">
                              <span className="text-slate-600">振り返り:</span>
                              <p className="mt-1 text-slate-800">{studyLog.reflection_text}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
