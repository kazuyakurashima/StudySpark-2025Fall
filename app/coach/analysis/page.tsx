"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BarChart3,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Users,
} from "lucide-react"
import Link from "next/link"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { useCoachAnalysis, type GradeFilter } from "@/lib/hooks/use-coach-analysis"
import { getAvatarById } from "@/lib/constants/avatars"
import type { TrendType, DistributionBin, StudentTrend, SubjectAverage } from "@/app/actions/coach"

/**
 * トレンドアイコンを取得
 */
function TrendIcon({ trend, className = "h-4 w-4" }: { trend: TrendType; className?: string }) {
  switch (trend) {
    case "up":
      return <TrendingUp className={`${className} text-emerald-600`} />
    case "down":
      return <TrendingDown className={`${className} text-red-500`} />
    case "stable":
      return <Minus className={`${className} text-slate-500`} />
    case "insufficient":
      return <HelpCircle className={`${className} text-slate-400`} />
  }
}

/**
 * トレンドラベルを取得
 */
function getTrendLabel(trend: TrendType): string {
  switch (trend) {
    case "up":
      return "上昇"
    case "down":
      return "下降"
    case "stable":
      return "安定"
    case "insufficient":
      return "データ不足"
  }
}

/**
 * 学年フィルタコンポーネント
 */
function GradeFilterButtons({
  value,
  onChange,
  totalStudents,
}: {
  value: GradeFilter
  onChange: (grade: GradeFilter) => void
  totalStudents: number
}) {
  const filters: { value: GradeFilter; label: string }[] = [
    { value: "all", label: "全体" },
    { value: "5", label: "5年" },
    { value: "6", label: "6年" },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">{totalStudents}名</span>
      <div className="flex gap-1">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={value === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(filter.value)}
            className="px-3 h-8"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * 科目別平均セクション
 */
function SubjectAveragesSection({ data }: { data: SubjectAverage[] }) {
  if (data.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">学年平均（科目別）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            まだ学習記録がありません
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">学年平均（科目別）</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.map((subject) => (
            <div
              key={subject.subject}
              className="p-3 bg-slate-50 rounded-xl text-center"
            >
              <div className="text-sm font-medium text-slate-700 mb-1">
                {subject.subject}
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-2xl font-bold text-slate-900">
                  {subject.average}%
                </span>
                <TrendIcon trend={subject.trend} />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                (n={subject.sampleSize})
                {subject.sampleSize < 10 && (
                  <span className="text-amber-600 ml-1">*</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {data.some((s) => s.sampleSize < 10) && (
          <p className="text-xs text-amber-600 mt-2">
            * サンプル数が少ないため参考値
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 生徒分布セクション
 */
function StudentDistributionSection({ data }: { data: DistributionBin[] }) {
  const totalStudents = data.reduce((sum, bin) => sum + bin.count, 0)

  if (totalStudents === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">生徒分布</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            直近14日間の学習記録がありません
          </p>
        </CardContent>
      </Card>
    )
  }

  const getColorClass = (bin: string) => {
    switch (bin) {
      case "excellent":
        return "bg-emerald-500"
      case "good":
        return "bg-blue-500"
      case "improving":
        return "bg-amber-500"
      case "needs_support":
        return "bg-red-500"
      default:
        return "bg-slate-400"
    }
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">生徒分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((bin) => {
            const percentage = maxCount > 0 ? (bin.count / maxCount) * 100 : 0
            return (
              <div key={bin.bin} className="flex items-center gap-3">
                <div className="w-28 text-sm text-slate-700 flex-shrink-0">
                  {bin.label}
                </div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getColorClass(bin.bin)} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-slate-900 text-right">
                  {bin.count}名
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 生徒別トレンドセクション
 */
function StudentTrendsSection({ data }: { data: StudentTrend[] }) {
  if (data.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">生徒別トレンド</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            担当生徒がいません
          </p>
        </CardContent>
      </Card>
    )
  }

  const getAvatarSrc = (avatarId: string | null, customUrl: string | null) => {
    if (customUrl) return customUrl
    if (avatarId) {
      const avatar = getAvatarById(avatarId)
      return avatar?.src || "/placeholder.svg"
    }
    return "/placeholder.svg"
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">生徒別トレンド</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {data.map((student) => (
            <Link
              key={student.studentId}
              href={`/coach/student/${student.studentId}`}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage
                  src={getAvatarSrc(student.avatarId, student.customAvatarUrl)}
                  alt={student.studentName}
                />
                <AvatarFallback className="text-sm bg-slate-100">
                  {student.studentName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm truncate">
                    {student.nickname || student.studentName}
                  </span>
                  <span className="text-xs text-slate-500">
                    小{student.grade}
                  </span>
                  {student.overallAccuracy !== null && (
                    <span className="text-xs text-slate-500 ml-auto">
                      {student.overallAccuracy}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {student.subjectTrends.map((st) => (
                    <div
                      key={st.subject}
                      className="flex items-center gap-0.5 text-xs text-slate-600"
                      title={`${st.subject}: ${getTrendLabel(st.trend)}`}
                    >
                      <span className="text-slate-500">{st.subject.charAt(0)}</span>
                      <TrendIcon trend={st.trend} className="h-3 w-3" />
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * スケルトンUI
 */
function AnalysisSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-slate-100 rounded-xl h-20" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <div className="h-5 w-24 bg-slate-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-slate-100 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </CardHeader>
        <CardContent className="p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className="h-10 w-10 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalysisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URLから学年フィルタを取得
  const gradeParam = searchParams.get("grade")
  const initialGrade: GradeFilter =
    gradeParam === "5" || gradeParam === "6" ? gradeParam : "all"

  const [grade, setGrade] = useState<GradeFilter>(initialGrade)

  // SWRフック
  const {
    subjectAverages,
    distribution,
    studentTrends,
    meta,
    isLoading,
    isValidating,
    mutate,
    error,
  } = useCoachAnalysis(grade)

  // 学年フィルタ変更時にURLを更新
  const handleGradeChange = (newGrade: GradeFilter) => {
    setGrade(newGrade)
    const params = new URLSearchParams(searchParams.toString())
    if (newGrade === "all") {
      params.delete("grade")
    } else {
      params.set("grade", newGrade)
    }
    router.push(`/coach/analysis?${params.toString()}`, { scroll: false })
  }

  // localStorageから学年フィルタを復元
  useEffect(() => {
    if (!gradeParam) {
      const saved = localStorage.getItem("coach-analysis-grade")
      if (saved === "5" || saved === "6") {
        setGrade(saved)
        router.push(`/coach/analysis?grade=${saved}`, { scroll: false })
      }
    }
  }, [gradeParam, router])

  // 学年フィルタをlocalStorageに保存
  useEffect(() => {
    localStorage.setItem("coach-analysis-grade", grade)
  }, [grade])

  const handleRefresh = () => {
    mutate()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <UserProfileHeader />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              分析
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              直近14日間のデータ
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isValidating}
            className="text-slate-500 hover:text-slate-900"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Grade Filter */}
        <div className="flex items-center justify-between">
          <GradeFilterButtons
            value={grade}
            onChange={handleGradeChange}
            totalStudents={meta?.totalStudents || 0}
          />
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-50 border-red-200 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  データの取得に失敗しました
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {error.message}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-auto"
              >
                再読み込み
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && <AnalysisSkeleton />}

        {/* Content */}
        {!isLoading && !error && (
          <div className="space-y-4">
            <SubjectAveragesSection data={subjectAverages} />
            <StudentDistributionSection data={distribution} />
            <StudentTrendsSection data={studentTrends} />
          </div>
        )}
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
