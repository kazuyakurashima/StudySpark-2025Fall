import { describe, it, expect } from "vitest"
import { PerfTimer } from "../perf-timer"

describe("PerfTimer", () => {
  it("mark → measure で正の duration を返す", () => {
    const timer = new PerfTimer()
    timer.mark("start")
    // 少し時間を消費
    for (let i = 0; i < 1000; i++) { /* noop */ }
    const duration = timer.measure("test", "start")
    expect(duration).toBeGreaterThanOrEqual(0)
  })

  it("存在しないマークを measure に渡すと throw", () => {
    const timer = new PerfTimer()
    expect(() => timer.measure("test", "nonexistent")).toThrow(
      'Mark "nonexistent" not found'
    )
  })

  it("toMetadata() が perf_*_ms 形式のキーで整数値を返す", () => {
    const timer = new PerfTimer()
    timer.mark("a")
    timer.measure("db", "a")
    timer.measure("total", "a")

    const metadata = timer.toMetadata()
    expect(metadata).toHaveProperty("perf_db_ms")
    expect(metadata).toHaveProperty("perf_total_ms")
    expect(Number.isInteger(metadata.perf_db_ms)).toBe(true)
    expect(Number.isInteger(metadata.perf_total_ms)).toBe(true)
  })

  it("複数の mark/measure ペアが独立して動作する", () => {
    const timer = new PerfTimer()
    timer.mark("phase1")
    timer.mark("phase2")
    const d1 = timer.measure("first", "phase1")
    const d2 = timer.measure("second", "phase2")

    expect(d1).toBeGreaterThanOrEqual(0)
    expect(d2).toBeGreaterThanOrEqual(0)

    const metadata = timer.toMetadata()
    expect(metadata).toHaveProperty("perf_first_ms")
    expect(metadata).toHaveProperty("perf_second_ms")
  })

  it("measure 未実行時に toMetadata() が空オブジェクトを返す", () => {
    const timer = new PerfTimer()
    timer.mark("unused")
    expect(timer.toMetadata()).toEqual({})
  })
})
