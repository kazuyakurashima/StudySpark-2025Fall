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
// 振り返り保存（衝突時リトライ付き）
// ================================================================

const MAX_RETRY = 3

export async function saveExerciseReflection(input: {
  answerSessionId: number
  sectionName: string
  reflectionText: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '認証されていません' }

    const admin = createAdminClient()

    // answer_session の所有確認（自分の生徒IDと一致するか）
    const { data: student } = await admin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!student) return { success: false, error: '生徒情報が見つかりません' }

    const { data: session } = await admin
      .from('answer_sessions')
      .select('id')
      .eq('id', input.answerSessionId)
      .eq('student_id', student.id)
      .single()
    if (!session) return { success: false, error: 'セッションが見つかりません' }

    // 空文字バリデーション
    if (!input.reflectionText.trim()) {
      return { success: false, error: '振り返りテキストを入力してください' }
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

      const { error: insertError } = await admin
        .from('exercise_reflections')
        .insert({
          answer_session_id: input.answerSessionId,
          section_name: input.sectionName,
          reflection_text: input.reflectionText.trim(),
          attempt_number: nextAttempt,
        })

      if (!insertError) return { success: true }

      // ユニーク衝突（23505）ならリトライ
      if (insertError.code === '23505') {
        console.warn(`Reflection insert conflict, retry ${retry + 1}/${MAX_RETRY}`)
        continue
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
