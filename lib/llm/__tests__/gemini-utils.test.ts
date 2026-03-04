import { describe, it, expect } from "vitest"
import { toGeminiContents, buildGeminiContents } from "../gemini-utils"

describe("toGeminiContents", () => {
  it("空配列を渡すと空配列を返す", () => {
    expect(toGeminiContents([])).toEqual([])
  })

  it("assistant → model にロール変換する", () => {
    const result = toGeminiContents([
      { role: "assistant", content: "こんにちは" },
    ])
    expect(result).toEqual([
      { role: "model", parts: [{ text: "こんにちは" }] },
    ])
  })

  it("user はそのまま user として保持する", () => {
    const result = toGeminiContents([
      { role: "user", content: "質問です" },
    ])
    expect(result).toEqual([
      { role: "user", parts: [{ text: "質問です" }] },
    ])
  })

  it("連続する同一ロールのメッセージをparts結合する", () => {
    const result = toGeminiContents([
      { role: "user", content: "1つ目" },
      { role: "user", content: "2つ目" },
    ])
    expect(result).toEqual([
      { role: "user", parts: [{ text: "1つ目" }, { text: "2つ目" }] },
    ])
  })

  it("交互のロールはそれぞれ別エントリになる", () => {
    const result = toGeminiContents([
      { role: "user", content: "質問" },
      { role: "assistant", content: "回答" },
      { role: "user", content: "追加質問" },
    ])
    expect(result).toEqual([
      { role: "user", parts: [{ text: "質問" }] },
      { role: "model", parts: [{ text: "回答" }] },
      { role: "user", parts: [{ text: "追加質問" }] },
    ])
  })

  it("assistant開始の会話を正しく変換する", () => {
    const result = toGeminiContents([
      { role: "assistant", content: "ようこそ" },
      { role: "user", content: "ありがとう" },
    ])
    expect(result).toEqual([
      { role: "model", parts: [{ text: "ようこそ" }] },
      { role: "user", parts: [{ text: "ありがとう" }] },
    ])
  })

  it("3連続同一ロールを1エントリに結合する", () => {
    const result = toGeminiContents([
      { role: "user", content: "a" },
      { role: "user", content: "b" },
      { role: "user", content: "c" },
    ])
    expect(result).toEqual([
      { role: "user", parts: [{ text: "a" }, { text: "b" }, { text: "c" }] },
    ])
  })

  it("中間で連続するassistantを結合する", () => {
    const result = toGeminiContents([
      { role: "user", content: "Q" },
      { role: "assistant", content: "A1" },
      { role: "assistant", content: "A2" },
      { role: "user", content: "Q2" },
    ])
    expect(result).toEqual([
      { role: "user", parts: [{ text: "Q" }] },
      { role: "model", parts: [{ text: "A1" }, { text: "A2" }] },
      { role: "user", parts: [{ text: "Q2" }] },
    ])
  })

  it("空文字contentも正しく処理する", () => {
    const result = toGeminiContents([
      { role: "user", content: "" },
    ])
    expect(result).toEqual([
      { role: "user", parts: [{ text: "" }] },
    ])
  })
})

describe("buildGeminiContents", () => {
  it("空のhistoryにuserPromptを追加する", () => {
    const result = buildGeminiContents([], "質問です")
    expect(result).toEqual([
      { role: "user", parts: [{ text: "質問です" }] },
    ])
  })

  it("末尾がuserのhistoryにuserPromptをparts結合する", () => {
    const result = buildGeminiContents(
      [
        { role: "assistant", content: "回答" },
        { role: "user", content: "追加" },
      ],
      "最終質問"
    )
    expect(result).toEqual([
      { role: "model", parts: [{ text: "回答" }] },
      { role: "user", parts: [{ text: "追加" }, { text: "最終質問" }] },
    ])
  })

  it("末尾がassistantのhistoryにuserPromptを新規エントリで追加する", () => {
    const result = buildGeminiContents(
      [
        { role: "user", content: "質問" },
        { role: "assistant", content: "回答" },
      ],
      "新しい質問"
    )
    expect(result).toEqual([
      { role: "user", parts: [{ text: "質問" }] },
      { role: "model", parts: [{ text: "回答" }] },
      { role: "user", parts: [{ text: "新しい質問" }] },
    ])
  })
})
