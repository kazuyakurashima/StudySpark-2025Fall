import { describe, it, expect } from "vitest"
import {
  validateGoalStepOutput,
  FALLBACK_TEMPLATES,
} from "../goal-output-validator"

describe("validateGoalStepOutput", () => {
  it("正常な質問を通過させる（simple step 2）", () => {
    const result = validateGoalStepOutput(
      "目標を達成できたら、どんな気持ちになると思う？",
      "simple",
      2
    )
    expect(result.valid).toBe(true)
    expect(result.content).toBe("目標を達成できたら、どんな気持ちになると思う？")
  })

  it("正常な受容+質問を通過させる（simple step 3）", () => {
    const result = validateGoalStepOutput(
      'すごくいい気持ちだね！その自分から"今の自分"にひとこと送るとしたら？',
      "simple",
      3
    )
    expect(result.valid).toBe(true)
  })

  it("文字数不足でフォールバック", () => {
    const result = validateGoalStepOutput("短い？", "simple", 2)
    expect(result.valid).toBe(false)
    expect(result.content).toBe(FALLBACK_TEMPLATES["simple:2"])
    expect(result.reason).toBe("too_short")
  })

  it("文字数超過でフォールバック", () => {
    const longText = "あ".repeat(201)
    const result = validateGoalStepOutput(longText, "simple", 2)
    expect(result.valid).toBe(false)
    expect(result.content).toBe(FALLBACK_TEMPLATES["simple:2"])
    expect(result.reason).toBe("too_long")
  })

  it("改行含むとフォールバック", () => {
    const result = validateGoalStepOutput(
      "目標を達成できたら、\nどんな気持ちになると思う？",
      "simple",
      2
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("newline")
  })

  it("疑問符なしでフォールバック", () => {
    const result = validateGoalStepOutput(
      "目標を達成できたら、どんな気持ちになると思うかな。",
      "simple",
      2
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("no_question")
  })

  it("禁止語を含むとフォールバック（simple step 3）", () => {
    const result = validateGoalStepOutput(
      "お前はダメな人間だよね？もっともっと頑張れるよね？",
      "simple",
      3
    )
    expect(result.valid).toBe(false)
    expect(result.content).toBe(FALLBACK_TEMPLATES["simple:3"])
    expect(result.reason).toBe("forbidden")
  })

  it("攻撃的でない文脈の語は通過させる", () => {
    // 「死なない」「ダメージ」「無理なく」などは攻撃的でないので通過すべき
    const result = validateGoalStepOutput(
      "死なないように頑張る気持ち、すてきだね！どんな自分になりたい？",
      "simple",
      3
    )
    expect(result.valid).toBe(true)
  })

  it("前後の空白をトリムする", () => {
    const result = validateGoalStepOutput(
      "  目標を達成できたら、どんな気持ちになると思う？  ",
      "simple",
      2
    )
    expect(result.valid).toBe(true)
    expect(result.content).toBe("目標を達成できたら、どんな気持ちになると思う？")
  })

  // --- flowType=full のテスト ---

  it("full step 2 のフォールバックは予祝質問になる", () => {
    const result = validateGoalStepOutput("短い？", "full", 2)
    expect(result.valid).toBe(false)
    expect(result.content).toBe(FALLBACK_TEMPLATES["full:2"])
    // full:2 は simple:2（感情質問）ではなく予祝質問であること
    expect(result.content).not.toBe(FALLBACK_TEMPLATES["simple:2"])
  })

  it("full step 2 の正常出力を通過させる", () => {
    const result = validateGoalStepOutput(
      'すてきだね！その自分から"今の自分"にひとこと送るとしたら？',
      "full",
      2
    )
    expect(result.valid).toBe(true)
  })
})
