'use client'

import Link from 'next/link'
import type { MathQuestionSetSummary } from '@/app/actions/math-answer'
import { cn } from '@/lib/utils'

interface Props {
  questionSets: MathQuestionSetSummary[]
}

export function MathQuestionSetList({ questionSets }: Props) {
  return (
    <div className="space-y-3">
      {questionSets.map((qs) => (
        <Link
          key={qs.id}
          href={`/student/math-answer/${qs.id}`}
          className={cn(
            'block rounded-lg border p-4 transition-colors hover:bg-accent/50',
            qs.status === 'graded' && 'border-green-200 bg-green-50/50',
            qs.status === 'in_progress' && 'border-blue-200 bg-blue-50/50'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{qs.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {qs.questionCount}問
              </p>
            </div>
            <div className="text-right">
              {qs.status === 'not_started' && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  未着手
                </span>
              )}
              {qs.status === 'in_progress' && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  入力中
                </span>
              )}
              {qs.status === 'graded' && qs.score && (
                <div>
                  <span className={cn(
                    'text-sm font-bold',
                    qs.score.percentage === 100 ? 'text-green-600' : 'text-orange-600'
                  )}>
                    {qs.score.total}/{qs.score.max}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({qs.score.percentage}%)
                  </span>
                  {qs.answersRevealed && (
                    <p className="text-xs text-muted-foreground mt-0.5">解答済み</p>
                  )}
                  {!qs.answersRevealed && qs.remainingCount && qs.remainingCount > 0 && (
                    <p className="text-xs text-orange-500 mt-0.5">
                      残り{qs.remainingCount}問
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
