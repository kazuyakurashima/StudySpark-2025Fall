"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,
  Heart,
  ChevronRight,
  RefreshCw,
  Loader2,
  Clock,
  ClipboardCheck,
} from "lucide-react"

type GradeFilter = "all" | "5" | "6"
import Link from "next/link"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { getAvatarById } from "@/lib/constants/avatars"
import type { LearningRecordWithEncouragements, InactiveStudentData } from "@/app/actions/coach"
import { useCoachDashboard, type CoachDashboardData } from "@/lib/hooks/use-coach-dashboard"
import { useCoachStudents } from "@/lib/hooks/use-coach-students"

interface CoachHomeClientProps {
  initialRecords: LearningRecordWithEncouragements[]
  initialInactiveStudents: InactiveStudentData[]
}

/**
 * SSR初期データをSWR形式に変換
 */
function transformSSRtoSWRData(
  initialRecords: LearningRecordWithEncouragements[],
  initialInactiveStudents: InactiveStudentData[]
): Partial<CoachDashboardData> {
  return {
    records: { records: initialRecords },
    inactiveStudents: { students: initialInactiveStudents },
    fetchedAt: Date.now(),
  }
}

export function CoachHomeClient({ initialRecords, initialInactiveStudents }: CoachHomeClientProps) {
  // SWRでデータを管理
  const { records, inactiveStudents, isValidating, mutate } = useCoachDashboard(
    transformSSRtoSWRData(initialRecords, initialInactiveStudents)
  )
  // 生徒一覧データ
  const { students, isLoading: isStudentsLoading, isValidating: isStudentsValidating, mutate: mutateStudents } = useCoachStudents()

  // 学年フィルタの状態
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all")

  // 学年でフィルタリングされた生徒
  const filteredStudents = useMemo(() => {
    if (gradeFilter === "all") return students
    // grade が "小5" や "小6" の形式と仮定
    return students.filter((s) => s.grade?.includes(gradeFilter))
  }, [students, gradeFilter])

  // 学年ごとの生徒数
  const gradeCount = useMemo(() => {
    const grade5 = students.filter((s) => s.grade?.includes("5")).length
    const grade6 = students.filter((s) => s.grade?.includes("6")).length
    return { grade5, grade6, total: students.length }
  }, [students])

  // 7日以上未入力の生徒
  const alertStudents = useMemo(() =>
    inactiveStudents.filter((s) => s.daysInactive >= 7),
    [inactiveStudents]
  )

  // 最近の学習記録（5件のみ）
  const recentRecords = useMemo(() => records.slice(0, 5), [records])

  // 生徒のステータスを取得（順調/注意/要対応）
  const getStudentStatus = (studentId: string) => {
    const inactive = inactiveStudents.find((s) => s.id === studentId)
    if (!inactive) return "good" // データなし = 順調
    if (inactive.daysInactive >= 7) return "alert"
    if (inactive.daysInactive >= 3) return "warning"
    return "good"
  }

  const getAvatarSrc = (avatarId: string | null, customAvatarUrl?: string | null) => {
    if (customAvatarUrl) return customAvatarUrl
    if (!avatarId) return "/placeholder.svg"
    const avatar = getAvatarById(avatarId)
    return avatar?.src || "/placeholder.svg"
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "1時間以内"
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
  }

  const handleRefresh = () => {
    mutate()
    mutateStudents()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <UserProfileHeader />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Header - Minimal */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isValidating || isStudentsValidating}
            className="text-slate-500 hover:text-slate-900"
          >
            {(isValidating || isStudentsValidating) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <section>
          <Link href="/coach/assessments" className="block group">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-sm hover:shadow-md transition-all duration-200 group-focus:ring-2 group-focus:ring-blue-500 group-focus:ring-offset-2 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <ClipboardCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900 mb-0.5">
                      テスト結果を入力
                    </p>
                    <p className="text-sm text-slate-600">
                      算数プリント・漢字テストの採点結果を一括入力
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Alert Banner - Only when there are issues */}
        {alertStudents.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {alertStudents.length}名の生徒が7日以上学習記録を入力していません
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {alertStudents.slice(0, 3).map((student) => (
                    <Link
                      key={student.id}
                      href={`/coach/student/${student.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors"
                    >
                      {student.name}
                      <span className="text-amber-500">·</span>
                      <span className="text-amber-600">{student.daysInactive}日</span>
                    </Link>
                  ))}
                  {alertStudents.length > 3 && (
                    <span className="text-sm text-amber-600">
                      他{alertStudents.length - 3}名
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">担当生徒</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{filteredStudents.length}名</span>
              <div className="flex gap-1">
                <Button
                  variant={gradeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGradeFilter("all")}
                  className="px-3 h-8 text-xs"
                >
                  全体
                  <span className="ml-1 text-xs opacity-70">({gradeCount.total})</span>
                </Button>
                <Button
                  variant={gradeFilter === "5" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGradeFilter("5")}
                  className="px-3 h-8 text-xs"
                >
                  5年
                  <span className="ml-1 text-xs opacity-70">({gradeCount.grade5})</span>
                </Button>
                <Button
                  variant={gradeFilter === "6" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGradeFilter("6")}
                  className="px-3 h-8 text-xs"
                >
                  6年
                  <span className="ml-1 text-xs opacity-70">({gradeCount.grade6})</span>
                </Button>
              </div>
            </div>
          </div>

          {isStudentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">該当する生徒がいません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredStudents.map((student) => {
                const status = getStudentStatus(student.id)
                return (
                  <Link
                    key={student.id}
                    href={`/coach/student/${student.id}`}
                    className="group block"
                  >
                    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 group-focus:ring-2 group-focus:ring-blue-500 group-focus:ring-offset-2 rounded-2xl overflow-hidden">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="relative mb-3">
                          <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                            <AvatarImage
                              src={student.custom_avatar_url || (student.avatar_id ? getAvatarById(student.avatar_id)?.src || "/placeholder.svg" : "/placeholder.svg")}
                              alt={student.full_name}
                            />
                            <AvatarFallback className="text-lg bg-slate-100 text-slate-600">
                              {student.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Status Indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
                            status === "alert" ? "bg-red-500" :
                            status === "warning" ? "bg-amber-500" :
                            "bg-emerald-500"
                          }`} />
                        </div>
                        <p className="font-medium text-slate-900 text-sm leading-tight line-clamp-2 w-full">
                          {student.nickname ? (
                            <>
                              {student.nickname}
                              <span className="text-slate-500 font-normal">（{student.full_name}）</span>
                            </>
                          ) : (
                            student.full_name
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {student.grade} · {student.course || "-"}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent Learning Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">最近の学習</h2>
            <Link
              href="/coach/encouragement"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              すべて見る
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {recentRecords.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">学習記録がありません</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {recentRecords.map((record) => {
                  const accuracy = record.totalQuestions > 0
                    ? Math.round((record.correctCount / record.totalQuestions) * 100)
                    : 0
                  const hasEncouragement = record.coachEncouragements.length > 0

                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                    >
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage
                          src={getAvatarSrc(record.studentAvatar, record.studentCustomAvatarUrl)}
                          alt={record.studentName}
                        />
                        <AvatarFallback className="text-sm bg-slate-100">
                          {record.studentName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 text-sm truncate">
                            {record.studentNickname || record.studentName}
                          </p>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-slate-100 text-slate-600 font-normal">
                            {record.subject}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Progress Bar */}
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                accuracy >= 80 ? "bg-emerald-500" :
                                accuracy >= 50 ? "bg-amber-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{accuracy}%</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(record.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      {hasEncouragement ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <Heart className="h-4 w-4 fill-current" />
                        </div>
                      ) : (
                        <Link
                          href="/coach/encouragement"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          応援
                        </Link>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
