'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkStudentAccess } from '@/app/actions/common/check-student-access'

// ================================================================
// 型定義
// ================================================================

export interface ExerciseReflection {
  id: number
  sectionName: string
  reflectionText: string
  attemptNumber: number
  createdAt: string
}

// ================================================================
// 振り返り保存（衝突時リトライ付き + 上限チェック）
// ================================================================

const MAX_RETRY = 3
import { MAX_REFLECTIONS } from '@/lib/constants/exercise'

export async function saveExerciseReflection(input: {
  answerSessionId: number
  sectionName: string
  reflectionText: string
}): Promise<{ success: boolean; reflectionId?: number; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '認証されていません' }

    const admin = createAdminClient()

    // answer_session の所有確認 + question_set_id 取得
    const { data: student } = await admin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!student) return { success: false, error: '生徒情報が見つかりません' }

    const { data: session } = await admin
      .from('answer_sessions')
      .select('id, question_set_id')
      .eq('id', input.answerSessionId)
      .eq('student_id', student.id)
      .single()
    if (!session) return { success: false, error: 'セッションが見つかりません' }

    // 空文字バリデーション
    if (!input.reflectionText.trim()) {
      return { success: false, error: '振り返りテキストを入力してください' }
    }

    // ---- 振り返り上限チェック（DB実数ベース、question_set 横断） ----
    // この question_set の全セッションを取得
    const { data: allSessions } = await admin
      .from('answer_sessions')
      .select('id')
      .eq('student_id', student.id)
      .eq('question_set_id', session.question_set_id)

    if (allSessions && allSessions.length > 0) {
      const allSessionIds = allSessions.map(s => s.id)
      const { count } = await admin
        .from('exercise_reflections')
        .select('id', { count: 'exact', head: true })
        .in('answer_session_id', allSessionIds)
        .eq('section_name', input.sectionName)

      if (count !== null && count >= MAX_REFLECTIONS) {
        return { success: false, error: `振り返りは${MAX_REFLECTIONS}回までです` }
      }
    }

    // 衝突時リトライ: MAX + 1 で採番し、ユニーク衝突したらリトライ
    for (let retry = 0; retry < MAX_RETRY; retry++) {
      const { data: existing } = await admin
        .from('exercise_reflections')
        .select('attempt_number')
        .eq('answer_session_id', input.answerSessionId)
        .eq('section_name', input.sectionName)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single()

      const nextAttempt = (existing?.attempt_number ?? 0) + 1

      const { data: inserted, error: insertError } = await admin
        .from('exercise_reflections')
        .insert({
          answer_session_id: input.answerSessionId,
          section_name: input.sectionName,
          reflection_text: input.reflectionText.trim(),
          attempt_number: nextAttempt,
        })
        .select('id')
        .single()

      if (!insertError && inserted) return { success: true, reflectionId: inserted.id }

      // ユニーク衝突（23505）ならリトライ
      if (insertError.code === '23505') {
        console.warn(`Reflection insert conflict, retry ${retry + 1}/${MAX_RETRY}`)
        continue
      }

      // DB トリガーによる上限拒否（P0001: reflection_limit_exceeded）
      if (insertError.code === 'P0001' && insertError.message?.includes('reflection_limit_exceeded')) {
        return { success: false, error: `振り返りは${MAX_REFLECTIONS}回までです` }
      }

      // その他のエラー
      console.error('Failed to save exercise reflection:', insertError)
      return { success: false, error: '振り返りの保存に失敗しました' }
    }

    return { success: false, error: '振り返りの保存に失敗しました（リトライ上限）' }
  } catch (error) {
    console.error('Error in saveExerciseReflection:', error)
    return { success: false, error: '予期しないエラーが発生しました' }
  }
}

// ================================================================
// 振り返り取得（認可付き — 自分 or checkStudentAccess で検証済みの生徒）
// ================================================================

export async function getExerciseReflections(
  answerSessionId: number,
  options?: { targetStudentId?: number }
): Promise<ExerciseReflection[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const admin = createAdminClient()

    // セッションの所有者を取得
    const { data: session } = await admin
      .from('answer_sessions')
      .select('student_id')
      .eq('id', answerSessionId)
      .single()
    if (!session) return []

    if (options?.targetStudentId) {
      // 他生徒アクセス: checkStudentAccess で認可
      if (session.student_id !== options.targetStudentId) return []
      const hasAccess = await checkStudentAccess(user.id, String(options.targetStudentId))
      if (!hasAccess) return []
    } else {
      // 自分のデータ: user_id → student_id の一致確認
      const { data: student } = await admin
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!student || student.id !== session.student_id) return []
    }

    // 振り返りデータ取得
    const { data } = await admin
      .from('exercise_reflections')
      .select('id, section_name, reflection_text, attempt_number, created_at')
      .eq('answer_session_id', answerSessionId)
      .order('section_name')
      .order('attempt_number', { ascending: false })

    if (!data) return []

    // 各セクションの最新のみ抽出
    const latestBySection = new Map<string, typeof data[0]>()
    for (const r of data) {
      if (!latestBySection.has(r.section_name)) {
        latestBySection.set(r.section_name, r)
      }
    }

    return Array.from(latestBySection.values()).map(r => ({
      id: r.id,
      sectionName: r.section_name,
      reflectionText: r.reflection_text,
      attemptNumber: r.attempt_number,
      createdAt: r.created_at,
    }))
  } catch (error) {
    console.error('Error in getExerciseReflections:', error)
    return []
  }
}

