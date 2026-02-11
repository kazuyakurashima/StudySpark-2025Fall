"use client"

import { useEffect, useState } from "react"
import { getAssessmentHistory, getAssessmentSummary } from "@/app/actions/reflect"
import { getMathGradingHistory } from "@/app/actions/math-answer"
import { AssessmentSummaryCards } from "./components/assessment-summary-cards"
import { AssessmentTrendChart } from "./components/assessment-trend-chart"
import { AssessmentHistoryList } from "./components/assessment-history-list"
import { AssessmentData, AssessmentSummary } from "./types"

interface AssessmentHistoryProps {
  studentId?: string  // 保護者画面から渡される生徒ID（オプショナル）
}

export function AssessmentHistory({ studentId }: AssessmentHistoryProps = {}) {
  const [assessments, setAssessments] = useState<AssessmentData[]>([])
  const [summary, setSummary] = useState<AssessmentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // 履歴・サマリー・算数自動採点を並行取得
        const [historyResult, summaryResult, mathAutoResult] = await Promise.all([
          getAssessmentHistory({ sortBy: 'date_desc', studentId }),
          getAssessmentSummary({ studentId }),
          getMathGradingHistory({ studentId: studentId ? Number(studentId) : undefined })
        ])

        if ('error' in historyResult && historyResult.error) {
          setError(historyResult.error)
          return
        }

        if ('error' in summaryResult && summaryResult.error) {
          setError(summaryResult.error)
          return
        }

        // class_assessments のデータ
        const classAssessments = (historyResult.assessments || []) as AssessmentData[]

        // 算数自動採点データを AssessmentData 形式に変換してマージ
        const mathAutoAssessments: AssessmentData[] = (mathAutoResult.results || [])
          .filter(r => r.latestAttempt && r.latestAttempt.status === 'graded')
          .map(r => ({
            id: `math_auto_${r.questionSetId}`,
            score: r.latestAttempt!.score,
            max_score_at_submission: r.latestAttempt!.maxScore,
            assessment_date: r.latestAttempt!.gradedAt
              ? r.latestAttempt!.gradedAt.split('T')[0]
              : new Date().toISOString().split('T')[0],
            master: {
              id: `math_auto_${r.questionSetId}`,
              title: r.title,
              assessment_type: 'math_auto_grading',
              max_score: r.latestAttempt!.maxScore,
              session_number: r.sessionNumber,
            },
            attemptHistory: r.attemptHistory.map(h => ({
              attempt: h.attempt,
              percentage: h.percentage,
            })),
          }))

        // 日付降順でマージソート
        const mergedAssessments = [...classAssessments, ...mathAutoAssessments]
          .sort((a, b) =>
            new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime()
          )

        setAssessments(mergedAssessments)

        // サマリーに算数自動採点のデータを追加
        const baseSummary = summaryResult as AssessmentSummary
        const mathAutoSummary = mathAutoResult.summary

        // 最新の算数自動採点を見つける（gradedAt タイムスタンプで比較）
        const latestGradedResult = (mathAutoResult.results || [])
          .filter(r => r.latestAttempt?.status === 'graded' && r.latestAttempt.gradedAt)
          .sort((a, b) => (b.latestAttempt!.gradedAt || '').localeCompare(a.latestAttempt!.gradedAt || ''))
        const latestSource = latestGradedResult[0] ?? null
        const latestMathAuto = latestSource ? mathAutoAssessments.find(
          a => a.id === `math_auto_${latestSource.questionSetId}`
        ) ?? null : null

        const enrichedSummary: AssessmentSummary = {
          latest: {
            math: baseSummary.latest?.math || null,
            kanji: baseSummary.latest?.kanji || null,
            mathAutoGrading: latestMathAuto ? {
              id: latestMathAuto.id,
              name: latestMathAuto.master?.title || null,
              score: latestMathAuto.score,
              maxScore: latestMathAuto.max_score_at_submission,
              percentage: latestMathAuto.max_score_at_submission > 0
                ? Math.round((latestMathAuto.score / latestMathAuto.max_score_at_submission) * 100)
                : 0,
              submittedAt: latestMathAuto.assessment_date,
            } : null,
          },
          averages: {
            math: baseSummary.averages?.math ?? null,
            kanji: baseSummary.averages?.kanji ?? null,
            mathAutoGrading: mathAutoSummary.averagePercentage,
          },
          counts: {
            math: baseSummary.counts?.math || 0,
            kanji: baseSummary.counts?.kanji || 0,
            mathAutoGrading: mathAutoSummary.completedSets,
            total: (baseSummary.counts?.total || 0) + mathAutoSummary.completedSets,
          },
        }

        setSummary(enrichedSummary)
      } catch (err) {
        console.error('Error fetching assessment data:', err)
        setError('データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [studentId])

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
