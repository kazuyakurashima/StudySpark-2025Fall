"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, Users, Loader2, RefreshCw } from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { useCoachStudents } from "@/lib/hooks/use-coach-students"
import { getAvatarById } from "@/lib/constants/avatars"

export default function StudentsListPage() {
  // SWRフックで生徒一覧を取得
  const { students, studentsError, isLoading, isValidating, mutate } = useCoachStudents()

  const [gradeFilter, setGradeFilter] = useState<string>("all")

  const filteredStudents = students.filter((student) => {
    if (gradeFilter === "all") return true
    return student.grade === gradeFilter
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (studentsError) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <p className="text-destructive">{studentsError}</p>
            </CardContent>
          </Card>
        </div>
        <CoachBottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <UserProfileHeader />
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Users className="h-6 w-6 md:h-7 md:w-7" />
                  生徒一覧
                </h1>
                <p className="text-muted-foreground">各生徒の詳細情報を確認</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => mutate()}
                disabled={isValidating}
                title="データを更新"
              >
                <RefreshCw className={`h-5 w-5 ${isValidating ? "animate-spin" : ""}`} />
              </Button>
            </div>
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
                          <AvatarImage
                            src={student.custom_avatar_url || (student.avatar_id ? getAvatarById(student.avatar_id)?.src || "/placeholder.svg" : "/placeholder.svg")}
                            alt={student.full_name}
                          />
                          <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base md:text-lg leading-tight line-clamp-2">
                            {student.nickname ? (
                              <>
                                {student.nickname}
                                <span className="text-slate-500 font-normal">（{student.full_name}）</span>
                              </>
                            ) : (
                              student.full_name
                            )}
                          </div>
                          <Badge variant="secondary" className="mt-1">
                            {student.grade}
                          </Badge>
                        </div>
                      </div>

                      {/* Detail Link */}
                      <Link href={`/coach/student/${student.id}`}>
                        <Button
                          variant="default"
                          className="w-full flex items-center justify-center gap-2"
                        >
                          詳細を見る
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
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
