'use client'

import { useState, useCallback, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NumericInput } from '@/components/math/numeric-input'
import { FractionInput } from '@/components/math/fraction-input'
import { MultiPartInput } from '@/components/math/multi-part-input'
import { SelectionInput } from '@/components/math/selection-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BottomNavigation } from '@/components/bottom-navigation'
import { UserProfileHeader } from '@/components/common/user-profile-header'
import { PageHeader } from '@/components/common/page-header'
import { UserProfileProvider } from '@/lib/hooks/use-user-profile'
import { Calculator, BookOpen, ChevronLeft, Save, ArrowRight, Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  saveMathDraftAnswers,
  submitAndGradeMathAnswers,
  type MathQuestionForUI,
} from '@/app/actions/math-answer'

interface Props {
  questionSetId: number
  questionSetTitle: string
  questions: MathQuestionForUI[]
  draft: {
    answerSessionId: number
    attemptNumber: number
    answers: { questionId: number; rawInput: string; isCorrect: boolean | null }[]
  } | null
}

type AnswerState = Record<number, string>     // questionId → rawInput
type FractionState = Record<number, { numerator: string; denominator: string }>
type MultiPartState = Record<number, Record<string, string>>
type SelectionState = Record<number, string[]>

const HELP_TEXT: Record<string, string> = {
  numeric: '数値を入力（小数も可）',
  fraction: '分子と分母をそれぞれ入力',
  selection: '正しい選択肢をタップ',
  multi_part: '各欄に数値を入力',
}

