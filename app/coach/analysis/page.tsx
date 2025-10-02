"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Target,
  Map,
  BookOpen,
  Heart,
  MessageCircle,
} from "lucide-react"
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
  keyMetrics: { label: string; value: string; trend?: string }[]
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
        summary: "目標達成率は全体で75%。前週比+5%の改善が見られました。小学5年生の算数で特に高い達成率（85%）を記録。",
        keyMetrics: [
          { label: "全体達成率", value: "75%", trend: "+5%" },
          { label: "算数（5年）", value: "85%", trend: "+8%" },
          { label: "理科（6年）", value: "60%", trend: "-3%" },
        ],
        details:
          "小学5年生の算数で特に高い達成率（85%）を記録。一方、小学6年生の理科は60%と課題が残ります。目標設定の具体性が達成率に大きく影響していることが分かりました。算数では「問題集の〇〇ページを解く」といった具体的な目標が多く、理科では「復習する」といった抽象的な目標が多い傾向にあります。",
        insights: [
          "算数の目標設定が適切で、生徒のモチベーション向上に寄与している",
          "理科の目標設定を見直し、より具体的な目標に変更することを推奨",
          "目標達成時の応援メッセージが次の学習意欲につながっている",
        ],
      },
      achievementMap: {
        summary: "全体の習得率は68%。前週比+3%の向上。算数の習得率が最も高く（78%）、社会が最も低い（55%）。",
        keyMetrics: [
          { label: "全体習得率", value: "68%", trend: "+3%" },
          { label: "算数", value: "78%", trend: "+4%" },
          { label: "社会", value: "55%", trend: "+1%" },
        ],
        details:
          "算数の習得率が最も高く（78%）、社会が最も低い（55%）。学年別では小学6年生が小学5年生を上回る傾向にあります。特に算数では、基礎問題の習得率が90%を超えており、応用問題への移行がスムーズに進んでいます。社会では地理分野の習得率が低く、歴史分野との差が顕著です。",
        insights: [
          "社会の学習時間が不足している傾向があり、学習計画の見直しが必要",
          "小学6年生の学習習慣が定着してきており、継続的なサポートが効果を発揮",
          "算数の基礎固めが成功しており、応用問題への展開を推奨",
        ],
      },
      learningHistory: {
        summary: "週平均学習時間は4.2時間。前週比+0.5時間。算数と国語の学習時間が多く、理科と社会が少ない傾向。",
        keyMetrics: [
          { label: "週平均学習時間", value: "4.2時間", trend: "+0.5時間" },
          { label: "平日平均", value: "35分/日", trend: "+5分" },
          { label: "休日平均", value: "1.2時間/日", trend: "+0.2時間" },
        ],
        details:
          "算数と国語の学習時間が多く、理科と社会が少ない傾向。平日の学習時間が増加しており、学習習慣の定着が見られます。特に朝学習を取り入れている生徒の学習時間が長く、集中力も高い傾向にあります。一方で、理科と社会の学習時間は週1時間未満の生徒が多く、バランスの改善が必要です。",
        insights: [
          "理科と社会の学習時間を増やす工夫が必要（週2時間以上を目標に）",
          "平日の学習習慣が定着してきており、朝学習の効果が顕著",
          "休日の学習時間を活用した理科・社会の強化を推奨",
        ],
      },
      encouragementHistory: {
        summary:
          "応援総数は週120件。前週比+15件。保護者からの応援が80件、指導者からが40件。AI提案メッセージの使用率が60%。",
        keyMetrics: [
          { label: "応援総数", value: "120件", trend: "+15件" },
          { label: "保護者", value: "80件", trend: "+10件" },
          { label: "指導者", value: "40件", trend: "+5件" },
        ],
        details:
          "保護者からの応援が80件、指導者からが40件。AI提案メッセージの使用率が60%で、効率的な応援が実現できています。応援を受けた生徒の学習継続率は95%と高く、応援の効果が明確に表れています。特に学習直後の応援が効果的で、次の学習へのモチベーション維持につながっています。",
        insights: [
          "保護者の関与度が高く、生徒のモチベーション向上に大きく貢献",
          "AI提案メッセージが効果的に活用されており、応援の質と量が向上",
          "学習直後の応援が特に効果的で、タイムリーな応援を推奨",
        ],
      },
      coachingHistory: {
        summary: "Will設定数は週50件。SMART度の平均は3.5/5。具体性と計測可能性は高いが、時間制約の設定が不十分。",
        keyMetrics: [
          { label: "Will設定数", value: "50件", trend: "+8件" },
          { label: "SMART度", value: "3.5/5", trend: "+0.3" },
          { label: "達成率", value: "70%", trend: "+5%" },
        ],
        details:
          "具体性と計測可能性は高いが、時間制約の設定が不十分。Will達成率は70%で、前週比+5%の改善が見られます。Willの品質が向上するにつれて達成率も上昇しており、SMART度との相関が確認できます。特に「いつまでに」を明確にしたWillの達成率が85%と高く、時間制約の重要性が示されています。",
        insights: [
          "時間制約を明確にすることで達成率の向上が期待できる（目標：SMART度4.0以上）",
          "Willの品質向上により行動変容が促進されており、継続的な指導が重要",
          "達成したWillを振り返る機会を設けることで、次のWill設定の質が向上",
        ],
      },
    },
  },
]

