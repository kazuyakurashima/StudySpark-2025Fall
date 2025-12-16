"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { AssessmentResultCard, getActionSuggestion } from "./assessment-result-card"
import { useStudentAssessments } from "@/lib/hooks/use-assessments"
import type { AssessmentDisplayData } from "@/lib/types/class-assessment"

interface StudentAssessmentSectionProps {
  studentId: number
  /** 表示件数（デフォルト: 3） */
  limit?: number
  /** コンパクト表示 */
  compact?: boolean
}

/**
 * 生徒ダッシュボード用テスト結果セクション
 *
 * 仕様:
 * - 最新のテスト結果を表示（デフォルト3件）
 * - 「すべて見る」で詳細ページへ（将来実装）
 * - ローディング・空状態の対応
 */
export function StudentAssessmentSection({
  studentId,
  limit = 3,
  compact = false,
}: StudentAssessmentSectionProps) {
  const { assessments, isLoading, error } = useStudentAssessments(studentId, {
    limit,
    includeResubmissions: false,
  })

  // エラー時は非表示
  if (error) {
    return null
  }

  // ローディング中
  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-600" />
            先生からの採点結果
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  // データなし
  if (!assessments || assessments.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm border-dashed border-2 border-slate-200 bg-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-400" />
            先生からの採点結果
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-slate-500">
            まだテスト結果がありません
          </p>
          <p className="text-xs text-slate-400 mt-1">
            先生が入力すると表示されます
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-600" />
            先生からの採点結果
          </CardTitle>
          {/* 将来的に詳細ページへのリンク */}
          {/* <Link
            href="/student/assessments"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            すべて見る
            <ChevronRight className="h-4 w-4" />
          </Link> */}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assessments.map((assessment) => (
          <AssessmentResultCard
            key={assessment.id}
            type={assessment.assessment_type}
            sessionNumber={assessment.session_number}
            attemptNumber={assessment.attempt_number}
            status={assessment.status}
            score={assessment.score}
            maxScore={assessment.max_score}
            percentage={assessment.percentage}
            change={assessment.change}
            changeLabel={assessment.change_label}
            actionSuggestion={getActionSuggestion(
              assessment.assessment_type,
              assessment.percentage
            )}
            isResubmission={assessment.is_resubmission}
            description={assessment.description}
            assessmentDate={assessment.assessment_date}
            gradedAt={assessment.graded_at}
            compact={compact}
          />
        ))}
      </CardContent>
    </Card>
  )
}
