"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getEncouragementHistory } from "@/app/actions/reflect"
import { Heart, ChevronDown, ChevronUp } from "lucide-react"

export function EncouragementHistory() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("1month")
  const [sortBy, setSortBy] = useState("date")
  const [displayMode, setDisplayMode] = useState<"partial" | "full">("partial")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadHistory()
  }, [subjectFilter, periodFilter, sortBy, displayMode])

  const loadHistory = async () => {
    setLoading(true)
    const result = await getEncouragementHistory({
      subjectFilter,
      periodFilter,
      sortBy,
      displayMode,
    })

    if (!result.error) {
      setMessages(result.messages || [])
    }
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return "/avatars/default.png"
    if (avatar.startsWith("http")) return avatar

    // 保護者アバター（parent1-6）のURL対応
    const parentAvatarMap: Record<string, string> = {
      "parent1": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
      "parent2": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
      "parent3": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
      "parent4": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
      "parent5": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
      "parent6": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
    }

    if (parentAvatarMap[avatar]) {
      return parentAvatarMap[avatar]
    }

    // 生徒アバター（従来通り）
    return `/avatars/${avatar}.png`
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          応援履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* フィルター */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium mb-2 block">科目</label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全科目</SelectItem>
                <SelectItem value="math">算数</SelectItem>
                <SelectItem value="japanese">国語</SelectItem>
                <SelectItem value="science">理科</SelectItem>
                <SelectItem value="social">社会</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium mb-2 block">期間</label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1week">1週間</SelectItem>
                <SelectItem value="1month">1ヶ月</SelectItem>
                <SelectItem value="all">全て</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium mb-2 block">並び替え</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">記録日時</SelectItem>
                <SelectItem value="session">学習回</SelectItem>
                <SelectItem value="accuracy">正答率</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium mb-2 block">表示</label>
            <Select
              value={displayMode}
              onValueChange={(value) => setDisplayMode(value as "partial" | "full")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partial">一部表示</SelectItem>
                <SelectItem value="full">全表示</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 応援履歴リスト */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            該当する応援メッセージがありません
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isExpanded = expandedIds.has(message.id)
              const studyLog = message.study_logs

              const accuracy = studyLog?.total_problems > 0
                ? Math.round((studyLog.correct_count / studyLog.total_problems) * 100)
                : 0

              const sessionNum = studyLog?.study_sessions?.session_number || studyLog?.session_id || 0
              const startDate = studyLog?.study_sessions?.start_date
                ? new Date(studyLog.study_sessions.start_date)
                : null
              const endDate = studyLog?.study_sessions?.end_date
                ? new Date(studyLog.study_sessions.end_date)
                : null

              let sessionDisplay = `第${sessionNum}回`
              if (startDate && endDate) {
                const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
                const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`
                sessionDisplay = `第${sessionNum}回(${startStr}〜${endStr})`
              }

              return (
                <div
                  key={message.id}
                  className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border border-pink-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => toggleExpand(message.id)}
                >
                  {/* 常に表示される部分 */}
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={getAvatarUrl(message.sender_profile?.avatar_id)}
                      alt="avatar"
                      className="w-12 h-12 rounded-full border-2 border-white shadow-md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {message.sender_profile?.nickname || message.sender_profile?.display_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {message.sender_role === "parent" ? "保護者" : "指導者"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(message.sent_at)}
                      </p>
                    </div>
                    {displayMode === "partial" && (
                      <Button variant="ghost" size="sm">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-md shadow-sm mb-3">
                    <p className="text-sm leading-relaxed">{message.message}</p>
                  </div>

                  {/* 学習記録詳細（デフォルト非表示、全表示モードまたは展開時に表示） */}
                  {(displayMode === "full" || isExpanded) && studyLog && (
                    <div className="mt-3 p-3 bg-white/80 rounded-md border-l-4 border-primary">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        関連する学習記録
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">生徒記録日時:</span>{" "}
                          {formatDate(studyLog.logged_at || studyLog.study_date)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">学習回:</span> {sessionDisplay}
                        </div>
                        <div>
                          <span className="text-muted-foreground">科目:</span>{" "}
                          {studyLog.subjects?.name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">学習内容:</span>{" "}
                          {studyLog.study_content_types?.content_name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">正答率:</span>{" "}
                          <span className="font-semibold">{accuracy}%</span> (
                          {studyLog.correct_count}/{studyLog.total_problems}問)
                        </div>
                      </div>
                      {studyLog.reflection_text && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">今日の振り返り:</p>
                          <p className="text-sm">{studyLog.reflection_text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
