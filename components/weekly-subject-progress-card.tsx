"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"

interface WeeklyProgressDetail {
  content: string
  correct: number
  total: number
  remaining: number
}

interface WeeklyProgressItem {
  subject: string
  colorCode: string
  accuracy: number
  correctCount: number
  totalProblems: number
  details?: WeeklyProgressDetail[]
}

interface WeeklySubjectProgressCardProps {
  weeklyProgress: WeeklyProgressItem[]
  sessionNumber?: number | null
}

export function WeeklySubjectProgressCard({ weeklyProgress, sessionNumber }: WeeklySubjectProgressCardProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  const getStatus = (accuracy: number) => {
    if (accuracy === 0) return "未着手"
    if (accuracy < 50) return "進行中"
    if (accuracy < 80) return "あと少し"
    return "達成"
  }

  // 科目名からTailwindカラー名にマッピング
  const getSubjectColor = (subjectName: string) => {
    const colorMap: Record<string, string> = {
      算数: "blue",
      国語: "pink",
      理科: "orange",
      社会: "emerald",
    }
    return colorMap[subjectName] || "gray"
  }

  const subjectProgress = weeklyProgress.map((item) => ({
    subject: item.subject,
    status: getStatus(item.accuracy),
    correctAnswers: item.correctCount,
    totalQuestions: item.totalProblems,
    progressRate: item.accuracy,
    color: getSubjectColor(item.subject),
    details: item.details || []
  }))

  const getStatusColor = (status: string) => {
    const colors = {
      進行中: "bg-blue-100 text-blue-800 border-blue-200",
      あと少し: "bg-yellow-100 text-yellow-800 border-yellow-200",
      未着手: "bg-gray-100 text-gray-800 border-gray-200",
      達成: "bg-green-100 text-green-800 border-green-200",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getProgressColor = (color: string) => {
    const colors = {
      blue: "bg-blue-500",
      pink: "bg-pink-500",
      orange: "bg-orange-500",
      emerald: "bg-emerald-500",
      gray: "bg-gray-400",
    }
    return colors[color as keyof typeof colors] || "bg-gray-400"
  }

  const getProgressBgColor = (color: string) => {
    const colors = {
      blue: "bg-blue-100",
      pink: "bg-pink-100",
      orange: "bg-orange-100",
      emerald: "bg-emerald-100",
      gray: "bg-gray-100",
    }
    return colors[color as keyof typeof colors] || "bg-gray-100"
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-indigo-200/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-lg">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-full shadow-sm">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <span className="text-indigo-900">今週の進捗</span>
          {sessionNumber && (
            <span className="text-sm font-medium text-indigo-700 ml-2">（第{sessionNumber}回）</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjectProgress.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <p>今週の学習記録がまだありません</p>
            <p className="text-sm mt-2">スパーク機能で学習を記録しましょう！</p>
          </div>
        ) : (
          subjectProgress.map((subject, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-slate-800">{subject.subject}</span>
                <Badge className={`text-xs px-2 py-1 border ${getStatusColor(subject.status)}`}>{subject.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  {subject.correctAnswers}/{subject.totalQuestions}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newExpanded = new Set(expandedSubjects)
                    if (newExpanded.has(subject.subject)) {
                      newExpanded.delete(subject.subject)
                    } else {
                      newExpanded.add(subject.subject)
                    }
                    setExpandedSubjects(newExpanded)
                  }}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  詳細
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`w-full h-3 rounded-full ${getProgressBgColor(subject.color)}`}>
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(subject.color)}`}
                  style={{ width: `${subject.progressRate}%` }}
                />
              </div>
            </div>

            {expandedSubjects.has(subject.subject) && subject.details.length > 0 && (
              <div className="bg-white/80 rounded-lg p-4 border border-slate-200 space-y-2">
                <h4 className="font-medium text-slate-700 mb-2">学習内容別の詳細</h4>
                {subject.details.map((detail, detailIndex) => (
                  <div key={detailIndex} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 font-medium">{detail.content}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>正解: {detail.correct}問 / 全体: {detail.total}問</span>
                      <span className={detail.remaining > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                        {detail.remaining > 0 ? `残り${detail.remaining}問` : "完璧！"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
        )}
      </CardContent>
    </Card>
  )
}
