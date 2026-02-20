"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { Calendar, Flag, Target, PartyPopper, Eye, Users, FileText, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  getParentChildren,
} from "@/app/actions/parent"
import { ParentPastExamViewer } from "./past-exam-viewer"
import {
  getAvailableTestsForStudent,
  getAllTestGoalsForStudent,
  getAllTestResultsForStudent,
} from "@/app/actions/goal"
import { useUserProfile } from "@/lib/hooks/use-user-profile"

interface Child {
  id: number
  full_name: string
  display_name: string
  grade: number
  user_id: string
  avatar_id: string | null
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

export default function ParentGoalNaviPage() {
  const searchParams = useSearchParams()
  const { setSelectedChildId: setProviderChildId, selectedChildId: providerSelectedChildId } = useUserProfile()

  // URLパラメータから child ID を取得
  const childParam = searchParams?.get("child") ?? null

  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [availableTests, setAvailableTests] = useState<TestSchedule[]>([])
  const [testGoals, setTestGoals] = useState<TestGoal[]>([])
  const [testResults, setTestResults] = useState<any[]>([])
  const [selectedGoal, setSelectedGoal] = useState<TestGoal | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "result" | "test" | "pastexam">("test")
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [encouragementStatus, setEncouragementStatus] = useState<{ [childId: number]: boolean }>({})

  // 子ども一覧を読み込み（選択は別のuseEffectで処理）
  useEffect(() => {
    const loadChildren = async () => {
      try {
        const result = await getParentChildren()

        if (result.error) {
          console.error("🔍 [CLIENT] Error from API:", result.error)
          setLoading(false)
          return
        }

        if (result.children) {
          setChildren(result.children)
          // 子どもの選択は別のuseEffectで処理（URLパラメータ or プロバイダー or デフォルト）
        }
      } catch (error) {
        console.error("🔍 [CLIENT] Exception loading children:", error)
      } finally {
        setLoading(false)
      }
    }

    loadChildren()
  }, [])

  // URL パラメータの child ID をプロバイダーに反映（初回のみ）
  useEffect(() => {
    if (childParam && children.length > 0) {
      const childId = parseInt(childParam, 10)
      const child = children.find(c => c.id === childId)
      if (child) {
        setProviderChildId(childId)
      }
    }
  }, [childParam, children, setProviderChildId])

  // プロバイダーの selectedChildId が確定したら、選択中の子どもを設定
  // プロバイダーに値がない場合は、最初の子どもを選択
  useEffect(() => {
    if (children.length === 0) return

    if (providerSelectedChildId !== null) {
      // プロバイダーから取得したIDで子どもを選択
      const child = children.find(c => c.id === providerSelectedChildId)
      if (child) {
        setSelectedChildId(child.id)
        setSelectedChild(child)
      }
    } else if (selectedChildId === null && children.length > 0) {
      // プロバイダーに値がなく、まだ選択されていない場合は最初の子どもを選択
      setSelectedChildId(children[0].id)
      setSelectedChild(children[0])
      setProviderChildId(children[0].id)
    }
  }, [providerSelectedChildId, children, selectedChildId, setProviderChildId])

  // 全ての子供の今日の応援状況をチェック
  // ページ表示時にも再取得（他ページで応援送信後の反映のため）
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
          const level = await getDailySparkLevel(child.id, user.id)
          statusMap[child.id] = level === "parent" || level === "both"
        } catch (error) {
          console.error(`[EncouragementStatus] Error for child ${child.id}:`, error)
          statusMap[child.id] = false
        }
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
  }, [children])

  // 選択された子どものデータを読み込み
  useEffect(() => {
    const loadChildData = async () => {
      if (selectedChildId === null) {
        return
      }

      // エラー状態をリセット
      setDataError(null)

      // studentIdを使って生徒のデータを取得
      const [testsData, goalsData, resultsData] = await Promise.all([
        getAvailableTestsForStudent(selectedChildId),
        getAllTestGoalsForStudent(selectedChildId),
        getAllTestResultsForStudent(selectedChildId)
      ])

      // エラーログを詳細に出力
      if (testsData.error) {
        console.error('🔍 [ゴールナビ] テスト取得エラー:', testsData.error)
      }
      if (goalsData.error) {
        console.error('🔍 [ゴールナビ] 目標取得エラー:', goalsData.error)
      }
      if (resultsData.error) {
        console.error('🔍 [ゴールナビ] 結果取得エラー:', resultsData.error)
      }

      // エラーがあればUIに表示
      if (testsData.error || goalsData.error || resultsData.error) {
        const errors = [testsData.error, goalsData.error, resultsData.error].filter(Boolean)
        setDataError(`データの取得に失敗しました: ${errors.join(', ')}`)
      }

      if (testsData.tests) {
        setAvailableTests(testsData.tests as any)
      }

      if (goalsData.goals) {
        setTestGoals(goalsData.goals as any)
      }

      if (resultsData.results) {
        setTestResults(resultsData.results)
      }
    }

    loadChildData()
  }, [selectedChildId])

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
        <ParentBottomNavigation selectedChildId={providerSelectedChildId} />
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
        <ParentBottomNavigation selectedChildId={providerSelectedChildId} />
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
        {/* エラー表示 */}
        {dataError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{dataError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* タブコンテンツ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "input" | "result" | "test" | "pastexam")}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input">目標入力</TabsTrigger>
            <TabsTrigger value="result">結果入力</TabsTrigger>
            <TabsTrigger value="test">履歴</TabsTrigger>
            <TabsTrigger value="pastexam" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              過去問
            </TabsTrigger>
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
            {testGoals.length === 0 && testResults.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-10 text-center text-muted-foreground">
                  まだ目標・結果が登録されていません。
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* 目標と結果を統合して表示 */}
                {(() => {
                  // test_schedule_id でグループ化
                  const scheduleMap = new Map()

                  // 目標を追加
                  testGoals.forEach(goal => {
                    scheduleMap.set(goal.test_schedule_id, {
                      scheduleId: goal.test_schedule_id,
                      testName: goal.test_schedules.test_types.name,
                      testDate: goal.test_schedules.test_date,
                      goal: goal,
                      result: null
                    })
                  })

                  // 結果を追加
                  testResults.forEach(result => {
                    if (scheduleMap.has(result.test_schedule_id)) {
                      scheduleMap.get(result.test_schedule_id).result = result
                    } else {
                      scheduleMap.set(result.test_schedule_id, {
                        scheduleId: result.test_schedule_id,
                        testName: result.test_schedules.test_types.name,
                        testDate: result.test_schedules.test_date,
                        goal: result.goal || null,
                        result: result
                      })
                    }
                  })

                  // 日付順にソート
                  const sortedItems = Array.from(scheduleMap.values()).sort((a, b) =>
                    new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
                  )

                  return sortedItems.map((item) => (
                    <Card key={item.scheduleId} className="card-elevated">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          {item.testName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.testDate)}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 目標表示 */}
                        {item.goal && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Flag className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-sm">目標</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">目標コース</div>
                                <div className="font-bold text-lg text-blue-600">
                                  {getCourseName(item.goal.target_course)}
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">目標の組</div>
                                <div className="font-bold text-lg text-blue-600">{item.goal.target_class}組</div>
                              </div>
                            </div>
                            {item.goal.goal_thoughts && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="text-xs text-gray-600 mb-2">今回の思い</div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.goal.goal_thoughts}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 結果表示 */}
                        {item.result ? (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Target className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-sm">結果</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">結果コース</div>
                                <div className="font-bold text-lg text-green-600">
                                  {getCourseName(item.result.result_course)}
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">結果の組</div>
                                <div className="font-bold text-lg text-green-600">{item.result.result_class}組</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-muted-foreground">
                            結果はまだ入力されていません
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                })()}
              </div>
            )}
          </TabsContent>

          {/* 過去問演習タブ */}
          <TabsContent value="pastexam" className="space-y-4 mt-6">
            {selectedChild && selectedChildId !== null && (
              <ParentPastExamViewer
                childId={String(selectedChildId)}
                childName={selectedChild.display_name || selectedChild.full_name}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

        <ParentBottomNavigation selectedChildId={providerSelectedChildId} />
      </div>
    </>
  )
}
