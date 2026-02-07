"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { AchievementMap } from "@/app/student/reflect/achievement-map"
import { StudyHistory } from "@/app/student/reflect/study-history"
import { EncouragementHistory } from "@/app/student/reflect/encouragement-history"
import { AssessmentHistory } from "@/app/student/reflect/assessment-history"
import {
  getParentChildren,
  getChildReflections,
  getChildReflection,
} from "@/app/actions/parent"
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Users,
  Bot,
  Lock,
  MessageCircle,
  Target,
  ClipboardCheck,
  BookOpen,
  Heart,
  MessageSquare,
} from "lucide-react"
import { useUserProfile } from "@/lib/hooks/use-user-profile"

interface Child {
  id: string
  full_name: string
  display_name: string
  avatar_id: string | null
  grade: number
}

interface Reflection {
  id: string
  session_number: number
  week_type: "growth" | "stable" | "challenge" | "special"
  this_week_accuracy: number
  last_week_accuracy: number
  summary: string
  completed_at: string
  created_at: string
}

export default function ParentReflectPage() {
  const searchParams = useSearchParams()
  const { profile, setSelectedChildId: setProviderChildId, selectedChildId: providerSelectedChildId } = useUserProfile()

  // URLパラメータから初期タブを取得
  const tabParam = searchParams.get("tab")

  // 後方互換: map → achievement, assessment-history → assessment に正規化
  const normalizedTab = tabParam === "map" ? "achievement"
    : tabParam === "assessment-history" ? "assessment"
    : tabParam

  const initialTab = (normalizedTab && ["achievement", "assessment", "history", "encouragement", "coaching"].includes(normalizedTab))
    ? (normalizedTab as "achievement" | "assessment" | "history" | "encouragement" | "coaching")
    : "achievement"

  // URLパラメータから child ID を取得
  const childParam = searchParams.get("child")

  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"achievement" | "assessment" | "history" | "encouragement" | "coaching">(initialTab)
  const [loading, setLoading] = useState(true)
  const [encouragementStatus, setEncouragementStatus] = useState<{ [childId: number]: boolean }>({})

  // URLパラメータの変更を監視してタブを更新
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (!tabParam) return

    // 後方互換: map → achievement, assessment-history → assessment に正規化
    const normalizedTab = tabParam === "map" ? "achievement"
      : tabParam === "assessment-history" ? "assessment"
      : tabParam

    if (["achievement", "assessment", "history", "encouragement", "coaching"].includes(normalizedTab)) {
      setActiveTab(normalizedTab as "achievement" | "assessment" | "history" | "encouragement" | "coaching")
    }
  }, [searchParams])

  // 子ども一覧を読み込み（初回のみ）
  useEffect(() => {
    const loadChildren = async () => {
      const { children, error } = await getParentChildren()
      if (children && !error) {
        setChildren(children)
      }
      setLoading(false)
    }

    loadChildren()
  }, [])

  // URL パラメータの child ID をプロバイダーに反映（初回のみ）
  useEffect(() => {
    if (childParam && children.length > 0) {
      const childId = parseInt(childParam, 10)
      const child = children.find(c => parseInt(c.id) === childId)
      if (child) {
        setProviderChildId(childId)
      }
    }
  }, [childParam, children, setProviderChildId])

  // プロバイダーの selectedChildId が確定したら、選択中の子どもを設定
  useEffect(() => {
    if (children.length === 0) return

    if (providerSelectedChildId !== null) {
      // プロバイダーから取得したIDで子どもを選択
      const child = children.find(c => parseInt(c.id) === providerSelectedChildId)
      if (child) {
        setSelectedChildId(child.id)
        setSelectedChild(child)
      }
    } else {
      // プロバイダーにまだ値がない場合は待機（何もしない）
      // UserProfileProvider の初期化が完了すれば providerSelectedChildId が設定される
    }
  }, [providerSelectedChildId, children])

  // 選択された子どものデータを読み込み
  useEffect(() => {
    const loadChildData = async () => {
      if (!selectedChildId) return

      const child = children.find((c) => c.id === selectedChildId)
      if (child) {
        setSelectedChild(child)
      }

      // 振り返り一覧取得
      const { reflections } = await getChildReflections(selectedChildId)
      if (reflections) {
        setReflections(reflections)
      }
    }

    loadChildData()
  }, [selectedChildId, children])

  // Daily Spark の応援状態をチェック
  // ページ表示時にも再取得（他ページで応援送信後の反映のため）
  useEffect(() => {
    const checkEncouragementStatus = async () => {
      if (children.length === 0 || !profile?.id) return

      const { getDailySparkLevel } = await import("@/app/actions/daily-spark")
      const statusMap: { [childId: number]: boolean } = {}

      for (const child of children) {
        const childIdNumber = parseInt(child.id, 10)
        const level = await getDailySparkLevel(childIdNumber, profile.id)
        statusMap[childIdNumber] = level === "parent" || level === "both"
      }

      setEncouragementStatus(statusMap)
    }

    // 初回実行
    checkEncouragementStatus()

    // ページがフォーカスされた時に再チェック（他ページで応援送信後の更新用）
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkEncouragementStatus()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [children, profile?.id])

  const getWeekTypeLabel = (weekType: string) => {
    switch (weekType) {
      case "growth":
        return { label: "成長週", icon: TrendingUp, color: "text-green-600" }
      case "stable":
        return { label: "安定週", icon: Minus, color: "text-blue-600" }
      case "challenge":
        return { label: "挑戦週", icon: TrendingDown, color: "text-orange-600" }
      case "special":
        return { label: "特別週", icon: Calendar, color: "text-purple-600" }
      default:
        return { label: weekType, icon: Calendar, color: "text-gray-600" }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-20">読み込み中...</div>
        </div>
        <ParentBottomNavigation selectedChildId={providerSelectedChildId} />
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-20">
            <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600">お子様の情報がありません</p>
          </div>
        </div>
        <ParentBottomNavigation selectedChildId={providerSelectedChildId} />
      </div>
    )
  }

  return (
    <>
      <UserProfileHeader encouragementStatus={encouragementStatus} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={MessageCircle}
          title="振り返り閲覧"
          subtitle="お子さんの振り返りを見守りましょう"
          variant="parent"
        />

      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 保護者向け案内 */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900">
                  保護者様へ
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  お子様の達成マップ、テスト結果、学習履歴、応援履歴、ふりかえり履歴をご覧いただけます。ふりかえり機能（対話形式）はお子様本人のみご利用いただけます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* タブコンテンツ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="achievement" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">達成マップ</span>
              <span className="sm:hidden leading-tight">達成</span>
            </TabsTrigger>
            <TabsTrigger value="assessment" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">テスト結果</span>
              <span className="sm:hidden leading-tight">テスト</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">学習履歴</span>
              <span className="sm:hidden leading-tight">学習</span>
            </TabsTrigger>
            <TabsTrigger value="encouragement" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">応援履歴</span>
              <span className="sm:hidden leading-tight">応援</span>
            </TabsTrigger>
            <TabsTrigger value="coaching" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">ふりかえり履歴</span>
              <span className="sm:hidden leading-tight whitespace-nowrap">ふり返り</span>
            </TabsTrigger>
          </TabsList>

          {/* タブコンテンツ（新しい順序: 達成/テスト/学習/応援/ふりかえり） */}

          {/* 達成マップタブ */}
          <TabsContent value="achievement" className="space-y-4">
            {selectedChild && (
              <AchievementMap
                studentGrade={selectedChild.grade}
                studentCourse="B"
                viewerRole="parent"
                studentId={selectedChildId}
              />
            )}
          </TabsContent>

          {/* テスト結果タブ */}
          <TabsContent value="assessment" className="space-y-4">
            {!selectedChild ? (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="text-6xl">👨‍👩‍👧‍👦</div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      お子様を選択してください
                    </p>
                    <p className="text-xs text-slate-500">
                      お子様のテスト結果履歴を確認できます
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AssessmentHistory studentId={selectedChild.id} />
            )}
          </TabsContent>

          {/* 学習履歴タブ */}
          <TabsContent value="history" className="space-y-4">
            {selectedChildId && (
              <StudyHistory viewerRole="parent" studentId={selectedChildId} />
            )}
          </TabsContent>

          {/* 応援履歴タブ */}
          <TabsContent value="encouragement" className="space-y-4">
            {selectedChildId && (
              <EncouragementHistory viewerRole="parent" studentId={selectedChildId} />
            )}
          </TabsContent>

          {/* ふりかえり履歴タブ */}
          <TabsContent value="coaching" className="space-y-4">
            {reflections.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  まだ振り返りがありません
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reflections.map((reflection) => {
                  const weekTypeInfo = getWeekTypeLabel(reflection.week_type)
                  const Icon = weekTypeInfo.icon
                  const accuracyDiff = reflection.this_week_accuracy - reflection.last_week_accuracy

                  return (
                    <Card key={reflection.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className={`h-5 w-5 ${weekTypeInfo.color}`} />
                              <span className="font-medium">{weekTypeInfo.label}</span>
                              <Badge variant="outline">第{reflection.session_number}週</Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {formatDate(reflection.completed_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">正答率の変化</div>
                            <div className="flex items-center gap-1">
                              {accuracyDiff > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : accuracyDiff < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-600" />
                              )}
                              <span
                                className={`font-medium ${
                                  accuracyDiff > 0
                                    ? "text-green-600"
                                    : accuracyDiff < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {accuracyDiff > 0 ? "+" : ""}
                                {accuracyDiff.toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {reflection.last_week_accuracy.toFixed(1)}% →{" "}
                              {reflection.this_week_accuracy.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">
                              振り返りサマリー
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {reflection.summary}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

        <ParentBottomNavigation selectedChildId={providerSelectedChildId} />
      </div>
    </>
  )
}
