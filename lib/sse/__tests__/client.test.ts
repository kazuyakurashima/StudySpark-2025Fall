import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchSSE } from "../client"

// ReadableStreamをSSEレスポンスとしてモック
function createSSEResponse(
  events: string[],
  status = 200
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  })
}

describe("fetchSSE", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("delta→done の正常フローでテキストを蓄積する", async () => {
    const events = [
      'data: {"type":"delta","content":"こん"}\n\n',
      'data: {"type":"delta","content":"にちは"}\n\n',
      'data: {"type":"done","content":"こんにちは"}\n\n',
    ]

    vi.spyOn(globalThis, "fetch").mockResolvedValue(createSSEResponse(events))

    const chunks: string[] = []
    const controller = new AbortController()

    const resultPromise = fetchSSE(
      "/api/test",
      {},
      (acc) => chunks.push(acc),
      controller.signal
    )

    // バッチタイマーを進める
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.content).toBe("こんにちは")
    // 最終flushで全文が通知されている
    expect(chunks[chunks.length - 1]).toBe("こんにちは")
  })

  it("heartbeat（SSEコメント）を無視する", async () => {
    const events = [
      ":\n\n", // heartbeat
      'data: {"type":"delta","content":"OK"}\n\n',
      ":\n\n", // heartbeat
      'data: {"type":"done","content":"OK"}\n\n',
    ]

    vi.spyOn(globalThis, "fetch").mockResolvedValue(createSSEResponse(events))

    const controller = new AbortController()
    const resultPromise = fetchSSE("/api/test", {}, () => {}, controller.signal)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.content).toBe("OK")
  })

  it("errorイベントでエラーをthrowする", async () => {
    const events = [
      'data: {"type":"error","content":"LLM failed"}\n\n',
    ]

    vi.spyOn(globalThis, "fetch").mockResolvedValue(createSSEResponse(events))

    const controller = new AbortController()
    const resultPromise = fetchSSE("/api/test", {}, () => {}, controller.signal)

    // rejectハンドラを即座に登録してunhandled rejectionを防ぐ
    await expect(resultPromise).rejects.toThrow("LLM failed")
  })

  it("複数eventが同一chunkに含まれる場合を処理する", async () => {
    // 2つのイベントが1つのchunkに結合
    const events = [
      'data: {"type":"delta","content":"A"}\n\ndata: {"type":"delta","content":"B"}\n\n',
      'data: {"type":"done","content":"AB"}\n\n',
    ]

    vi.spyOn(globalThis, "fetch").mockResolvedValue(createSSEResponse(events))

    const controller = new AbortController()
    const resultPromise = fetchSSE("/api/test", {}, () => {}, controller.signal)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.content).toBe("AB")
  })

  it("不正JSONイベントを無視して処理を継続する", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const events = [
      "data: {invalid json}\n\n",
      'data: {"type":"delta","content":"OK"}\n\n',
      'data: {"type":"done","content":"OK"}\n\n',
    ]

    vi.spyOn(globalThis, "fetch").mockResolvedValue(createSSEResponse(events))

    const controller = new AbortController()
    const resultPromise = fetchSSE("/api/test", {}, () => {}, controller.signal)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.content).toBe("OK")
    expect(warnSpy).toHaveBeenCalledOnce()
    warnSpy.mockRestore()
  })

  it("HTTPエラー時にthrowする", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    )

    const controller = new AbortController()
    await expect(
      fetchSSE("/api/test", {}, () => {}, controller.signal)
    ).rejects.toThrow("SSE request failed: 500")
  })
})
