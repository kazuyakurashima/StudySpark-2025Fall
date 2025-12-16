"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileQuestion,
  ClipboardList,
} from "lucide-react"
import Link from "next/link"
import { useCoachAssessments } from "@/lib/hooks/use-assessments"
import { getAvatarById } from "@/lib/constants/avatars"
import type {
  AssessmentType,
  AssessmentGrade,
  ClassAssessment,
} from "@/lib/types/class-assessment"
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_COLORS,
} from "@/lib/types/class-assessment"

// =============================================================================
// 型定義
// =============================================================================

interface StudentWithAssessments {
  student_id: number
  student_name: string
  nickname: string | null
  avatar_id: string | null
  assessments: ClassAssessment[]
}

interface AssessmentTypeStats {
  type: AssessmentType
  count: number
  averagePercentage: number
  absentCount: number
  notSubmittedCount: number
}

interface StudentAssessmentSummary {
  studentId: number
  studentName: string
  nickname: string | null
  avatarId: string | null
  mathPrintAverage: number | null
  kanjiTestAverage: number | null
  totalCount: number
  needsAttention: boolean
  attentionReason?: string
}

// =============================================================================
// ヘルパー関数
// =============================================================================

function calculateTypeStats(
  students: StudentWithAssessments[],
  type: AssessmentType
): AssessmentTypeStats {
  let totalScore = 0
  let totalMaxScore = 0
  let count = 0
  let absentCount = 0
  let notSubmittedCount = 0

  students.forEach((student) => {
    student.assessments.forEach((a) => {
      // マスタ情報がない場合はスキップ（本来はJOINされるはず）
      const assessmentType = (a as ClassAssessment & { master?: { assessment_type: AssessmentType } }).master?.assessment_type
      if (assessmentType !== type) return

      if (a.status === "completed" && a.score !== null) {
        totalScore += a.score
        totalMaxScore += a.max_score_at_submission
        count++
      } else if (a.status === "absent") {
        absentCount++
      } else if (a.status === "not_submitted") {
        notSubmittedCount++
      }
    })
  })

  return {
    type,
    count,
    averagePercentage:
      totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
    absentCount,
    notSubmittedCount,
  }
}

function getAvatarSrc(avatarId: string | null): string {
  if (!avatarId) return "/placeholder.svg"
  if (avatarId.startsWith("http")) return avatarId
  const avatar = getAvatarById(avatarId)
  return avatar?.src || "/placeholder.svg"
}

// =============================================================================
// サブコンポーネント
// =============================================================================

/**
 * テスト種別ごとの平均表示
 */
