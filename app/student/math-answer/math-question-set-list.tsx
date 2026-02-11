'use client'

import Link from 'next/link'
import { Calculator, BookOpen, ArrowRight, Eye, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BottomNavigation } from '@/components/bottom-navigation'
import { UserProfileHeader } from '@/components/common/user-profile-header'
import { PageHeader } from '@/components/common/page-header'
import { UserProfileProvider } from '@/lib/hooks/use-user-profile'
import type { MathQuestionSetSummary } from '@/app/actions/math-answer'
import { cn } from '@/lib/utils'

interface Props {
  questionSets: MathQuestionSetSummary[]
  error?: string
}

function MathQuestionSetListInner({ questionSets, error }: Props) {
  const groups = groupBySession(questionSets)

  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Calculator}
          title="算数プリント"
          subtitle="解答を入力して自動採点"
          variant="student"
        />

        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
          {error ? (
            <Card className="border-destructive/30 bg-red-50/50">
              <CardContent className="p-6 text-center">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </CardContent>
            </Card>
          ) : questionSets.length === 0 ? (
            <Card className="bg-white/80">
              <CardContent className="p-8 text-center">
                <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">利用可能な問題セットがありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groups.map(({ sessionNumber, sets }) => (
                <div key={sessionNumber}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-700">第{sessionNumber}回</h2>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {sets.map((qs) => {
                      const isAllCorrect = qs.score?.percentage === 100
                      const displayLabel = qs.displayOrder === 1 ? '①' : '②'

                      return (
                        <Link key={qs.id} href={`/student/math-answer/${qs.id}`}>
                          <Card className={cn(
                            'bg-white/90 backdrop-blur-sm border shadow-md hover:shadow-lg transition-all duration-300 group cursor-pointer',
                            qs.status === 'graded' && isAllCorrect && 'border-green-200/60 bg-gradient-to-br from-green-50/40 to-emerald-50/40',
                            qs.status === 'graded' && !isAllCorrect && 'border-orange-200/60 bg-gradient-to-br from-orange-50/30 to-amber-50/30',
                            qs.status === 'in_progress' && 'border-blue-200/60 bg-gradient-to-br from-blue-50/30 to-indigo-50/30',
                            qs.status === 'not_started' && 'border-slate-200/60'
                          )}>
                            <CardContent className="flex items-center gap-3 p-4">
                              <div className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-xl text-base font-bold shrink-0',
                                qs.status === 'graded' && isAllCorrect && 'bg-green-100 text-green-700',
                                qs.status === 'graded' && !isAllCorrect && 'bg-orange-100 text-orange-700',
                                qs.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                                qs.status === 'not_started' && 'bg-slate-100 text-slate-600'
                              )}>
                                {displayLabel}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-sm truncate">{qs.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500">{qs.questionCount}問</span>
                                  {qs.score && (
                                    <div className="h-1.5 flex-1 max-w-[80px] bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          'h-full rounded-full transition-all',
                                          isAllCorrect ? 'bg-green-500' : 'bg-orange-500'
                                        )}
                                        style={{ width: `${qs.score.percentage}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                {qs.status === 'not_started' && (
                                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs">
                                    未着手
                                  </Badge>
                                )}
                                {qs.status === 'in_progress' && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                    入力中
                                  </Badge>
                                )}
                                {qs.status === 'graded' && qs.score && (
                                  <>
                                    <Badge variant="outline" className={cn(
                                      'text-xs',
                                      isAllCorrect
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-orange-50 text-orange-700 border-orange-200'
                                    )}>
                                      {isAllCorrect ? (
                                        <span className="flex items-center gap-1"><Check className="h-3 w-3" />全問正解</span>
                                      ) : (
                                        `${qs.score.percentage}%`
                                      )}
                                    </Badge>
                                    {qs.answersRevealed && (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                        <Eye className="h-2.5 w-2.5" />解答済み
                                      </span>
                                    )}
                                    {!qs.answersRevealed && qs.remainingCount && qs.remainingCount > 0 && (
                                      <span className="text-[10px] text-orange-500">残り{qs.remainingCount}問</span>
                                    )}
                                  </>
                                )}
                              </div>

                              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNavigation activeTab="home" />
    </>
  )
}

export function MathQuestionSetList(props: Props) {
  return (
    <UserProfileProvider>
      <MathQuestionSetListInner {...props} />
    </UserProfileProvider>
  )
}

function groupBySession(sets: MathQuestionSetSummary[]) {
  const map = new Map<number, MathQuestionSetSummary[]>()
  for (const s of sets) {
    const arr = map.get(s.sessionNumber) || []
    arr.push(s)
    map.set(s.sessionNumber, arr)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([sessionNumber, sets]) => ({ sessionNumber, sets }))
}