function MathAnswerFormInner({ questionSetId, questionSetTitle, questions, draft }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // answer_type ごとの状態を管理
  const [numericAnswers, setNumericAnswers] = useState<AnswerState>(() => {
    const initial: AnswerState = {}
    if (draft) {
      for (const a of draft.answers) {
        const q = questions.find(q => q.id === a.questionId)
        if (q?.answerType === 'numeric') initial[a.questionId] = a.rawInput
      }
    }
    return initial
  })

  const [fractionAnswers, setFractionAnswers] = useState<FractionState>(() => {
    const initial: FractionState = {}
    if (draft) {
      for (const a of draft.answers) {
        const q = questions.find(q => q.id === a.questionId)
        if (q?.answerType === 'fraction') {
          const [num, den] = a.rawInput.split('/')
          initial[a.questionId] = { numerator: num || '', denominator: den || '' }
        }
      }
    }
    return initial
  })

  const [multiPartAnswers, setMultiPartAnswers] = useState<MultiPartState>(() => {
    const initial: MultiPartState = {}
    if (draft) {
      for (const a of draft.answers) {
        const q = questions.find(q => q.id === a.questionId)
        if (q?.answerType === 'multi_part') {
          try {
            initial[a.questionId] = JSON.parse(a.rawInput)
          } catch {
            initial[a.questionId] = {}
          }
        }
      }
    }
    return initial
  })

  const [selectionAnswers, setSelectionAnswers] = useState<SelectionState>(() => {
    const initial: SelectionState = {}
    if (draft) {
      for (const a of draft.answers) {
        const q = questions.find(q => q.id === a.questionId)
        if (q?.answerType === 'selection') {
          try {
            initial[a.questionId] = JSON.parse(a.rawInput)
          } catch {
            initial[a.questionId] = []
          }
        }
      }
    }
    return initial
  })

  const [answerSessionId, setAnswerSessionId] = useState<number>(draft?.answerSessionId ?? 0)
  const [saveMessage, setSaveMessage] = useState<string>('')

  // ロック判定（リトライ時に正解済みの問題）
  const lockedQuestionIds = new Set(
    draft?.answers.filter(a => a.isCorrect === true).map(a => a.questionId) ?? []
  )

  // 進捗計算
  const progress = useMemo(() => {
    let answered = 0
    for (const q of questions) {
      if (lockedQuestionIds.has(q.id)) {
        answered++
        continue
      }
      switch (q.answerType) {
        case 'numeric':
          if (numericAnswers[q.id]) answered++
          break
        case 'fraction':
          if (fractionAnswers[q.id]?.numerator && fractionAnswers[q.id]?.denominator) answered++
          break
        case 'multi_part':
          if (multiPartAnswers[q.id] && Object.values(multiPartAnswers[q.id]).some(v => v)) answered++
          break
        case 'selection':
          if (selectionAnswers[q.id]?.length > 0) answered++
          break
      }
    }
    const total = questions.length
    return { answered, total, percentage: total > 0 ? Math.round((answered / total) * 100) : 0 }
  }, [questions, numericAnswers, fractionAnswers, multiPartAnswers, selectionAnswers, lockedQuestionIds])

  // 全解答を統合して配列化
  const collectAnswers = useCallback(() => {
    return questions.map(q => {
      let rawInput: string | null = null
      switch (q.answerType) {
        case 'numeric':
          rawInput = numericAnswers[q.id] || null
          break
        case 'fraction': {
          const f = fractionAnswers[q.id]
          if (f?.numerator || f?.denominator) {
            rawInput = `${f.numerator || ''}/${f.denominator || ''}`
          }
          break
        }
        case 'multi_part': {
          const mp = multiPartAnswers[q.id]
          if (mp && Object.values(mp).some(v => v)) {
            rawInput = JSON.stringify(mp)
          }
          break
        }
        case 'selection': {
          const sel = selectionAnswers[q.id]
          if (sel && sel.length > 0) {
            rawInput = JSON.stringify(sel)
          }
          break
        }
      }
      return { questionId: q.id, rawInput }
    })
  }, [questions, numericAnswers, fractionAnswers, multiPartAnswers, selectionAnswers])

  // 途中保存
  const handleSave = useCallback(() => {
    startTransition(async () => {
      setSaveMessage('')
      const answers = collectAnswers()
      const result = await saveMathDraftAnswers({ questionSetId, answers })
      if (result.error) {
        setSaveMessage(result.error)
      } else {
        setAnswerSessionId(result.answerSessionId)
        setSaveMessage(`${result.savedCount}問を保存しました`)
        setTimeout(() => setSaveMessage(''), 3000)
      }
    })
  }, [collectAnswers, questionSetId])

  // 採点
  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      setSaveMessage('')

      // まず保存
      const answers = collectAnswers()
      const saveResult = await saveMathDraftAnswers({ questionSetId, answers })
      if (saveResult.error) {
        setSaveMessage(saveResult.error)
        return
      }

      const sessionId = saveResult.answerSessionId || answerSessionId
      if (!sessionId) {
        setSaveMessage('セッションが見つかりません')
        return
      }

      // 採点
      const gradeResult = await submitAndGradeMathAnswers({ answerSessionId: sessionId })
      if (gradeResult.error) {
        setSaveMessage(gradeResult.error)
        return
      }

      router.push(`/student/math-answer/${questionSetId}/result`)
    })
  }, [collectAnswers, questionSetId, answerSessionId, router])

  // セクション単位でグループ化
  const sections = groupBySection(questions)
  const attemptNumber = draft?.attemptNumber ?? 1
  const subtitle = `${questions.length}問${attemptNumber > 1 ? ` | ${attemptNumber}回目の挑戦` : ''}`

  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Calculator}
          title={questionSetTitle}
          subtitle={subtitle}
          variant="student"
        />

        {/* 戻るリンク */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <Link
            href="/student/math-answer"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            一覧へ
          </Link>
        </div>

        {/* 進捗バー (sticky) */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                入力済み {progress.answered}/{progress.total}問
              </span>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <span className="text-xs font-bold text-blue-600">{progress.percentage}%</span>
            </div>
          </div>
        </div>

        {/* フォーム本体 */}
        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
          {sections.map(({ sectionName, questions: sectionQuestions }) => (
            <div key={sectionName} className="mb-8">
              {/* セクションヘッダー */}
              <div className="flex items-center gap-2 mb-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/10 to-transparent rounded-r-lg py-2 px-3">
                <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                <h2 className="text-sm font-bold text-slate-700">{sectionName}</h2>
                <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{sectionQuestions.length}問</span>
              </div>

              <div className="space-y-3">
                {sectionQuestions.map((q, idx) => {
                  const isLocked = lockedQuestionIds.has(q.id)
                  const showHelp = !isLocked && (idx === 0 || sectionQuestions[idx - 1]?.answerType !== q.answerType)

                  return (
                    <Card key={q.id} className={cn(
                      'bg-white/80 backdrop-blur-sm border shadow-sm',
                      isLocked && 'bg-green-50/50 border-green-200/60'
                    )}>
                      <CardContent className="p-4">
                        {showHelp && (
                          <div className="flex items-center gap-1.5 mb-2.5 text-xs text-slate-400">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>{HELP_TEXT[q.answerType] ?? ''}</span>
                          </div>
                        )}

                        {isLocked ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-700 min-w-[2.5rem]">
                              {q.questionNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                                <Check className="h-3 w-3 text-green-600" />
                              </div>
                              <span className="text-sm text-slate-700">
                                {draft?.answers.find(a => a.questionId === q.id)?.rawInput}
                              </span>
                              {q.unitLabel && (
                                <span className="text-sm text-muted-foreground">{q.unitLabel}</span>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200 text-xs">
                              正解済み
                            </Badge>
                          </div>
                        ) : (
                          <>
                            {q.answerType === 'numeric' && (
                              <NumericInput
                                questionNumber={q.questionNumber}
                                unitLabel={q.unitLabel ?? undefined}
                                value={numericAnswers[q.id] || ''}
                                onChange={(v) => setNumericAnswers(prev => ({ ...prev, [q.id]: v }))}
                              />
                            )}

                            {q.answerType === 'fraction' && (
                              <FractionInput
                                questionNumber={q.questionNumber}
                                numerator={fractionAnswers[q.id]?.numerator || ''}
                                denominator={fractionAnswers[q.id]?.denominator || ''}
                                onNumeratorChange={(v) =>
                                  setFractionAnswers(prev => ({
                                    ...prev,
                                    [q.id]: { ...prev[q.id], numerator: v, denominator: prev[q.id]?.denominator || '' },
                                  }))
                                }
                                onDenominatorChange={(v) =>
                                  setFractionAnswers(prev => ({
                                    ...prev,
                                    [q.id]: { numerator: prev[q.id]?.numerator || '', denominator: v },
                                  }))
                                }
                              />
                            )}

                            {q.answerType === 'multi_part' && (() => {
                              const config = q.answerConfig as { template: string; slots: { label: string; unit: string }[] } | null
                              if (!config) return null
                              return (
                                <MultiPartInput
                                  questionNumber={q.questionNumber}
                                  template={config.template}
                                  slots={config.slots}
                                  values={multiPartAnswers[q.id] || {}}
                                  onChange={(label, value) =>
                                    setMultiPartAnswers(prev => ({
                                      ...prev,
                                      [q.id]: { ...prev[q.id], [label]: value },
                                    }))
                                  }
                                />
                              )
                            })()}

                            {q.answerType === 'selection' && (() => {
                              const config = q.answerConfig as { options: string[]; unit: string | null } | null
                              if (!config) return null
                              return (
                                <SelectionInput
                                  questionNumber={q.questionNumber}
                                  options={config.options}
                                  selectedValues={selectionAnswers[q.id] || []}
                                  unitLabel={config.unit ?? undefined}
                                  onToggle={(value) =>
                                    setSelectionAnswers(prev => {
                                      const current = prev[q.id] || []
                                      const next = current.includes(value)
                                        ? current.filter(v => v !== value)
                                        : [...current, value]
                                      return { ...prev, [q.id]: next }
                                    })
                                  }
                                />
                              )
                            })()}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}

          {/* 操作ボタン (sticky) */}
          <div className="sticky bottom-16 z-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-3 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              途中保存
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-2"
            >
              {isPending ? '処理中...' : (
                <>採点する<ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>

        {/* 保存メッセージ (toast) */}
        {saveMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-slate-700">{saveMessage}</span>
            </div>
          </div>
        )}
      </div>
      <BottomNavigation activeTab="home" />
    </>
  )
}

export function MathAnswerForm(props: Props) {
  return (
    <UserProfileProvider>
      <MathAnswerFormInner {...props} />
    </UserProfileProvider>
  )
}

// セクション名でグループ化
function groupBySection(questions: MathQuestionForUI[]) {
  const sections: { sectionName: string; questions: MathQuestionForUI[] }[] = []
  let currentSection = ''

  for (const q of questions) {
    if (q.sectionName !== currentSection) {
      currentSection = q.sectionName
      sections.push({ sectionName: currentSection, questions: [] })
    }
    sections[sections.length - 1].questions.push(q)
  }

  return sections
}
