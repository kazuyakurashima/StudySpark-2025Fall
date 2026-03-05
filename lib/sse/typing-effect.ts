/**
 * 疑似タイピング表示ユーティリティ
 *
 * JSON非ストリーム応答（ゴールナビStep4まとめ等）をクライアント側で
 * タイピングアニメーション表示するためのヘルパー。
 *
 * 可変速度: 先頭30%は速く → 中盤は標準 → 末尾20%は減速
 * prefers-reduced-motion: アニメーション無効時は即時表示
 */

/**
 * テキストを1文字ずつコールバックで返す疑似タイピング
 *
 * @param text 表示するテキスト
 * @param onUpdate 累積テキストのコールバック
 * @param options.baseDelay 1文字あたりの基準遅延ms（デフォルト30ms）
 * @returns cancel: アニメーション中止, promise: 完了待機用Promise
 */
export function simulateTyping(
  text: string,
  onUpdate: (partial: string) => void,
  options?: { baseDelay?: number }
): { cancel: () => void; promise: Promise<void> } {
  // 空文字はそのまま返す
  if (!text) {
    onUpdate("")
    return { cancel: () => {}, promise: Promise.resolve() }
  }

  // prefers-reduced-motion: アクセシビリティ対応
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    onUpdate(text)
    return { cancel: () => {}, promise: Promise.resolve() }
  }

  const baseDelay = options?.baseDelay ?? 30
  let i = 0
  let cancelled = false

  const promise = new Promise<void>((resolve) => {
    const tick = () => {
      if (cancelled || i >= text.length) {
        if (!cancelled) onUpdate(text) // 最終状態を保証
        resolve()
        return
      }
      i++
      onUpdate(text.slice(0, i))

      // 可変速度: 進行率に応じてdelay変化
      const progress = i / text.length
      const delay =
        progress < 0.3
          ? baseDelay * 0.5 // 先頭30%: 速い
          : progress < 0.8
            ? baseDelay // 中盤: 標準
            : baseDelay * 1.5 // 末尾20%: 減速
      setTimeout(tick, delay)
    }
    tick()
  })

  return {
    cancel: () => {
      cancelled = true
    },
    promise,
  }
}
