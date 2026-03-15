'use client'

import { useState, useCallback, useTransition, useMemo, useEffect } from 'react'
import { NumericInput } from '@/components/math/numeric-input'
import { FractionInput } from '@/components/math/fraction-input'
import { MultiPartInput } from '@/components/math/multi-part-input'
import { SelectionInput } from '@/components/math/selection-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Check, X, Loader2, RotateCcw, RefreshCw, Trophy, Target, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MultiPartConfig, SelectionConfig } from '@/lib/math-answer-utils'
import {
  getExerciseQuestionSet,
  gradeExerciseSection,
  getExerciseAnswerHistory,
  type ExerciseQuestion,
  type ExerciseQuestionSet,
  type ExerciseGradeResult,
} from '@/app/actions/exercise'

// ================================================================
// 型定義
// ================================================================

type NumericState = Record<number, string>
type FractionState = Record<number, { numerator: string; denominator: string }>
type MultiPartState = Record<number, Record<string, string>>
type SelectionState = Record<number, string[]>

interface Props { sessionId: number | null }

interface SectionState {
  name: string
  questions: ExerciseQuestion[]
  isGraded: boolean
  isExpanded: boolean
  score: number
  maxScore: number
  results: Map<number, ExerciseGradeResult>
  lockedQuestionIds: Set<number>
}

