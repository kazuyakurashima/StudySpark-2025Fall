/**
 * 今日のミッション科目を取得
 *
 * ブロックローテーション:
 * - 月火（ブロックA）: 算数、国語、社会
 * - 水木（ブロックB）: 算数、国語、理科
 * - 金土（ブロックC）: 算数、理科、社会
 * - 日曜: 振り返り（ミッション対象外）
 */
export function getTodayMissionSubjects(date: Date): string[] {
  const dayOfWeek = date.getDay() // 0=日, 1=月, ..., 6=土

  if (dayOfWeek === 0) {
    // 日曜日は振り返りの日（ミッション対象外）
    return []
  }

  // 月曜=1, 火曜=2, 水曜=3, 木曜=4, 金曜=5, 土曜=6
  if (dayOfWeek === 1 || dayOfWeek === 2) {
    // ブロックA: 月火
    return ["算数", "国語", "社会"]
  } else if (dayOfWeek === 3 || dayOfWeek === 4) {
    // ブロックB: 水木
    return ["算数", "国語", "理科"]
  } else {
    // ブロックC: 金土
    return ["算数", "理科", "社会"]
  }
}

/**
 * JST形式の日付文字列から今日のミッション科目を取得
 * @param dateStr YYYY-MM-DD形式の日付文字列（JST）
 * @returns ミッション科目の配列
 */
export function getTodayMissionSubjectsFromString(dateStr: string): string[] {
  const date = new Date(dateStr + "T00:00:00+09:00") // JSTとして解釈
  return getTodayMissionSubjects(date)
}
