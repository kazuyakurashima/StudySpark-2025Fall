'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStudySessions } from '@/app/actions/study-log'
import {
  getExerciseAchievementMapData,
  type ExerciseAchievementData,
  type ExerciseAchievementSummary,
} from '@/app/actions/exercise-achievement'

// ================================================================
// 型定義
// ================================================================

interface Props {
  studentGrade: number
  studentCourse?: string
  // viewerRole / studentId は 1A-6/7 で認可付きで追加予定
  viewerRole?: 'student' | 'parent' | 'coach'
  studentId?: number
}

// セクション列の定義
// 配色: 全セクション青で統一（凡例との一致性を優先。セクション区別は列ヘッダーのラベルで行う）
const SECTION_COLUMNS = [
  { key: '反復問題（基本）', label: '反復(基本)', shortLabel: '基本' },
  { key: '反復問題（練習）', label: '反復(練習)', shortLabel: '練習' },
  { key: '実戦演習', label: '実戦演習', shortLabel: '実戦' },
  // 総合回
  { key: 'ステップ①', label: 'ステップ①', shortLabel: '①' },
  { key: 'ステップ②', label: 'ステップ②', shortLabel: '②' },
  { key: 'ステップ③', label: 'ステップ③', shortLabel: '③' },
]

// ================================================================
// 配色ロジック（既存 achievement-map.tsx と統一 — 青の単色濃淡）
// 算数1科目内のセクション分けなので、色でセクションを区別する必要がない
// ================================================================

function getAccuracyColor(accuracy: number): string {
  if (accuracy === 0) return 'bg-gray-100'
  if (accuracy <= 49) return 'bg-blue-200'   // 1-49%: 薄青（文字=濃色）
  if (accuracy <= 79) return 'bg-blue-500'   // 50-79%: 中青（文字=白）
  return 'bg-blue-600'                       // 80-100%: 濃青（文字=白）
}

/** 50%以上は白文字、49%以下は濃色文字 */
function getAccuracyTextColor(accuracy: number): string {
  if (accuracy === 0) return 'text-gray-400'
  if (accuracy <= 49) return 'text-gray-700'
  return 'text-white'
}

// ================================================================
// メインコンポーネント
// ================================================================

