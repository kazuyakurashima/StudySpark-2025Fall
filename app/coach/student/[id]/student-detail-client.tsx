"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
  MessageSquare,
  ClipboardCheck,
  MoreHorizontal,
  Settings,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAvatarById } from "@/lib/constants/avatars"
import { useCoachStudentDetail } from "@/lib/hooks/use-coach-student-detail"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

// タブコンポーネント
import { LearningTab } from "./tabs/learning-tab"
import { EncouragementTab } from "./tabs/encouragement-tab"
import { AssessmentHistory } from "@/app/student/reflect/assessment-history"
import { AchievementMap } from "@/app/student/reflect/achievement-map"
import { EncouragementHistory } from "@/app/student/reflect/encouragement-history"

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
  grade: number
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

  // 学年を数値に変換（明示的マッピング）
  const getStudentGradeNumber = (gradeStr: string | null | undefined): number => {
    // ガード: 空/未定義チェック
    if (!gradeStr || typeof gradeStr !== 'string') {
      console.warn('[student-detail-client] Invalid grade value, defaulting to 6')
      return 6
    }

    // Server Actionから返される形式: "小学5年" or "小学6年"
    const gradeMap: Record<string, number> = {
      "小学5年": 5,
      "小学5年生": 5,
      "小学6年": 6,
      "小学6年生": 6,
    }

    // 明示的マッピングを優先
    if (gradeMap[gradeStr]) {
      return gradeMap[gradeStr]
    }

    // フォールバック: 数字抽出
    const match = gradeStr.match(/(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      return num === 5 || num === 6 ? num : 6
    }

    // 最終フォールバック
    console.warn(`[student-detail-client] Unknown grade format: "${gradeStr}", defaulting to 6`)
    return 6
  }

  const getAvatarSrc = () => {
    if (student.custom_avatar_url) return student.custom_avatar_url
    if (student.avatar_id) {
      const avatar = getAvatarById(student.avatar_id)
      return avatar?.src || "/placeholder.svg"
    }
    return "/placeholder.svg"
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ヘッダー（パンくず + 生徒情報） */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-2">
          {/* パンくずナビゲーション */}
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
            <Link
              href="/coach"
              className="hover:text-slate-900 transition-colors"
            >
              生徒一覧
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-medium">
              {student.nickname
                ? `${student.nickname}（${student.full_name}）`
                : student.full_name
              }
            </span>
          </div>

          {/* メインヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/coach')}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={getAvatarSrc()}
                    alt={student.nickname || student.full_name}
                  />
                  <AvatarFallback>
                    {(student.nickname || student.full_name).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-base font-semibold leading-tight">
                    {student.nickname || student.full_name}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {student.nickname && `${student.full_name} · `}
                    {student.grade}
                    {student.course && ` · ${student.course}`}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* タブナビゲーション（PC: 6タブ, Mobile: 5タブ） */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* PC版: 6タブ構成（主要5タブ + その他メニュー） */}
          <TabsList className="hidden md:grid md:grid-cols-6 w-full h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-3">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">概要</span>
            </TabsTrigger>

            <TabsTrigger value="assessment" className="flex items-center gap-2 py-3">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">テスト結果</span>
            </TabsTrigger>

            <TabsTrigger value="learning" className="flex items-center gap-2 py-3">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">学習</span>
            </TabsTrigger>

            <TabsTrigger value="encouragement" className="flex items-center gap-2 py-3">
              <Heart className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">応援</span>
            </TabsTrigger>

            <TabsTrigger value="achievement" className="flex items-center gap-2 py-3">
              <Target className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">達成マップ</span>
            </TabsTrigger>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto py-3">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">その他</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("coaching")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  ふりかえり履歴
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  設定
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>

          {/* モバイル版: 5タブ構成（主要4タブ + その他メニュー） */}
          <TabsList className="grid grid-cols-5 md:hidden w-full h-auto">
            <TabsTrigger value="overview" className="flex flex-col items-center gap-1 text-xs min-h-[44px] px-2 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>概要</span>
            </TabsTrigger>

            <TabsTrigger value="assessment" className="flex flex-col items-center gap-1 text-xs min-h-[44px] px-2 py-2">
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>テスト</span>
            </TabsTrigger>

            <TabsTrigger value="learning" className="flex flex-col items-center gap-1 text-xs min-h-[44px] px-2 py-2">
              <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>学習</span>
            </TabsTrigger>

            <TabsTrigger value="encouragement" className="flex flex-col items-center gap-1 text-xs min-h-[44px] px-2 py-2">
              <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>応援</span>
            </TabsTrigger>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex flex-col items-center gap-1 text-xs min-h-[44px] px-2 py-2 h-auto">
                  <MoreHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>その他</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("achievement")}>
                  <Target className="h-4 w-4 mr-2" />
                  達成マップ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("coaching")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  ふりかえり履歴
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  設定
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* テスト結果タブ */}
          <TabsContent value="assessment" className="mt-4">
            <AssessmentHistory studentId={studentId} />
          </TabsContent>

          {/* 学習タブ（SWR lazy load） */}
          <TabsContent value="learning" className="mt-4">
            <LearningTab studentId={studentId} />
          </TabsContent>

          {/* 応援タブ（送信UI + 履歴） */}
          <TabsContent value="encouragement" className="mt-4">
            <div className="space-y-6">
              {/* 応援メッセージ送信UI */}
              <EncouragementTab studentId={studentId} studentName={student.nickname || student.full_name} />

              {/* 送信済み履歴 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">送信済みメッセージ</h3>
                <EncouragementHistory viewerRole="coach" studentId={studentId} />
              </div>
            </div>
          </TabsContent>

          {/* 達成マップタブ */}
          <TabsContent value="achievement" className="mt-4">
            <AchievementMap
              viewerRole="coach"
              studentId={studentId}
              studentGrade={student.grade}
              studentCourse={student.course || undefined}
            />
          </TabsContent>

          {/* ふりかえり履歴タブ */}
          <TabsContent value="coaching" className="mt-4">
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-medium">ふりかえり履歴</p>
              <p className="text-sm mt-2">この機能は今後実装予定です</p>
            </div>
          </TabsContent>

          {/* 設定タブ */}
          <TabsContent value="settings" className="mt-4">
            <div className="text-center py-12 text-slate-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-medium">設定</p>
              <p className="text-sm mt-2">この機能は今後実装予定です</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