// ================================================================
// フィードバック取得（再訪時プリフィル用）
// ================================================================

export interface ExerciseFeedback {
  sectionName: string
  feedbackText: string
  reflectionId: number
}

// ================================================================
// 振り返り履歴（question_set 横断 — 過去のリトライ分も含む）
// ================================================================

export interface ExerciseReflectionHistoryItem {
  sectionName: string
  reflectionText: string
  feedbackText: string | null
  sessionAttemptNumber: number
  createdAt: string
}

export async function getExerciseReflectionHistory(
  questionSetId: number
): Promise<ExerciseReflectionHistoryItem[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const admin = createAdminClient()
    const { data: studentData } = await admin.from('students').select('id').eq('user_id', user.id).single()
    if (!studentData) return []

    // 1. この question_set の全セッション
    const { data: sessions } = await admin
      .from('answer_sessions')
      .select('id, attempt_number')
      .eq('student_id', studentData.id)
      .eq('question_set_id', questionSetId)
      .order('attempt_number')

    if (!sessions || sessions.length === 0) return []

    const sessionMap = new Map(sessions.map(s => [s.id, s.attempt_number]))
    const sessionIds = sessions.map(s => s.id)

    // 2. 全振り返り
    const { data: reflections } = await admin
      .from('exercise_reflections')
      .select('id, answer_session_id, section_name, reflection_text, created_at')
      .in('answer_session_id', sessionIds)
      .order('created_at')

    if (!reflections || reflections.length === 0) return []

    // 3. 全フィードバック
    const reflectionIds = reflections.map(r => r.id)
    const { data: feedbacks } = await admin
      .from('exercise_feedbacks')
      .select('exercise_reflection_id, feedback_text')
      .in('exercise_reflection_id', reflectionIds)

    const feedbackMap = new Map((feedbacks || []).map(f => [f.exercise_reflection_id, f.feedback_text]))

    return reflections.map(r => ({
      sectionName: r.section_name,
      reflectionText: r.reflection_text,
      feedbackText: feedbackMap.get(r.id) || null,
      sessionAttemptNumber: sessionMap.get(r.answer_session_id) || 1,
      createdAt: r.created_at,
    }))
  } catch (error) {
    console.error('Error in getExerciseReflectionHistory:', error)
    return []
  }
}

// ================================================================
// フィードバック取得（再訪時プリフィル用）
// ================================================================

export async function getExerciseFeedbacks(
  answerSessionId: number
): Promise<ExerciseFeedback[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const admin = createAdminClient()

    // 所有確認
    const { data: studentData } = await admin.from('students').select('id').eq('user_id', user.id).single()
    if (!studentData) return []

    // 各セクションの最新振り返り（attempt_number DESC で1件ずつ）を取得
    const { data: reflections } = await admin
      .from('exercise_reflections')
      .select('id, section_name, attempt_number, answer_sessions!inner(student_id)')
      .eq('answer_session_id', answerSessionId)
      .order('section_name')
      .order('attempt_number', { ascending: false })

    if (!reflections || reflections.length === 0) return []

    // 所有確認 + セクションごとに最新のみ抽出
    const latestBySection = new Map<string, number>() // section_name → reflection_id
    for (const r of reflections) {
      const session = r.answer_sessions as unknown as { student_id: number }
      if (session.student_id !== studentData.id) continue
      if (!latestBySection.has(r.section_name)) {
        latestBySection.set(r.section_name, r.id)
      }
    }

    if (latestBySection.size === 0) return []

    const latestIds = Array.from(latestBySection.values())

    // 最新振り返りに対応するフィードバックを取得
    const { data: feedbacks } = await admin
      .from('exercise_feedbacks')
      .select('exercise_reflection_id, feedback_text, created_at')
      .in('exercise_reflection_id', latestIds)

    if (!feedbacks) return []

    // section_name → feedbackText マッピング
    const idToSection = new Map(Array.from(latestBySection.entries()).map(([s, id]) => [id, s]))

    return feedbacks.map(f => ({
      sectionName: idToSection.get(f.exercise_reflection_id) || '',
      feedbackText: f.feedback_text,
      reflectionId: f.exercise_reflection_id,
    }))
  } catch (error) {
    console.error('Error in getExerciseFeedbacks:', error)
    return []
  }
}
