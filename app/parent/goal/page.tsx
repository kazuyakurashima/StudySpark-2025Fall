"use client"

import { useEffect, useState } from "react"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Calendar, Flag, Target, PartyPopper, Eye, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  getParentChildren,
} from "@/app/actions/parent"
import {
  getAvailableTestsForStudent,
  getAllTestGoalsForStudent,
} from "@/app/actions/goal"
import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

interface Child {
  id: string
  full_name: string
  display_name: string
  avatar_id: string | null
  grade: number
}

interface TestSchedule {
  id: string
  test_type_id: string
  test_date: string
  test_types: {
    id: string
    name: string
  }
}

interface TestGoal {
  id: string
  test_schedule_id: string
  target_course: string
  target_class: number
  goal_thoughts: string
  created_at: string
  test_schedules: {
    id: string
    test_date: string
    test_types: {
      id: string
      name: string
    }
  }
}

const courses = [
  { id: "S", name: "Sコース", description: "最難関校" },
  { id: "C", name: "Cコース", description: "難関校" },
  { id: "B", name: "Bコース", description: "有名校" },
  { id: "A", name: "Aコース", description: "標準校" },
]

const getAvatarSrc = (avatarId?: string | null) => {
  if (avatarId && avatarId.startsWith("http")) {
    return avatarId
  }

  const avatarMap: { [key: string]: string } = {
    student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
  }
  return avatarMap[avatarId || ""] || avatarMap["student1"]
}

