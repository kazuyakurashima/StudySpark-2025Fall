"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useState, useMemo } from "react"
import { AssessmentData } from "../types"

type ChartType = 'math_print' | 'kanji_test' | 'math_auto_grading'

interface AssessmentTrendChartProps {
  assessments: AssessmentData[]
  loading?: boolean
}

export function AssessmentTrendChart({ assessments, loading }: AssessmentTrendChartProps) {
  // データがある種類を自動検出して初期選択
  const defaultType = useMemo<ChartType>(() => {
    const types: ChartType[] = ['math_print', 'kanji_test', 'math_auto_grading']
    for (const t of types) {
      if (assessments.some(a => a.master?.assessment_type === t)) return t
    }
    return 'math_print'
  }, [assessments])

  const [selectedType, setSelectedType] = useState<ChartType | null>(null)
  const activeType = selectedType ?? defaultType

  if (loading) {
    return (
      <Card className="card-elevated mb-6">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-slate-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  // テスト種類でフィルター
  const filteredAssessments = assessments.filter(
    (a) => a.master?.assessment_type === activeType
  )

  // データが空の場合
  if (filteredAssessments.length === 0) {
    const typeName = activeType === 'math_print' ? '算数プリント'
      : activeType === 'math_auto_grading' ? '算数自動採点' : '漢字テスト'
    const icon = activeType === 'math_print' ? '📊'
      : activeType === 'math_auto_grading' ? '📐' : '✏️'

    return (
      <Card className="card-elevated mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span>📈</span>
            <span>成績トレンド</span>
          </CardTitle>
          <Select value={activeType} onValueChange={(v) => setSelectedType(v as ChartType)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="math_print">📊 算数プリント</SelectItem>
              <SelectItem value="kanji_test">✏️ 漢字テスト</SelectItem>
              <SelectItem value="math_auto_grading">📐 算数自動採点</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <div className="text-6xl">{icon}</div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                {typeName}のデータがまだありません
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                {activeType === 'math_auto_grading'
                  ? '💡 算数プリントを解いて採点すると、自動的にグラフが表示されるよ！'
                  : '💡 テスト結果は指導者が入力します。入力されると自動的にグラフが表示されるよ！'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // チャート用データの準備（学習回順にソート）
  const chartData = filteredAssessments
    .map((a) => {
      const percentage = a.max_score_at_submission > 0
        ? Math.round((a.score / a.max_score_at_submission) * 100)
        : 0

      return {
        sessionNumber: a.master?.session_number || 0,
        percentage,
        score: a.score,
        maxScore: a.max_score_at_submission,
        name: a.master?.title || '',
        date: new Date(a.assessment_date).toLocaleDateString('ja-JP', {
          month: 'short',
          day: 'numeric'
        })
      }
    })
    .sort((a, b) => a.sessionNumber - b.sessionNumber)

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            第{data.sessionNumber}回
          </p>
          <p className="text-sm font-bold text-slate-900 mb-1">
            {data.percentage}%
          </p>
          <p className="text-xs text-slate-600">
            {data.score}/{data.maxScore}点
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data.date}
          </p>
        </div>
      )
    }
    return null
  }

  const typeName = activeType === 'math_print' ? '算数プリント'
    : activeType === 'math_auto_grading' ? '算数自動採点' : '漢字テスト'
  const lineColor = activeType === 'math_print' ? '#3b82f6'
    : activeType === 'math_auto_grading' ? '#6366f1' : '#10b981'

  return (
    <Card className="card-elevated mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span>📈</span>
          <span>成績トレンド</span>
        </CardTitle>
        <Select value={activeType} onValueChange={(v) => setSelectedType(v as ChartType)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="math_print">📊 算数プリント</SelectItem>
            <SelectItem value="kanji_test">✏️ 漢字テスト</SelectItem>
            <SelectItem value="math_auto_grading">📐 算数自動採点</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {typeName}の成績推移（全{filteredAssessments.length}回）
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-emerald-500"></div>
              <span>80%以上</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500"></div>
              <span>50-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-orange-500"></div>
              <span>50%未満</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="sessionNumber"
              label={{ value: '学習回', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `第${value}回`}
            />
            <YAxis
              label={{ value: '得点率(%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
            {/* 80%のラインを追加 */}
            <Line
              type="monotone"
              data={chartData.map(d => ({ ...d, threshold: 80 }))}
              dataKey="threshold"
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              legendType="none"
            />
            {/* 50%のラインを追加 */}
            <Line
              type="monotone"
              data={chartData.map(d => ({ ...d, threshold: 50 }))}
              dataKey="threshold"
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-slate-700 flex items-start gap-2">
            <span>💡</span>
            <span>
              グラフは学習回ごとの成績推移を示しています。
              80%以上を目指して、コツコツ取り組んでいこう！
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