function AssessmentTypeAverages({
  students,
}: {
  students: StudentWithAssessments[]
}) {
  const mathStats = useMemo(
    () => calculateTypeStats(students, "math_print"),
    [students]
  )
  const kanjiStats = useMemo(
    () => calculateTypeStats(students, "kanji_test"),
    [students]
  )

  const stats = [mathStats, kanjiStats]

  if (stats.every((s) => s.count === 0)) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            テスト結果平均
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            まだテスト結果がありません
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          テスト結果平均
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const colors = ASSESSMENT_TYPE_COLORS[stat.type]
            return (
              <div
                key={stat.type}
                className={`p-4 rounded-xl ${colors.bg} text-center`}
              >
                <div className={`text-sm font-medium ${colors.text} mb-1`}>
                  {ASSESSMENT_TYPE_LABELS[stat.type]}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stat.count > 0 ? `${stat.averagePercentage}%` : "—"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {stat.count > 0 ? `(${stat.count}件)` : "データなし"}
                </div>
                {(stat.absentCount > 0 || stat.notSubmittedCount > 0) && (
                  <div className="text-xs text-amber-600 mt-1">
                    {stat.absentCount > 0 && `欠席${stat.absentCount}件`}
                    {stat.absentCount > 0 && stat.notSubmittedCount > 0 && " / "}
                    {stat.notSubmittedCount > 0 && `未入力${stat.notSubmittedCount}件`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 注意が必要な生徒リスト
 */
function StudentsNeedingAttention({
  students,
}: {
  students: StudentWithAssessments[]
}) {
  const studentsWithIssues = useMemo(() => {
    return students
      .map((student) => {
        const absentCount = student.assessments.filter(
          (a) => a.status === "absent"
        ).length
        const notSubmittedCount = student.assessments.filter(
          (a) => a.status === "not_submitted"
        ).length

        if (absentCount === 0 && notSubmittedCount === 0) return null

        const reasons: string[] = []
        if (absentCount > 0) reasons.push(`欠席${absentCount}件`)
        if (notSubmittedCount > 0) reasons.push(`未入力${notSubmittedCount}件`)

        return {
          ...student,
          attentionReason: reasons.join("・"),
        }
      })
      .filter(Boolean) as (StudentWithAssessments & { attentionReason: string })[]
  }, [students])

  if (studentsWithIssues.length === 0) {
    return null
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          要確認（{studentsWithIssues.length}名）
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {studentsWithIssues.map((student) => (
            <Link
              key={student.student_id}
              href={`/coach/student/${student.student_id}`}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage
                  src={getAvatarSrc(student.avatar_id)}
                  alt={student.student_name}
                />
                <AvatarFallback className="text-sm bg-slate-100">
                  {(student.nickname || student.student_name).charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-slate-900 text-sm truncate block">
                  {student.nickname || student.student_name}
                </span>
                <span className="text-xs text-amber-600">
                  {student.attentionReason}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 生徒別テスト成績一覧
 */
function StudentAssessmentList({
  students,
}: {
  students: StudentWithAssessments[]
}) {
  const summaries = useMemo(() => {
    return students
      .map((student) => {
        const mathAssessments = student.assessments.filter(
          (a) =>
            a.status === "completed" &&
            (a as ClassAssessment & { master?: { assessment_type: AssessmentType } }).master?.assessment_type === "math_print"
        )
        const kanjiAssessments = student.assessments.filter(
          (a) =>
            a.status === "completed" &&
            (a as ClassAssessment & { master?: { assessment_type: AssessmentType } }).master?.assessment_type === "kanji_test"
        )

        const mathAvg =
          mathAssessments.length > 0
            ? Math.round(
                mathAssessments.reduce(
                  (sum, a) =>
                    sum + ((a.score ?? 0) / a.max_score_at_submission) * 100,
                  0
                ) / mathAssessments.length
              )
            : null

        const kanjiAvg =
          kanjiAssessments.length > 0
            ? Math.round(
                kanjiAssessments.reduce(
                  (sum, a) =>
                    sum + ((a.score ?? 0) / a.max_score_at_submission) * 100,
                  0
                ) / kanjiAssessments.length
              )
            : null

        const needsAttention = student.assessments.some(
          (a) => a.status === "absent" || a.status === "not_submitted"
        )

        return {
          studentId: student.student_id,
          studentName: student.student_name,
          nickname: student.nickname,
          avatarId: student.avatar_id,
          mathPrintAverage: mathAvg,
          kanjiTestAverage: kanjiAvg,
          totalCount: student.assessments.filter((a) => a.status === "completed")
            .length,
          needsAttention,
        } as StudentAssessmentSummary
      })
      .sort((a, b) => {
        // 注意が必要な生徒を上に
        if (a.needsAttention && !b.needsAttention) return -1
        if (!a.needsAttention && b.needsAttention) return 1
        // テスト数が多い順
        return b.totalCount - a.totalCount
      })
  }, [students])

  if (summaries.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">生徒別テスト成績</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            担当生徒がいません
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">生徒別テスト成績</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {summaries.map((summary) => (
            <Link
              key={summary.studentId}
              href={`/coach/student/${summary.studentId}`}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage
                  src={getAvatarSrc(summary.avatarId)}
                  alt={summary.studentName}
                />
                <AvatarFallback className="text-sm bg-slate-100">
                  {(summary.nickname || summary.studentName).charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm truncate">
                    {summary.nickname || summary.studentName}
                  </span>
                  {summary.needsAttention && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      算数
                    </Badge>
                    <span className="text-sm text-slate-700">
                      {summary.mathPrintAverage !== null
                        ? `${summary.mathPrintAverage}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                    >
                      漢字
                    </Badge>
                    <span className="text-sm text-slate-700">
                      {summary.kanjiTestAverage !== null
                        ? `${summary.kanjiTestAverage}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                {summary.totalCount}件
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// メインコンポーネント
// =============================================================================

interface AssessmentAnalysisSectionProps {
  grade?: AssessmentGrade
}

/**
 * 指導者分析ページ用テスト結果分析セクション
 */
export function AssessmentAnalysisSection({
  grade,
}: AssessmentAnalysisSectionProps) {
  const { students, isLoading, error } = useCoachAssessments({
    grade,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <div className="h-5 w-32 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200 rounded-2xl">
        <CardContent className="p-4">
          <p className="text-sm text-red-800">テスト結果の取得に失敗しました</p>
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            テスト結果分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileQuestion className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              まだテスト結果がありません
            </p>
            <p className="text-xs text-slate-400 mt-1">
              テスト結果入力ページから登録できます
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <AssessmentTypeAverages students={students} />
      <StudentsNeedingAttention students={students} />
      <StudentAssessmentList students={students} />
    </div>
  )
}
