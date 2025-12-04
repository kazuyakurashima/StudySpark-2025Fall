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
import { getStudyHistory } from "@/app/actions/reflect"
import { getChildStudyHistory } from "@/app/actions/parent"
import { BookOpen, TrendingUp, TrendingDown, Minus, Layers } from "lucide-react"
import { groupLogsByBatch, calculateSummary, calculateAccuracy, getRepresentativeLog } from "@/lib/utils/batch-grouping"
import type { GroupedLogEntry, StudyLogWithBatch } from "@/lib/types/batch-grouping"

interface StudyHistoryProps {
  viewerRole?: "student" | "parent"
  studentId?: string
}

// 学習ログ型（APIレスポンスに合わせて拡張）
interface StudyLogFromAPI extends StudyLogWithBatch {
  subjects?: { id?: number; name: string; color_code: string } | null
  study_content_types?: { id?: number; content_name: string } | null
  study_sessions?: { id?: number; session_number: number; start_date: string; end_date: string } | null
}

export function StudyHistory({ viewerRole = "student", studentId }: StudyHistoryProps = {}) {
  const [entries, setEntries] = useState<GroupedLogEntry<StudyLogFromAPI>[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("1month")
  const [sortBy, setSortBy] = useState("date")

  useEffect(() => {
    loadHistory()
  }, [subjectFilter, periodFilter, sortBy, viewerRole, studentId])

  const loadHistory = async () => {
    setLoading(true)

    // viewerRoleに応じて適切なAPIを呼び出す
    const result = viewerRole === "parent" && studentId
      ? await getChildStudyHistory(studentId, {
          subjectFilter,
          periodFilter,
          sortBy,
        })
      : await getStudyHistory({
          subjectFilter,
          periodFilter,
          sortBy,
        })

    if (!result.error && result.logs) {
      // 学習ログをグループ化（batch_idでまとめる）
      // 現時点ではフィードバックマップは空（学習履歴画面ではコーチフィードバック不要）
      const logsWithSubject = result.logs.map((log: any) => ({
        ...log,
        subject: log.subjects?.name || "不明",
      })) as StudyLogFromAPI[]

      const grouped = groupLogsByBatch(logsWithSubject, {
        batchFeedbacks: {},
        legacyFeedbacks: {},
      })

      // sortByに応じてグループ化後のソートを適用
      if (sortBy === "accuracy") {
        // 正答率でソート
        grouped.sort((a, b) => {
          const summaryA = calculateSummary(a)
          const summaryB = calculateSummary(b)
          const accA = calculateAccuracy(summaryA.totalQuestions, summaryA.totalCorrect)
          const accB = calculateAccuracy(summaryB.totalQuestions, summaryB.totalCorrect)
          return accB - accA
        })
      } else if (sortBy === "session") {
        // セッション番号でソート（代表ログのsession_idで比較）
        grouped.sort((a, b) => {
          const repA = getRepresentativeLog(a)
          const repB = getRepresentativeLog(b)
          const sessionA = repA.study_sessions?.session_number || repA.session_id || 0
          const sessionB = repB.study_sessions?.session_number || repB.session_id || 0
          return sessionB - sessionA // 降順
        })
      }
      // sortBy === "date" の場合は groupLogsByBatch のデフォルト（logged_at降順）のまま

      setEntries(grouped)

      // 1ヶ月フィルターで5件未満の場合、全期間に切り替え
      if (periodFilter === "1month" && grouped.length < 5) {
        setPeriodFilter("all")
      }
    }
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`
  }

  const getAccuracyBadge = (log: any, prevAccuracy?: number) => {
    const accuracy =
      log.total_problems > 0
        ? Math.round((log.correct_count / log.total_problems) * 100)
        : 0

    let changeIcon = null
    let changeText = ""

    if (prevAccuracy !== undefined && prevAccuracy !== null) {
      const diff = accuracy - prevAccuracy
      if (diff > 0) {
        changeIcon = <TrendingUp className="h-4 w-4 text-green-600" />
        changeText = `+${diff}%`
      } else if (diff < 0) {
        changeIcon = <TrendingDown className="h-4 w-4 text-red-600" />
        changeText = `${diff}%`
      } else {
        changeIcon = <Minus className="h-4 w-4 text-blue-600" />
        changeText = "±0%"
      }
    }

    return { accuracy, changeIcon, changeText }
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          学習履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* フィルター */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[140px]">
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

          <div className="flex-1 min-w-[140px]">
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

          <div className="flex-1 min-w-[140px]">
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
        </div>

        {/* 学習履歴リスト */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            該当する学習履歴がありません
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => {
              // グループ化されたエントリから集計情報を取得
              const summary = calculateSummary(entry)
              const accuracy = calculateAccuracy(summary.totalQuestions, summary.totalCorrect)

              // 前のエントリとの比較用
              let prevAccuracy: number | undefined
              if (index < entries.length - 1) {
                const prevSummary = calculateSummary(entries[index + 1])
                prevAccuracy = calculateAccuracy(prevSummary.totalQuestions, prevSummary.totalCorrect)
              }

              const { changeIcon, changeText } = getAccuracyBadge(
                { total_problems: summary.totalQuestions, correct_count: summary.totalCorrect },
                prevAccuracy
              )

              // バッチ or 単独によって表示を分岐
              const isBatch = entry.type === "batch"
              // 代表ログを共通ユーティリティで取得（max(logged_at)と整合）
              const representativeLog = getRepresentativeLog(entry)
              const loggedAt = isBatch ? entry.latestLoggedAt : entry.log.logged_at

              const sessionNum = representativeLog.study_sessions?.session_number || representativeLog.session_id || 0
              const startDate = representativeLog.study_sessions?.start_date
                ? new Date(representativeLog.study_sessions.start_date)
                : null
              const endDate = representativeLog.study_sessions?.end_date
                ? new Date(representativeLog.study_sessions.end_date)
                : null

              let sessionDisplay = `第${sessionNum}回`
              if (startDate && endDate) {
                const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
                const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`
                sessionDisplay = `第${sessionNum}回(${startStr}〜${endStr})`
              }

              // キー生成
              const entryKey = isBatch ? `batch-${entry.batchId}` : `single-${entry.log.id}`

              // 振り返りテキスト（単独の場合はそのまま、バッチの場合は代表ログから）
              const reflectionText = isBatch
                ? entry.logs.find(log => log.reflection_text)?.reflection_text
                : entry.log.reflection_text

              return (
                <div
                  key={entryKey}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      {/* バッチの場合は複数科目を表示（重複排除済み） */}
                      {isBatch ? (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          {entry.subjects.map((subjectName, idx) => {
                            // 該当科目のログから色情報を取得
                            const logWithColor = entry.logs.find(log => log.subjects?.name === subjectName)
                            const colorCode = logWithColor?.subjects?.color_code || "#666"
                            return (
                              <span key={subjectName} className="flex items-center gap-1">
                                <span
                                  className="inline-block w-3 h-3 rounded-full"
                                  style={{ backgroundColor: colorCode }}
                                ></span>
                                <span className="font-semibold text-sm">{subjectName}</span>
                                {idx < entry.subjects.length - 1 && <span className="text-muted-foreground">·</span>}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.log.subjects?.color_code || "#666" }}
                          ></span>
                          <span className="font-semibold">{entry.log.subjects?.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {entry.log.study_content_types?.content_name}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(loggedAt || representativeLog.study_date)} · {sessionDisplay}
                        {isBatch && <span className="ml-2 text-primary">（{entry.subjects.length}科目・{entry.logs.length}項目）</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{accuracy}%</p>
                        <p className="text-xs text-muted-foreground">
                          {summary.totalCorrect}/{summary.totalQuestions}問
                        </p>
                      </div>
                      {changeIcon && (
                        <div className="flex flex-col items-center">
                          {changeIcon}
                          <span className="text-xs font-medium">{changeText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* バッチの場合は各科目の内訳を表示 */}
                  {isBatch && (
                    <div className="mt-2 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {entry.logs.map((log) => {
                        const logAccuracy = log.total_problems > 0
                          ? Math.round((log.correct_count / log.total_problems) * 100)
                          : 0
                        return (
                          <div key={log.id} className="text-xs p-2 bg-background rounded border">
                            <div className="flex items-center gap-1 mb-1">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: log.subjects?.color_code || "#666" }}
                              ></span>
                              <span className="font-medium">{log.subjects?.name}</span>
                            </div>
                            <p className="text-muted-foreground">
                              {logAccuracy}% ({log.correct_count}/{log.total_problems})
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {reflectionText && (
                    <div className="mt-3 p-3 bg-background rounded-md border-l-4 border-primary">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        今日の振り返り
                      </p>
                      <p className="text-sm">{reflectionText}</p>
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
