"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Target, BookOpen, User } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

export default function ParentGoalPage() {
  const [selectedChild, setSelectedChild] = useState("")
  const [testDate, setTestDate] = useState("")
  const [course, setCourse] = useState("")
  const [classNumber, setClassNumber] = useState(20)

  const children = [
    { id: "child1", name: "みかん", nickname: "みかんちゃん" },
    { id: "child2", name: "太郎", nickname: "たろう" },
  ]

  const subjects = [
    { name: "算数", color: "bg-blue-100 text-blue-800", progress: 75 },
    { name: "国語", color: "bg-green-100 text-green-800", progress: 60 },
    { name: "理科", color: "bg-purple-100 text-purple-800", progress: 80 },
    { name: "社会", color: "bg-orange-100 text-orange-800", progress: 65 },
  ]

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
              お子さんを選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="お子さんを選んでください" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}（{child.nickname}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedChild && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  目標設定状況
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-cyan-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">受験日</p>
                  <p className="font-semibold">2025年2月1日（土）</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">志望コース</p>
                  <p className="font-semibold">Aコース</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  科目別進捗
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${subject.color}`}>
                        {subject.name}
                      </span>
                      <span className="text-sm font-medium">{subject.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>保護者からの応援メッセージ</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="お子さんへの応援メッセージを入力してください..." className="min-h-[100px]" />
                <Button className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700">応援メッセージを送信</Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
