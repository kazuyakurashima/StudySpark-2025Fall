"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, TestTube, TrendingUp, TrendingDown, Minus } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

export default function ParentGoalPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [showMoreTests, setShowMoreTests] = useState(false)

  const children = [
    { id: "child1", name: "みかん", nickname: "みかんちゃん" },
    { id: "child2", name: "太郎", nickname: "たろう" },
  ]

  const testHistory = [
    // みかんのテストデータ
    {
      id: "test1",
      childName: "みかん",
      name: "第3回合不合判定テスト",
      date: "2024-09-08",
      type: "合不合",
      goal: { course: "S", class: 15 },
      result: { course: "S", class: 12 },
      memo: "今回は算数の図形問題を重点的に勉強したので、前回より良い結果を出したいです。特に立体図形の問題を頑張りました。",
    },
    {
      id: "test2",
      childName: "みかん",
      name: "第2回週テスト",
      date: "2024-09-13",
      type: "週テスト",
      goal: { subjects: { 算数: 52, 国語: 48, 理科: 45, 社会: 55 } },
      result: { subjects: { 算数: 55, 国語: 46, 理科: 48, 社会: 52 } },
      memo: "算数と理科は目標を上回りました！国語と社会はもう少し頑張りたいです。",
      achievedCount: 2,
      totalSubjects: 4,
    },
    {
      id: "test3",
      childName: "みかん",
      name: "第4回合不合判定テスト",
      date: "2024-10-05",
      type: "合不合",
      goal: { course: "S", class: 10 },
      result: { course: "C", class: 25 },
      memo: "思うような結果が出ませんでしたが、次回に向けて頑張ります。",
    },
    // 太郎のテストデータ
    {
      id: "test4",
      childName: "太郎",
      name: "第3回合不合判定テスト",
      date: "2024-09-08",
      type: "合不合",
      goal: { course: "C", class: 20 },
      result: { course: "C", class: 18 },
      memo: "目標を達成できました！次回はSコースを目指したいです。",
    },
    {
      id: "test5",
      childName: "太郎",
      name: "第2回週テスト",
      date: "2024-09-13",
      type: "週テスト",
      goal: { subjects: { 算数: 45, 国語: 50, 理科: 42, 社会: 48 } },
      result: { subjects: { 算数: 48, 国語: 52, 理科: 40, 社会: 50 } },
      memo: "算数、国語、社会は目標達成！理科をもう少し頑張りたいです。",
      achievedCount: 3,
      totalSubjects: 4,
    },
    {
      id: "test6",
      childName: "太郎",
      name: "第4回合不合判定テスト",
      date: "2024-10-05",
      type: "合不合",
      goal: { course: "C", class: 15 },
      result: { course: "S", class: 22 },
      memo: "目標を大きく上回る結果が出ました！とても嬉しいです。",
    },
  ]

  const selectedChildName = children.find((child) => child.id === selectedChild)?.name
  const filteredTestHistory = testHistory.filter((test) => test.childName === selectedChildName)
  const displayedTests = showMoreTests ? filteredTestHistory : filteredTestHistory.slice(0, 5)

  const isTestAchieved = (test: any) => {
    if (test.type === "合不合") {
      const courseOrder = { S: 4, C: 3, B: 2, A: 1 }
      const goalCourseValue = courseOrder[test.goal.course as keyof typeof courseOrder]
      const resultCourseValue = courseOrder[test.result.course as keyof typeof courseOrder]
      return resultCourseValue >= goalCourseValue && test.result.class <= test.goal.class
    } else {
      return Object.entries(test.goal.subjects).every(
        ([subject, goalValue]) => test.result.subjects[subject] >= goalValue,
      )
    }
  }

  const getSubjectDelta = (goal: number, result: number) => {
    const diff = result - goal
    if (diff > 0) {
      return { value: `+${diff}`, color: "text-emerald-600", icon: TrendingUp }
    } else if (diff < 0) {
      return { value: `${diff}`, color: "text-red-600", icon: TrendingDown }
    } else {
      return { value: "±0", color: "text-slate-500", icon: Minus }
    }
  }

  const courseColors = {
    goal: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      gradient: "from-blue-50 to-blue-100",
    },
    result: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      gradient: "from-emerald-50 to-emerald-100",
    },
  }

  const subjectColors = {
    算数: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      gradient: "from-blue-50 to-blue-100",
    },
    国語: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      gradient: "from-emerald-50 to-emerald-100",
    },
    理科: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      gradient: "from-violet-50 to-violet-100",
    },
    社会: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      gradient: "from-amber-50 to-amber-100",
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">ゴールナビ</h1>
              <p className="text-sm text-slate-600">目標を設定して、合格に向けて頑張ろう！</p>
            </div>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {children.map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 rounded-md transition-all ${
                  selectedChild === child.id
                    ? "bg-white text-primary shadow-sm font-medium"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                {child.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-primary" />
                テスト結果
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                全{filteredTestHistory.length}件
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayedTests.map((test) => (
                <Card key={test.id} className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{test.name}</h3>
                          <Badge
                            variant={test.type === "合不合" ? "default" : "secondary"}
                            className="text-xs bg-primary/10 text-primary border-primary/20"
                          >
                            {test.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {new Date(test.date).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={isTestAchieved(test) ? "default" : "destructive"}
                        className={`text-xs font-medium ${
                          isTestAchieved(test)
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {isTestAchieved(test) ? "✓ 達成" : "× 未達"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {test.type === "合不合" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`text-center p-4 ${courseColors.goal.bg} ${courseColors.goal.border} border rounded-xl bg-gradient-to-br ${courseColors.goal.gradient} shadow-sm`}
                          >
                            <div className="text-xs text-slate-500 mb-2 font-medium">目標</div>
                            <div className={`font-bold text-xl ${courseColors.goal.text} mb-1`}>
                              {test.goal.course}コース
                            </div>
                            <div className={`text-sm ${courseColors.goal.text} opacity-80`}>{test.goal.class}組</div>
                          </div>
                          <div
                            className={`text-center p-4 ${courseColors.result.bg} ${courseColors.result.border} border rounded-xl bg-gradient-to-br ${courseColors.result.gradient} shadow-sm`}
                          >
                            <div className="text-xs text-slate-500 mb-2 font-medium">実績</div>
                            <div className={`font-bold text-xl ${courseColors.result.text} mb-1`}>
                              {test.result.course}コース
                            </div>
                            <div className={`text-sm ${courseColors.result.text} opacity-80`}>
                              {test.result.class}組
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">科目別結果</span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {test.achievedCount}/{test.totalSubjects}科目 達成
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(test.goal.subjects).map(([subject, goalValue]) => {
                            const resultValue = test.result.subjects[subject as keyof typeof test.result.subjects]
                            const delta = getSubjectDelta(goalValue, resultValue)
                            const DeltaIcon = delta.icon
                            const colors = subjectColors[subject as keyof typeof subjectColors]
                            const isAchieved = resultValue >= goalValue

                            return (
                              <div
                                key={subject}
                                className={`p-3 ${colors.bg} ${colors.border} border rounded-xl bg-gradient-to-br ${colors.gradient} shadow-sm hover:shadow-md transition-all duration-200`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-sm font-semibold ${colors.text}`}>{subject}</span>
                                  <div className={`flex items-center gap-1 text-xs font-medium ${delta.color}`}>
                                    <DeltaIcon className="h-3 w-3" />
                                    {delta.value}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">目標</span>
                                    <span className={`font-medium ${colors.text}`}>{goalValue}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">実績</span>
                                    <span className={`font-bold ${isAchieved ? "text-emerald-600" : "text-red-600"}`}>
                                      {resultValue}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {test.memo && (
                      <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 mb-2 font-medium">今回の思い</div>
                        <p className="text-sm text-slate-700 leading-relaxed">{test.memo}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredTestHistory.length > 5 && !showMoreTests && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setShowMoreTests(true)} className="text-sm">
                    もっと見る（残り{filteredTestHistory.length - 5}件）
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
