/**
 * lib/llm/logger.ts のユニットテスト
 *
 * PIIマスキング・サイクル検出・MAX_DEPTH・共有参照を検証。
 */

import { describe, it, expect } from "vitest"
import { sanitizeForLog } from "../logger"

describe("sanitizeForLog", () => {
  it("プリミティブはそのまま返す", () => {
    expect(sanitizeForLog(null)).toBeNull()
    expect(sanitizeForLog(undefined)).toBeUndefined()
    expect(sanitizeForLog(42)).toBe(42)
    expect(sanitizeForLog("hello")).toBe("hello")
    expect(sanitizeForLog(true)).toBe(true)
  })

  it("PIIフィールドを [REDACTED] にマスク", () => {
    const input = {
      studentName: "田中太郎",
      content: "秘密のメッセージ",
      full_name: "Taro Tanaka",
      email: "taro@example.com",
      grade: 5,
    }
    const result = sanitizeForLog(input) as Record<string, unknown>
    expect(result.studentName).toBe("[REDACTED]")
    expect(result.content).toBe("[REDACTED]")
    expect(result.full_name).toBe("[REDACTED]")
    expect(result.email).toBe("[REDACTED]")
    expect(result.grade).toBe(5)
  })

  it("ネストされたオブジェクトのPIIもマスク", () => {
    const input = {
      student: {
        studentName: "テスト生徒",
        id: 123,
      },
    }
    const result = sanitizeForLog(input) as Record<string, Record<string, unknown>>
    expect(result.student.studentName).toBe("[REDACTED]")
    expect(result.student.id).toBe(123)
  })

  it("配列内のオブジェクトもマスク", () => {
    const input = {
      messages: [
        { role: "user", content: "秘密" },
        { role: "assistant", content: "返答" },
      ],
    }
    const result = sanitizeForLog(input) as { messages: Array<Record<string, unknown>> }
    expect(result.messages[0].content).toBe("[REDACTED]")
    expect(result.messages[0].role).toBe("user")
    expect(result.messages[1].content).toBe("[REDACTED]")
  })

  it("循環参照を [Circular] で安全に処理", () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    const result = sanitizeForLog(obj) as Record<string, unknown>
    expect(result.a).toBe(1)
    expect(result.self).toBe("[Circular]")
  })

  it("共有参照（非循環）は正常にコピーされる", () => {
    const shared = { id: 42, email: "test@test.com" }
    const input = { first: shared, second: shared }
    const result = sanitizeForLog(input) as Record<string, Record<string, unknown>>
    // 共有参照は [Circular] にならず、どちらも正常にコピー
    expect(result.first.id).toBe(42)
    expect(result.first.email).toBe("[REDACTED]")
    expect(result.second.id).toBe(42)
    expect(result.second.email).toBe("[REDACTED]")
  })

  it("MAX_DEPTH を超えたら [MAX_DEPTH] に打ち切り", () => {
    // 深さ7のネストを作成（MAX_DEPTH=5、オブジェクトに対してのみ発動）
    // depth: 0→a(1)→b(2)→c(3)→d(4)→e(5)→f(6) で f のオブジェクトが depth > 5
    const input = { a: { b: { c: { d: { e: { f: { g: "deep" } } } } } } }
    const result = sanitizeForLog(input) as Record<string, unknown>
    const level1 = result.a as Record<string, unknown>
    const level2 = level1.b as Record<string, unknown>
    const level3 = level2.c as Record<string, unknown>
    const level4 = level3.d as Record<string, unknown>
    const level5 = level4.e as Record<string, unknown>
    // depth=6 でオブジェクト { g: "deep" } に到達 → "[MAX_DEPTH]" に打ち切り
    expect(level5.f).toBe("[MAX_DEPTH]")
  })

  it("MAX_DEPTH境界のプリミティブは正常に返す", () => {
    // depth 5 のオブジェクト内のプリミティブ値は正常に返す
    const input = { a: { b: { c: { d: { e: { val: 42 } } } } } }
    const result = sanitizeForLog(input) as Record<string, unknown>
    const level1 = result.a as Record<string, unknown>
    const level2 = level1.b as Record<string, unknown>
    const level3 = level2.c as Record<string, unknown>
    const level4 = level3.d as Record<string, unknown>
    const level5 = level4.e as Record<string, unknown>
    expect(level5.val).toBe(42)
  })

  it("元のオブジェクトを変更しない", () => {
    const input = { studentName: "太郎", grade: 5 }
    sanitizeForLog(input)
    expect(input.studentName).toBe("太郎")
    expect(input.grade).toBe(5)
  })

  it("空オブジェクトと空配列", () => {
    expect(sanitizeForLog({})).toEqual({})
    expect(sanitizeForLog([])).toEqual([])
  })

  it("Error の name は保持、message/stack はマスク（PII防止）", () => {
    const err = new Error("user prompt: 田中太郎の成績は...")
    const result = sanitizeForLog(err) as Record<string, unknown>
    expect(result.name).toBe("Error")
    expect(result.message).toBe("[REDACTED]")
    expect(result.stack).toBe("[REDACTED]")
  })

  it("Error の列挙プロパティ(status, code等)は保持", () => {
    const err = new Error("API error") as Error & { status: number; code: string; type: string }
    err.status = 429
    err.code = "rate_limit_exceeded"
    err.type = "tokens"
    const result = sanitizeForLog(err) as Record<string, unknown>
    expect(result.name).toBe("Error")
    expect(result.message).toBe("[REDACTED]")
    expect(result.status).toBe(429)
    expect(result.code).toBe("rate_limit_exceeded")
    expect(result.type).toBe("tokens")
  })

  it("ネストされた Error もマスク＋列挙プロパティ保持", () => {
    const input = { context: "llm", error: new TypeError("invalid input") }
    const result = sanitizeForLog(input) as Record<string, Record<string, unknown>>
    expect(result.error.name).toBe("TypeError")
    expect(result.error.message).toBe("[REDACTED]")
  })
})
