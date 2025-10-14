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
 * 現在のJST日時を取得（ISO 8601形式）
 */
export function getNowJST(): Date {
  return new Date()
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
