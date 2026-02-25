"use client"

import { useEffect, useState } from "react"
import { getAssessmentHistory, getAssessmentSummary } from "@/app/actions/reflect"
import { getMathGradingHistory } from "@/app/actions/math-answer"
import { AssessmentSummaryCards } from "./components/assessment-summary-cards"
import { AssessmentTrendChart } from "./components/assessment-trend-chart"
import { AssessmentHistoryList } from "./components/assessment-history-list"
import { AssessmentData, AssessmentSummary } from "./types"
import { compareAssessmentDateDesc } from "./assessment-sort"

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

        // 算数自動採点のエラーは致命的ではない（他のデータは表示継続）
        if (mathAutoResult.error) {
          console.error('Math auto grading history fetch failed:', mathAutoResult.error)
        }

        // class_assessments のデータ
        const classAssessments = (historyResult.assessments || []) as AssessmentData[]

        // 算数自動採点データを AssessmentData 形式に変換してマージ
        // latestAttempt が in_progress（再挑戦中）でも、過去に graded 履歴があれば表示する
        const mathAutoAssessments: AssessmentData[] = (mathAutoResult.results || [])
          .filter(r =>
            (r.latestAttempt?.status === 'graded') ||
            (r.latestAttempt?.status === 'in_progress' && r.attemptHistory.length > 0)
          )
          .flatMap(r => {
            // latestAttempt が graded ならそれを使用、
            // そうでなければ attemptHistory の最新 graded を使用
            // （attemptHistory は RPC の graded_history CTE で attempt_number ASC 順）
            const useLatest = r.latestAttempt?.status === 'graded'
            const lastHistory = r.attemptHistory[r.attemptHistory.length - 1]
            if (!useLatest && !lastHistory) return []

            const score = useLatest ? r.latestAttempt!.score : lastHistory!.score
            const maxScore = useLatest ? r.latestAttempt!.maxScore : lastHistory!.maxScore
            const gradedAt = useLatest ? r.latestAttempt!.gradedAt : lastHistory!.gradedAt

            const item: AssessmentData = {
              id: `math_auto_${r.questionSetId}`,
              score,
              max_score_at_submission: maxScore,
              assessment_date: gradedAt
                ? gradedAt.split('T')[0]
                : new Date().toISOString().split('T')[0],
              graded_at: gradedAt || undefined,
              master: {
                id: `math_auto_${r.questionSetId}`,
                title: r.title,
                assessment_type: 'math_auto_grading',
                max_score: maxScore,
                session_number: r.sessionNumber,
              },
              attemptHistory: r.attemptHistory.map(h => ({
                attempt: h.attempt,
                percentage: h.percentage,
              })),
            }
            return [item]
          })

        // 日付降順でマージソート（テスト済み: assessment-sort.test.ts）
        const mergedAssessments = [...classAssessments, ...mathAutoAssessments]
          .sort(compareAssessmentDateDesc)

        setAssessments(mergedAssessments)

        // サマリーに算数自動採点のデータを追加
        const baseSummary = summaryResult as AssessmentSummary
        const mathAutoSummary = mathAutoResult.summary

        // 最新の算数自動採点を見つける（graded_at タイムスタンプで比較）
        // mathAutoAssessments は既に attemptHistory フォールバック済みなので直接使用
        const latestMathAuto = mathAutoAssessments.length > 0
          ? [...mathAutoAssessments]
              .filter(a => a.graded_at)
              .sort((a, b) => (b.graded_at || '').localeCompare(a.graded_at || ''))
              [0] ?? null
          : null

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
