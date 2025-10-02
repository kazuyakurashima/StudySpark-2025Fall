"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, ChevronRight, ChevronDown, Target, TrendingUp, BookOpen, Heart, MessageCircle } from "lucide-react"
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
  details: {
    byGrade?: string
    bySubject?: string
    trend?: string
    suggestions?: string
  }
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
        summary: "全体の目標達成率は78%で、先週比+5%の向上。算数の達成率が特に高く85%を記録。",
        details: {
          byGrade: "小学5年: 4.2時間、小学6年: 4.8時間",
          bySubject: "算数: 35%, 国語: 30%, 理科: 20%, 社会: 15%",
          trend: "朝学習を実施している生徒は週平均6時間と高い傾向。",
          suggestions: "社会の学習時間が少ない生徒には、興味関心を引き出す教材を提案。",
        },
      },
      achievementMap: {
        summary: "週次目標の達成率は72%。小目標の設定がSMART基準を満たしている生徒ほど達成率が高い傾向。",
        details: {
          byGrade: "小学5年: 68%, 小学6年: 76%",
          bySubject: "算数: 80%, 国語: 70%, 理科: 65%, 社会: 60%",
          trend: "SMART基準を満たす目標設定をしている生徒の達成率は85%と高い。",
          suggestions: "目標設定時にSMART基準を意識するよう指導を強化。",
        },
      },
      learningHistory: {
        summary: "週平均学習時間は4.5時間。平日の学習時間が先週比+15分増加し、習慣化が進んでいる。",
        details: {
          byGrade: "小学5年: 4.2時間、小学6年: 4.8時間",
          bySubject: "算数: 35%, 国語: 30%, 理科: 20%, 社会: 15%",
          trend: "朝学習を実施している生徒は週平均6時間と高い傾向。",
          suggestions: "社会の学習時間が少ない生徒には、興味関心を引き出す教材を提案。",
        },
      },
      encouragementHistory: {
        summary: "応援総数は週156件。個別メッセージを受けた生徒は習慣の学習時間が平均30%増加。",
        details: {
          byGrade: "小学5年: 70件、小学6年: 86件",
          bySubject: "算数: 45件、国語: 40件、理科: 35件、社会: 36件",
          trend: "保護者からの応援が多い生徒ほど学習継続率が高い（95%）。",
          suggestions: "応援が少ない生徒には、保護者への働きかけを強化。",
        },
      },
      coachingHistory: {
        summary: "Will設定数は週50件。SMART度の平均は3.5/5。具体性と計測可能性は高いが、時間制約の設定が不十分。",
        details: {
          byGrade: "小学5年: 22件、小学6年: 28件",
          bySubject: "算数: 15件、国語: 12件、理科: 11件、社会: 12件",
          trend: "SMART度が高いWillほど達成率が高い（SMART度4以上: 85%達成）。",
          suggestions: "時間制約を明確にすることで達成率の向上が期待できる。",
        },
      },
    },
  },
]

export default function AnalysisPage() {
  const [selectedReport, setSelectedReport] = useState<AnalysisReport>(analysisReports[0])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const categories = [
    {
      id: "goalNavi",
      label: "ゴールナビのテスト結果",
      icon: Target,
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      iconColor: "text-blue-600",
    },
    {
      id: "achievementMap",
      label: "達成マップの分析",
      icon: TrendingUp,
      bgColor: "bg-green-50 dark:bg-green-950/20",
      iconColor: "text-green-600",
    },
    {
      id: "learningHistory",
      label: "学習履歴の分析",
      icon: BookOpen,
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      iconColor: "text-purple-600",
    },
    {
      id: "encouragementHistory",
      label: "応援履歴の分析",
      icon: Heart,
      bgColor: "bg-pink-50 dark:bg-pink-950/20",
      iconColor: "text-pink-600",
    },
    {
      id: "coachingHistory",
      label: "コーチング履歴の分析",
      icon: MessageCircle,
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      iconColor: "text-orange-600",
    },
  ]

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">週次AI分析レポート</h1>
          </div>
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-0 px-4 py-2 text-sm">
            最終分析（木曜日）
          </Badge>
        </div>

        {/* Report Selection */}
        <div className="flex justify-end">
          <Select
            value={selectedReport.id}
            onValueChange={(value) => {
              const report = analysisReports.find((r) => r.id === value)
              if (report) setSelectedReport(report)
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {analysisReports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {report.week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Analysis Categories */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryData = selectedReport.categories[category.id as keyof typeof selectedReport.categories]
            const isExpanded = expandedCategory === category.id
            const Icon = category.icon

            return (
              <Card
                key={category.id}
                className={`${category.bgColor} border-0 cursor-pointer hover:shadow-md transition-all duration-200`}
                onClick={() => toggleCategory(category.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`p-3 rounded-full ${category.iconColor} bg-white dark:bg-gray-800 flex-shrink-0`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-2">{category.label}</h3>
                        <p className="text-sm leading-relaxed text-foreground/80">{categoryData.summary}</p>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-6 space-y-4 pt-4 border-t border-border/30">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="font-semibold text-sm mb-3">学年別</h4>
                              <p className="text-sm text-muted-foreground">{categoryData.details.byGrade}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="font-semibold text-sm mb-3">科目別</h4>
                              <p className="text-sm text-muted-foreground">{categoryData.details.bySubject}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="font-semibold text-sm mb-3">トレンド</h4>
                              <p className="text-sm text-muted-foreground">{categoryData.details.trend}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                              <h4 className="font-semibold text-sm mb-3">示唆・提案</h4>
                              <p className="text-sm text-muted-foreground">{categoryData.details.suggestions}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
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
