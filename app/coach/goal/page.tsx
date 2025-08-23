"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, User, Calendar, BookOpen, TrendingUp } from "lucide-react"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"

export default function CoachGoalPage() {
  const [selectedStudent, setSelectedStudent] = useState("")

  const students = [
    { id: "student1", name: "田中みかん", nickname: "みかんちゃん", course: "A", class: 15 },
    { id: "student2", name: "佐藤太郎", nickname: "たろう", course: "B", class: 8 },
    { id: "student3", name: "鈴木花子", nickname: "はなちゃん", course: "A", class: 22 },
  ]

  const subjects = [
    { name: "算数", color: "bg-blue-100 text-blue-800", target: 85, current: 75 },
    { name: "国語", color: "bg-green-100 text-green-800", target: 80, current: 60 },
    { name: "理科", color: "bg-purple-100 text-purple-800", target: 90, current: 80 },
    { name: "社会", color: "bg-orange-100 text-orange-800", target: 75, current: 65 },
  ]

  const selectedStudentData = students.find((s) => s.id === selectedStudent)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-cyan-600" />
            <h1 className="text-xl font-bold text-gray-900">ゴールナビ</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              生徒を選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="生徒を選んでください" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}（{student.nickname}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedStudentData && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  目標設定状況
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cyan-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">志望コース</p>
                    <p className="font-semibold">{selectedStudentData.course}コース</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">目標クラス</p>
                    <p className="font-semibold">{selectedStudentData.class}組</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">受験日</p>
                  <p className="font-semibold">2025年2月1日（土）</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  科目別目標と進捗
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${subject.color}`}>
                        {subject.name}
                      </span>
                      <div className="text-sm">
                        <span className="font-medium">{subject.current}%</span>
                        <span className="text-gray-500"> / {subject.target}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(subject.current / subject.target) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>現在: {subject.current}%</span>
                      <span>目標: {subject.target}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  指導方針
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-1">強化ポイント</h4>
                    <p className="text-sm text-blue-700">国語の読解力向上が必要です</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-1">良好な分野</h4>
                    <p className="text-sm text-green-700">理科の計算問題は安定しています</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
