"use client"

import { useEffect, useState } from "react"
import { getAssessmentHistory, getAssessmentSummary } from "@/app/actions/reflect"
import { AssessmentSummaryCards } from "./components/assessment-summary-cards"
import { AssessmentTrendChart } from "./components/assessment-trend-chart"
import { AssessmentHistoryList } from "./components/assessment-history-list"
import { AssessmentData, AssessmentSummary } from "./types"

export function AssessmentHistory() {
  const [assessments, setAssessments] = useState<AssessmentData[]>([])
  const [summary, setSummary] = useState<AssessmentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // 履歴とサマリーを並行取得
        const [historyResult, summaryResult] = await Promise.all([
          getAssessmentHistory({ sortBy: 'date_desc' }),
          getAssessmentSummary()
        ])

        if ('error' in historyResult && historyResult.error) {
          setError(historyResult.error)
          return
        }

        if ('error' in summaryResult && summaryResult.error) {
          setError(summaryResult.error)
          return
        }

        setAssessments((historyResult.assessments || []) as AssessmentData[])
        setSummary(summaryResult as AssessmentSummary)
      } catch (err) {
        console.error('Error fetching assessment data:', err)
        setError('データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium mb-2">エラーが発生しました</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 3層構造: サマリーカード → トレンドチャート → 履歴リスト */}

      {/* 層1: サマリーカード（4枚） */}
      <AssessmentSummaryCards summary={summary} loading={loading} />

      {/* 層2: トレンドチャート */}
      <AssessmentTrendChart assessments={assessments} loading={loading} />

      {/* 層3: 履歴リスト */}
      <AssessmentHistoryList assessments={assessments} loading={loading} />
    </div>
  )
}
