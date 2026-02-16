"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useMathMasterDetail } from "@/lib/hooks/use-math-master"
import type { MathMasterQuestion } from "@/lib/hooks/use-math-master"

interface DetailMatrixProps {
  questionSetId: number
  onBack: () => void
}

export function DetailMatrix({ questionSetId, onBack }: DetailMatrixProps) {
  const { data, isLoading, error, questions, students, questionStats, questionSet } =
    useMathMasterDetail(questionSetId)

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
    ? `第${questionSet.session_number || "?"}回${questionSet.display_order === 1 ? "\u2460" : "\u2461"} ${questionSet.title || ""}`
    : ""
  const gradeLabel = questionSet ? `小${questionSet.grade}` : ""

  // section_name でグルーピング
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
                  <th className="px-3 py-1 text-center font-medium border-b border-l min-w-[50px]">合計</th>
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
                  const answeredCount = questions.filter(
                    (q) => st.results[q.id.toString()] !== undefined && st.results[q.id.toString()] !== null
                  ).length
                  const correctCount = questions.filter(
                    (q) => st.results[q.id.toString()] === true
                  ).length
                  const rate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : null

                  return (
                    <tr key={st.student_id} className="border-b hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium whitespace-nowrap border-r">
                        {st.full_name}
                      </td>
                      {questions.map((q) => {
                        const result = st.results[q.id.toString()]
                        return (
                          <td key={q.id} className="px-1 py-2 text-center border-l">
                            <ResultMark value={result} />
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-center border-l font-medium">
                        {hasSubmitted ? st.total_score : <span className="text-muted-foreground">-</span>}
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

function ResultMark({ value }: { value: boolean | null | undefined }) {
  if (value === true) return <span className="text-green-600 font-bold">\u25CB</span>
  if (value === false) return <span className="text-red-500 font-bold">\u00D7</span>
  return <span className="text-muted-foreground">-</span>
}

function RateText({ rate }: { rate: number }) {
  let colorClass = "text-foreground"
  if (rate >= 80) colorClass = "text-green-600"
  else if (rate < 50) colorClass = "text-red-600"
  return <span className={colorClass}>{rate}%</span>
}

interface Section {
  name: string
  questions: MathMasterQuestion[]
}

function groupBySections(questions: MathMasterQuestion[]): Section[] {
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
