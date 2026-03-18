"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { ExerciseMasterSession } from "@/app/actions/exercise-master"

interface ExerciseSummaryTableProps {
  sessions: ExerciseMasterSession[]
  totalStudents: number
  onSelectSet: (questionSetId: number) => void
}

export function ExerciseSummaryTable({ sessions, totalStudents, onSelectSet }: ExerciseSummaryTableProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          演習問題集データがありません
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">回</th>
                <th className="px-3 py-2 text-left font-medium">タイトル</th>
                <th className="px-3 py-2 text-center font-medium whitespace-nowrap">問題数</th>
                <th className="px-3 py-2 text-center font-medium whitespace-nowrap">提出</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">平均正答率</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const hasData = s.question_set_id != null

                return (
                  <tr
                    key={s.session_number}
                    className={
                      hasData
                        ? "border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        : "border-b opacity-50"
                    }
                    onClick={() => {
                      if (hasData && s.question_set_id) {
                        onSelectSet(s.question_set_id)
                      }
                    }}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      第{s.session_number}回
                    </td>
                    <td className="px-3 py-2">
                      {s.title || <span className="text-muted-foreground italic">(未登録)</span>}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {s.total_questions > 0 ? s.total_questions : "-"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {hasData ? (
                        <span>
                          {s.submitted_count}/{totalStudents}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {hasData && s.submitted_count > 0 ? (
                        <RateCell rate={s.avg_rate} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function RateCell({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100)
  let colorClass = "text-foreground"
  if (pct >= 80) colorClass = "text-green-600"
  else if (pct < 50) colorClass = "text-red-600"

  return <span className={colorClass}>{pct}%</span>
}
