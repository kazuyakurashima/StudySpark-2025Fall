"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Loader2, TrendingUp, TrendingDown, Minus, BookOpen } from "lucide-react"
import { getAllTestGoalsForStudent, getAllTestResultsForStudent } from "@/app/actions/goal"
import { mergeGoalsAndResults } from "@/lib/utils/goal-result-merger"
import type { TestGoal, TestResult, MergedTestRecord } from "@/lib/types/goal"

interface GoalTabProps {
  studentId: string
  studentGrade: string
}

export function GoalTab({ studentId, studentGrade }: GoalTabProps) {
  const [records, setRecords] = useState<MergedTestRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const [goalsResult, resultsResult] = await Promise.all([
          getAllTestGoalsForStudent(studentId),
          getAllTestResultsForStudent(studentId),
        ])

        if (goalsResult.error) {
          setError(goalsResult.error)
          return
        }

        const goals = (goalsResult.goals || []) as TestGoal[]
        const results = (resultsResult.results || []) as TestResult[]
        const merged = mergeGoalsAndResults(goals, results)
        setRecords(merged)
      } catch (e) {
        setError("データの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [studentId])

  const getTestDateLabel = (testDate: string): string => {
    const today = new Date()
    const date = new Date(testDate)
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date >= today ? "次回" : "直近"
  }

  const getDeviationTrend = (goal: number | null, result: number | null) => {
    if (goal === null || result === null) return null
    const diff = result - goal
    if (diff > 2) return { icon: TrendingUp, color: "text-green-600", label: `+${diff.toFixed(1)}` }
    if (diff < -2) return { icon: TrendingDown, color: "text-red-600", label: diff.toFixed(1) }
    return { icon: Minus, color: "text-gray-500", label: "±0" }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            テスト目標・結果
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>目標・結果がまだ登録されていません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const trend = getDeviationTrend(record.goalDeviation, record.resultDeviation)
                const TrendIcon = trend?.icon

                return (
                  <div
                    key={record.scheduleId}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{record.testName}</span>
                          <Badge variant="outline" className="text-xs">
                            {getTestDateLabel(record.testDate)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.testDate).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {trend && TrendIcon && (
                        <div className={`flex items-center gap-1 ${trend.color}`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{trend.label}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* 目標 */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 mb-1">目標偏差値</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {record.goalDeviation !== null ? record.goalDeviation.toFixed(1) : "-"}
                        </div>
                        {record.goalThoughts && (
                          <p className="text-xs text-blue-600 mt-2 line-clamp-2">
                            「{record.goalThoughts}」
                          </p>
                        )}
                      </div>

                      {/* 結果 */}
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">結果偏差値</div>
                        <div className="text-2xl font-bold text-green-700">
                          {record.resultDeviation !== null ? record.resultDeviation.toFixed(1) : "-"}
                        </div>
                        {record.resultRegisteredAt && (
                          <p className="text-xs text-green-600 mt-2">
                            {new Date(record.resultRegisteredAt).toLocaleDateString("ja-JP")}登録
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 科目別結果（あれば） */}
                    {record.subjectDeviations && Object.keys(record.subjectDeviations).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">科目別偏差値</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(record.subjectDeviations).map(([subject, value]) => (
                            <div key={subject} className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-xs text-muted-foreground">{subject}</div>
                              <div className="font-semibold">{value?.toFixed(1) || "-"}</div>
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
    </div>
  )
}
