"use client"

import { useEffect, useState } from "react"
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
  getChildAvailableTests,
  getChildTestGoals,
  getChildTestGoal,
} from "@/app/actions/parent"

interface Child {
  id: string
  full_name: string
  nickname: string
  avatar_url: string | null
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

export default function ParentGoalNaviPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [availableTests, setAvailableTests] = useState<TestSchedule[]>([])
  const [testGoals, setTestGoals] = useState<TestGoal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<TestGoal | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "result" | "test">("input")
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

      // テスト日程取得
      const { tests } = await getChildAvailableTests(selectedChildId)
      if (tests) {
        setAvailableTests(tests)
      }

      // 目標一覧取得
      const { goals } = await getChildTestGoals(selectedChildId)
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Target className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              ゴールナビ
            </h1>
          </div>
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <Eye className="h-4 w-4" />
            お子様の目標を確認できます（読み取り専用）
          </p>
        </div>

        {/* 子ども切り替えタブ */}
        {children.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {children.map((child) => {
              const childName = child.nickname || child.full_name
              const childAvatar = child.avatar_url || "student1"
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
            <TabsTrigger value="test">テスト結果</TabsTrigger>
          </TabsList>

          {/* 目標入力タブ */}
          <TabsContent value="input" className="space-y-4">
            {availableTests.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  現在設定可能なテストはありません
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">目標設定可能なテスト</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availableTests.map((test) => {
                    const goal = testGoals.find((g) => g.test_schedule_id === test.id)
                    return (
                      <div
                        key={test.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-orange-500" />
                              <span className="font-medium">{test.test_types.name}</span>
                              {goal && (
                                <Badge variant="secondary" className="ml-2">
                                  設定済み
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{formatDate(test.test_date)}</p>
                            {goal && (
                              <div className="mt-3 space-y-2 p-3 bg-blue-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <Flag className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-sm">目標</span>
                                </div>
                                <div className="text-sm space-y-1">
                                  <p>
                                    <span className="text-gray-600">コース:</span>{" "}
                                    <span className="font-medium">{getCourseName(goal.target_course)}</span>
                                  </p>
                                  <p>
                                    <span className="text-gray-600">組:</span>{" "}
                                    <span className="font-medium">{goal.target_class}組</span>
                                  </p>
                                  {goal.goal_thoughts && (
                                    <div className="mt-2 pt-2 border-t border-blue-200">
                                      <p className="text-gray-600 text-xs mb-1">今回の思い:</p>
                                      <p className="text-gray-800 whitespace-pre-wrap">
                                        {goal.goal_thoughts}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 結果入力タブ */}
          <TabsContent value="result" className="space-y-4">
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                <p>結果入力は生徒本人のみ可能です</p>
                <p className="text-sm mt-2">
                  お子様にログインしてもらい、結果を入力してください
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* テスト結果タブ */}
          <TabsContent value="test" className="space-y-4">
            {testGoals.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  まだテスト結果がありません
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {testGoals.map((goal) => (
                  <Card key={goal.id}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        {goal.test_schedules.test_types.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {formatDate(goal.test_schedules.test_date)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">目標</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-gray-600">コース:</span>{" "}
                          <span className="font-medium">{getCourseName(goal.target_course)}</span>
                        </p>
                        <p>
                          <span className="text-gray-600">組:</span>{" "}
                          <span className="font-medium">{goal.target_class}組</span>
                        </p>
                      </div>
                      {goal.goal_thoughts && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-xs text-gray-600 mb-2">今回の思い:</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {goal.goal_thoughts}
                          </p>
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <p className="text-xs text-gray-500">
                          設定日: {new Date(goal.created_at).toLocaleDateString("ja-JP")}
                        </p>
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
  )
}
