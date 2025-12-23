/**
 * JST（日本標準時）の日付ユーティリティ
 *
 * このアプリは日本国内専用のため、すべての日付処理はJST基準で統一します。
 * UTCは使用しません。
 */

/**
 * 現在のJST日付を取得（YYYY-MM-DD形式）
 */
export function getTodayJST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date())
}

/**
 * 指定日数前/後のJST日付を取得（YYYY-MM-DD形式）
 * @param daysOffset - 日数のオフセット（負の値で過去、正の値で未来）
 */
export function getDateJST(daysOffset: number = 0): string {
  const now = new Date()
  const target = new Date(now)
  target.setDate(now.getDate() + daysOffset)

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(target)
}

/**
 * 現在のJST日時を取得
 *
 * Intl.DateTimeFormat で JST の年月日時分秒を取得し、
 * それを Date オブジェクトとして返す。
 * クラウド環境（UTC）でも正しく JST として扱えるようにする。
 */
export function getNowJST(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(new Date())
  const get = (type: Intl.DateTimeFormatPartTypes, fallback = '0') =>
    parts.find(p => p.type === type)?.value ?? fallback

  const year = Number(get('year'))
  const month = Number(get('month')) - 1  // Date constructor uses 0-indexed months
  const day = Number(get('day'))
  const hour = Number(get('hour'))
  const minute = Number(get('minute'))
  const second = Number(get('second'))

  // JST のカレンダー時刻を UTC エポックに戻すために hour - 9
  // これで内部的には実際の「今」と同じタイムスタンプを指しつつ、
  // formatDateToJST 等に渡すと正しく JST として扱える
  return new Date(Date.UTC(year, month, day, hour - 9, minute, second, 0))
}

/**
 * Date オブジェクトをJST日付文字列に変換（YYYY-MM-DD形式）
 */
export function formatDateToJST(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(date)
}

/**
 * ISO文字列をJST日付文字列に変換（YYYY-MM-DD形式）
 */
export function isoToJSTDate(isoString: string): string {
  return formatDateToJST(new Date(isoString))
}

/**
 * 今日がJSTで特定の日付範囲内にあるかチェック
 */
export function isDateInRangeJST(startDate: string, endDate: string): boolean {
  const today = getTodayJST()
  return today >= startDate && today <= endDate
}

/**
 * 2つの日付の差（日数）を計算
 */
export function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * 昨日のJST日付を取得（YYYY-MM-DD形式）
 */
export function getYesterdayJST(): string {
  return getDateJST(-1)
}

/**
 * 明日のJST日付を取得（YYYY-MM-DD形式）
 */
export function getTomorrowJST(): string {
  return getDateJST(1)
}

/**
 * N日前のJST日付を取得（YYYY-MM-DD形式）
 */
export function getDaysAgoJST(days: number): string {
  return getDateJST(-days)
}

/**
 * N日後のJST日付を取得（YYYY-MM-DD形式）
 */
export function getDaysLaterJST(days: number): string {
  return getDateJST(days)
}

/**
 * JST日付のISO 8601開始時刻を取得（その日の00:00:00 JSTをUTCで表現）
 */
export function getJSTDayStartISO(dateStr: string): string {
  // YYYY-MM-DD形式の日付文字列をJSTの00:00:00として解釈
  const jstDate = new Date(`${dateStr}T00:00:00+09:00`)
  return jstDate.toISOString()
}

/**
 * JST日付のISO 8601終了時刻を取得（その日の23:59:59.999 JSTをUTCで表現）
 */
export function getJSTDayEndISO(dateStr: string): string {
  // YYYY-MM-DD形式の日付文字列をJSTの23:59:59.999として解釈
  const jstDate = new Date(`${dateStr}T23:59:59.999+09:00`)
  return jstDate.toISOString()
}

/**
 * 現在のJST日時をISO 8601形式で取得
 */
export function getNowJSTISO(): string {
  return new Date().toISOString()
}

/**
 * 今週の月曜日（週の開始日）をJST基準で取得（YYYY-MM-DD形式）
 */
export function getThisWeekMondayJST(): string {
  // 今日のJST日付を取得
  const todayStr = getTodayJST()
  const today = new Date(`${todayStr}T00:00:00+09:00`)

  // JSTでの曜日を取得（0=日曜, 1=月曜, ..., 6=土曜）
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short'
  })
  const dayName = formatter.format(today)

  // 曜日名から数値に変換
  const dayMap: { [key: string]: number } = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  }
  const dayOfWeek = dayMap[dayName]

  // 月曜日までの日数差を計算（日曜なら-6、月曜なら0、火曜なら-1、...）
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  // 月曜日の日付を計算
  return getDateJST(diff)
}

/**
 * 指定した週数前のJST日付を取得（YYYY-MM-DD形式）
 * @param weeks - 週数（正の値で過去、負の値で未来）
 * @example
 * getWeeksAgoJST(1) // 1週間前
 * getWeeksAgoJST(-1) // 1週間後
 */
export function getWeeksAgoJST(weeks: number): string {
  const todayStr = getTodayJST()
  const jstDate = new Date(`${todayStr}T00:00:00+09:00`)
  const targetMs = jstDate.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000)
  const targetDate = new Date(targetMs)
  return formatDateToJST(targetDate)
}

/**
 * 指定した月数前のJST日付を取得（YYYY-MM-DD形式）
 * @param months - 月数（正の値で過去、負の値で未来）
 * @example
 * getMonthsAgoJST(1) // 1ヶ月前
 * getMonthsAgoJST(3) // 3ヶ月前
 */
export function getMonthsAgoJST(months: number): string {
  const todayStr = getTodayJST()
  const [year, month, day] = todayStr.split('-').map(Number)

  let targetYear = year
  let targetMonth = month - months

  // 月が0以下になる場合、年を調整
  while (targetMonth < 1) {
    targetMonth += 12
    targetYear -= 1
  }

  // 月が13以上になる場合、年を調整
  while (targetMonth > 12) {
    targetMonth -= 12
    targetYear += 1
  }

  // 対象月の最終日を取得（JST完全独立で計算）
  // Date.UTC を使ってローカルTZに依存しないようにする
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  const targetDay = Math.min(day, daysInTargetMonth)

  const monthStr = String(targetMonth).padStart(2, '0')
  const dayStr = String(targetDay).padStart(2, '0')
  return `${targetYear}-${monthStr}-${dayStr}`
}
