"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Target,
  TrendingUp,
  BookOpen,
  Heart,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle2,
  Check,
  ChevronRight,
} from "lucide-react"
import { getAvatarById } from "@/lib/constants/avatars"
import { useCoachStudentDetail } from "@/lib/hooks/use-coach-student-detail"

// タブコンポーネント
import { LearningTab } from "./tabs/learning-tab"
import { EncouragementTab } from "./tabs/encouragement-tab"

// 相対時間を計算するヘルパー
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "たった今"
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays === 1) return "昨日"
  if (diffDays < 7) return `${diffDays}日前`
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
}

interface StudentData {
  id: string
  full_name: string
  nickname: string | null
  grade: string
  course: string | null
  avatar_id: string | null
  custom_avatar_url: string | null
}

interface SummaryData {
  streak: number
  studyDaysThisWeek: number
  recentAccuracy: number
  totalQuestionsThisWeek: number
}

interface StudentDetailClientProps {
  studentId: string
  initialData: {
    student: StudentData
    summary: SummaryData
  }
}

export function StudentDetailClient({ studentId, initialData }: StudentDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // SWRで詳細データを取得（学習タブ等で使用）
  const { isValidating, mutate, studyLogs, isLoading, error } = useCoachStudentDetail(studentId)

  const { student, summary } = initialData

  // 最近の学習（最新5件）
  const recentLearning = studyLogs.slice(0, 5)

  const getAvatarSrc = () => {
    if (student.custom_avatar_url) return student.custom_avatar_url
    if (student.avatar_id) {
      const avatar = getAvatarById(student.avatar_id)
      return avatar?.src || "/placeholder.svg"
    }
    return "/placeholder.svg"
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* シンプルヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-9 w-9 p-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getAvatarSrc()} alt={student.full_name} />
                <AvatarFallback className="text-sm">{student.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold text-slate-900">{student.full_name}</span>
                <span className="text-slate-500 text-sm ml-2">
                  {student.grade}
                  {student.course && `・${student.course}コース`}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating}
            className="h-9 w-9 p-0"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* タブナビゲーション（3タブ構成） */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="flex flex-col gap-1 py-3">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">概要</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex flex-col gap-1 py-3">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs">学習</span>
            </TabsTrigger>
            <TabsTrigger value="encouragement" className="flex flex-col gap-1 py-3">
              <Heart className="h-4 w-4" />
              <span className="text-xs">応援</span>
            </TabsTrigger>
          </TabsList>

          {/* 概要タブ（SSRデータ使用） */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* サマリーカード */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{summary.streak}</div>
                      <div className="text-xs text-muted-foreground">連続日数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{summary.studyDaysThisWeek}</div>
                      <div className="text-xs text-muted-foreground">今週の学習日</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{summary.recentAccuracy}%</div>
                      <div className="text-xs text-muted-foreground">今週の正答率</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{summary.totalQuestionsThisWeek}</div>
                      <div className="text-xs text-muted-foreground">今週の問題数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 最近の学習 */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">最近の学習</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500"
                    onClick={() => setActiveTab("learning")}
                  >
                    すべて見る
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {error ? (
                  <div className="text-center py-8 text-red-500 text-sm">
                    データの取得に失敗しました: {error.message}
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : recentLearning.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    まだ学習記録がありません
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLearning.map((log) => {
                      const accuracy = log.total_problems > 0
                        ? Math.round((log.correct_count / log.total_problems) * 100)
                        : 0
                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-slate-900">
                                {log.subject || log.subjects?.name || "科目不明"}
                              </span>
                              <span className="text-xs text-slate-400">
                                {getRelativeTime(log.logged_at || log.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={accuracy} className="h-1.5 flex-1 max-w-24" />
                              <span className="text-xs text-slate-600 font-medium">{accuracy}%</span>
                              <span className="text-xs text-slate-400">
                                ({log.correct_count}/{log.total_problems}問)
                              </span>
                            </div>
                          </div>
                          {log.hasCoachResponse ? (
                            <div className="flex items-center gap-1 text-emerald-600 ml-3">
                              <Check className="h-4 w-4" />
                              <span className="text-xs">済</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-3 h-8 text-xs"
                              onClick={() => setActiveTab("encouragement")}
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              応援
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* 学習タブ（SWR lazy load） */}
          <TabsContent value="learning" className="mt-4">
            <LearningTab studentId={studentId} />
          </TabsContent>

          {/* 応援タブ */}
          <TabsContent value="encouragement" className="mt-4">
            <EncouragementTab studentId={studentId} studentName={student.nickname || student.full_name} />
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
