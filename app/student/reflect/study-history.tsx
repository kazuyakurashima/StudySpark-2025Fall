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
import { BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react"

export function StudyHistory() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("1month")
  const [sortBy, setSortBy] = useState("date")

  useEffect(() => {
    loadHistory()
  }, [subjectFilter, periodFilter, sortBy])

  const loadHistory = async () => {
    setLoading(true)
    const result = await getStudyHistory({
      subjectFilter,
      periodFilter,
      sortBy,
    })

    if (!result.error && result.logs) {
      let processedLogs = result.logs

      // 正答率でソートする場合
      if (sortBy === "accuracy") {
        processedLogs = [...result.logs].sort((a, b) => {
          const accA = a.total_problems > 0 ? (a.correct_count / a.total_problems) * 100 : 0
          const accB = b.total_problems > 0 ? (b.correct_count / b.total_problems) * 100 : 0
          return accB - accA
        })
      }

      setLogs(processedLogs)

      // 1ヶ月フィルターで5件未満の場合、全期間に切り替え
      if (periodFilter === "1month" && processedLogs.length < 5) {
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
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            該当する学習履歴がありません
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => {
              const { accuracy, changeIcon, changeText } = getAccuracyBadge(
                log,
                index < logs.length - 1 ? logs[index + 1].total_problems > 0
                  ? Math.round((logs[index + 1].correct_count / logs[index + 1].total_problems) * 100)
                  : 0
                : undefined
              )

              const sessionNum = log.study_sessions?.session_number || log.session_id || 0
              const startDate = log.study_sessions?.start_date
                ? new Date(log.study_sessions.start_date)
                : null
              const endDate = log.study_sessions?.end_date
                ? new Date(log.study_sessions.end_date)
                : null

              let sessionDisplay = `第${sessionNum}回`
              if (startDate && endDate) {
                const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
                const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`
                sessionDisplay = `第${sessionNum}回(${startStr}〜${endStr})`
              }

              return (
                <div
                  key={log.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: log.subjects?.color_code || "#666" }}
                        ></span>
                        <span className="font-semibold">{log.subjects?.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {log.study_content_types?.content_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.logged_at || log.study_date)} · {sessionDisplay}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{accuracy}%</p>
                        <p className="text-xs text-muted-foreground">
                          {log.correct_count}/{log.total_problems}問
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

                  {log.reflection_text && (
                    <div className="mt-3 p-3 bg-background rounded-md border-l-4 border-primary">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        今日の振り返り
                      </p>
                      <p className="text-sm">{log.reflection_text}</p>
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
