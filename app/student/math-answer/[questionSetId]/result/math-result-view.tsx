'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BottomNavigation } from '@/components/bottom-navigation'
import { UserProfileHeader } from '@/components/common/user-profile-header'
import { PageHeader } from '@/components/common/page-header'
import { UserProfileProvider } from '@/lib/hooks/use-user-profile'
import { Award, BookOpen, RotateCcw, Eye, ChevronLeft, Check, X, Minus } from 'lucide-react'
import { startMathRetry, revealMathAnswers, type MathGradeResult } from '@/app/actions/math-answer'
import { cn } from '@/lib/utils'

interface Props {
  questionSetId: number
  questionSetTitle: string
  result: MathGradeResult
}

function ScoreRing({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const isAllCorrect = percentage === 100

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-1000',
            isAllCorrect ? 'text-green-500' : 'text-blue-500'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          'text-3xl font-bold',
          isAllCorrect ? 'text-green-600' : 'text-blue-600'
        )}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}

function MathResultViewInner({ questionSetId, questionSetTitle, result }: Props) {
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
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Award}
          title={questionSetTitle}
          subtitle="採点結果"
          variant="student"
        />

        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* スコアサマリ */}
          <Card className={cn(
            'mb-6 border shadow-lg overflow-hidden',
            isAllCorrect
              ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-green-200/60'
              : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-blue-200/60'
          )}>
            <CardContent className="py-8 flex flex-col items-center">
              <ScoreRing percentage={result.percentage} />
              <div className="mt-4 text-center">
                <div className={cn(
                  'text-2xl font-bold',
                  isAllCorrect ? 'text-green-700' : 'text-slate-800'
                )}>
                  {result.totalScore}/{result.maxScore}点
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {result.attemptNumber}回目の挑戦
                </div>
                {isAllCorrect && (
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Award className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-bold">全問正解!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 問題ごとの結果 */}
          {sections.map(({ sectionName, details }) => (
            <div key={sectionName} className="mb-6">
              {/* セクションヘッダー */}
              <div className="flex items-center gap-2 mb-3 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/10 to-transparent rounded-r-lg py-2 px-3">
                <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                <h2 className="text-sm font-bold text-slate-700">{sectionName}</h2>
                <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{details.length}問</span>
              </div>

              <div className="space-y-2">
                {details.map(d => (
                  <Card key={d.questionId} className={cn(
                    'border shadow-sm',
                    d.isCorrect === true && 'bg-green-50/50 border-green-200/60',
                    d.isCorrect === false && 'bg-red-50/40 border-red-200/60',
                    d.isCorrect === null && 'bg-slate-50/50 border-slate-200/60'
                  )}>
                    <CardContent className="flex items-start gap-3 p-3">
                      <span className="text-sm font-bold text-blue-700 min-w-[2.5rem] mt-0.5">
                        {d.questionNumber}
                      </span>

                      {/* 正誤アイコン */}
                      <div className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5',
                        d.isCorrect === true && 'bg-green-100',
                        d.isCorrect === false && 'bg-red-100',
                        d.isCorrect === null && 'bg-slate-200'
                      )}>
                        {d.isCorrect === true && <Check className="h-3.5 w-3.5 text-green-600" />}
                        {d.isCorrect === false && <X className="h-3.5 w-3.5 text-red-500" />}
                        {d.isCorrect === null && <Minus className="h-3.5 w-3.5 text-slate-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {d.rawInput ? (
                          <span className="text-sm text-slate-700">{d.rawInput}</span>
                        ) : (
                          <span className="text-sm text-slate-400">未回答</span>
                        )}
                        {d.unitLabel && (
                          <span className="text-sm text-muted-foreground ml-1">{d.unitLabel}</span>
                        )}
                        {result.answersRevealed && 'correctAnswer' in d && (
                          <div className="flex items-center gap-1 mt-1">
                            <Eye className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="text-xs text-blue-600">正答: {d.correctAnswer}</span>
                          </div>
                        )}
                      </div>

                      {/* 正誤バッジ */}
                      <div className="shrink-0">
                        {d.isCorrect === true && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">正解</Badge>
                        )}
                        {d.isCorrect === false && (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">不正解</Badge>
                        )}
                        {d.isCorrect === null && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs">未回答</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* 操作ボタン */}
          <div className="flex flex-wrap items-center gap-3 mt-8 mb-4">
            {canRetry && (
              <>
                <Button
                  onClick={handleRetry}
                  disabled={isPending}
                  className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  もう一度挑戦
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReveal}
                  disabled={isPending}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  解答を見る
                </Button>
              </>
            )}
            <Link href="/student/math-answer">
              <Button variant="ghost" className="gap-1 text-slate-500 hover:text-blue-600">
                <ChevronLeft className="h-4 w-4" />
                一覧に戻る
              </Button>
            </Link>
          </div>

          {errorMessage && (
            <Card className="border-destructive/30 bg-red-50/50 mt-3">
              <CardContent className="p-3">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <BottomNavigation activeTab="home" />
    </>
  )
}

export function MathResultView(props: Props) {
  return (
    <UserProfileProvider>
      <MathResultViewInner {...props} />
    </UserProfileProvider>
  )
}
