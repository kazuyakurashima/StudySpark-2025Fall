'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { startMathRetry, revealMathAnswers, type MathGradeResult } from '@/app/actions/math-answer'
import { cn } from '@/lib/utils'

interface Props {
  questionSetId: number
  result: MathGradeResult
}

export function MathResultView({ questionSetId, result }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  const isAllCorrect = result.totalScore === result.maxScore
  const canRetry = !result.answersRevealed && !isAllCorrect

  const handleRetry = () => {
    startTransition(async () => {
      setErrorMessage('')
      const res = await startMathRetry({ answerSessionId: result.answerSessionId })
      if (res.error) {
        setErrorMessage(res.error)
        return
      }
      router.push(`/student/math-answer/${questionSetId}`)
      router.refresh()
    })
  }

  const handleReveal = () => {
    startTransition(async () => {
      setErrorMessage('')
      const res = await revealMathAnswers({ answerSessionId: result.answerSessionId })
      if (res.error) {
        setErrorMessage(res.error)
        return
      }
      router.refresh()
    })
  }

  // セクション単位でグループ化
  type Detail = (typeof result.details)[number]
  const sections: { sectionName: string; details: Detail[] }[] = []
  let currentSection = ''
  for (const d of result.details) {
    if (d.sectionName !== currentSection) {
      currentSection = d.sectionName
      sections.push({ sectionName: currentSection, details: [] })
    }
    sections[sections.length - 1].details.push(d)
  }

  return (
    <div>
      {/* スコアサマリ */}
      <div className="text-center py-6 mb-6 bg-muted/50 rounded-lg">
        <div className={cn(
          'text-4xl font-bold',
          isAllCorrect ? 'text-green-600' : 'text-orange-600'
        )}>
          {result.totalScore}/{result.maxScore}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {result.percentage}% — {result.attemptNumber}回目
        </div>
        {isAllCorrect && (
          <p className="text-green-600 font-medium mt-2">全問正解!</p>
        )}
      </div>

      {/* 問題ごとの結果 */}
      {sections.map(({ sectionName, details }) => (
        <div key={sectionName} className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">
            {sectionName}
          </h2>
          <div className="space-y-2">
            {details.map(d => (
              <div key={d.questionId} className="flex items-start gap-2 py-1">
                <span className="text-sm text-muted-foreground min-w-[2.5rem]">
                  {d.questionNumber}
                </span>
                <span className="min-w-[1.5rem]">
                  {d.isCorrect === true && '✅'}
                  {d.isCorrect === false && '❌'}
                  {d.isCorrect === null && '⬜'}
                </span>
                <div className="flex-1">
                  {d.rawInput && (
                    <span className="text-sm">{d.rawInput}</span>
                  )}
                  {d.unitLabel && (
                    <span className="text-sm text-muted-foreground ml-1">{d.unitLabel}</span>
                  )}
                  {result.answersRevealed && 'correctAnswer' in d && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      正答: {d.correctAnswer}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 操作ボタン */}
      <div className="flex flex-wrap items-center gap-3 mt-8 mb-20">
        {canRetry && (
          <>
            <Button onClick={handleRetry} disabled={isPending}>
              もう一度挑戦
            </Button>
            <Button variant="outline" onClick={handleReveal} disabled={isPending}>
              解答を見る
            </Button>
          </>
        )}
        <Link href="/student/math-answer">
          <Button variant="ghost">一覧に戻る</Button>
        </Link>
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive mt-2">{errorMessage}</p>
      )}
    </div>
  )
}
