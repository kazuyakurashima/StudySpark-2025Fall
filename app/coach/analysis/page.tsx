"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { CoachTopNavigation } from "@/components/coach-top-navigation"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

interface AnalysisReport {
  id: string
  week: string
  type: "intermediate" | "final"
  executionDate: Date
  targetWeek: string
  categories: {
    goalNavi: AnalysisSummary
    achievementMap: AnalysisSummary
    learningHistory: AnalysisSummary
    encouragementHistory: AnalysisSummary
    coachingHistory: AnalysisSummary
  }
}

interface AnalysisSummary {
  summary: string
  details: string
  insights: string[]
}

const analysisReports: AnalysisReport[] = [
  {
    id: "report1",
    week: "第4回（9/22〜9/28）",
    type: "final",
    executionDate: new Date("2024-10-02"),
    targetWeek: "第4回（9/22〜9/28）",
    categories: {
      goalNavi: {
        summary: "目標達成率は全体で75%。前週比+5%の改善が見られました。",
        details: "小学5年生の算数で特に高い達成率（85%）を記録。一方、小学6年生の理科は60%と課題が残ります。",
        insights: [
          "算数の目標設定が適切で、生徒のモチベーション向上に寄与",
          "理科の目標設定を見直し、より具体的な目標に変更することを推奨",
        ],
      },
      achievementMap: {
        summary: "全体の習得率は68%。前週比+3%の向上。",
        details: "算数の習得率が最も高く（78%）、社会が最も低い（55%）。学年別では小学6年生が小学5年生を上回る。",
        insights: ["社会の学習時間が不足している傾向", "小学6年生の学習習慣が定着してきている"],
      },
      learningHistory: {
        summary: "週平均学習時間は4.2時間。前週比+0.5時間。",
        details: "算数と国語の学習時間が多く、理科と社会が少ない傾向。平日の学習時間が増加。",
        insights: ["理科と社会の学習時間を増やす工夫が必要", "平日の学習習慣が定着してきている"],
      },
      encouragementHistory: {
        summary: "応援総数は週120件。前週比+15件。",
        details: "保護者からの応援が80件、指導者からが40件。AI提案メッセージの使用率が60%。",
        insights: ["保護者の関与度が高く、生徒のモチベーション向上に貢献", "AI提案メッセージが効果的に活用されている"],
      },
      coachingHistory: {
        summary: "Will設定数は週50件。SMART度の平均は3.5/5。",
        details: "具体性と計測可能性は高いが、時間制約の設定が不十分。Will達成率は70%。",
        insights: [
          "時間制約を明確にすることで達成率の向上が期待できる",
          "Willの品質向上により行動変容が促進されている",
        ],
      },
    },
  },
]

export default function AnalysisPage() {
  const [selectedReport, setSelectedReport] = useState<AnalysisReport>(analysisReports[0])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [analysisAxis, setAnalysisAxis] = useState("all")

  const categories = [
    { id: "goalNavi", label: "ゴールナビのテスト結果分析", icon: "🎯" },
    { id: "achievementMap", label: "達成マップの分析", icon: "🗺️" },
    { id: "learningHistory", label: "学習履歴の分析", icon: "📚" },
    { id: "encouragementHistory", label: "応援履歴の分析", icon: "💪" },
    { id: "coachingHistory", label: "コーチング履歴の分析", icon: "🎓" },
  ]

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      <CoachTopNavigation />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            分析機能（週次AI分析）
          </h1>
          <p className="text-blue-100">毎週月曜日（中間）と木曜日（最終）に自動実行</p>
        </div>

        {/* Report Selection */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-md border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                value={selectedReport.id}
                onValueChange={(value) => {
                  const report = analysisReports.find((r) => r.id === value)
                  if (report) setSelectedReport(report)
                }}
              >
                <SelectTrigger className="w-60 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {analysisReports.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.week} - {report.type === "intermediate" ? "中間分析" : "最終分析"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {selectedReport.type === "intermediate" ? "中間分析" : "最終分析"}
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {selectedReport.executionDate.toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Axis Filter */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-md border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium">分析軸:</span>
              <Select value={analysisAxis} onValueChange={setAnalysisAxis}>
                <SelectTrigger className="w-40 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="grade">学年別</SelectItem>
                  <SelectItem value="student">生徒別</SelectItem>
                  <SelectItem value="subject">科目別</SelectItem>
                  <SelectItem value="comparison">前週比較</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Categories */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryData = selectedReport.categories[category.id as keyof typeof selectedReport.categories]
            const isExpanded = expandedCategory === category.id

            return (
              <Card key={category.id} className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="cursor-pointer" onClick={() => toggleCategory(category.id)}>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon}</span>
                      <span>{category.label}</span>
                    </div>
                    <Button variant="ghost" size="icon">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Summary (Always Visible) */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <div className="font-medium text-sm text-muted-foreground mb-1">サマリー</div>
                        <p className="text-sm leading-relaxed">{categoryData.summary}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details (Expandable) */}
                  {isExpanded && (
                    <div className="space-y-4">
                      <div className="border-t pt-4">
                        <div className="font-medium text-sm text-muted-foreground mb-2">詳細分析</div>
                        <p className="text-sm leading-relaxed">{categoryData.details}</p>
                      </div>

                      <div className="border-t pt-4">
                        <div className="font-medium text-sm text-muted-foreground mb-2">示唆・アクション</div>
                        <ul className="space-y-2">
                          {categoryData.insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
