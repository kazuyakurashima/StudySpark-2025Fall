'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { NumericInput } from '@/components/math/numeric-input'
import { FractionInput } from '@/components/math/fraction-input'
import { MultiPartInput } from '@/components/math/multi-part-input'
import { SelectionInput } from '@/components/math/selection-input'
import { Button } from '@/components/ui/button'
import {
  saveMathDraftAnswers,
  submitAndGradeMathAnswers,
  type MathQuestionForUI,
} from '@/app/actions/math-answer'

interface Props {
  questionSetId: number
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

export function MathAnswerForm({ questionSetId, questions, draft }: Props) {
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

  return (
    <div>
      {sections.map(({ sectionName, questions: sectionQuestions }) => (
        <div key={sectionName} className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">
            {sectionName}
          </h2>
          <div className="space-y-4">
            {sectionQuestions.map(q => {
              const isLocked = lockedQuestionIds.has(q.id)

              if (isLocked) {
                // 正解済み: 読み取り専用表示
                const draftAnswer = draft?.answers.find(a => a.questionId === q.id)
                return (
                  <div key={q.id} className="flex items-center gap-2 opacity-70">
                    <span className="text-sm font-medium text-muted-foreground min-w-[2.5rem]">
                      {q.questionNumber}
                    </span>
                    <span className="text-green-600">✅</span>
                    <span className="text-sm">{draftAnswer?.rawInput}</span>
                    {q.unitLabel && (
                      <span className="text-sm text-muted-foreground">{q.unitLabel}</span>
                    )}
                  </div>
                )
              }

              switch (q.answerType) {
                case 'numeric':
                  return (
                    <NumericInput
                      key={q.id}
                      questionNumber={q.questionNumber}
                      unitLabel={q.unitLabel ?? undefined}
                      value={numericAnswers[q.id] || ''}
                      onChange={(v) => setNumericAnswers(prev => ({ ...prev, [q.id]: v }))}
                    />
                  )

                case 'fraction':
                  return (
                    <FractionInput
                      key={q.id}
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
                  )

                case 'multi_part': {
                  const config = q.answerConfig as { template: string; slots: { label: string; unit: string }[] } | null
                  if (!config) return null
                  return (
                    <MultiPartInput
                      key={q.id}
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
                }

                case 'selection': {
                  const config = q.answerConfig as { options: string[]; unit: string | null } | null
                  if (!config) return null
                  return (
                    <SelectionInput
                      key={q.id}
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
                }

                default:
                  return null
              }
            })}
          </div>
        </div>
      ))}

      {/* 操作ボタン */}
      <div className="flex items-center gap-3 mt-8 mb-20">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isPending}
        >
          途中保存
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? '処理中...' : '採点する'}
        </Button>
      </div>

      {saveMessage && (
        <p className="text-sm text-muted-foreground fixed bottom-20 left-1/2 -translate-x-1/2 bg-background border rounded-md px-4 py-2 shadow-md">
          {saveMessage}
        </p>
      )}
    </div>
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