export function ExerciseAchievementMap({
  studentGrade,
  studentCourse = 'B',
}: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<ExerciseAchievementData[]>([])
  const [summary, setSummary] = useState<ExerciseAchievementSummary | null>(null)
  const [totalSessions, setTotalSessions] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // 学習回数をDBから取得（学年依存）
        const sessionsResult = await getStudySessions(studentGrade)
        if (!sessionsResult.error && sessionsResult.sessions) {
          setTotalSessions(sessionsResult.sessions.length)
        }
        const result = await getExerciseAchievementMapData()
        if (result.error) { setError(result.error) }
        else { setData(result.data); setSummary(result.summary) }
      } catch (e) {
        console.error('Failed to load exercise achievement data:', e)
        setError('データの読み込みに失敗しました')
      } finally { setIsLoading(false) }
    }
    load()
  }, [studentGrade, studentCourse])

  // セッションごとにセクション別スコアを集計
  const gridData = useMemo(() => {
    return data.map(session => {
      const sections: Record<string, { correct: number; total: number; excluded: boolean }> = {}

      for (const q of session.questions) {
        if (!sections[q.sectionName]) {
          sections[q.sectionName] = { correct: 0, total: 0, excluded: false }
        }
        const sec = sections[q.sectionName]

        if (q.status === 'excluded') {
          sec.excluded = true
        } else {
          sec.total++
          if (q.status === true) sec.correct++
        }
      }

      return { sessionNumber: session.sessionNumber, sections }
    })
  }, [data])

  // 実際に使われているセクション名を検出
  const activeSectionColumns = useMemo(() => {
    const usedSections = new Set<string>()
    for (const session of data) {
      for (const q of session.questions) {
        usedSections.add(q.sectionName)
      }
    }
    return SECTION_COLUMNS.filter(col => usedSections.has(col.key))
  }, [data])

  // 全学習回を生成（DBから取得した回数、データがない回も表示）
  const allSessionNumbers = useMemo(
    () => Array.from({ length: totalSessions }, (_, i) => i + 1),
    [totalSessions]
  )

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
    )
  }

  if (error) {
    return <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">まだデータがありません</div>
  }

  const gridMap = new Map(gridData.map(g => [g.sessionNumber, g.sections]))

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          演習問題集 達成マップ
        </CardTitle>
        {summary && summary.totalQuestions > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            到達率 <span className="font-bold text-foreground">{summary.accuracy}%</span>
            （{summary.correctQuestions}/{summary.totalQuestions}問正解）
            {summary.answeredRate < 100 && (
              <span className="ml-2">回答率 {summary.answeredRate}%</span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 凡例 */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <span className="text-muted-foreground font-semibold">正答率:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border rounded" />
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-200 rounded" />
              <span>1-49%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded" />
              <span>50-79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-600 rounded" />
              <span>80-100%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border rounded flex items-center justify-center">
                <Lock className="h-2 w-2 text-gray-400" />
              </div>
              <span>未対象</span>
            </div>
          </div>

          {/* ヒートマップテーブル */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white z-10 text-left text-xs sm:text-sm font-semibold p-1 sm:p-2 border-b">
                    学習回
                  </th>
                  {activeSectionColumns.map(col => (
                    <th key={col.key} className="text-center text-[10px] sm:text-xs font-bold p-1 sm:p-2 border-b min-w-[70px] sm:min-w-[90px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="hidden sm:inline text-gray-800">{col.label}</span>
                        <span className="sm:hidden text-gray-800">{col.shortLabel}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allSessionNumbers.map(sessionNum => {
                  const sessionData = gridMap.get(sessionNum)

                  return (
                    <tr key={sessionNum}>
                      <td className="sticky left-0 bg-white z-10 text-xs sm:text-sm font-medium p-1 sm:p-2 border-b whitespace-nowrap">
                        第{sessionNum}回
                      </td>
                      {activeSectionColumns.map(col => {
                        const sec = sessionData?.[col.key]

                        // データなし（この回のデータ未投入）
                        if (!sec) {
                          return (
                            <td key={col.key} className="p-1 sm:p-2 border-b">
                              <div className="flex justify-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-300 text-[10px] sm:text-xs">-</span>
                                </div>
                              </div>
                            </td>
                          )
                        }

                        // 未対象（上位コース）
                        if (sec.excluded && sec.total === 0) {
                          return (
                            <td key={col.key} className="p-1 sm:p-2 border-b">
                              <div className="flex justify-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                                  <Lock className="h-3 w-3 text-gray-400" />
                                </div>
                              </div>
                            </td>
                          )
                        }

                        // 未回答（データはあるが回答なし）
                        if (sec.total > 0 && sec.correct === 0 && !sessionData) {
                          // This case shouldn't happen since sec exists means sessionData exists
                        }

                        const accuracy = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0
                        const hasAnswers = sessionData && Object.values(sessionData).some(s =>
                          !s.excluded && s.total > 0
                        )
                        // 回答済みかどうかを判定（graded セッションがある = 回答済み）
                        const isAnswered = hasAnswers

                        if (!isAnswered) {
                          return (
                            <td key={col.key} className="p-1 sm:p-2 border-b">
                              <div className="flex justify-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-300 text-[10px] sm:text-xs">-</span>
                                </div>
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={col.key} className="p-1 sm:p-2 border-b">
                            <div className="flex justify-center">
                              <div
                                className={cn(
                                  "w-10 h-10 sm:w-12 sm:h-12 rounded flex flex-col items-center justify-center",
                                  getAccuracyColor(accuracy),
                                  getAccuracyTextColor(accuracy)
                                )}
                                title={`${col.label}: ${accuracy}% (${sec.correct}/${sec.total})`}
                              >
                                <span className="text-[10px] sm:text-xs font-bold leading-tight">{accuracy}%</span>
                                <span className="text-[8px] sm:text-[10px] opacity-80 leading-tight">{sec.correct}/{sec.total}</span>
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
