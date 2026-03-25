/**
 * 特別期間（講習・休暇）の定数定義
 * study_sessions のギャップ期間を明示的に定義する。
 * 年度更新時にここだけ変更すればよい。
 */

export type SpecialPeriodType = 'spring_break' | 'gw_break' | 'summer_break'

export interface SpecialPeriod {
  type: SpecialPeriodType
  label: string
  message: string
  description: string
  startDate: string // 'YYYY-MM-DD'
  endDate: string   // 'YYYY-MM-DD'
  grade: number
}

export const SPECIAL_PERIODS_2026: SpecialPeriod[] = [
  {
    type: 'spring_break',
    label: '春期講習',
    message: '春期講習がんばろう！',
    description: 'この期間は、既習分野の復習や予習シリーズの振り返りに取り組みましょう。演習問題集にもチャレンジしてみよう！',
    startDate: '2026-03-23',
    endDate: '2026-04-05',
    grade: 5,
  },
  {
    type: 'spring_break',
    label: '春期講習',
    message: '春期講習がんばろう！',
    description: 'この期間は、既習分野の復習や予習シリーズの振り返りに取り組みましょう。演習問題集にもチャレンジしてみよう！',
    startDate: '2026-03-23',
    endDate: '2026-04-12',
    grade: 6,
  },
  {
    type: 'gw_break',
    label: 'GW休み',
    message: 'GW中も少しずつ取り組もう！',
    description: 'ゴールデンウィーク中です。苦手分野の復習や、演習問題集に取り組みましょう。',
    startDate: '2026-04-27',
    endDate: '2026-05-03',
    grade: 5,
  },
  {
    type: 'gw_break',
    label: 'GW休み',
    message: 'GW中も少しずつ取り組もう！',
    description: 'ゴールデンウィーク中です。苦手分野の復習や、演習問題集に取り組みましょう。',
    startDate: '2026-04-27',
    endDate: '2026-05-03',
    grade: 6,
  },
]
