"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Flag, Map, BookOpen, Heart, MessageCircle, X } from "lucide-react"
import { CoachTopNavigation } from "@/components/coach-top-navigation"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

interface Student {
  id: string
  name: string
  nickname: string
  avatar: string
  grade: string
}

const students: Student[] = [
  {
    id: "student1",
    name: "田中太郎",
    nickname: "たんじろう",
    avatar: "student1",
    grade: "小学5年",
  },
  {
    id: "student2",
    name: "佐藤花子",
    nickname: "はなちゃん",
    avatar: "student2",
    grade: "小学6年",
  },
  {
    id: "student3",
    name: "鈴木次郎",
    nickname: "じろう",
    avatar: "student3",
    grade: "小学5年",
  },
  {
    id: "student4",
    name: "高橋美咲",
    nickname: "みさき",
    avatar: "student4",
    grade: "小学6年",
  },
]

export default function StudentsListPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedView, setSelectedView] = useState<string | null>(null)

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const actionButtons = [
    { id: "home", label: "ホーム", icon: Home, description: "学習カレンダー、今日のミッション！、今週の進捗など" },
    { id: "goal-navi", label: "ゴールナビ", icon: Flag, description: "テスト結果のみ閲覧" },
    { id: "achievement-map", label: "達成マップ", icon: Map, description: "達成マップを閲覧" },
    { id: "learning-history", label: "学習履歴", icon: BookOpen, description: "学習履歴を閲覧" },
    { id: "encouragement-history", label: "応援履歴", icon: Heart, description: "応援履歴を閲覧" },
    { id: "coaching-history", label: "コーチング履歴", icon: MessageCircle, description: "コーチング履歴を閲覧" },
  ]

  const handleActionClick = (student: Student, actionId: string) => {
    setSelectedStudent(student)
    setSelectedView(actionId)
  }

  const handleClose = () => {
    setSelectedStudent(null)
    setSelectedView(null)
  }

  if (selectedStudent && selectedView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
        <CoachTopNavigation />

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Header with Close Button */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  {selectedStudent.name}さんの{actionButtons.find((a) => a.id === selectedView)?.label}
                </h1>
                <p className="text-blue-100">{actionButtons.find((a) => a.id === selectedView)?.description}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                ここに{selectedStudent.name}さんの{actionButtons.find((a) => a.id === selectedView)?.label}
                が表示されます
              </p>
            </CardContent>
          </Card>
        </div>

        <CoachBottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      <CoachTopNavigation />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2">生徒一覧</h1>
          <p className="text-blue-100">各生徒の詳細情報を確認</p>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {students.map((student) => (
            <Card key={student.id} className="bg-white shadow-md hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                      <AvatarImage src={getAvatarSrc(student.avatar) || "/placeholder.svg"} alt={student.name} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-lg">{student.name}</div>
                      <div className="text-sm text-muted-foreground">ニックネーム: {student.nickname}</div>
                      <Badge className="mt-1 bg-blue-100 text-blue-800">{student.grade}</Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {actionButtons.map((action) => {
                      const Icon = action.icon
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          className="flex items-center gap-2 justify-start h-auto py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 bg-transparent"
                          onClick={() => handleActionClick(student, action.id)}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{action.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
