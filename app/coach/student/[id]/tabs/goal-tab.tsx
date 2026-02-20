"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { getAllTestGoalsForStudent, getAllTestResultsForStudent } from "@/app/actions/goal"
import { mergeGoalsAndResults } from "@/lib/utils/goal-result-merger"
import type { TestGoal, TestResult, MergedTestRecord } from "@/lib/types/goal"

interface GoalTabProps {
  studentId: string
}

export function GoalTab({ studentId }: GoalTabProps) {
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

        if (resultsResult.error) {
          setError(resultsResult.error)
          return
        }

        const goals = (goalsResult.goals || []) as unknown as TestGoal[]
        const results = (resultsResult.results || []) as unknown as TestResult[]
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

  // テストが未来か過去かを判定（JST基準）
  const getTestStatus = (testDate: string): "upcoming" | "past" => {
    // testDateはYYYY-MM-DD形式なのでJSTとして解釈
    const testDateJST = new Date(testDate + "T00:00:00+09:00")
    const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
    nowJST.setHours(0, 0, 0, 0)
    return testDateJST >= nowJST ? "upcoming" : "past"
  }

  // コース表示用のフォーマット
  const formatCourseClass = (course: string | null, classNum: number | null): string => {
    if (!course) return "-"
    if (classNum !== null) return `${course}コース ${classNum}組`
    return `${course}コース`
  }

  // 達成状況のアイコンとスタイル
  const getAchievementDisplay = (record: MergedTestRecord) => {
    if (record.isAchieved === null) {
      // 結果未入力
      return null
    }
    if (record.isAchieved) {
      return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "達成" }
    }
    return { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "未達成" }
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
                const testStatus = getTestStatus(record.testDate)
                const achievement = getAchievementDisplay(record)
                const AchievementIcon = achievement?.icon

                return (
                  <div
                    key={record.scheduleId}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{record.testName}</span>
                          <Badge
                            variant={testStatus === "upcoming" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {testStatus === "upcoming" ? "次回" : "過去"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.testDateFormatted}
                        </p>
                      </div>
                      {achievement && AchievementIcon && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${achievement.bg} ${achievement.color}`}>
                          <AchievementIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{achievement.label}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* 目標 */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 mb-1">目標</div>
                        <div className="text-lg font-bold text-blue-700">
                          {formatCourseClass(record.goalCourse, record.goalClass)}
                        </div>
                        {record.goalThoughts && (
                          <p className="text-xs text-blue-600 mt-2 line-clamp-2">
                            「{record.goalThoughts}」
                          </p>
                        )}
                      </div>

                      {/* 結果 */}
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">結果</div>
                        {record.resultCourse ? (
                          <>
                            <div className="text-lg font-bold text-green-700">
                              {formatCourseClass(record.resultCourse, record.resultClass)}
                            </div>
                            {record.resultRegisteredAt && (
                              <p className="text-xs text-green-600 mt-2">
                                {new Date(record.resultRegisteredAt).toLocaleDateString("ja-JP", {
                                  timeZone: "Asia/Tokyo",
                                  month: "numeric",
                                  day: "numeric",
                                })}登録
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">未入力</span>
                          </div>
                        )}
                      </div>
                    </div>
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
