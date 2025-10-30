"use client"

import { useEffect, useState } from "react"
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
import { CoachingHistory } from "@/app/student/reflect/coaching-history"
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
} from "lucide-react"
import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

interface Child {
  id: string
  full_name: string
  display_name: string
  avatar_url: string | null
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

function ParentReflectPageInner() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"map" | "history" | "encouragement" | "coaching">("map")
  const [loading, setLoading] = useState(true)

  // 子ども一覧を読み込み
  useEffect(() => {
    const loadChildren = async () => {
      const { children, error } = await getParentChildren()
      if (children && !error) {
        setChildren(children)
        if (children.length > 0) {
          setSelectedChildId(children[0].id)
          setSelectedChild(children[0])
        }
      }
      setLoading(false)
    }

    loadChildren()
  }, [])

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
        <ParentBottomNavigation />
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
        <ParentBottomNavigation />
      </div>
    )
  }

  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={MessageCircle}
          title="振り返り閲覧"
          subtitle="お子さんの振り返りを見守りましょう"
          variant="parent"
        />

      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 子ども切り替えタブ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              お子様を選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {children.map((child) => (
                <Button
                  key={child.id}
                  variant={selectedChildId === child.id ? "default" : "outline"}
                  onClick={() => setSelectedChildId(child.id)}
                  className="flex-shrink-0"
                >
                  {child.display_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AIコーチング制限の通知 */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  AIコーチング機能はお子様本人のみご利用いただけます
                </p>
                <p className="text-xs text-amber-700">
                  保護者様は過去の振り返り履歴、達成マップ、学習履歴、応援履歴をご覧いただけます
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* タブコンテンツ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="map">達成マップ</TabsTrigger>
            <TabsTrigger value="history">学習履歴</TabsTrigger>
            <TabsTrigger value="encouragement">応援履歴</TabsTrigger>
            <TabsTrigger value="coaching">コーチング履歴</TabsTrigger>
          </TabsList>

          {/* 達成マップタブ */}
          <TabsContent value="map" className="space-y-4">
            {selectedChildId && <AchievementMap studentId={selectedChildId} />}
          </TabsContent>

          {/* 学習履歴タブ */}
          <TabsContent value="history" className="space-y-4">
            {selectedChildId && <StudyHistory studentId={selectedChildId} />}
          </TabsContent>

          {/* 応援履歴タブ */}
          <TabsContent value="encouragement" className="space-y-4">
            {selectedChildId && <EncouragementHistory studentId={selectedChildId} />}
          </TabsContent>

          {/* コーチング履歴タブ */}
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

        <ParentBottomNavigation />
      </div>
    </>
  )
}

/**
 * 保護者振り返り閲覧ページ（Context Provider付き）
 */
export default function ParentReflectPage() {
  return (
    <UserProfileProvider>
      <ParentReflectPageInner />
    </UserProfileProvider>
  )
}
