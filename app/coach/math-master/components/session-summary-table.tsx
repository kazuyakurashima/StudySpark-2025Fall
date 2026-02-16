"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { MathMasterSessionSummary } from "@/lib/hooks/use-math-master"

interface SessionSummaryTableProps {
  sessions: MathMasterSessionSummary[]
  totalStudents: number
  onSelectSet: (questionSetId: number) => void
}

function formatAttemptLabel(sessionNumber: number, attemptNumber: number): string {
  const circled = attemptNumber === 1 ? "\u2460" : "\u2461"
  return `${sessionNumber}${circled}`
}

export function SessionSummaryTable({ sessions, totalStudents, onSelectSet }: SessionSummaryTableProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          データがありません
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
                <th className="px-3 py-2 text-center font-medium whitespace-nowrap">提出</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">平均点</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">満点</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">平均率</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isRegistered = s.has_question_set
                const label = formatAttemptLabel(s.session_number, s.attempt_number)

                return (
                  <tr
                    key={`${s.session_number}-${s.attempt_number}`}
                    className={
                      isRegistered
                        ? "border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        : "border-b opacity-50"
                    }
                    onClick={() => {
                      if (isRegistered && s.question_set_id) {
                        onSelectSet(s.question_set_id)
                      }
                    }}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{label}</td>
                    <td className="px-3 py-2">
                      {isRegistered ? (
                        <span className="text-foreground">{s.title}</span>
                      ) : (
                        <span className="text-muted-foreground italic">(未登録)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {isRegistered ? (
                        <span>
                          {s.submitted_count}/{totalStudents}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isRegistered && s.submitted_count > 0 ? (
                        <span>{s.avg_score}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isRegistered ? (
                        <span>{s.max_score}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isRegistered && s.submitted_count > 0 ? (
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
