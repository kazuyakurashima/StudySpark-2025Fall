'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, ClipboardList, Loader2, MessageSquare, Bot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AchievementMap } from './achievement-map'
import { ExerciseAchievementMap } from './exercise-achievement-map'
import { getParentExerciseDetail, type ParentExerciseSectionStat, type ParentExerciseDetail } from '@/app/actions/exercise-master'
import type { ExerciseStudentReflection } from '@/app/actions/exercise-master'

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
  // 保護者用: マップ行タップで選択されたセッション
  const [selectedSession, setSelectedSession] = useState<{ questionSetId: number; sessionNumber: number } | null>(null)
  const [detail, setDetail] = useState<ParentExerciseDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailCache, setDetailCache] = useState<Map<number, ParentExerciseDetail>>(new Map())

  const handleSessionClick = async (questionSetId: number, sessionNumber: number) => {
    // 同じ行を再タップ → 閉じる
    if (selectedSession?.questionSetId === questionSetId) {
      setSelectedSession(null)
      setDetail(null)
      return
    }

    setSelectedSession({ questionSetId, sessionNumber })

    // キャッシュヒット
    if (detailCache.has(questionSetId)) {
      setDetail(detailCache.get(questionSetId)!)
      return
    }

    setDetail(null)
    setIsLoadingDetail(true)
    const result = await getParentExerciseDetail(studentId!, questionSetId)
    if (result.data) {
      setDetailCache(prev => new Map(prev).set(questionSetId, result.data!))
      setDetail(result.data)
    }
    setIsLoadingDetail(false)
  }

  return (
    <Tabs value={subtab} onValueChange={(v) => { setSubtab(v); setSelectedSession(null); setDetail(null) }} className="w-full">
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
        {/* 到達マップ（主役・常時展開）*/}
        <ExerciseAchievementMap
          studentGrade={studentGrade}
          studentCourse={studentCourse}
          viewerRole={viewerRole}
          studentId={studentId}
          selectedSessionNumber={selectedSession?.sessionNumber ?? null}
          onSessionClick={viewerRole === 'parent' && studentId != null ? handleSessionClick : undefined}
        />

        {/* 保護者のみ: セッション詳細パネル（マップ行タップで展開）*/}
        {viewerRole === 'parent' && studentId != null && selectedSession && (
          <Card className="border-blue-200">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold text-blue-800">
                第{selectedSession.sessionNumber}回 — 詳細
              </p>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !detail ? (
                <p className="text-sm text-muted-foreground text-center py-2">データを取得できませんでした</p>
              ) : (
                <>
                  {/* セクション別正答率バー */}
                  {detail.sectionStats.length > 0 && (
                    <SectionBars sectionStats={detail.sectionStats} />
                  )}

                  {/* 振り返り + AIフィードバック */}
                  {detail.reflections.length > 0 ? (
                    <ReflectionList reflections={detail.reflections} />
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-1">この回の振り返りはまだありません</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 保護者: マップ未選択時のヒント */}
        {viewerRole === 'parent' && studentId != null && !selectedSession && (
          <p className="text-xs text-muted-foreground text-center">
            回の行をタップすると、セクション別正答率・振り返りが表示されます
          </p>
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

// ================================================================
// サブコンポーネント
// ================================================================

function SectionBars({ sectionStats }: { sectionStats: ParentExerciseSectionStat[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">セクション別正答率</p>
      {sectionStats.map((sec) => (
        <div key={sec.sectionName}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-slate-600">{sec.sectionName}</span>
            <span className={
              sec.accuracyRate >= 80 ? "text-green-600 font-medium"
              : sec.accuracyRate < 50 ? "text-red-600 font-medium"
              : "text-amber-600 font-medium"
            }>{sec.accuracyRate}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                sec.accuracyRate >= 80 ? "bg-green-500"
                : sec.accuracyRate < 50 ? "bg-red-400"
                : "bg-amber-400"
              }`}
              style={{ width: `${sec.accuracyRate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReflectionList({ reflections }: { reflections: ExerciseStudentReflection[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">振り返り</p>
      {reflections.map((r) => (
        <div key={`${r.sectionName}-${r.attemptNumber}-${r.createdAt}`} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">{r.sectionName}</span>
            {r.attemptNumber > 1 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                {r.attemptNumber}回目
              </span>
            )}
          </div>
          <div className="flex gap-2 bg-white rounded-lg p-2.5 border border-slate-100">
            <MessageSquare className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-700">{r.reflectionText}</p>
          </div>
          {r.feedbackText && (
            <div className="flex gap-2 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
              <Bot className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-800">{r.feedbackText}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
