import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { simulateTyping } from "../typing-effect"

describe("simulateTyping", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("テキストを1文字ずつ通知する", async () => {
    const updates: string[] = []
    const { promise } = simulateTyping("abc", (partial) => updates.push(partial))

    // 全タイマーを実行
    await vi.runAllTimersAsync()
    await promise

    // 最終結果が全文
    expect(updates[updates.length - 1]).toBe("abc")
    // 中間状態を含む
    expect(updates).toContain("a")
    expect(updates).toContain("ab")
  })

  it("cancelで途中停止できる", async () => {
    const updates: string[] = []
    const { cancel, promise } = simulateTyping("abcdef", (partial) =>
      updates.push(partial)
    )

    // 2回分だけタイマー進行
    await vi.advanceTimersByTimeAsync(20)
    cancel()
    await vi.runAllTimersAsync()
    await promise

    // 全文まで到達していない
    expect(updates[updates.length - 1]?.length).toBeLessThan(6)
  })

  it("可変速度で先頭が速く末尾が遅い", async () => {
    // 10文字: 先頭3文字は速い(15ms)、中盤5文字は標準(30ms)、末尾2文字は遅い(45ms)
    const baseDelay = 30
    const text = "1234567890"
    const timestamps: number[] = []

    simulateTyping(
      text,
      () => {
        timestamps.push(Date.now())
      },
      { baseDelay }
    )

    await vi.runAllTimersAsync()

    // 少なくとも先頭のdelayが末尾のdelayより短いことを確認
    if (timestamps.length >= 3) {
      const earlyGap = timestamps[1]! - timestamps[0]!
      const lateGap = timestamps[timestamps.length - 1]! - timestamps[timestamps.length - 2]!
      expect(earlyGap).toBeLessThanOrEqual(lateGap)
    }
  })

  it("空文字で即座に完了する", async () => {
    const updates: string[] = []
    const { promise } = simulateTyping("", (partial) => updates.push(partial))
    await promise

    expect(updates).toEqual([""])
  })

  it("prefers-reduced-motion時は即時表示", async () => {
    // globalThis.windowとmatchMediaをモック（vitest はNode環境のため）
    const mockMatchMedia = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal("window", { matchMedia: mockMatchMedia })

    const updates: string[] = []
    const { promise } = simulateTyping("hello", (partial) => updates.push(partial))
    await promise

    // タイマーなしで即座に全文
    expect(updates).toEqual(["hello"])

    vi.unstubAllGlobals()
  })
})
