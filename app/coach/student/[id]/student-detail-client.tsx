"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Target,
  TrendingUp,
  BookOpen,
  Heart,
  BarChart3,
  FileText,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { getAvatarById } from "@/lib/constants/avatars"
import { useCoachStudentDetail } from "@/lib/hooks/use-coach-student-detail"

// タブコンポーネントの遅延インポート用
import { LearningTab } from "./tabs/learning-tab"
import { GoalTab } from "./tabs/goal-tab"
import { EncouragementTab } from "./tabs/encouragement-tab"
import { AnalysisTab } from "./tabs/analysis-tab"

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
  const { isValidating, mutate } = useCoachStudentDetail(studentId)

  const { student, summary } = initialData

  const getAvatarSrc = () => {
    if (student.custom_avatar_url) return student.custom_avatar_url
    if (student.avatar_id) {
      const avatar = getAvatarById(student.avatar_id)
      return avatar?.src || "/placeholder.svg"
    }
    return "/placeholder.svg"
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <UserProfileHeader />

      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-12 w-12 border-2 border-border">
                <AvatarImage src={getAvatarSrc()} alt={student.full_name} />
                <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">{student.full_name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {student.nickname && <span>({student.nickname})</span>}
                  <Badge variant="secondary">{student.grade}</Badge>
                  {student.course && (
                    <Badge variant="outline">{student.course}コース</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-2">更新</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* タブナビゲーション */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-6 h-auto">
            <TabsTrigger value="overview" className="flex flex-col gap-1 py-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">概要</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex flex-col gap-1 py-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs">学習</span>
            </TabsTrigger>
            <TabsTrigger value="goal" className="flex flex-col gap-1 py-2">
              <Target className="h-4 w-4" />
              <span className="text-xs">目標</span>
            </TabsTrigger>
            <TabsTrigger value="encouragement" className="flex flex-col gap-1 py-2">
              <Heart className="h-4 w-4" />
              <span className="text-xs">応援</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex flex-col gap-1 py-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">分析</span>
            </TabsTrigger>
            <TabsTrigger value="memo" className="flex flex-col gap-1 py-2" disabled>
              <FileText className="h-4 w-4" />
              <span className="text-xs">メモ</span>
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

            {/* 生徒情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">生徒情報</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">氏名</dt>
                    <dd className="font-medium">{student.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">ニックネーム</dt>
                    <dd className="font-medium">{student.nickname || "未設定"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">学年</dt>
                    <dd className="font-medium">{student.grade}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">コース</dt>
                    <dd className="font-medium">{student.course || "未設定"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* クイックアクション */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">クイックアクション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("learning")}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="text-sm">学習履歴</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("goal")}
                  >
                    <Target className="h-5 w-5" />
                    <span className="text-sm">目標確認</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("encouragement")}
                  >
                    <Heart className="h-5 w-5" />
                    <span className="text-sm">応援する</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab("analysis")}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-sm">分析を見る</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学習タブ（SWR lazy load） */}
          <TabsContent value="learning" className="mt-4">
            <LearningTab studentId={studentId} />
          </TabsContent>

          {/* 目標タブ（SWR lazy load） */}
          <TabsContent value="goal" className="mt-4">
            <GoalTab studentId={studentId} studentGrade={student.grade} />
          </TabsContent>

          {/* 応援タブ（SWR lazy load） */}
          <TabsContent value="encouragement" className="mt-4">
            <EncouragementTab studentId={studentId} studentName={student.nickname || student.full_name} />
          </TabsContent>

          {/* 分析タブ（SWR lazy load） */}
          <TabsContent value="analysis" className="mt-4">
            <AnalysisTab studentId={studentId} studentName={student.full_name} />
          </TabsContent>

          {/* メモタブ（準備中） */}
          <TabsContent value="memo" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">メモ機能は準備中です</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
