"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ClipboardList } from "lucide-react"
import { AssessmentResultCard, getActionSuggestion } from "@/components/assessment/assessment-result-card"
import { useStudentAssessments } from "@/lib/hooks/use-assessments"

interface AssessmentsTabProps {
  studentId: string
}

/**
 * 生徒のテスト結果タブ（指導者用）
 *
 * 仕様:
 * - SWR でクライアント側フェッチ（タブ切り替え時に lazy load）
 * - AssessmentResultCard を再利用して表示
 * - ローディング・エラー・空状態のハンドリング
 */
export function AssessmentsTab({ studentId }: AssessmentsTabProps) {
  // SWR でクライアント側フェッチ（タブ切り替え時に lazy load）
  const { assessments, isLoading, error } = useStudentAssessments(
    parseInt(studentId, 10),
    {
      limit: 20, // 最新20件
      includeResubmissions: false, // 通常提出のみ
    }
  )

  // エラー表示
  if (error) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center text-red-500 text-sm">
          データの取得に失敗しました
        </CardContent>
      </Card>
    )
  }

  // ローディング表示
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  // データなし表示
  if (!assessments || assessments.length === 0) {
    return (
      <Card className="shadow-sm border-dashed border-2 border-slate-200 bg-slate-50">
        <CardContent className="py-8 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">まだテスト結果がありません</p>
          <p className="text-slate-400 text-xs mt-1">
            テスト結果入力画面から登録してください
          </p>
        </CardContent>
      </Card>
    )
  }

  // テスト結果一覧表示
  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-600" />
            テスト結果一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assessments.map((assessment) => (
            <AssessmentResultCard
              key={assessment.id}
              // フィールドマッピング（snake_case → camelCase）
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
              title={assessment.title}
              description={assessment.description}
              assessmentDate={assessment.assessment_date}
              gradedAt={assessment.graded_at}
              compact={false}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
