"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RotateCcw, Calendar, BookOpen } from "lucide-react"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"

export default function CoachReflectPage() {
  const [selectedStudent, setSelectedStudent] = useState("student1")
  const [activeTab, setActiveTab] = useState("history")

  const students = [
    {
      id: "student1",
      name: "田中みかん",
      nickname: "みかん",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-7vQJ9X2pqtBKn8fY3mZ1sL4cR6wE9t.png",
    },
    {
      id: "student2",
      name: "佐藤太郎",
      nickname: "太郎",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-2mN5pQ8rY1vK7xB3nC9fG4hL6wE8tR.png",
    },
    {
      id: "student3",
      name: "鈴木花子",
      nickname: "花子",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-9pL3mQ7rY2vK8xB4nC0fG5hL7wE9tR.png",
    },
    {
      id: "student4",
      name: "山田次郎",
      nickname: "次郎",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-4nM6pQ9rY3vK9xB5nC1fG6hL8wE0tR.png",
    },
    {
      id: "student5",
      name: "高橋美咲",
      nickname: "美咲",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-7pL5mQ0rY4vK0xB6nC2fG7hL9wE1tR.png",
    },
  ]

  const learningHistory = [
    {
      recordDate: "2024年9月6日 18:30",
      studyDate: "2024年9月6日",
      subject: "算数",
      categories: ["授業", "宿題"],
      understanding: { level: "バッチリ理解", emoji: "😄", color: "text-blue-600" },
      reflection: "図形問題の解き方がよく分かりました。特に面積の求め方が理解できて嬉しいです。",
    },
    {
      recordDate: "2024年9月5日 19:15",
      studyDate: "2024年9月5日",
      subject: "国語",
      categories: ["宿題", "週テスト・復習ナビ"],
      understanding: { level: "できた", emoji: "😊", color: "text-green-600" },
      reflection: "漢字の読み方を間違えたところがあったので、復習します。",
    },
    {
      recordDate: "2024年9月4日 20:00",
      studyDate: "2024年9月4日",
      subject: "理科",
      categories: ["授業"],
      understanding: { level: "ふつう", emoji: "😐", color: "text-yellow-600" },
      reflection: "実験の結果は面白かったけど、理由がまだよく分からない部分があります。",
    },
  ]

  const supportMessages = [
    {
      date: "今日",
      sender: "田中先生",
      message: "算数がんばったね！明日もファイト！",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/teacher-5mN8pQ2rY6vK3xB7nC4fG8hL0wE2tR.png",
    },
    {
      date: "昨日",
      sender: "お母さん",
      message: "理科の実験問題、よくできていました",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-3nM7pQ1rY5vK2xB6nC3fG7hL9wE1tR.png",
    },
  ]

  const coachingHistory = [
    {
      date: "2024年9月5日",
      time: "15:30-16:00",
      type: "Flame",
      topics: ["学習計画の見直し", "理科の理解度向上"],
      summary:
        "理科の実験問題について詳しく話し合いました。具体的な例を使って説明することで理解が深まりました。次回は社会の地理分野を重点的に取り組む予定です。",
      coach: "AIコーチ",
    },
    {
      date: "2024年9月1日",
      time: "16:00-16:30",
      type: "Blaze",
      topics: ["目標設定", "学習習慣の改善"],
      summary:
        "新学期の目標について話し合い、具体的な学習計画を立てました。毎日の学習時間を30分増やすことを目標に設定し、進捗を週次で確認することにしました。",
      coach: "AIコーチ",
    },
  ]

  const selectedStudentData = students.find((s) => s.id === selectedStudent)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">リフレクト</h1>
              <p className="text-sm text-gray-600">生徒の学習を振り返ろう</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">生徒を選択</h2>
          <div className="grid grid-cols-2 gap-2">
            {students.map((student) => (
              <Button
                key={student.id}
                variant={selectedStudent === student.id ? "default" : "outline"}
                className={`h-auto p-3 justify-start ${
                  selectedStudent === student.id ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50"
                }`}
                onClick={() => setSelectedStudent(student.id)}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
                  <AvatarFallback>{student.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-medium">{student.nickname}</div>
                  <div className="text-xs opacity-75">{student.name}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {selectedStudentData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedStudentData.avatar || "/placeholder.svg"} alt={selectedStudentData.name} />
                <AvatarFallback>{selectedStudentData.nickname[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedStudentData.name}</h3>
                <p className="text-sm text-gray-600">{selectedStudentData.nickname}の学習状況</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="history" className="text-xs">
                  学習履歴
                </TabsTrigger>
                <TabsTrigger value="support" className="text-xs">
                  応援メッセージ
                </TabsTrigger>
                <TabsTrigger value="coaching" className="text-xs">
                  コーチング履歴
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                {learningHistory.map((entry, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {entry.studyDate}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{entry.understanding.emoji}</span>
                          <Badge variant="outline" className={entry.understanding.color}>
                            {entry.understanding.level}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">記録日時: {entry.recordDate}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{entry.subject}</Badge>
                        {entry.categories.map((category, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                      {entry.reflection && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">振り返り:</span>
                            <br />
                            {entry.reflection}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="support" className="space-y-4">
                {supportMessages.map((message, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={message.avatar || "/placeholder.svg"} alt={message.sender} />
                          <AvatarFallback>{message.sender[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.sender}</span>
                            <span className="text-xs text-gray-500">{message.date}</span>
                          </div>
                          <p className="text-sm text-gray-700">{message.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="coaching" className="space-y-4">
                {coachingHistory.map((session, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {session.date}
                        </CardTitle>
                        <Badge variant="outline">{session.type}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {session.time} | {session.coach}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">話し合ったトピック:</p>
                        <div className="flex flex-wrap gap-1">
                          {session.topics.map((topic, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">コーチングサマリー:</span>
                          <br />
                          {session.summary}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
