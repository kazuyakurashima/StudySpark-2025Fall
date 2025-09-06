"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Calendar, TrendingUp } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")

  const children = [
    { id: "child1", name: "みかん", nickname: "みかんちゃん" },
    { id: "child2", name: "太郎", nickname: "たろう" },
  ]

  const learningHistory = [
    {
      date: "2024年8月17日",
      subjects: ["算数", "国語"],
      mood: "😊",
      problems: 15,
      correct: 12,
      reflection: "図形問題が少し難しかったけど、頑張りました",
    },
    {
      date: "2024年8月16日",
      subjects: ["理科", "社会"],
      mood: "😐",
      problems: 20,
      correct: 16,
      reflection: "理科の実験問題が面白かったです",
    },
  ]

  const encouragementMessages = [
    {
      from: "お母さん",
      message: "今日も頑張ったね！明日もファイト！",
      time: "今日 20:30",
      type: "parent",
    },
    {
      from: "田中先生",
      message: "算数の応用問題、よくできていました",
      time: "今日 18:45",
      type: "teacher",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">リフレクト</h1>
              <p className="text-sm text-slate-600">お子さんの学習を振り返ろう</p>
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex gap-2">
            {children.map((child) => (
              <Button
                key={child.id}
                variant={selectedChild === child.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedChild(child.id)}
                className={selectedChild === child.id ? "bg-cyan-600 hover:bg-cyan-700" : ""}
              >
                {child.name}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">学習履歴</TabsTrigger>
            <TabsTrigger value="messages">応援メッセージ</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
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
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{entry.reflection}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            {encouragementMessages.map((msg, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                        msg.type === "parent" ? "bg-pink-500" : "bg-blue-500"
                      }`}
                    >
                      {msg.type === "parent" ? "母" : "先"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{msg.from}</span>
                        <span className="text-xs text-gray-500">{msg.time}</span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  学習傾向分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">良い傾向</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• 毎日継続して学習できています</li>
                    <li>• 算数の正答率が向上しています</li>
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">改善ポイント</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• 理科の応用問題に時間をかけましょう</li>
                    <li>• 社会の暗記項目を復習しましょう</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
