"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, User, BookOpen, TrendingUp, AlertCircle } from "lucide-react"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"

export default function CoachGoalPage() {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const students = [
    {
      id: "student1",
      name: "田中みかん",
      nickname: "みかんちゃん",
      course: "S",
      class: 15,
      testDate: "2025年2月1日",
      subjects: [
        { name: "算数", target: 85, current: 75, trend: "up" },
        { name: "国語", target: 80, current: 60, trend: "down" },
        { name: "理科", target: 90, current: 80, trend: "stable" },
        { name: "社会", target: 75, current: 65, trend: "up" },
      ],
      needsAttention: true,
    },
    {
      id: "student2",
      name: "佐藤太郎",
      nickname: "たろう",
      course: "C",
      class: 8,
      testDate: "2025年2月1日",
      subjects: [
        { name: "算数", target: 75, current: 78, trend: "up" },
        { name: "国語", target: 70, current: 72, trend: "up" },
        { name: "理科", target: 80, current: 75, trend: "stable" },
        { name: "社会", target: 70, current: 68, trend: "stable" },
      ],
      needsAttention: false,
    },
    {
      id: "student3",
      name: "鈴木花子",
      nickname: "はなちゃん",
      course: "B",
      class: 22,
      testDate: "2025年2月2日",
      subjects: [
        { name: "算数", target: 80, current: 82, trend: "up" },
        { name: "国語", target: 85, current: 80, trend: "stable" },
        { name: "理科", target: 75, current: 70, trend: "down" },
        { name: "社会", target: 80, current: 85, trend: "up" },
      ],
      needsAttention: false,
    },
  ]

  const getCourseColor = (course: string) => {
    switch (course) {
      case "S":
        return "bg-purple-100 text-purple-800"
      case "C":
        return "bg-blue-100 text-blue-800"
      case "B":
        return "bg-green-100 text-green-800"
      case "A":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "📈"
      case "down":
        return "📉"
      case "stable":
        return "➡️"
      default:
        return "➡️"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <UserProfileHeader />
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-cyan-600" />
            <h1 className="text-xl font-bold text-gray-900">ゴールナビ - 生徒一覧</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {students.map((student) => (
          <Card
            key={student.id}
            className={`transition-all duration-200 ${student.needsAttention ? "border-orange-200 bg-orange-50" : ""}`}
          >
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <div>
                    <CardTitle className="text-lg">
                      {student.name}（{student.nickname}）
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getCourseColor(student.course)}>{student.course}コース</Badge>
                      <span className="text-sm text-gray-600">{student.class}組</span>
                      <span className="text-sm text-gray-600">• {student.testDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {student.needsAttention && <AlertCircle className="h-5 w-5 text-orange-500" />}
                  <span className="text-sm text-gray-500">{expandedStudent === student.id ? "▼" : "▶"}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {student.subjects.map((subject) => (
                  <div key={subject.name} className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{subject.name}</span>
                      <span className="text-xs">{getTrendIcon(subject.trend)}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {subject.current}% / {subject.target}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          subject.current >= subject.target
                            ? "bg-green-500"
                            : subject.current >= subject.target * 0.8
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min((subject.current / subject.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {expandedStudent === student.id && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          詳細進捗
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {student.subjects.map((subject) => (
                          <div key={subject.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{subject.name}</span>
                              <div className="text-sm">
                                <span className="font-medium">{subject.current}%</span>
                                <span className="text-gray-500"> / {subject.target}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  subject.current >= subject.target
                                    ? "bg-green-500"
                                    : subject.current >= subject.target * 0.8
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min((subject.current / subject.target) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          指導方針
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {student.needsAttention && (
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <h4 className="font-medium text-orange-800 mb-1">要注意</h4>
                              <p className="text-sm text-orange-700">国語の進捗が遅れています</p>
                            </div>
                          )}
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-1">強化ポイント</h4>
                            <p className="text-sm text-blue-700">
                              {student.subjects.find((s) => s.current < s.target * 0.8)?.name || "全体的に"}の対策が必要
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <h4 className="font-medium text-green-800 mb-1">良好な分野</h4>
                            <p className="text-sm text-green-700">
                              {student.subjects.find((s) => s.current >= s.target)?.name || "継続的な学習"}で安定
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
