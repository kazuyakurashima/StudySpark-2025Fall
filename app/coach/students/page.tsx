"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Flag, Map, BookOpen, Heart, MessageCircle, X, Users, Loader2 } from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { getCoachStudents, type CoachStudent } from "@/app/actions/coach"

export default function StudentsListPage() {
  const [students, setStudents] = useState<CoachStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<CoachStudent | null>(null)
  const [selectedView, setSelectedView] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState<string>("all")

  useEffect(() => {
    async function loadStudents() {
      setLoading(true)
      const result = await getCoachStudents()

      if (result.error) {
        setError(result.error)
      } else if (result.students) {
        setStudents(result.students)
      }

      setLoading(false)
    }

    loadStudents()
  }, [])

  const actionButtons = [
    { id: "home", label: "ホーム", icon: Home, description: "学習カレンダー、今日のミッション！、今週の進捗など" },
    { id: "goal-navi", label: "ゴールナビ", icon: Flag, description: "テスト結果のみ閲覧" },
    { id: "achievement-map", label: "達成マップ", icon: Map, description: "達成マップを閲覧" },
    { id: "learning-history", label: "学習履歴", icon: BookOpen, description: "学習履歴を閲覧" },
    { id: "encouragement-history", label: "応援履歴", icon: Heart, description: "応援履歴を閲覧" },
    { id: "coaching-history", label: "コーチング履歴", icon: MessageCircle, description: "コーチング履歴を閲覧" },
  ]

  const handleActionClick = (student: CoachStudent, actionId: string) => {
    setSelectedStudent(student)
    setSelectedView(actionId)
  }

  const handleClose = () => {
    setSelectedStudent(null)
    setSelectedView(null)
  }

  const filteredStudents = students.filter((student) => {
    if (gradeFilter === "all") return true
    return student.grade === gradeFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
        <CoachBottomNavigation />
      </div>
    )
  }

  if (selectedStudent && selectedView) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header with Close Button */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold mb-2">
                    {selectedStudent.full_name}さんの{actionButtons.find((a) => a.id === selectedView)?.label}
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {actionButtons.find((a) => a.id === selectedView)?.description}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content Area */}
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                ここに{selectedStudent.full_name}さんの{actionButtons.find((a) => a.id === selectedView)?.label}
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
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Users className="h-6 w-6 md:h-7 md:w-7" />
              生徒一覧
            </h1>
            <p className="text-muted-foreground">各生徒の詳細情報を確認</p>
          </CardContent>
        </Card>

        <Tabs value={gradeFilter} onValueChange={setGradeFilter} className="space-y-6">
          <TabsList className="bg-muted w-full md:w-auto">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 md:flex-none"
            >
              すべて
            </TabsTrigger>
            <TabsTrigger
              value="小学5年"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 md:flex-none"
            >
              小学5年
            </TabsTrigger>
            <TabsTrigger
              value="小学6年"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 md:flex-none"
            >
              小学6年
            </TabsTrigger>
          </TabsList>

          <TabsContent value={gradeFilter} className="mt-0">
            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4 md:p-6">
                    <div className="space-y-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-3 md:gap-4">
                        <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-border">
                          <AvatarImage src={student.avatar_id || "/placeholder.svg"} alt={student.full_name} />
                          <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base md:text-lg truncate">{student.full_name}</div>
                          {student.nickname && (
                            <div className="text-sm text-muted-foreground truncate">
                              ニックネーム: {student.nickname}
                            </div>
                          )}
                          <Badge variant="secondary" className="mt-1">
                            {student.grade}
                          </Badge>
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
                              className="flex items-center gap-2 justify-start h-auto py-2 md:py-3 hover:bg-accent text-xs md:text-sm bg-transparent"
                              onClick={() => handleActionClick(student, action.id)}
                            >
                              <Icon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="truncate">{action.label}</span>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredStudents.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">該当する生徒がいません</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
