"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, BookOpen, MessageSquare, Bot, AlertCircle } from "lucide-react"
import {
  getStudentExerciseSessions,
  getStudentExerciseReflections,
  type StudentExerciseSession,
  type ExerciseStudentReflection,
} from "@/app/actions/exercise-master"

interface ParentExerciseSectionProps {
  studentId: number
  studentGrade: number
}

/**
 * 保護者向け演習問題集セクション
 * - 子どもの提出済みセッション一覧（正答率+スコア）
 * - セッション選択 → 振り返り+AIフィードバック閲覧
 */
export function ParentExerciseSection({ studentId, studentGrade }: ParentExerciseSectionProps) {
  const [sessions, setSessions] = useState<StudentExerciseSession[]>([])
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null)
  const [reflections, setReflections] = useState<ExerciseStudentReflection[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingReflections, setIsLoadingReflections] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [reflectionsError, setReflectionsError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!selectedSetId) {
      setReflections([])
      setReflectionsError(null)
      return
    }
    async function load() {
      setIsLoadingReflections(true)
      setReflectionsError(null)
      const result = await getStudentExerciseReflections(studentId, selectedSetId!)
      if (result.error) {
        setReflectionsError(result.error)
      } else {
        setReflections(result.data)
      }
      setIsLoadingReflections(false)
    }
    load()
  }, [studentId, selectedSetId])

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

  const selectedSession = sessions.find(s => s.questionSetId === selectedSetId)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-emerald-500" />
        演習問題集の結果
      </h3>

      {/* セッション一覧カード */}
      <div className="grid gap-2">
        {sessions.map((s) => {
          const isSelected = selectedSetId === s.questionSetId
          const pct = s.accuracyRate !== null ? Math.round(s.accuracyRate * 100) : null

          return (
            <Card
              key={s.questionSetId}
              className={`cursor-pointer transition-colors ${isSelected ? "border-emerald-500 bg-emerald-50/50" : "hover:bg-muted/30"}`}
              onClick={() => setSelectedSetId(isSelected ? null : s.questionSetId)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">第{s.sessionNumber}回</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.title}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {s.totalScore !== null && (
                    <span className="text-muted-foreground text-xs">
                      {s.totalScore}/{s.maxScore}点
                    </span>
                  )}
                  {pct !== null && (
                    <RateText rate={pct} />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 振り返り表示 */}
      {selectedSetId && selectedSession && (
        <div className="space-y-3">
          {isLoadingReflections ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reflectionsError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {reflectionsError}
              </CardContent>
            </Card>
          ) : reflections.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground text-sm">
                この回の振り返りはまだありません
              </CardContent>
            </Card>
          ) : (
            reflections.map((r) => (
              <Card key={`${r.sectionName}-${r.attemptNumber}-${r.createdAt}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{r.sectionName}</span>
                    {r.attemptNumber > 1 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        {r.attemptNumber}回目
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm">{r.reflectionText}</p>
                  </div>
                  {r.feedbackText && (
                    <div className="flex gap-2 bg-emerald-50 rounded-lg p-2.5">
                      <Bot className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-800">{r.feedbackText}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function RateText({ rate }: { rate: number }) {
  let colorClass = "text-foreground font-medium text-sm"
  if (rate >= 80) colorClass = "text-green-600 font-medium text-sm"
  else if (rate < 50) colorClass = "text-red-600 font-medium text-sm"
  return <span className={colorClass}>{rate}%</span>
}
