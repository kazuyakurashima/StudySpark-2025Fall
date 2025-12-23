"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface AssessmentSummary {
  latest: {
    math: {
      id: string
      name: string | null
      score: number
      maxScore: number
      percentage: number
      submittedAt: string
    } | null
    kanji: {
      id: string
      name: string | null
      score: number
      maxScore: number
      percentage: number
      submittedAt: string
    } | null
  } | null
  averages: {
    math: number | null
    kanji: number | null
  } | null
  counts: {
    math: number
    kanji: number
    total: number
  }
}

interface AssessmentSummaryCardsProps {
  summary: AssessmentSummary | null
  loading?: boolean
}

export function AssessmentSummaryCards({ summary, loading }: AssessmentSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="card-elevated animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 bg-slate-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
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

  // 前回比の表示
  const getPreviousComparison = (current: number, previous: number | null) => {
    if (previous === null || previous === undefined) return null

    const diff = current - previous
    if (diff > 0) {
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        text: `+${diff}%`,
        className: "text-emerald-600"
      }
    } else if (diff < 0) {
      return {
        icon: <TrendingDown className="h-4 w-4" />,
        text: `${diff}%`,
        className: "text-orange-600"
      }
    } else {
      return {
        icon: <Minus className="h-4 w-4" />,
        text: "±0%",
        className: "text-slate-600"
      }
    }
  }

  // 空データカード
  const EmptyCard = ({ title, icon, bgClass }: { title: string; icon: string; bgClass: string }) => (
    <Card className={`card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 ${bgClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-600">まだテスト結果がありません</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-500 flex items-start gap-1">
            <span>💡</span>
            <span>テスト結果は指導者が入力します</span>
          </p>
          <p className="text-xs text-slate-500 flex items-start gap-1">
            <span>📌</span>
            <span>入力されると自動的にここに表示されるよ！</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )

  const latestMath = summary?.latest?.math
  const latestKanji = summary?.latest?.kanji
  const mathAverage = summary?.averages?.math
  const kanjiAverage = summary?.averages?.kanji

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* カード1: 最新 算数プリント */}
      {latestMath ? (
        <Card className="card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>📊</span>
              <span>最新 算数プリント</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {latestMath.score}/{latestMath.maxScore}
              </p>
              <p className="text-xs text-slate-600">({latestMath.percentage}%)</p>
            </div>

            <Badge
              variant="outline"
              className={`${getPerformanceBadge(latestMath.percentage).className} text-xs`}
            >
              {getPerformanceBadge(latestMath.percentage).icon} {getPerformanceBadge(latestMath.percentage).text}
            </Badge>

            {mathAverage !== null && mathAverage !== undefined && getPreviousComparison(latestMath.percentage, mathAverage ?? null) && (
              <div className={`flex items-center gap-1 text-xs ${getPreviousComparison(latestMath.percentage, mathAverage ?? null)?.className}`}>
                {getPreviousComparison(latestMath.percentage, mathAverage ?? null)?.icon}
                <span>{getPreviousComparison(latestMath.percentage, mathAverage ?? null)?.text}</span>
                <span className="text-slate-500 ml-1">（平均比）</span>
              </div>
            )}

            <p className="text-xs text-slate-500 truncate" title={latestMath.name || '---'}>
              {latestMath.name || '---'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <EmptyCard
          title="最新 算数プリント"
          icon="📊"
          bgClass="bg-gradient-to-br from-blue-50 to-blue-100/50"
        />
      )}

      {/* カード2: 最新 漢字テスト */}
      {latestKanji ? (
        <Card className="card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>✏️</span>
              <span>最新 漢字テスト</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {latestKanji.score}/{latestKanji.maxScore}
              </p>
              <p className="text-xs text-slate-600">({latestKanji.percentage}%)</p>
            </div>

            <Badge
              variant="outline"
              className={`${getPerformanceBadge(latestKanji.percentage).className} text-xs`}
            >
              {getPerformanceBadge(latestKanji.percentage).icon} {getPerformanceBadge(latestKanji.percentage).text}
            </Badge>

            {kanjiAverage !== null && kanjiAverage !== undefined && getPreviousComparison(latestKanji.percentage, kanjiAverage ?? null) && (
              <div className={`flex items-center gap-1 text-xs ${getPreviousComparison(latestKanji.percentage, kanjiAverage ?? null)?.className}`}>
                {getPreviousComparison(latestKanji.percentage, kanjiAverage ?? null)?.icon}
                <span>{getPreviousComparison(latestKanji.percentage, kanjiAverage ?? null)?.text}</span>
                <span className="text-slate-500 ml-1">（平均比）</span>
              </div>
            )}

            <p className="text-xs text-slate-500 truncate" title={latestKanji.name || '---'}>
              {latestKanji.name || '---'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <EmptyCard
          title="最新 漢字テスト"
          icon="✏️"
          bgClass="bg-gradient-to-br from-emerald-50 to-emerald-100/50"
        />
      )}

      {/* カード3: 直近3回 算数平均 */}
      {mathAverage !== null && summary && summary.counts.math >= 3 ? (
        <Card className="card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>📈</span>
              <span>直近3回 算数平均</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {mathAverage}%
              </p>
              <p className="text-xs text-slate-600">（直近3回の平均）</p>
            </div>

            <Badge
              variant="outline"
              className={`${getPerformanceBadge(mathAverage!).className} text-xs`}
            >
              {getPerformanceBadge(mathAverage!).icon} {getPerformanceBadge(mathAverage!).text}
            </Badge>

            <p className="text-xs text-slate-500">
              受験回数: {summary.counts.math}回
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>📈</span>
              <span>直近3回 算数平均</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              {summary && summary.counts.math > 0
                ? `あと${3 - summary.counts.math}回受けると平均が表示されます`
                : 'まだテスト結果がありません'
              }
            </p>
            <p className="text-xs text-slate-500">
              受験回数: {summary?.counts.math || 0}回
            </p>
          </CardContent>
        </Card>
      )}

      {/* カード4: 直近3回 漢字平均 */}
      {kanjiAverage !== null && summary && summary.counts.kanji >= 3 ? (
        <Card className="card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>📈</span>
              <span>直近3回 漢字平均</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {kanjiAverage}%
              </p>
              <p className="text-xs text-slate-600">（直近3回の平均）</p>
            </div>

            <Badge
              variant="outline"
              className={`${getPerformanceBadge(kanjiAverage!).className} text-xs`}
            >
              {getPerformanceBadge(kanjiAverage!).icon} {getPerformanceBadge(kanjiAverage!).text}
            </Badge>

            <p className="text-xs text-slate-500">
              受験回数: {summary.counts.kanji}回
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elevated shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>📈</span>
              <span>直近3回 漢字平均</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              {summary && summary.counts.kanji > 0
                ? `あと${3 - summary.counts.kanji}回受けると平均が表示されます`
                : 'まだテスト結果がありません'
              }
            </p>
            <p className="text-xs text-slate-500">
              受験回数: {summary?.counts.kanji || 0}回
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
