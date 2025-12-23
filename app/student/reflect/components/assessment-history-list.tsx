"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, TrendingUp } from "lucide-react"
import { useState } from "react"

interface AssessmentData {
  id: string
  score: number
  max_score_at_submission: number
  assessment_date: string
  master?: {
    id: string
    title: string | null
    assessment_type: string
    max_score: number
    session_number: number
  }
}

interface AssessmentHistoryListProps {
  assessments: AssessmentData[]
  loading?: boolean
}

export function AssessmentHistoryList({ assessments, loading }: AssessmentHistoryListProps) {
  const [testType, setTestType] = useState<'all' | 'math_print' | 'kanji_test'>('all')
  const [period, setPeriod] = useState<'all' | '1week' | '1month' | '3months'>('all')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'>('date_desc')

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // パフォーマンスバッジを取得
  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 80) {
      return {
        icon: "🟢",
        text: "よくできました！",
        className: "text-emerald-600 bg-emerald-50 border-emerald-200"
      }
    } else if (percentage >= 50) {
      return {
        icon: "🟡",
        text: "成長中だね！",
        className: "text-amber-600 bg-amber-50 border-amber-200"
      }
    } else {
      return {
        icon: "🟠",
        text: "チャレンジ中！",
        className: "text-orange-600 bg-orange-50 border-orange-200"
      }
    }
  }

  // フィルタリング
  let filteredAssessments = [...assessments]

  // テスト種類フィルター
  if (testType !== 'all') {
    filteredAssessments = filteredAssessments.filter(
      (a) => a.master?.assessment_type === testType
    )
  }

  // 期間フィルター
  if (period !== 'all') {
    const now = new Date()
    let dateThreshold: Date

    if (period === '1week') {
      dateThreshold = new Date(now)
      dateThreshold.setDate(now.getDate() - 7)
    } else if (period === '1month') {
      dateThreshold = new Date(now)
      dateThreshold.setMonth(now.getMonth() - 1)
    } else { // 3months
      dateThreshold = new Date(now)
      dateThreshold.setMonth(now.getMonth() - 3)
    }

    filteredAssessments = filteredAssessments.filter(
      (a) => new Date(a.assessment_date) >= dateThreshold
    )
  }

  // ソート
  filteredAssessments.sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime()
    } else if (sortBy === 'date_asc') {
      return new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime()
    } else if (sortBy === 'score_desc') {
      const scoreA = a.max_score_at_submission > 0 ? (a.score / a.max_score_at_submission) * 100 : 0
      const scoreB = b.max_score_at_submission > 0 ? (b.score / b.max_score_at_submission) * 100 : 0
      return scoreB - scoreA
    } else { // score_asc
      const scoreA = a.max_score_at_submission > 0 ? (a.score / a.max_score_at_submission) * 100 : 0
      const scoreB = b.max_score_at_submission > 0 ? (b.score / b.max_score_at_submission) * 100 : 0
      return scoreA - scoreB
    }
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2 mb-4">
          <span>📋</span>
          <span>テスト結果履歴</span>
        </CardTitle>

        {/* フィルターUI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">テスト種類</label>
            <Select value={testType} onValueChange={(v) => setTestType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📚 すべて</SelectItem>
                <SelectItem value="math_print">📊 算数プリント</SelectItem>
                <SelectItem value="kanji_test">✏️ 漢字テスト</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">期間</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全期間</SelectItem>
                <SelectItem value="1week">直近1週間</SelectItem>
                <SelectItem value="1month">直近1ヶ月</SelectItem>
                <SelectItem value="3months">直近3ヶ月</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">並び順</label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">新しい順</SelectItem>
                <SelectItem value="date_asc">古い順</SelectItem>
                <SelectItem value="score_desc">得点率が高い順</SelectItem>
                <SelectItem value="score_asc">得点率が低い順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredAssessments.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <div className="text-6xl">📭</div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                表示できる履歴がありません
              </p>
              <p className="text-xs text-slate-500">
                フィルター条件を変更してみてください
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 mb-3">
              {filteredAssessments.length}件の結果
            </p>

            <Accordion type="single" collapsible className="space-y-2">
              {filteredAssessments.map((assessment, index) => {
                const percentage = assessment.max_score_at_submission > 0
                  ? Math.round((assessment.score / assessment.max_score_at_submission) * 100)
                  : 0
                const badge = getPerformanceBadge(percentage)
                const isKanji = assessment.master?.assessment_type === 'kanji_test'
                const testIcon = isKanji ? '✏️' : '📊'

                return (
                  <AccordionItem
                    key={assessment.id}
                    value={assessment.id}
                    className="border rounded-lg px-4 hover:bg-slate-50 transition-colors"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{testIcon}</span>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-900">
                              {assessment.master?.title || '---'}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {formatDate(assessment.assessment_date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              {assessment.score}/{assessment.max_score_at_submission}
                            </p>
                            <p className="text-xs text-slate-600">
                              {percentage}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-4">
                      <div className="pt-3 border-t space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${badge.className} text-xs`}
                          >
                            {badge.icon} {badge.text}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="text-slate-600">学習回</p>
                            <p className="font-semibold text-slate-900">
                              第{assessment.master?.session_number || '---'}回
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-slate-600">得点率</p>
                            <p className="font-semibold text-slate-900">
                              {percentage}%
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-slate-600">得点</p>
                            <p className="font-semibold text-slate-900">
                              {assessment.score}点
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-slate-600">満点</p>
                            <p className="font-semibold text-slate-900">
                              {assessment.max_score_at_submission}点
                            </p>
                          </div>
                        </div>

                        {percentage >= 80 && (
                          <div className="mt-3 p-2 bg-emerald-50 rounded border border-emerald-100">
                            <p className="text-xs text-emerald-700 flex items-start gap-1">
                              <span>🌟</span>
                              <span>素晴らしい結果だね！この調子で頑張ろう！</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