const SECTION_THEMES: Record<string, { bg: string; border: string; text: string; badgeText: string; bar: string }> = {
  '反復問題（基本）': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', badgeText: 'Aコース〜', bar: 'bg-blue-400' },
  '反復問題（練習）': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', badgeText: 'Bコース〜', bar: 'bg-purple-400' },
  '実戦演習':         { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', badgeText: 'C/Sコース〜', bar: 'bg-orange-400' },
  'ステップ①':       { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', badgeText: 'Aコース〜', bar: 'bg-blue-400' },
  'ステップ②':       { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', badgeText: 'Bコース〜', bar: 'bg-purple-400' },
  'ステップ③':       { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', badgeText: 'C/Sコース〜', bar: 'bg-orange-400' },
}
const DEFAULT_THEME = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', badgeText: '', bar: 'bg-gray-400' }

// ================================================================
// メインコンポーネント
// ================================================================

export function ExerciseInput({ sessionId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)

  const [questionSet, setQuestionSet] = useState<ExerciseQuestionSet | null>(null)
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([])
  const [sections, setSections] = useState<SectionState[]>([])
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null)

  const [numericAnswers, setNumericAnswers] = useState<NumericState>({})
  const [fractionAnswers, setFractionAnswers] = useState<FractionState>({})
  const [multiPartAnswers, setMultiPartAnswers] = useState<MultiPartState>({})
  const [selectionAnswers, setSelectionAnswers] = useState<SelectionState>({})

  const [error, setError] = useState<string | null>(null)

  const buildSections = useCallback((qs: ExerciseQuestion[]): SectionState[] => {
    const secs: SectionState[] = []
    let cur = ''
    for (const q of qs) {
      if (q.sectionName !== cur) { cur = q.sectionName; secs.push({ name: cur, questions: [], isGraded: false, isExpanded: false, score: 0, maxScore: 0, results: new Map(), lockedQuestionIds: new Set() }) }
      secs[secs.length - 1].questions.push(q)
    }
    if (secs.length > 0) secs[0].isExpanded = true
    return secs
  }, [])

  const allGraded = useMemo(() => sections.length > 0 && sections.every(s => s.isGraded), [sections])

  // データ取得
  useEffect(() => {
    if (!sessionId) return
    const load = async () => {
      setIsLoading(true); setError(null); setAttemptNumber(null)
      setNumericAnswers({}); setFractionAnswers({}); setMultiPartAnswers({}); setSelectionAnswers({})
      try {
        const result = await getExerciseQuestionSet(sessionId, 1)
        if (result.error) { setError(result.error); return }
        setQuestionSet(result.questionSet); setQuestions(result.questions)
        const newSecs = buildSections(result.questions)
        if (result.questionSet) {
          const history = await getExerciseAnswerHistory(result.questionSet.id)
          if (history && history.answers.length > 0) {
            const ids = new Set(history.answers.map(a => a.questionId))
            for (const a of history.answers) { const q = result.questions.find(q => q.id === a.questionId); if (q && a.rawInput) prefillAnswer(q, a.rawInput) }
            if (history.totalScore !== null && history.maxScore !== null) {
              setAttemptNumber(history.attemptNumber)
              for (const sec of newSecs) {
                if (sec.questions.every(q => ids.has(q.id))) {
                  sec.isGraded = true; sec.isExpanded = false; let sc = 0; sec.maxScore = sec.questions.reduce((s, q) => s + q.points, 0)
                  for (const q of sec.questions) { const a = history.answers.find(a => a.questionId === q.id); if (a) { sec.results.set(q.id, { questionId: q.id, isCorrect: a.isCorrect ?? false, answerValue: a.rawInput, correctAnswer: '' }); if (a.isCorrect) sc += q.points } }
                  sec.score = sc
                }
              }
            } else {
              for (const sec of newSecs) {
                if (sec.questions.every(q => ids.has(q.id))) {
                  sec.isGraded = true; sec.isExpanded = false; let sc = 0; sec.maxScore = sec.questions.reduce((s, q) => s + q.points, 0)
                  for (const q of sec.questions) { const a = history.answers.find(a => a.questionId === q.id); if (a) { sec.results.set(q.id, { questionId: q.id, isCorrect: a.isCorrect ?? false, answerValue: a.rawInput, correctAnswer: '' }); if (a.isCorrect) sc += q.points } }
                  sec.score = sc
                }
              }
              const first = newSecs.findIndex(s => !s.isGraded); if (first !== -1) newSecs.forEach((s, i) => { s.isExpanded = i === first })
            }
          }
        }
        setSections(newSecs)
      } catch (e) { console.error(e); setError('データの読み込みに失敗しました') } finally { setIsLoading(false) }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  function prefillAnswer(q: ExerciseQuestion, rawInput: string) {
    switch (q.answerType) {
      case 'numeric': setNumericAnswers(prev => ({ ...prev, [q.id]: rawInput })); break
      case 'fraction': { const [n, d] = rawInput.split('/'); setFractionAnswers(prev => ({ ...prev, [q.id]: { numerator: n || '', denominator: d || '' } })); break }
      case 'multi_part': try { setMultiPartAnswers(prev => ({ ...prev, [q.id]: JSON.parse(rawInput) })) } catch { /* */ } break
      case 'selection': try { setSelectionAnswers(prev => ({ ...prev, [q.id]: JSON.parse(rawInput) })) } catch { /* */ } break
    }
  }

  const buildRawInput = useCallback((q: ExerciseQuestion): string | null => {
    switch (q.answerType) {
      case 'numeric': return numericAnswers[q.id]?.trim() || null
      case 'fraction': { const f = fractionAnswers[q.id]; return f?.numerator?.trim() && f?.denominator?.trim() ? `${f.numerator}/${f.denominator}` : null }
      case 'multi_part': { const v = multiPartAnswers[q.id]; return v && !Object.values(v).every(x => !x?.trim()) ? JSON.stringify(v) : null }
      case 'selection': { const s = selectionAnswers[q.id]; return s && s.length > 0 ? JSON.stringify(s) : null }
      default: return null
    }
  }, [numericAnswers, fractionAnswers, multiPartAnswers, selectionAnswers])

  const toggleSection = useCallback((i: number) => {
    setSections(prev => prev.map((s, j) => ({ ...s, isExpanded: j === i ? !s.isExpanded : s.isExpanded })))
  }, [])

  // セクション採点
  const handleGradeSection = useCallback((idx: number) => {
    if (!questionSet) return
    const section = sections[idx]
    const answers = section.questions
      .filter(q => !section.lockedQuestionIds.has(q.id))
      .map(q => ({ questionId: q.id, rawInput: buildRawInput(q) }))
      .filter((a): a is { questionId: number; rawInput: string } => a.rawInput !== null)
    const sectionQuestionIds = section.questions.filter(q => !section.lockedQuestionIds.has(q.id)).map(q => q.id)
    const ungradedRemaining = sections.filter((s, i) => i !== idx && !s.isGraded).length
    const isFinal = ungradedRemaining === 0

    startTransition(async () => {
      setError(null)
      const result = await gradeExerciseSection({ questionSetId: questionSet.id, sectionQuestionIds, answers, isFinal })
      if (result.error) { setError(result.error); return }

      const resultMap = new Map<number, ExerciseGradeResult>()
      for (const qId of section.lockedQuestionIds) resultMap.set(qId, { questionId: qId, isCorrect: true, answerValue: '', correctAnswer: '' })
      for (const r of result.results) resultMap.set(r.questionId, r)

      const lockedPoints = Array.from(section.lockedQuestionIds).reduce((s, qId) => s + (section.questions.find(q => q.id === qId)?.points ?? 0), 0)

      setSections(prev => {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], isGraded: true, isExpanded: true, score: result.sectionScore + lockedPoints, maxScore: result.sectionMaxScore + lockedPoints, results: resultMap, lockedQuestionIds: new Set() }
        // 次の未採点セクションを自動展開
        if (!isFinal) {
          const next = updated.findIndex((s, i) => i > idx && !s.isGraded)
          if (next !== -1) updated[next] = { ...updated[next], isExpanded: true }
        }
        return updated
      })

      if (isFinal) {
        // attempt_number はサーバーから取得（正確なDB値）
        setAttemptNumber(result.attemptNumber ?? (attemptNumber ?? 0) + 1)
      }
    })
  }, [questionSet, sections, buildRawInput, attemptNumber])

  // セクション単位: 不正解だけやり直す
  const handleSectionRetryIncorrect = useCallback((idx: number) => {
    setSections(prev => {
      const updated = [...prev]
      const sec = updated[idx]
      const locked = new Set<number>()
      for (const q of sec.questions) {
        const r = sec.results.get(q.id)
        if (r?.isCorrect) { locked.add(q.id) } else { clearAnswer(q.id, q.answerType) }
      }
      updated[idx] = { ...sec, isGraded: false, isExpanded: true, score: 0, maxScore: 0, results: new Map(), lockedQuestionIds: locked }
      return updated
    })
    setError(null)
  }, [])

  // セクション単位: 全部やり直す
  const handleSectionRetryAll = useCallback((idx: number) => {
    setSections(prev => {
      const updated = [...prev]
      const sec = updated[idx]
      for (const q of sec.questions) clearAnswer(q.id, q.answerType)
      updated[idx] = { ...sec, isGraded: false, isExpanded: true, score: 0, maxScore: 0, results: new Map(), lockedQuestionIds: new Set() }
      return updated
    })
    setError(null)
  }, [])

  function clearAnswer(qId: number, t: string) {
    switch (t) {
      case 'numeric': setNumericAnswers(prev => { const n = { ...prev }; delete n[qId]; return n }); break
      case 'fraction': setFractionAnswers(prev => { const n = { ...prev }; delete n[qId]; return n }); break
      case 'multi_part': setMultiPartAnswers(prev => { const n = { ...prev }; delete n[qId]; return n }); break
      case 'selection': setSelectionAnswers(prev => { const n = { ...prev }; delete n[qId]; return n }); break
    }
  }

  // ================================================================
  // レンダリング
  // ================================================================

  // 総合スコア: score は採点済みセクションの合算、max は常に全問題のpoints合計
  const computedTotal = useMemo(() => {
    const score = sections.reduce((s, sec) => s + sec.score, 0)
    const max = sections.reduce((s, sec) => s + sec.questions.reduce((sum, q) => sum + q.points, 0), 0)
    return { score, max }
  }, [sections])

  if (!sessionId) return <div className="text-center py-12 text-gray-400"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>学習回を選択してください</p></div>
  if (isLoading) return <div className="flex flex-col items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" /><span className="text-gray-500 text-sm">問題を読み込んでいます...</span></div>
  if (!questionSet || questions.length === 0) return <div className="text-center py-12"><BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-4" /><p className="text-gray-400 text-sm">この回の演習問題集データはまだ準備されていません</p></div>

  const isPerfect = allGraded && computedTotal.score === computedTotal.max

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-900">{questionSet.title}</h3>

      {/* 総合スコア（全セクション完了後 — セクションscoreの合算） */}
      {allGraded && (
        <div className={cn("rounded-2xl p-5 text-center", isPerfect ? "bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 border-2 border-yellow-300 shadow-md" : "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-2 border-blue-300 shadow-md")}>
          {isPerfect && <Trophy className="h-10 w-10 text-yellow-500 mx-auto mb-2" />}
          <div className="text-4xl font-extrabold text-gray-900">{computedTotal.score}<span className="text-xl text-gray-400 font-normal">/{computedTotal.max}</span></div>
          <div className="text-sm text-gray-600 mt-1 font-medium">
            正答率 {computedTotal.max > 0 ? Math.round((computedTotal.score / computedTotal.max) * 100) : 0}%
            {attemptNumber && <span>（{attemptNumber}回目）</span>}
          </div>
          {isPerfect && <p className="text-sm text-yellow-700 mt-2 font-bold">全問正解！すばらしい！</p>}
        </div>
      )}

      {/* 進行中のスコア（一部セクション採点済みだが全セクション未完了） */}
      {!allGraded && sections.some(s => s.isGraded) && (() => {
        const gradedSections = sections.filter(s => s.isGraded)
        const pct = computedTotal.max > 0 ? Math.round((computedTotal.score / computedTotal.max) * 100) : 0
        return (
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">採点済み {gradedSections.length}/{sections.length} セクション</span>
              <span className="text-xs text-gray-500">{pct}%</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{computedTotal.score}</span>
              <span className="text-lg text-gray-400 font-normal mb-0.5">/ {computedTotal.max}点</span>
            </div>
            <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })()}

      {error && <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">{error}</div>}

      {/* ===== セクション一覧 ===== */}
      {sections.map((section, idx) => {
        const theme = SECTION_THEMES[section.name] || DEFAULT_THEME
        const editableQs = section.questions.filter(q => !section.lockedQuestionIds.has(q.id))
        const sectionAnswered = editableQs.filter(q => buildRawInput(q) !== null).length
        const sectionIncorrect = Array.from(section.results.values()).filter(r => !r.isCorrect).length

        return (
          <div key={section.name} className="space-y-2">
            {/* セクションヘッダー */}
            <button onClick={() => toggleSection(idx)} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left", theme.bg, theme.border, section.isExpanded && "shadow-sm")}>
              <div className={cn("w-1.5 h-8 rounded-full flex-shrink-0", theme.bar)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn("font-bold text-sm", theme.text)}>{section.name}</h4>
                  {theme.badgeText && <Badge variant="outline" className="text-[10px] font-bold border-current px-1.5 py-0.5">{theme.badgeText}</Badge>}
                </div>
                {section.isGraded ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-sm font-extrabold", section.score === section.maxScore ? "text-green-600" : theme.text)}>
                      {section.score}/{section.maxScore}点
                    </span>
                    <span className="text-xs text-gray-500">
                      （正答率 {section.maxScore > 0 ? Math.round((section.score / section.maxScore) * 100) : 0}%）
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[120px]">
                      <div className={cn("h-full rounded-full transition-all", theme.bar)} style={{ width: `${editableQs.length > 0 ? (sectionAnswered / editableQs.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {sectionAnswered}/{editableQs.length}問回答
                    </span>
                  </div>
                )}
              </div>
              {section.isGraded && <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", section.score === section.maxScore ? "bg-green-500" : "bg-blue-500")}><Check className="h-4 w-4 text-white" strokeWidth={3} /></div>}
              {section.isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />}
            </button>

            {/* セクション内容 */}
            {section.isExpanded && (
              <div className="space-y-2 pl-2">
                {/* 採点済み: セクション単位リトライボタン */}
                {section.isGraded && (
                  <div className="flex gap-2">
                    {sectionIncorrect > 0 && (
                      <Button onClick={() => handleSectionRetryIncorrect(idx)} variant="outline" className="flex-1 h-10 text-xs font-bold border-2 border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl">
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />不正解だけやり直す（{sectionIncorrect}問）
                      </Button>
                    )}
                    <Button onClick={() => handleSectionRetryAll(idx)} variant="outline" className={cn("h-10 text-xs font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl", sectionIncorrect > 0 ? "px-3" : "flex-1")}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />全部やり直す
                    </Button>
                  </div>
                )}

                {/* 問題カード */}
                {section.questions.map(question => {
                  const result = section.results.get(question.id)
                  const locked = section.lockedQuestionIds.has(question.id)
                  const disabled = section.isGraded || locked
                  const mpConfig = question.answerConfig as MultiPartConfig | null
                  const selConfig = question.answerConfig as SelectionConfig | null

                  return (
                    <div key={question.id} className={cn("rounded-xl border-2 p-3.5 transition-all",
                      section.isGraded && result?.isCorrect && "border-green-300 bg-green-50/70",
                      section.isGraded && result && !result.isCorrect && "border-red-300 bg-red-50/70",
                      locked && !section.isGraded && "border-green-200 bg-green-50/40",
                      !section.isGraded && !locked && "border-gray-200 bg-white",
                    )}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-2 w-6">
                          {section.isGraded && result && (result.isCorrect
                            ? <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm"><Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /></div>
                            : <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-sm"><X className="h-3.5 w-3.5 text-white" strokeWidth={3} /></div>
                          )}
                          {locked && !section.isGraded && <div className="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center shadow-sm"><Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn(disabled && "pointer-events-none", locked && "opacity-60")}>
                            {question.answerType === 'numeric' && <NumericInput questionNumber={question.questionNumber} value={numericAnswers[question.id] || ''} onChange={v => setNumericAnswers(p => ({ ...p, [question.id]: v }))} unitLabel={question.unitLabel ?? undefined} disabled={disabled} />}
                            {question.answerType === 'fraction' && <FractionInput questionNumber={question.questionNumber} numerator={fractionAnswers[question.id]?.numerator || ''} denominator={fractionAnswers[question.id]?.denominator || ''} onNumeratorChange={v => setFractionAnswers(p => ({ ...p, [question.id]: { ...p[question.id], numerator: v } }))} onDenominatorChange={v => setFractionAnswers(p => ({ ...p, [question.id]: { ...p[question.id], denominator: v } }))} disabled={disabled} />}
                            {question.answerType === 'multi_part' && mpConfig && <MultiPartInput questionNumber={question.questionNumber} template={mpConfig.template} slots={mpConfig.slots} values={multiPartAnswers[question.id] || {}} onChange={(l, v) => setMultiPartAnswers(p => ({ ...p, [question.id]: { ...(p[question.id] || {}), [l]: v } }))} disabled={disabled} />}
                            {question.answerType === 'selection' && selConfig && <SelectionInput questionNumber={question.questionNumber} options={selConfig.options} selectedValues={selectionAnswers[question.id] || []} unitLabel={selConfig.unit ?? undefined} onToggle={v => setSelectionAnswers(p => { const c = p[question.id] || []; return { ...p, [question.id]: c.includes(v) ? c.filter(x => x !== v) : [...c, v] } })} disabled={disabled} />}
                          </div>
                          {section.isGraded && result && !result.isCorrect && result.correctAnswer && (
                            <div className="mt-2.5 px-3 py-2 bg-red-100 rounded-lg border border-red-200">
                              <span className="text-xs text-red-500 font-medium">正解: </span>
                              <span className="text-sm font-bold text-red-700">{formatCorrectAnswer(result.correctAnswer, question)}</span>
                            </div>
                          )}
                          {locked && !section.isGraded && <p className="text-xs text-green-600 font-medium mt-1.5">正解済み</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* セクション採点ボタン */}
                {!section.isGraded && (
                  <Button onClick={() => handleGradeSection(idx)} disabled={isPending} className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg rounded-xl mt-1" size="lg">
                    {isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />採点中...</> : <><Check className="h-5 w-5 mr-2" />{section.name}を採点する（{sectionAnswered}/{editableQs.length}問回答済み）</>}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatCorrectAnswer(correctAnswer: string, question: ExerciseQuestion): string {
  if (question.answerType === 'multi_part') {
    try { const v = JSON.parse(correctAnswer) as Record<string, string>; return Object.entries(v).map(([k, v]) => `${k}: ${v}`).join(', ') } catch { return correctAnswer }
  }
  return correctAnswer
}
