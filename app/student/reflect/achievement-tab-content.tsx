'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, ClipboardList } from 'lucide-react'
import { AchievementMap } from './achievement-map'
import { ExerciseAchievementMap } from './exercise-achievement-map'

interface Props {
  studentGrade: number
  studentCourse?: string
  viewerRole?: 'student' | 'parent' | 'coach'
  studentId?: number
}

export function AchievementTabContent({
  studentGrade,
  studentCourse = 'B',
  viewerRole = 'student',
  studentId,
}: Props) {
  const [subtab, setSubtab] = useState<string>('exercise')

  return (
    <Tabs value={subtab} onValueChange={setSubtab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="exercise" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          演習問題集
        </TabsTrigger>
        <TabsTrigger value="textbook" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          予習シリーズ
        </TabsTrigger>
      </TabsList>

      <TabsContent value="exercise">
        <ExerciseAchievementMap
          studentGrade={studentGrade}
          studentCourse={studentCourse}
          viewerRole={viewerRole}
          studentId={studentId}
        />
      </TabsContent>

      <TabsContent value="textbook">
        <AchievementMap
          studentGrade={studentGrade}
          studentCourse={studentCourse}
          viewerRole={viewerRole}
          studentId={studentId ? String(studentId) : undefined}
        />
      </TabsContent>
    </Tabs>
  )
}
