"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCoachingHistory } from "@/app/actions/reflect"
import { Bot, Heart, TrendingUp, Target, Lightbulb, Zap } from "lucide-react"

export function CoachingHistory() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState("1month")

  useEffect(() => {
    loadHistory()
  }, [periodFilter])

  const loadHistory = async () => {
    setLoading(true)
    const result = await getCoachingHistory({
      periodFilter,
    })

    if (!result.error && result.sessions) {
      setSessions(result.sessions)
    }
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  const getWeekTypeLabel = (weekType: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      growth: { label: "成長週", color: "bg-emerald-100 text-emerald-800" },
      stable: { label: "安定週", color: "bg-blue-100 text-blue-800" },
      challenge: { label: "挑戦週", color: "bg-orange-100 text-orange-800" },
      special: { label: "特別週", color: "bg-purple-100 text-purple-800" },
    }
    return labels[weekType] || { label: "週次振り返り", color: "bg-gray-100 text-gray-800" }
  }

  // GROWモデルのサマリーを抽出（簡易版）
  const extractGROWSummary = (messages: any[]) => {
    if (!messages || messages.length === 0) return null

    // メッセージから各セクションを抽出（実際のAI対話に基づいて調整が必要）
    const summary = {
      goal: "",
      reality: "",
      options: "",
      will: "",
    }

    // ターン数に基づいて推測（簡易版）
    const userMessages = messages.filter((m) => m.role === "user")

    if (userMessages.length >= 1) summary.goal = userMessages[0].content
    if (userMessages.length >= 2) summary.reality = userMessages[1].content
    if (userMessages.length >= 3) summary.options = userMessages[2].content
    if (userMessages.length >= 4) summary.will = userMessages[3].content

    return summary
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          コーチング履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* フィルター */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 max-w-[200px]">
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
        </div>

        {/* コーチング履歴リスト */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            該当するコーチング履歴がありません
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => {
              const weekTypeInfo = getWeekTypeLabel(session.week_type)
              const growSummary = extractGROWSummary(session.coaching_messages)

              return (
                <div
                  key={session.id}
                  className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 shadow-md"
                >
                  {/* ヘッダー */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold">
                          {formatDate(session.week_start_date)} 〜{" "}
                          {formatDate(session.week_end_date)}
                        </h3>
                        <Badge className={weekTypeInfo.color}>{weekTypeInfo.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        対話ターン数: {session.total_turns}回
                      </p>
                    </div>
                  </div>

                  {/* サマリーテキスト */}
                  {session.summary_text && (
                    <div className="mb-4 p-4 bg-white rounded-md shadow-sm">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">
                        振り返りまとめ
                      </p>
                      <p className="text-sm leading-relaxed">{session.summary_text}</p>
                    </div>
                  )}

                  {/* GROWモデルサマリー */}
                  {growSummary && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">
                        コーチングサマリー（GROWモデル）
                      </p>
                      <div className="grid gap-3">
                        {growSummary.goal && (
                          <div className="flex gap-3 p-3 bg-white rounded-md">
                            <Target className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-green-600 mb-1">
                                Goal（目標）
                              </p>
                              <p className="text-sm">{growSummary.goal}</p>
                            </div>
                          </div>
                        )}

                        {growSummary.reality && (
                          <div className="flex gap-3 p-3 bg-white rounded-md">
                            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-blue-600 mb-1">
                                Reality（現状）
                              </p>
                              <p className="text-sm">{growSummary.reality}</p>
                            </div>
                          </div>
                        )}

                        {growSummary.options && (
                          <div className="flex gap-3 p-3 bg-white rounded-md">
                            <Lightbulb className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-orange-600 mb-1">
                                Options（選択肢）
                              </p>
                              <p className="text-sm">{growSummary.options}</p>
                            </div>
                          </div>
                        )}

                        {growSummary.will && (
                          <div className="flex gap-3 p-3 bg-white rounded-md">
                            <Zap className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-purple-600 mb-1">
                                Will（意思）
                              </p>
                              <p className="text-sm">{growSummary.will}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 応援メッセージ（あれば表示） */}
                  {session.encouragements && session.encouragements.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-md border border-pink-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-4 w-4 text-pink-600" />
                        <p className="text-sm font-semibold text-pink-800">
                          この週に届いた応援メッセージ ({session.encouragements.length}件)
                        </p>
                      </div>
                      <div className="space-y-2">
                        {session.encouragements.map((enc: any) => (
                          <div key={enc.id} className="flex items-start gap-2 text-sm">
                            <span className="font-medium">
                              {enc.sender_profile?.nickname || enc.sender_profile?.full_name}:
                            </span>
                            <span className="text-muted-foreground">{enc.message}</span>
                          </div>
                        ))}
                      </div>
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
