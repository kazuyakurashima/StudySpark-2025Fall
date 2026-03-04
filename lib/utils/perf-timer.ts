/**
 * パフォーマンス計測ユーティリティ
 *
 * LLM応答時間やDB取得時間などを計測し、
 * Langfuse metadata形式で出力する。
 */
export class PerfTimer {
  private marks = new Map<string, number>()
  private durations = new Map<string, number>()

  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark)
    if (start === undefined) {
      throw new Error(`Mark "${startMark}" not found`)
    }
    const duration = performance.now() - start
    this.durations.set(name, duration)
    return duration
  }

  toMetadata(): Record<string, number> {
    const result: Record<string, number> = {}
    this.durations.forEach((v, k) => {
      result[`perf_${k}_ms`] = Math.round(v)
    })
    return result
  }
}
