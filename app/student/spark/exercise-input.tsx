'use client'

import { useState, useCallback, useTransition, useMemo, useEffect } from 'react'
import { NumericInput } from '@/components/math/numeric-input'
import { FractionInput } from '@/components/math/fraction-input'
import { MultiPartInput } from '@/components/math/multi-part-input'
import { SelectionInput } from '@/components/math/selection-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { VoiceInputButton } from '@/components/ui/voice-input-button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { BookOpen, Check, X, Loader2, RotateCcw, RefreshCw, Trophy, ChevronDown, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MultiPartConfig, SelectionConfig } from '@/lib/math-answer-utils'
import {
  loadExerciseBundle,
  gradeExerciseSection,
  type ExerciseQuestion,
  type ExerciseQuestionSet,
  type ExerciseGradeResult,
} from '@/app/actions/exercise'
import { saveExerciseReflection } from '@/app/actions/exercise-reflection'
import { MAX_REFLECTIONS } from '@/lib/constants/exercise'
import { fetchSSE } from '@/lib/sse/client'
import { useUserProfile } from '@/lib/hooks/use-user-profile'
import { getAvatarUrl } from '@/lib/utils/avatar'

// ================================================================
// 型定義
// ================================================================

type NumericState = Record<number, string>
type FractionState = Record<number, { numerator: string; denominator: string }>
type MultiPartState = Record<number, Record<string, string>>
type SelectionState = Record<number, string[]>

interface Props { sessionId: number | null }

interface PreviousReflection {
  reflectionText: string
  feedbackText: string
  attemptNumber: number
}

interface SectionState {
  name: string
  questions: ExerciseQuestion[]
  isGraded: boolean
  isExpanded: boolean
  score: number
  maxScore: number
  results: Map<number, ExerciseGradeResult>
  lockedQuestionIds: Set<number>
  reflectionText: string
  reflectionSaved: boolean
  reflectionId: number | null      // 保存後のDB ID（フィードバック生成に使用）
  answerSessionId: number | null
  feedbackText: string             // AIコーチフィードバック
  feedbackLoading: boolean         // フィードバック生成中
  previousReflections: PreviousReflection[]  // 過去のリトライ分
}

// カラー体系:
//   ブランド色 = 青（ヘッダー・ボタン・カード・振り返り）
//   意味色 = 緑（正解）/ 赤（不正解）のみ
//   セクション区別 = ラベルテキスト + 罫線太さで表現（色ではなく）

// セクションヘッダーのラベル（全て青系統、ラベルで区別）
const SECTION_LABELS: Record<string, string> = {
  '反復問題（基本）': 'Aコース〜',
  '反復問題（練習）': 'Bコース〜',
  '実戦演習': 'C/Sコース〜',
  'ステップ①': 'Aコース〜',
  'ステップ②': 'Bコース〜',
  'ステップ③': 'C/Sコース〜',
}

// ================================================================
// メインコンポーネント
// ================================================================

