"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Calendar, BarChart3 } from "lucide-react"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"

export default function CoachReflectPage() {
  const [selectedStudent, setSelectedStudent] = useState("student1")

  const students = [
    { id: "student1", name: "田中みかん", nickname: "みかんちゃん" },
    { id: "student2", name: "佐藤太郎", nickname: "たろう" },
    { id: "student3", name: "鈴木花子", nickname: "はなちゃん" },
  ]

  const learningHistory = [
    {
      date: "2024年8月17日",
      subjects: ["算数", "国語"],
      mood: "😊",
      problems: 15,
      correct: 12,
      reflection: "図形問題が少し難しかったけど、頑張りました",
      feedback: "計算ミスが減ってきています。この調子で続けましょう。",
    },
    {
      date: "2024年8月16日",
      subjects: ["理科", "社会"],
      mood: "😐",
      problems: 20,
      correct: 16,
      reflection: "理科の実験問題が面白かったです",
      feedback: "理科への興味が高まっているのが良いですね。",
    },
  ]

  const classAnalytics = {
    totalStudents: 25,
    activeToday: 22,
    averageScore: 78,
    needsAttention: 3,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-cyan-600" />
            <h1 className="text-xl font-bold text-gray-900">リフレクト</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">個別分析</TabsTrigger>
            <TabsTrigger value="class">クラス全体</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4">
            <div className="mb-4">
              <div className="flex gap-2 flex-wrap">
                {students.map((student) => (
                  <Button
                    key={student.id}
                    variant={selectedStudent === student.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStudent(student.id)}
                    className={selectedStudent === student.id ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                  >
                    {student.nickname}
                  </Button>
                ))}
              </div>
            </div>

            {learningHistory.map((entry, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {entry.date}
                    </CardTitle>
                    <span className="text-2xl">{entry.mood}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    {entry.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">
                    問題数: {entry.problems}問 / 正解: {entry.correct}問 (
                    {Math.round((entry.correct / entry.problems) * 100)}%)
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-blue-800">生徒の振り返り:</span>
                      <br />
                      {entry.reflection}
                    </p>
                    <p className="text-sm bg-green-50 p-3 rounded-lg">
                      <span className="font-medium text-green-800">指導者コメント:</span>
                      <br />
                      {entry.feedback}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="class" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  クラス全体の状況
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{classAnalytics.totalStudents}</div>
                    <div className="text-sm text-blue-800">総生徒数</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{classAnalytics.activeToday}</div>
                    <div className="text-sm text-green-800">今日の学習者</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-600">{classAnalytics.averageScore}%</div>
                    <div className="text-sm text-cyan-800">平均正答率</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{classAnalytics.needsAttention}</div>
                    <div className="text-sm text-orange-800">要注意生徒</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>今日の学習状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {students.slice(0, 3).map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{student.nickname}</span>
                        <div className="text-sm text-gray-600">算数・国語完了</div>
                      </div>
                      <Badge variant={index === 0 ? "default" : "secondary"}>{index === 0 ? "優秀" : "完了"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