function ParentGoalNaviPageInner() {
  const { setSelectedChildId: setProviderChildId } = useUserProfile()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [availableTests, setAvailableTests] = useState<TestSchedule[]>([])
  const [testGoals, setTestGoals] = useState<TestGoal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<TestGoal | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "result" | "test">("input")
  const [loading, setLoading] = useState(true)
  const [encouragementStatus, setEncouragementStatus] = useState<{ [childId: number]: boolean }>({})

  // 子ども一覧を読み込み
  useEffect(() => {
    const loadChildren = async () => {
      console.log("🔍 [CLIENT] Loading children...")
      try {
        const result = await getParentChildren()
        console.log("🔍 [CLIENT] Children response:", result)

        if (result.error) {
          console.error("🔍 [CLIENT] Error from API:", result.error)
          setLoading(false)
          return
        }

        if (result.children) {
          console.log("🔍 [CLIENT] Setting children:", result.children)
          setChildren(result.children)
          if (result.children.length > 0) {
            setSelectedChildId(result.children[0].id)
            setSelectedChild(result.children[0])
            // Provider の selectedChild も更新
            setProviderChildId(parseInt(result.children[0].id, 10))
          }
        }
      } catch (error) {
        console.error("🔍 [CLIENT] Exception loading children:", error)
      } finally {
        setLoading(false)
      }
    }

    loadChildren()
  }, [setProviderChildId])

  // 全ての子供の今日の応援状況をチェック
  useEffect(() => {
    const checkEncouragementStatus = async () => {
      if (children.length === 0) return

      const { getDailySparkLevel } = await import("@/app/actions/daily-spark")
      const statusMap: { [childId: number]: boolean } = {}

      // 保護者のuser_idを取得（仮にauth.uidを使用）
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      for (const child of children) {
        try {
          const childIdNumber = parseInt(child.id, 10)
          const level = await getDailySparkLevel(childIdNumber, user.id)
          statusMap[childIdNumber] = level === "parent" || level === "both"
        } catch (error) {
          console.error(`[EncouragementStatus] Error for child ${child.id}:`, error)
          statusMap[parseInt(child.id, 10)] = false
        }
      }

      setEncouragementStatus(statusMap)
    }

    checkEncouragementStatus()
  }, [children])

  // 選択された子どものデータを読み込み
  useEffect(() => {
    const loadChildData = async () => {
      if (!selectedChildId) return

      const child = children.find((c) => c.id === selectedChildId)
      if (child) {
        setSelectedChild(child)
      }

      // studentIdを使って生徒のデータを取得
      const { tests } = await getAvailableTestsForStudent(selectedChildId)
      if (tests) {
        setAvailableTests(tests)
      }

      const { goals } = await getAllTestGoalsForStudent(selectedChildId)
      if (goals) {
        setTestGoals(goals)
      }
    }

    loadChildData()
  }, [selectedChildId, children])

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || courseId
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-20">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-20">読み込み中...</div>
        </div>
        <ParentBottomNavigation />
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-20">
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
      <UserProfileHeader encouragementStatus={encouragementStatus} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Flag}
          title="ゴール閲覧"
          subtitle="お子さんの目標を確認しましょう"
          variant="parent"
        />

      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 子ども切り替えタブ */}
        {children.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {children.map((child) => {
              const childName = child.display_name
              const childAvatar = child.avatar_id || "student1"
              const isActive = selectedChildId === child.id

              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Avatar className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={getAvatarSrc(childAvatar)} alt={childName} />
                    <AvatarFallback>{childName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{childName}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* タブコンテンツ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "input" | "result" | "test")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">目標入力</TabsTrigger>
            <TabsTrigger value="result">結果入力</TabsTrigger>
            <TabsTrigger value="test">目標と結果の履歴</TabsTrigger>
          </TabsList>

          {/* 目標入力タブ */}
          <TabsContent value="input" className="space-y-4 mt-6">
            {availableTests.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-10 text-center text-muted-foreground">
                  現在設定可能なテストはありません
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableTests.map((test) => {
                  const goal = testGoals.find((g) => g.test_schedule_id === test.id)
                  return (
                    <Card key={test.id} className="card-elevated">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          {test.test_types.name}
                          {goal && (
                            <Badge variant="secondary" className="ml-2">
                              設定済み
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{formatDate(test.test_date)}</p>
                      </CardHeader>
                      {goal && (
                        <CardContent className="space-y-3">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Flag className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-sm">目標</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">目標コース</div>
                                <div className="font-bold text-lg text-blue-600">
                                  {getCourseName(goal.target_course)}
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">目標の組</div>
                                <div className="font-bold text-lg text-blue-600">{goal.target_class}組</div>
                              </div>
                            </div>
                            {goal.goal_thoughts && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="text-xs text-gray-600 mb-2">今回の思い</div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{goal.goal_thoughts}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* 結果入力タブ */}
          <TabsContent value="result" className="space-y-4 mt-6">
            <Card className="card-elevated">
              <CardContent className="py-10 text-center text-muted-foreground">
                <p>結果入力は生徒本人のみ可能です</p>
                <p className="text-sm mt-2">
                  お子様にログインしてもらい、結果を入力してください
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 目標と結果の履歴タブ */}
          <TabsContent value="test" className="space-y-4 mt-6">
            {testGoals.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-10 text-center text-muted-foreground">
                  まだ目標が設定されていません。<br />
                  先に「目標入力」タブで目標を設定してください。
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {testGoals.map((goal) => (
                  <Card key={goal.id} className="card-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {goal.test_schedules.test_types.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(goal.test_schedules.test_date)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 目標表示 */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Flag className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">目標</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="text-center p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">目標コース</div>
                            <div className="font-bold text-lg text-blue-600">
                              {getCourseName(goal.target_course)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">目標の組</div>
                            <div className="font-bold text-lg text-blue-600">{goal.target_class}組</div>
                          </div>
                        </div>
                        {goal.goal_thoughts && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="text-xs text-gray-600 mb-2">今回の思い</div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{goal.goal_thoughts}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
 * 保護者ゴール閲覧ページ（Context Provider付き）
 */
export default function ParentGoalNaviPage() {
  return (
    <UserProfileProvider>
      <ParentGoalNaviPageInner />
    </UserProfileProvider>
  )
}
