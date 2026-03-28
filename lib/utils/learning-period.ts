/**
 * 学習期間判定ユーティリティ
 * 通常回 / 特別期間（講習・休暇）を判定する共通関数
 */

import { SPECIAL_PERIODS_2026, type SpecialPeriod } from '@/lib/constants/special-periods'
import { getTodayJST } from '@/lib/utils/date-jst'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LearningPeriodResult =
  | {
      type: 'regular'
      session: { id: number; session_number: number; start_date: string; end_date: string }
      specialPeriod: null
    }
  | {
      type: 'special'
      session: null
      specialPeriod: SpecialPeriod
      lastSession: { id: number; session_number: number } | null
    }

/**
 * 現在の学習期間を判定する。
 * - study_sessions に当日が含まれる → 'regular'（通常回）
 * - SPECIAL_PERIODS に当日が含まれる → 'special'（講習/休暇期間）
 * - どちらでもない → フォールバック: 直前の通常回を 'regular' として返す
 */
export async function getCurrentLearningPeriod(
  grade: number,
  supabase: SupabaseClient,
): Promise<LearningPeriodResult> {
  const today = getTodayJST()

  // 1. 通常回に該当するか
  const { data: session, error: sessionError } = await supabase
    .from('study_sessions')
    .select('id, session_number, start_date, end_date')
    .eq('grade', grade)
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  if (session) {
    return { type: 'regular', session, specialPeriod: null }
  }

  // DB接続エラー等の異常はここで検出（PGRST116 = 0行ヒットは正常）
  if (sessionError && sessionError.code !== 'PGRST116') {
    console.error('[getCurrentLearningPeriod] DB error:', sessionError)
    throw new Error(`study_sessions query failed: ${sessionError.message}`)
  }

  // 2. 特別期間に該当するか
  const specialPeriod = SPECIAL_PERIODS_2026.find(
    p => p.grade === grade && today >= p.startDate && today <= p.endDate
  )

  if (specialPeriod) {
    // 直前の通常回を取得（プルダウンのデフォルト位置用）
    const { data: lastSession } = await supabase
      .from('study_sessions')
      .select('id, session_number')
      .eq('grade', grade)
      .lte('end_date', today)
      .order('session_number', { ascending: false })
      .limit(1)
      .single()

    return { type: 'special', session: null, specialPeriod, lastSession }
  }

  // 3. フォールバック: 直前の通常回
  const { data: fallback } = await supabase
    .from('study_sessions')
    .select('id, session_number, start_date, end_date')
    .eq('grade', grade)
    .lte('end_date', today)
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  if (fallback) {
    return { type: 'regular', session: fallback, specialPeriod: null }
  }

  // 4. 最終フォールバック: 最初の回
  const { data: first } = await supabase
    .from('study_sessions')
    .select('id, session_number, start_date, end_date')
    .eq('grade', grade)
    .order('session_number', { ascending: true })
    .limit(1)
    .single()

  return { type: 'regular', session: first!, specialPeriod: null }
}