export function ExerciseInput({ sessionId }: Props) {
  const { profile } = useUserProfile()
  const studentAvatarUrl = getAvatarUrl(profile?.avatar_id, 'student')

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
      if (q.sectionName !== cur) { cur = q.sectionName; secs.push({ name: cur, questions: [], isGraded: false, isExpanded: false, score: 0, maxScore: 0, results: new Map(), lockedQuestionIds: new Set(), reflectionText: '', reflectionSaved: false, reflectionId: null, answerSessionId: null, feedbackText: '', feedbackLoading: false, previousReflections: [] }) }
      secs[secs.length - 1].questions.push(q)
    }
    if (secs.length === 1) secs[0].isExpanded = true
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
        // 統合Server Action: 1回の呼び出しで全データ取得
        const bundle = await loadExerciseBundle(sessionId, 1)
        if (bundle.error) { setError(bundle.error); return }
        setQuestionSet(bundle.questionSet); setQuestions(bundle.questions)
        const newSecs = buildSections(bundle.questions)

        if (bundle.history && bundle.history.answers.length > 0) {
          const { history, reflections, feedbacks, reflectionHistory } = bundle
          const ids = new Set(history.answers.map(a => a.questionId))
          for (const a of history.answers) { const q = bundle.questions.find(q => q.id === a.questionId); if (q && a.rawInput) prefillAnswer(q, a.rawInput) }

          // 過去セッション振り返りを previousReflections に分配
          const prevBySection = new Map<string, PreviousReflection[]>()
          for (const item of reflectionHistory) {
            if (item.sessionAttemptNumber === history.attemptNumber) continue
            const arr = prevBySection.get(item.sectionName) || []
            arr.push({ reflectionText: item.reflectionText, feedbackText: item.feedbackText || '', attemptNumber: item.sessionAttemptNumber })
            prevBySection.set(item.sectionName, arr)
          }

          const reflectionMap = new Map(reflections.map(r => [r.sectionName, r]))
          const feedbackMap = new Map(feedbacks.map(f => [f.sectionName, f.feedbackText]))

          if (history.totalScore !== null && history.maxScore !== null) {
            setAttemptNumber(history.attemptNumber)
          }

          for (const sec of newSecs) {
            if (sec.questions.every(q => ids.has(q.id))) {
              sec.isGraded = true; sec.isExpanded = false; let sc = 0; sec.maxScore = sec.questions.reduce((s, q) => s + q.points, 0)
              sec.answerSessionId = history.answerSessionId
              sec.previousReflections = prevBySection.get(sec.name) || []
              const ref = reflectionMap.get(sec.name)
              if (ref) { sec.reflectionText = ref.reflectionText; sec.reflectionSaved = true; sec.reflectionId = ref.id }
              const fb = feedbackMap.get(sec.name)
              if (fb) { sec.feedbackText = fb }
              for (const q of sec.questions) { const a = history.answers.find(a => a.questionId === q.id); if (a) { sec.results.set(q.id, { questionId: q.id, isCorrect: a.isCorrect ?? false, answerValue: a.rawInput, correctAnswer: '' }); if (a.isCorrect) sc += q.points } }
              sec.score = sc
            }
          }

          // in_progress: 未採点セクションが1つだけなら展開
          if (history.totalScore === null || history.maxScore === null) {
            const ungradedCount = newSecs.filter(s => !s.isGraded).length
            if (ungradedCount === 1) { const first = newSecs.findIndex(s => !s.isGraded); if (first !== -1) newSecs[first].isExpanded = true }
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

  const handleGradeSection = useCallback((idx: number) => {
    if (!questionSet) return
    const section = sections[idx]
    const answers = section.questions.filter(q => !section.lockedQuestionIds.has(q.id)).map(q => ({ questionId: q.id, rawInput: buildRawInput(q) })).filter((a): a is { questionId: number; rawInput: string } => a.rawInput !== null)
    const sectionQuestionIds = section.questions.filter(q => !section.lockedQuestionIds.has(q.id)).map(q => q.id)
    const isFinal = sections.filter((s, i) => i !== idx && !s.isGraded).length === 0

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
        updated[idx] = { ...updated[idx], isGraded: true, isExpanded: true, score: result.sectionScore + lockedPoints, maxScore: result.sectionMaxScore + lockedPoints, results: resultMap, lockedQuestionIds: new Set(), answerSessionId: result.answerSessionId, reflectionText: '', reflectionSaved: false }
        if (!isFinal) { const next = updated.findIndex((s, i) => i > idx && !s.isGraded); if (next !== -1) updated[next] = { ...updated[next], isExpanded: true } }
        return updated
      })
      if (isFinal) setAttemptNumber(result.attemptNumber ?? (attemptNumber ?? 0) + 1)
    })
  }, [questionSet, sections, buildRawInput, attemptNumber])

  const handleSectionRetryIncorrect = useCallback((idx: number) => {
    setSections(prev => {
      const updated = [...prev]; const sec = updated[idx]; const locked = new Set<number>()
      for (const q of sec.questions) { const r = sec.results.get(q.id); if (r?.isCorrect) { locked.add(q.id) } else { clearAnswer(q.id, q.answerType) } }
      // 保存済み振り返りを履歴に退避
      const prevReflections = [...sec.previousReflections]
      if (sec.reflectionSaved && sec.reflectionText) {
        prevReflections.push({ reflectionText: sec.reflectionText, feedbackText: sec.feedbackText, attemptNumber: prevReflections.length + 1 })
      }
      updated[idx] = { ...sec, isGraded: false, isExpanded: true, score: 0, maxScore: 0, results: new Map(), lockedQuestionIds: locked, reflectionText: '', reflectionSaved: false, reflectionId: null, feedbackText: '', feedbackLoading: false, previousReflections: prevReflections }
      return updated
    }); setError(null)
  }, [])

  const handleSectionRetryAll = useCallback((idx: number) => {
    setSections(prev => {
      const updated = [...prev]; const sec = updated[idx]
      for (const q of sec.questions) clearAnswer(q.id, q.answerType)
      // 保存済み振り返りを履歴に退避
      const prevReflections = [...sec.previousReflections]
      if (sec.reflectionSaved && sec.reflectionText) {
        prevReflections.push({ reflectionText: sec.reflectionText, feedbackText: sec.feedbackText, attemptNumber: prevReflections.length + 1 })
      }
      updated[idx] = { ...sec, isGraded: false, isExpanded: true, score: 0, maxScore: 0, results: new Map(), lockedQuestionIds: new Set(), reflectionText: '', reflectionSaved: false, reflectionId: null, feedbackText: '', feedbackLoading: false, previousReflections: prevReflections }
      return updated
    }); setError(null)
  }, [])

  const handleSaveReflection = useCallback(async (idx: number) => {
    const sec = sections[idx]
    if (!sec.answerSessionId || !sec.reflectionText.trim()) return
    const result = await saveExerciseReflection({ answerSessionId: sec.answerSessionId, sectionName: sec.name, reflectionText: sec.reflectionText })
    if (result.success && result.reflectionId) {
      setSections(prev => { const u = [...prev]; u[idx] = { ...u[idx], reflectionSaved: true, reflectionId: result.reflectionId!, feedbackLoading: true }; return u })

      // AIフィードバック生成（SSEストリーミング）
      const feedbackAbort = new AbortController()
      try {
        await fetchSSE(
          '/api/exercise/feedback-stream',
          { exerciseReflectionId: result.reflectionId },
          (accumulated) => {
            setSections(prev => { const u = [...prev]; u[idx] = { ...u[idx], feedbackText: accumulated }; return u })
          },
          feedbackAbort.signal
        )
      } catch (e) {
        console.error('Exercise feedback stream error:', e)
      } finally {
        setSections(prev => { const u = [...prev]; u[idx] = { ...u[idx], feedbackLoading: false }; return u })
      }
    } else if (!result.success) {
      setError(result.error || '振り返りの保存に失敗しました')
    }
  }, [sections])

  const handleReflectionChange = useCallback((idx: number, text: string) => {
    setSections(prev => { const u = [...prev]; u[idx] = { ...u[idx], reflectionText: text, reflectionSaved: false }; return u })
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

  const computedTotal = useMemo(() => {
    const score = sections.reduce((s, sec) => s + sec.score, 0)
    const max = sections.reduce((s, sec) => s + sec.questions.reduce((sum, q) => sum + q.points, 0), 0)
    return { score, max }
  }, [sections])

  if (!sessionId) return <div className="text-center py-12 text-gray-400"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>学習回を選択してください</p></div>
  if (isLoading) return <div className="flex flex-col items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" /><span className="text-gray-500 text-sm">問題を読み込んでいます...</span></div>
  if (!questionSet || questions.length === 0) return <div className="text-center py-12"><BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-4" /><p className="text-gray-400 text-sm">この回の演習問題集データはまだ準備されていません</p></div>

  const isPerfect = allGraded && computedTotal.score === computedTotal.max
  const totalPct = computedTotal.max > 0 ? Math.round((computedTotal.score / computedTotal.max) * 100) : 0

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-900">{questionSet.title}</h3>

      {/* 総合スコア（全セクション完了後） */}
      {allGraded && (
        <div className={cn("rounded-2xl p-5 text-center border-2 shadow-sm", isPerfect ? "bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 border-yellow-300" : "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-blue-200")}>
          {isPerfect && <Trophy className="h-10 w-10 text-yellow-500 mx-auto mb-2" />}
          <div className="text-4xl font-extrabold text-gray-900">{computedTotal.score}<span className="text-xl text-gray-400 font-normal">/{computedTotal.max}</span></div>
          <div className="text-sm text-gray-600 mt-1 font-medium">
            正答率 {totalPct}%{attemptNumber && <span>（{attemptNumber}回目）</span>}
          </div>
          {isPerfect && <p className="text-sm text-yellow-700 mt-2 font-bold">全問正解！すばらしい！</p>}
        </div>
      )}

      {/* 進行中スコア（一部採点済み） */}
      {!allGraded && sections.some(s => s.isGraded) && (
        <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">採点済み {sections.filter(s => s.isGraded).length}/{sections.length} セクション</span>
            <span className="text-xs text-gray-500">{totalPct}%</span>
          </div>
          <div className="text-4xl font-extrabold text-gray-900">{computedTotal.score}<span className="text-xl text-gray-400 font-normal">/{computedTotal.max}</span></div>
          <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">{error}</div>}

      {/* ===== セクション一覧 ===== */}
      {sections.map((section, idx) => {
        const badgeText = SECTION_LABELS[section.name] || ''
        const editableQs = section.questions.filter(q => !section.lockedQuestionIds.has(q.id))
        const sectionAnswered = editableQs.filter(q => buildRawInput(q) !== null).length
        const sectionIncorrect = Array.from(section.results.values()).filter(r => !r.isCorrect).length
        const sectionPct = section.maxScore > 0 ? Math.round((section.score / section.maxScore) * 100) : 0

        return (
          <div key={section.name} className="space-y-2">
            {/* セクションヘッダー（青系統統一） */}
            <button onClick={() => toggleSection(idx)} className={cn("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left", "bg-blue-50 border-blue-200", section.isExpanded && "shadow-sm border-blue-300")}>
              <div className="w-1.5 h-8 rounded-full flex-shrink-0 bg-blue-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-blue-800">{section.name}</h4>
                  {badgeText && <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-300 px-1.5 py-0.5">{badgeText}</Badge>}
                </div>
                {section.isGraded ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-sm font-extrabold", section.score === section.maxScore ? "text-green-600" : "text-blue-700")}>
                      {section.score}/{section.maxScore}点
                    </span>
                    <span className="text-xs text-gray-500">（{sectionPct}%）</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-full rounded-full transition-all bg-blue-400" style={{ width: `${editableQs.length > 0 ? (sectionAnswered / editableQs.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{sectionAnswered}/{editableQs.length}問回答</span>
                  </div>
                )}
              </div>
              {section.isGraded && <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", section.score === section.maxScore ? "bg-green-500" : "bg-blue-500")}><Check className="h-4 w-4 text-white" strokeWidth={3} /></div>}
              {section.isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />}
            </button>

            {/* セクション内容 */}
            {section.isExpanded && (
              <div className="space-y-2 pl-2">
                {/* 採点済み: スコア → 振り返り */}
                {section.isGraded && (
                  <div className="space-y-3">
                    {/* スコアカード（青系統） */}
                    <div className={cn("rounded-2xl p-5 text-center border-2 shadow-sm", section.score === section.maxScore ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200")}>
                      <div className="text-3xl font-extrabold text-gray-900">
                        {section.score}<span className="text-lg text-gray-400 font-normal">/{section.maxScore}点</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        正答率 {sectionPct}%
                        {sectionIncorrect > 0 && <span className="text-red-500 ml-1 font-bold">{sectionIncorrect}問不正解</span>}
                      </div>
                      {section.score === section.maxScore && <p className="text-xs text-green-600 font-bold mt-1">全問正解！</p>}
                    </div>

                    {/* 過去の振り返り履歴（リトライ前の記録） */}
                    {section.previousReflections.length > 0 && (
                      <div className="space-y-2">
                        {section.previousReflections.map((prev, i) => (
                          <div key={i} className="rounded-2xl bg-gray-50 border border-gray-200 p-3.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Avatar className="w-4 h-4"><AvatarImage src={studentAvatarUrl} alt="生徒アバター" /><AvatarFallback className="bg-gray-200 text-gray-500"><User className="h-2.5 w-2.5" /></AvatarFallback></Avatar>
                              <span className="text-[10px] font-bold text-gray-500">{prev.attemptNumber}回目のふりかえり</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">「{prev.reflectionText}」</p>
                            {prev.feedbackText && (
                              <div className="mt-2 pl-3 border-l-2 border-indigo-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <Avatar className="w-4 h-4"><AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" alt="AIコーチ" /><AvatarFallback className="bg-indigo-100 text-indigo-500">AI</AvatarFallback></Avatar>
                                  <span className="text-[10px] font-bold text-indigo-500">AIコーチ</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">{prev.feedbackText}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 振り返り — reflection_count < MAX_REFLECTIONS なら入力可、それ以外は記録閲覧のみ */}
                    {(() => {
                      const reflectionCount = section.previousReflections.length + (section.reflectionSaved ? 1 : 0)
                      const canReflect = reflectionCount < MAX_REFLECTIONS

                      if (section.reflectionSaved) {
                        // 今回の振り返り保存済み → 表示
                        return (
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Avatar className="w-5 h-5"><AvatarImage src={studentAvatarUrl} alt="生徒アバター" /><AvatarFallback className="bg-blue-100 text-blue-600"><User className="h-3 w-3" /></AvatarFallback></Avatar>
                                <span className="text-xs font-bold text-blue-700">ふりかえり</span>
                              </div>
                              <p className="text-sm text-gray-800 leading-relaxed">「{section.reflectionText}」</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <Check className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-xs text-green-600 font-medium">保存しました</span>
                              </div>
                            </div>
                            {(section.feedbackText || section.feedbackLoading) && (
                              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 p-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Avatar className="w-5 h-5"><AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" alt="AIコーチ" /><AvatarFallback className="bg-indigo-100 text-indigo-600">AI</AvatarFallback></Avatar>
                                  <span className="text-xs font-bold text-indigo-700">AIコーチ</span>
                                  {section.feedbackLoading && <Loader2 className="h-3 w-3 animate-spin text-indigo-400 ml-auto" />}
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  {section.feedbackText}
                                  {section.feedbackLoading && <span className="inline-block w-1 h-4 bg-indigo-400 animate-pulse ml-0.5 align-text-bottom" />}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      }

                      if (canReflect) {
                        // 振り返り枠あり → 入力フォーム表示
                        return (
                          <div className="rounded-2xl border-2 border-blue-300 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-white/50"><AvatarImage src={studentAvatarUrl} alt="生徒アバター" /><AvatarFallback className="bg-white/30 text-white"><User className="h-3 w-3" /></AvatarFallback></Avatar>
                                <span className="text-sm font-bold text-white">{section.name}をふりかえろう</span>
                                {reflectionCount > 0 && <span className="text-[10px] text-white/70 ml-auto">あと{MAX_REFLECTIONS - reflectionCount}回</span>}
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50/80 to-white p-4 space-y-3">
                              <div className="relative">
                                <Textarea
                                  value={section.reflectionText}
                                  onChange={(e) => handleReflectionChange(idx, e.target.value)}
                                  placeholder="例：倍数の問題は解けたけど、公約数の応用がまだ不安..."
                                  className="min-h-[80px] text-sm border-2 border-blue-200 bg-white focus:border-blue-400 focus:ring-blue-400/20 focus:ring-[3px] resize-none rounded-xl placeholder:text-gray-400 pr-12"
                                  maxLength={200}
                                  autoFocus
                                />
                                <VoiceInputButton
                                  onTranscribed={(text) => {
                                    const current = section.reflectionText
                                    const newText = current ? `${current} ${text}` : text
                                    handleReflectionChange(idx, newText.slice(0, 200))
                                  }}
                                  disabled={isPending}
                                  className="absolute right-2 bottom-2"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">{section.reflectionText.length}/200文字</span>
                                {section.reflectionText.trim() ? (
                                  <Button onClick={() => handleSaveReflection(idx)} className="h-9 px-5 text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl shadow-md">
                                    <Check className="h-4 w-4 mr-1.5" />保存する
                                  </Button>
                                ) : (
                                  <span className="text-xs text-gray-400">書かなくてもOK</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // 上限到達 → 記録閲覧のみ
                      return null
                    })()}
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
                            {question.answerType === 'multi_part' && mpConfig && <MultiPartInput questionNumber={question.questionNumber} template={mpConfig.template} slots={mpConfig.slots} values={multiPartAnswers[question.id] || {}} onChange={(l, v) => setMultiPartAnswers(p => ({ ...p, [question.id]: { ...(p[question.id] || {}), [l]: v } }))} disabled={disabled} vertex_map={mpConfig.vertex_map} />}
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

                {/* 採点ボタン（未採点時） */}
                {!section.isGraded && (
                  <Button onClick={() => handleGradeSection(idx)} disabled={isPending} className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg rounded-xl mt-1" size="lg">
                    {isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />採点中...</> : <><Check className="h-5 w-5 mr-2" />{section.name}を採点する（{sectionAnswered}/{editableQs.length}問回答済み）</>}
                  </Button>
                )}

                {/* リトライボタン（採点済み、問題詳細の後 — 中立アウトライン） */}
                {section.isGraded && (
                  <div className="flex gap-2 mt-1">
                    {sectionIncorrect > 0 && (
                      <Button onClick={() => handleSectionRetryIncorrect(idx)} variant="outline" className="flex-1 h-10 text-xs font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl">
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />不正解だけやり直す（{sectionIncorrect}問）
                      </Button>
                    )}
                    <Button onClick={() => handleSectionRetryAll(idx)} variant="outline" className={cn("h-10 text-xs font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl", sectionIncorrect > 0 ? "px-3" : "flex-1")}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />全部やり直す
                    </Button>
                  </div>
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
