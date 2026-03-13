/**
 * コードポイント単位の文字列切り詰め
 *
 * Array.from() でコードポイント単位に分割するため、
 * サロゲートペア（絵文字等）の途中で切れることは防げる。
 * ただし ZWJ 結合絵文字（👨‍👩‍👧‍👦 等）はコードポイント境界で分割されうる。
 *
 * @param text 入力テキスト
 * @param maxCodePoints 最大コードポイント数
 * @returns 上限以内ならそのまま、超過時は切り詰めて「…」を付与
 */
export function trimByCodePoints(text: string, maxCodePoints: number): string {
  const chars = Array.from(text)
  if (chars.length <= maxCodePoints) return text
  return chars.slice(0, maxCodePoints).join("") + "…"
}