export default function AnalysisPage() {
  const [selectedReport, setSelectedReport] = useState<AnalysisReport>(analysisReports[0])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const categories = [
    { id: "goalNavi", label: "ゴールナビのテスト結果分析", icon: Target, color: "text-blue-600" },
    { id: "achievementMap", label: "達成マップの分析", icon: Map, color: "text-green-600" },
    { id: "learningHistory", label: "学習履歴の分析", icon: BookOpen, color: "text-purple-600" },
    { id: "encouragementHistory", label: "応援履歴の分析", icon: Heart, color: "text-pink-600" },
    { id: "coachingHistory", label: "コーチング履歴の分析", icon: MessageCircle, color: "text-orange-600" },
  ]

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <CoachTopNavigation />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 md:h-7 md:w-7" />
              分析機能（週次AI分析）
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">毎週月曜日（中間）と木曜日（最終）に自動実行</p>
          </CardContent>
        </Card>

        {/* Report Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
              <Select
                value={selectedReport.id}
                onValueChange={(value) => {
                  const report = analysisReports.find((r) => r.id === value)
                  if (report) setSelectedReport(report)
                }}
              >
                <SelectTrigger className="w-full sm:w-60">
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

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedReport.type === "intermediate" ? "中間分析" : "最終分析"}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {selectedReport.executionDate.toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Categories */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryData = selectedReport.categories[category.id as keyof typeof selectedReport.categories]
            const isExpanded = expandedCategory === category.id
            const Icon = category.icon

            return (
              <Card key={category.id} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader
                  className="cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg"
                  onClick={() => toggleCategory(category.id)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-accent ${category.color}`}>
                        <Icon className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <span className="text-base md:text-lg">{category.label}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Summary (Always Visible) */}
                  <div className="bg-muted rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-muted-foreground mb-2">サマリー</div>
                        <p className="text-sm leading-relaxed">{categoryData.summary}</p>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/50">
                      {categoryData.keyMetrics.map((metric, index) => (
                        <div key={index} className="bg-background rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg md:text-xl font-bold">{metric.value}</span>
                            {metric.trend && (
                              <span
                                className={`text-xs font-medium ${
                                  metric.trend.startsWith("+") ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {metric.trend}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details (Expandable) */}
                  {isExpanded && (
                    <div className="space-y-4 mt-4">
                      <div className="border-t pt-4">
                        <div className="font-medium text-sm text-muted-foreground mb-2">詳細分析</div>
                        <p className="text-sm leading-relaxed">{categoryData.details}</p>
                      </div>

                      <div className="border-t pt-4">
                        <div className="font-medium text-sm text-muted-foreground mb-3">示唆・アクション</div>
                        <ul className="space-y-2">
                          {categoryData.insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm bg-accent/50 rounded-lg p-3">
                              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                              <span className="flex-1">{insight}</span>
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
