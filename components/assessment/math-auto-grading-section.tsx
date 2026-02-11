"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getMathGradingHistory, type MathGradingHistoryItem } from "@/app/actions/math-answer"

interface MathAutoGradingSectionProps {
  studentId: number
  /** 表示件数（デフォルト: 3） */
  limit?: number
  /** コンパクト表示 */
  compact?: boolean
}

/**
 * 算数自動採点ダッシュボードセクション
 *
 * 計画書 Section 12 準拠:
 * - getMathGradingHistory() 経由で認可チェック済みデータ取得
 * - 最新N件の採点済み/進行中セットをカード表示
 * - ステータスアイコン（🔄進行中 / ✅採点済み / 📖解答確認済み）
 * - inProgressSets 数の表示
 * - 「もっと見る →」→ /student/math-answer
 */
export function MathAutoGradingSection({
  studentId,
  limit = 3,
  compact = false,
}: MathAutoGradingSectionProps) {
  const [results, setResults] = useState<MathGradingHistoryItem[]>([])
  const [summary, setSummary] = useState<{
    latestScore: number | null
    averagePercentage: number | null
    completedSets: number
    inProgressSets: number
  }>({ latestScore: null, averagePercentage: null, completedSets: 0, inProgressSets: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const result = await getMathGradingHistory({ studentId })
        if (result.error) {
          setError(result.error)
          return
        }
        setResults(result.results)
        setSummary(result.summary)
      } catch {
        setError("データの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [studentId])

  // エラー時
  if (error) {
    return (
      <Card className="rounded-xl shadow-sm border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <Calculator className="h-5 w-5" />
            算数プリント 自動採点
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <p className="text-sm text-red-600">データの取得に失敗しました</p>
          <p className="text-xs text-red-500 mt-2 whitespace-pre-wrap">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // ローディング中
  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-indigo-600" />
            算数プリント 自動採点
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </CardContent>
      </Card>
    )
  }

  // セッションがあるもの（採点済み + 進行中）をフィルタ
  const activeResults = results.filter(r => r.latestAttempt !== null)

  // データなし
  if (activeResults.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm border-dashed border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-indigo-400" />
            算数プリント 自動採点
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-slate-500">
            まだ自動採点の結果がありません
          </p>
          <p className="text-xs text-slate-400 mt-1">
            算数プリントを解いて採点すると表示されます
          </p>
          <Link
            href="/student/math-answer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-3"
          >
            算数プリントに挑戦する
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    )
  }

  // 表示対象: 採点済み優先、最新N件（防御的コピーで元配列を非破壊）
  const displayResults = [...activeResults]
    .sort((a, b) => {
      // 採点済みを先、進行中を後
      const statusOrder = (s: string) => s === "graded" ? 0 : 1
      const orderDiff = statusOrder(a.latestAttempt!.status) - statusOrder(b.latestAttempt!.status)
      if (orderDiff !== 0) return orderDiff
      // 同じステータス内では gradedAt 降順
      const dateA = a.latestAttempt!.gradedAt || ""
      const dateB = b.latestAttempt!.gradedAt || ""
      return dateB.localeCompare(dateA)
    })
    .slice(0, limit)

  // 計画書 Section 12-2 ステータス定義:
  //   📖 = 正答開示済み（answersRevealed）
  //   ✅ = 全問正解（score === maxScore で判定。丸め誤差回避のため percentage は使わない）
  //   🔄 = リトライ可能（採点済み、開示前、満点でない）
  //   ⏳ = 解答中（in_progress）
  const getStatusIcon = (item: MathGradingHistoryItem) => {
    if (!item.latestAttempt) return ""
    if (item.latestAttempt.status === "in_progress") return "⏳"
    // graded 状態
    if (item.latestAttempt.answersRevealed) return "📖"
    if (item.latestAttempt.score === item.latestAttempt.maxScore) return "✅"
    return "🔄"
  }

  const getStatusLabel = (item: MathGradingHistoryItem) => {
    if (!item.latestAttempt) return ""
    if (item.latestAttempt.status === "in_progress") return "解答中"
    if (item.latestAttempt.answersRevealed) return "正答確認済み"
    if (item.latestAttempt.score === item.latestAttempt.maxScore) return "全問正解"
    return "リトライ可能"
  }

  return (
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-indigo-600" />
            算数プリント 自動採点
          </CardTitle>
          <Link
            href="/student/math-answer"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            もっと見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {/* サマリ情報 */}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
          <span>完了: {summary.completedSets}セット</span>
          {summary.inProgressSets > 0 && (
            <span className="text-amber-600">⏳ 解答中: {summary.inProgressSets}セット</span>
          )}
          {summary.averagePercentage !== null && (
            <span>平均: {summary.averagePercentage}%</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayResults.map((item) => {
          const attempt = item.latestAttempt!
          const percentage = attempt.maxScore > 0
            ? Math.round((attempt.score / attempt.maxScore) * 100)
            : 0
          const isGraded = attempt.status === "graded"

          return (
            <div
              key={item.questionSetId}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg flex-shrink-0">{getStatusIcon(item)}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium text-slate-900 truncate ${compact ? "" : ""}`}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{getStatusLabel(item)}</span>
                    {attempt.attemptNumber > 1 && (
                      <span className="text-indigo-600">{attempt.attemptNumber}回目</span>
                    )}
                    {/* アテンプト推移 */}
                    {item.attemptHistory.length > 1 && isGraded && (
                      <span className="text-slate-400">
                        {compact
                          ? `${item.attemptHistory[item.attemptHistory.length - 2].percentage}%→${item.attemptHistory[item.attemptHistory.length - 1].percentage}%`
                          : `推移: ${item.attemptHistory.map(h => `${h.percentage}%`).join(" → ")}`
                        }
                      </span>
                    )}
                    {/* 日付 */}
                    {attempt.gradedAt && (
                      <span className="text-slate-400">
                        {new Date(attempt.gradedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-2">
                {isGraded ? (
                  <>
                    <p className="text-sm font-bold text-slate-900">
                      {attempt.score}/{attempt.maxScore}
                    </p>
                    <p className={`text-xs font-medium ${
                      percentage >= 80 ? "text-emerald-600"
                        : percentage >= 50 ? "text-amber-600"
                        : "text-orange-600"
                    }`}>
                      {percentage}%
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">解答中...</p>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
