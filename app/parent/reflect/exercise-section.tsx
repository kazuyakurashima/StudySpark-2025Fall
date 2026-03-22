"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, BookOpen, MessageSquare, Bot, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import {
  getStudentExerciseSessions,
  getParentExerciseDetail,
  type StudentExerciseSession,
  type ParentExerciseDetail,
} from "@/app/actions/exercise-master"

interface ParentExerciseSectionProps {
  studentId: number
  studentGrade: number
}

export function ParentExerciseSection({ studentId, studentGrade }: ParentExerciseSectionProps) {
  const [sessions, setSessions] = useState<StudentExerciseSession[]>([])
  const [expandedSetId, setExpandedSetId] = useState<number | null>(null)
  const [details, setDetails] = useState<Map<number, ParentExerciseDetail>>(new Map())
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set())
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoadingSessions(true)
      setSessionsError(null)
      const result = await getStudentExerciseSessions(studentId, studentGrade)
      if (result.error) {
        setSessionsError(result.error)
      } else {
        setSessions(result.data)
      }
      setIsLoadingSessions(false)
    }
    load()
  }, [studentId, studentGrade])

  const handleToggle = async (questionSetId: number) => {
    if (expandedSetId === questionSetId) {
      setExpandedSetId(null)
      return
    }
    setExpandedSetId(questionSetId)

    if (details.has(questionSetId)) return

    setLoadingDetails(prev => new Set(prev).add(questionSetId))
    const result = await getParentExerciseDetail(studentId, questionSetId)
    if (result.data) {
      setDetails(prev => new Map(prev).set(questionSetId, result.data!))
    }
    setLoadingDetails(prev => {
      const next = new Set(prev)
      next.delete(questionSetId)
      return next
    })
  }

  if (isLoadingSessions) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sessionsError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {sessionsError}
        </CardContent>
      </Card>
    )
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm">演習問題集の提出がまだありません</p>
        </CardContent>
      </Card>
    )
  }

  // サマリー計算（提出数・平均正答率）
  const submittedWithRate = sessions.filter(s => s.accuracyRate !== null)
  const avgRate = submittedWithRate.length > 0
    ? Math.round(submittedWithRate.reduce((sum, s) => sum + (s.accuracyRate ?? 0) * 100, 0) / submittedWithRate.length)
    : null

  return (
    <div className="space-y-3">
      {/* サマリーカード */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">演習問題集まとめ</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">提出 <span className="font-medium text-foreground">{sessions.length}回</span></span>
            {avgRate !== null && (
              <span className="text-muted-foreground">平均 <span className={`font-medium ${avgRate >= 80 ? "text-green-600" : avgRate < 50 ? "text-red-600" : "text-foreground"}`}>{avgRate}%</span></span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* セッションカード（提出済みのみ・新しい順） */}
      {[...sessions].reverse().map((s) => {
        const isExpanded = expandedSetId === s.questionSetId
        const isLoadingDetail = loadingDetails.has(s.questionSetId)
        const detail = details.get(s.questionSetId)
        const pct = s.accuracyRate !== null ? Math.round(s.accuracyRate * 100) : null

        return (
          <Card key={s.questionSetId} className="overflow-hidden">
            {/* ヘッダー行（タップで展開） */}
            <CardContent
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => handleToggle(s.questionSetId)}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">第{s.sessionNumber}回</span>
                <span className="text-xs text-muted-foreground ml-2 truncate">{s.title}</span>
              </div>
              <div className="flex items-center gap-3 ml-2 shrink-0">
                {s.totalScore !== null && (
                  <span className="text-xs text-muted-foreground">{s.totalScore}/{s.maxScore}点</span>
                )}
                {pct !== null && <RateText rate={pct} />}
                {isExpanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </CardContent>

            {/* 展開コンテンツ */}
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-3 space-y-3 bg-slate-50/50">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : !detail ? (
                  <p className="text-xs text-muted-foreground text-center py-2">データを取得できませんでした</p>
                ) : (
                  <>
                    {/* セクション別正答率バー */}
                    {detail.sectionStats.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">セクション別正答率</p>
                        {detail.sectionStats.map((sec) => (
                          <div key={sec.sectionName}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-slate-600">{sec.sectionName}</span>
                              <span className={
                                sec.accuracyRate >= 80 ? "text-green-600 font-medium"
                                : sec.accuracyRate < 50 ? "text-red-600 font-medium"
                                : "text-amber-600 font-medium"
                              }>{sec.accuracyRate}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  sec.accuracyRate >= 80 ? "bg-green-500"
                                  : sec.accuracyRate < 50 ? "bg-red-400"
                                  : "bg-amber-400"
                                }`}
                                style={{ width: `${sec.accuracyRate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 振り返り + AIフィードバック */}
                    {detail.reflections.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">振り返り</p>
                        {detail.reflections.map((r) => (
                          <div
                            key={`${r.sectionName}-${r.attemptNumber}-${r.createdAt}`}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-slate-500">{r.sectionName}</span>
                              {r.attemptNumber > 1 && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                  {r.attemptNumber}回目
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 bg-white rounded-lg p-2.5 border border-slate-100">
                              <MessageSquare className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                              <p className="text-sm text-slate-700">{r.reflectionText}</p>
                            </div>
                            {r.feedbackText && (
                              <div className="flex gap-2 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                                <Bot className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <p className="text-sm text-emerald-800">{r.feedbackText}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-1">この回の振り返りはまだありません</p>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function RateText({ rate }: { rate: number }) {
  let colorClass = "text-foreground font-medium text-sm"
  if (rate >= 80) colorClass = "text-green-600 font-medium text-sm"
  else if (rate < 50) colorClass = "text-red-600 font-medium text-sm"
  return <span className={colorClass}>{rate}%</span>
}
