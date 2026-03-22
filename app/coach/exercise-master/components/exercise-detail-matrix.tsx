"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useExerciseMasterDetail } from "@/lib/hooks/use-exercise-master"
import type { ExerciseMasterQuestion, ExerciseMasterSectionStat } from "@/app/actions/exercise-master"
import { ExerciseRadarChart } from "./exercise-radar-chart"
import { ExerciseDistributionChart } from "./exercise-distribution-chart"

interface ExerciseDetailMatrixProps {
  questionSetId: number
  onBack: () => void
}

export function ExerciseDetailMatrix({ questionSetId, onBack }: ExerciseDetailMatrixProps) {
  const { data, isLoading, error, questions, students, questionStats, sectionStats, questionSet } =
    useExerciseMasterDetail(questionSetId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          データの取得に失敗しました
        </CardContent>
      </Card>
    )
  }

  const title = questionSet
    ? `第${questionSet.session_number}回 ${questionSet.title || ""}`
    : ""
  const gradeLabel = questionSet ? `小${questionSet.grade}` : ""

  const sections = groupBySections(questions)
  const statsMap = new Map(questionStats.map((s) => [s.question_id, s]))

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Button>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{gradeLabel}</p>
        </div>
      </div>

      {/* セクション別正答率バー */}
      {sectionStats.length > 0 && (
        <SectionRateBars sectionStats={sectionStats} />
      )}

      {/* グラフ（レーダー＋分布）*/}
      {(sectionStats.length >= 2 || students.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExerciseRadarChart sectionStats={sectionStats} />
          <ExerciseDistributionChart students={students} />
        </div>
      )}

      {/* マトリクス */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                {/* セクションヘッダー行 */}
                <tr className="bg-muted/30">
                  <th className="sticky left-0 z-10 bg-muted/30 px-3 py-1 text-left font-medium border-b min-w-[100px]">
                    &nbsp;
                  </th>
                  {sections.map((sec) => (
                    <th
                      key={sec.name}
                      colSpan={sec.questions.length}
                      className="px-1 py-1 text-center font-medium text-xs text-muted-foreground border-b border-l"
                    >
                      {sec.name}
                    </th>
                  ))}
                  <th className="px-3 py-1 text-center font-medium border-b border-l min-w-[50px]">得点</th>
                  <th className="px-3 py-1 text-center font-medium border-b border-l min-w-[60px]">正答率</th>
                </tr>
                {/* 設問番号行 */}
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium border-b">
                    生徒
                  </th>
                  {questions.map((q) => (
                    <th
                      key={q.id}
                      className="px-1 py-2 text-center font-normal text-xs border-b border-l min-w-[32px]"
                      title={q.min_course ? `${q.min_course}コース以上` : undefined}
                    >
                      {q.question_number}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium border-b border-l">&nbsp;</th>
                  <th className="px-3 py-2 text-center font-medium border-b border-l">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => {
                  const hasSubmitted = st.total_score !== null
                  const rate = st.accuracy_rate !== null
                    ? Math.round(st.accuracy_rate * 100)
                    : null

                  return (
                    <tr key={st.student_id} className="border-b hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium whitespace-nowrap border-r">
                        <span>{st.full_name}</span>
                        <span className="ml-1 text-xs text-muted-foreground">({st.course_level})</span>
                      </td>
                      {questions.map((q) => {
                        const result = st.results[q.id.toString()]
                        // コース外の問題は excluded マーク
                        const isExcluded = q.min_course && st.course_level &&
                          COURSE_RANK[q.min_course] > COURSE_RANK[st.course_level]

                        return (
                          <td key={q.id} className={`px-1 py-2 text-center border-l ${isExcluded ? "bg-muted/20" : ""}`}>
                            {isExcluded ? (
                              <span className="text-muted-foreground text-xs">-</span>
                            ) : (
                              <ResultMark value={result} />
                            )}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-center border-l font-medium">
                        {hasSubmitted ? (
                          <span>{st.total_score}/{st.max_score}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center border-l">
                        {rate !== null ? (
                          <RateText rate={rate} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {/* 正答率フッター */}
                <tr className="bg-muted/30 font-medium">
                  <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2 border-r">正答率</td>
                  {questions.map((q) => {
                    const stat = statsMap.get(q.id)
                    const pct = stat && stat.answered_count > 0
                      ? Math.round(stat.rate * 100)
                      : null
                    return (
                      <td key={q.id} className="px-1 py-2 text-center text-xs border-l">
                        {pct !== null ? <RateText rate={pct} /> : <span className="text-muted-foreground">-</span>}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 border-l">&nbsp;</td>
                  <td className="px-3 py-2 text-center border-l">
                    {(() => {
                      const totalCorrect = questionStats.reduce((sum, s) => sum + s.correct_count, 0)
                      const totalAnswered = questionStats.reduce((sum, s) => sum + s.answered_count, 0)
                      if (totalAnswered === 0) return <span className="text-muted-foreground">-</span>
                      return <RateText rate={Math.round((totalCorrect / totalAnswered) * 100)} />
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// サブコンポーネント
// ============================================================

const COURSE_RANK: Record<string, number> = { A: 1, B: 2, C: 3, S: 4 }

function ResultMark({ value }: { value: boolean | null | undefined }) {
  if (value === true) return <span className="text-green-600 font-bold">○</span>
  if (value === false) return <span className="text-red-500 font-bold">×</span>
  return <span className="text-muted-foreground">-</span>
}

function RateText({ rate }: { rate: number }) {
  let colorClass = "text-foreground"
  if (rate >= 80) colorClass = "text-green-600"
  else if (rate < 50) colorClass = "text-red-600"
  return <span className={colorClass}>{rate}%</span>
}

function SectionRateBars({ sectionStats }: { sectionStats: ExerciseMasterSectionStat[] }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">セクション別正答率（全体）</h3>
        {sectionStats.map((s) => {
          const pct = Math.round(s.avg_rate * 100)
          return (
            <div key={s.section_name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{s.section_name}（{s.question_count}問）</span>
                <RateText rate={pct} />
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============================================================
// ヘルパー
// ============================================================

interface Section {
  name: string
  questions: ExerciseMasterQuestion[]
}

function groupBySections(questions: ExerciseMasterQuestion[]): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const q of questions) {
    if (!current || current.name !== q.section_name) {
      current = { name: q.section_name, questions: [q] }
      sections.push(current)
    } else {
      current.questions.push(q)
    }
  }

  return sections
}
