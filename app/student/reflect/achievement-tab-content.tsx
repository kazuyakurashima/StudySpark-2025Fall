'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, ClipboardList, ChevronDown, ChevronUp, Map } from 'lucide-react'
import { AchievementMap } from './achievement-map'
import { ExerciseAchievementMap } from './exercise-achievement-map'
import dynamic from 'next/dynamic'

const ParentExerciseSection = dynamic(
  () => import('@/app/parent/reflect/exercise-section').then(m => ({ default: m.ParentExerciseSection })),
  { ssr: false }
)

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
  // 保護者のみ: 到達マップは初期折りたたみ
  const [mapOpen, setMapOpen] = useState(viewerRole !== 'parent')

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

      <TabsContent value="exercise" className="space-y-4">
        {/* 保護者: 結果ファースト（主目的を先頭に） */}
        {viewerRole === 'parent' && studentId != null && (
          <ParentExerciseSection
            studentId={studentId}
            studentGrade={studentGrade}
          />
        )}

        {/* 到達マップ: 保護者のみ折りたたみ制御 */}
        {viewerRole === 'parent' ? (
          <div className="space-y-0">
            <button
              onClick={() => setMapOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                到達マップを{mapOpen ? '閉じる' : '見る'}
              </span>
              {mapOpen
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </button>
            {mapOpen && (
              <ExerciseAchievementMap
                studentGrade={studentGrade}
                studentCourse={studentCourse}
                viewerRole={viewerRole}
                studentId={studentId}
              />
            )}
          </div>
        ) : (
          <ExerciseAchievementMap
            studentGrade={studentGrade}
            studentCourse={studentCourse}
            viewerRole={viewerRole}
            studentId={studentId}
          />
        )}
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
