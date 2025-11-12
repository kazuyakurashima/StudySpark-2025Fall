"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCoachingHistory } from "@/app/actions/reflect"
import { Bot, Heart, ChevronDown, ChevronUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { getAvatarById } from "@/lib/constants/avatars"

const AVATAR_AI_COACH =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

interface CoachingHistoryProps {
  refreshTrigger?: number
}

export function CoachingHistory({ refreshTrigger }: CoachingHistoryProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState("1month")
  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set())
  const { profile } = useUserProfile()
  const studentAvatarSrc = profile ? getAvatarById(profile.avatar_id)?.src : undefined
  const studentInitial = profile?.nickname?.slice(0, 2) || "You"

  useEffect(() => {
    loadHistory()
  }, [periodFilter, refreshTrigger])

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

  const toggleSessionOpen = (sessionId: string) => {
    setOpenSessions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
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
              const isOpen = openSessions.has(session.id)

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

                  {/* 対話の詳細（折りたたみ式） */}
                  {session.coaching_messages && session.coaching_messages.length > 0 && (
                    <Collapsible open={isOpen} onOpenChange={() => toggleSessionOpen(session.id)}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-between mb-2"
                        >
                          <span className="text-sm font-medium">対話の詳細を見る</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 mt-3">
                        {session.coaching_messages.map((message: any, index: number) => {
                          const isAssistant = message.role === "assistant"
                          return (
                            <div
                              key={message.id || index}
                              className={`p-3 rounded-md ${
                                isAssistant
                                  ? "bg-white border border-blue-200"
                                  : "bg-blue-50 border border-blue-300"
                              }`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <Avatar
                                  className={`h-8 w-8 border ${
                                    isAssistant ? "border-blue-200" : "border-blue-300"
                                  }`}
                                >
                                  <AvatarImage
                                    src={isAssistant ? AVATAR_AI_COACH : studentAvatarSrc}
                                    alt={isAssistant ? "AIコーチ" : profile?.nickname || "あなた"}
                                  />
                                  <AvatarFallback>
                                    {isAssistant ? (
                                      <Bot className="h-4 w-4" />
                                    ) : (
                                      studentInitial
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-semibold text-muted-foreground">
                                  {isAssistant ? "AIコーチ" : "あなた"}
                                </p>
                              </div>
                              <p className="text-sm whitespace-pre-line">{message.content}</p>
                            </div>
                          )
                        })}
                      </CollapsibleContent>
                    </Collapsible>
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
