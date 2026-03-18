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

interface ExerciseReflectionTabProps {
  studentId: number
  studentGrade: number
}

export function ExerciseReflectionTab({ studentId, studentGrade }: ExerciseReflectionTabProps) {
  const [sessions, setSessions] = useState<StudentExerciseSession[]>([])
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null)
  const [reflections, setReflections] = useState<ExerciseStudentReflection[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingReflections, setIsLoadingReflections] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [reflectionsError, setReflectionsError] = useState<string | null>(null)

  // 対象生徒の提出済みセッション一覧ロード
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

  // 振り返りロード
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      <div className="text-center py-12 text-slate-500">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium">演習問題集の提出がありません</p>
      </div>
    )
  }

  const selectedSession = sessions.find(s => s.questionSetId === selectedSetId)

  return (
    <div className="space-y-4">
      {/* セッション選択 */}
      <div className="flex flex-wrap gap-2">
        {sessions.map((s) => (
          <Button
            key={s.questionSetId}
            variant={selectedSetId === s.questionSetId ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSetId(
              selectedSetId === s.questionSetId ? null : s.questionSetId
            )}
          >
            第{s.sessionNumber}回
          </Button>
        ))}
      </div>

      {/* 選択中セッションのサマリー */}
      {selectedSession && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{selectedSession.title}</h3>
              <div className="flex items-center gap-3 text-sm">
                {selectedSession.totalScore !== null && (
                  <span className="text-muted-foreground">
                    {selectedSession.totalScore}/{selectedSession.maxScore}点
                  </span>
                )}
                {selectedSession.accuracyRate !== null && (
                  <RateText rate={Math.round(selectedSession.accuracyRate * 100)} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 振り返り一覧 */}
      {selectedSetId && (
        isLoadingReflections ? (
          <div className="flex items-center justify-center py-8">
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
            <CardContent className="p-6 text-center text-muted-foreground">
              この回の振り返りはまだありません
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reflections.map((r) => (
              <Card key={`${r.sectionName}-${r.attemptNumber}-${r.createdAt}`}>
                <CardContent className="p-4 space-y-3">
                  {/* セクション名 + 回数 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {r.sectionName}
                    </span>
                    {r.attemptNumber > 1 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        {r.attemptNumber}回目
                      </span>
                    )}
                  </div>

                  {/* 振り返りテキスト */}
                  <div className="flex gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm">{r.reflectionText}</p>
                  </div>

                  {/* AIフィードバック */}
                  {r.feedbackText && (
                    <div className="flex gap-2 bg-emerald-50 rounded-lg p-3">
                      <Bot className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-800">{r.feedbackText}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function RateText({ rate }: { rate: number }) {
  let colorClass = "text-foreground font-medium"
  if (rate >= 80) colorClass = "text-green-600 font-medium"
  else if (rate < 50) colorClass = "text-red-600 font-medium"
  return <span className={colorClass}>{rate}%</span>
}
