/**
 * ゴールナビ入力モード状態遷移テスト
 *
 * page.tsx が使用する input-mode.ts の遷移関数を直接テストする。
 * - ai-simple 選択 → GoalSimpleChat 表示条件
 * - ai-full 選択 → GoalNavigationChat 表示条件
 * - 戻る → choice に復帰
 * - complete → direct に遷移（AI生成フラグ付き）
 * - save 後 → none にリセット
 * - テスト切替 → none にリセット
 */
import { describe, it, expect } from "vitest"
import type { InputMode } from "../input-mode"
import {
  transitionGoalDecision,
  transitionInputMethodChoice,
  transitionAIChatComplete,
  transitionAIChatCancel,
  transitionFallbackToDirect,
  transitionSaveComplete,
  transitionTestChange,
  getVisibleComponent,
} from "../input-mode"

// ─── テスト ──────────────────────────────────────

describe("ゴールナビ入力モード状態遷移", () => {
  it("初期状態は none", () => {
    const initial: InputMode = "none"
    expect(getVisibleComponent(initial)).toBe("none")
  })

  it("目標決定 → choice メニュー表示", () => {
    const next = transitionGoalDecision()
    expect(next).toBe("choice")
    expect(getVisibleComponent(next)).toBe("choice-menu")
  })

  describe("ai-simple 選択", () => {
    it("choice → ai-simple で GoalSimpleChat 表示", () => {
      const { inputMode } = transitionInputMethodChoice("ai-simple")
      expect(inputMode).toBe("ai-simple")
      expect(getVisibleComponent(inputMode)).toBe("GoalSimpleChat")
    })

    it("ai-simple → complete → direct（AI生成フラグ true）", () => {
      const { inputMode, isAIGenerated } = transitionAIChatComplete()
      expect(inputMode).toBe("direct")
      expect(isAIGenerated).toBe(true)
      expect(getVisibleComponent(inputMode)).toBe("direct-input")
    })

    it("ai-simple → cancel → choice に復帰", () => {
      const next = transitionAIChatCancel()
      expect(next).toBe("choice")
      expect(getVisibleComponent(next)).toBe("choice-menu")
    })
  })

  describe("ai-full 選択", () => {
    it("choice → ai-full で GoalNavigationChat 表示", () => {
      const { inputMode } = transitionInputMethodChoice("ai-full")
      expect(inputMode).toBe("ai-full")
      expect(getVisibleComponent(inputMode)).toBe("GoalNavigationChat")
    })

    it("ai-full → complete → direct（AI生成フラグ true）", () => {
      const { inputMode, isAIGenerated } = transitionAIChatComplete()
      expect(inputMode).toBe("direct")
      expect(isAIGenerated).toBe(true)
    })

    it("ai-full → cancel → choice に復帰", () => {
      const next = transitionAIChatCancel()
      expect(next).toBe("choice")
    })

    it("ai-full → fallbackToDirect → direct（AI生成フラグ false）", () => {
      const { inputMode, isAIGenerated } = transitionFallbackToDirect()
      expect(inputMode).toBe("direct")
      expect(isAIGenerated).toBe(false)
      expect(getVisibleComponent(inputMode)).toBe("direct-input")
    })
  })

  describe("direct / later 選択", () => {
    it("direct 選択 → direct-input 表示（AI生成フラグ false）", () => {
      const { inputMode, isAIGenerated } = transitionInputMethodChoice("direct")
      expect(inputMode).toBe("direct")
      expect(isAIGenerated).toBe(false)
      expect(getVisibleComponent(inputMode)).toBe("direct-input")
    })

    it("later 選択 → direct-input 表示（AI生成フラグ false）", () => {
      const { inputMode, isAIGenerated } = transitionInputMethodChoice("later")
      expect(inputMode).toBe("direct")
      expect(isAIGenerated).toBe(false)
    })
  })

  describe("リセット系", () => {
    it("save → none にリセット", () => {
      const next = transitionSaveComplete()
      expect(next).toBe("none")
      expect(getVisibleComponent(next)).toBe("none")
    })

    it("テスト切替 → none + isAIGenerated false にリセット", () => {
      const result = transitionTestChange()
      expect(result.inputMode).toBe("none")
      expect(result.isAIGenerated).toBe(false)
      expect(getVisibleComponent(result.inputMode)).toBe("none")
    })
  })

  describe("全フロー通し", () => {
    it("none → choice → ai-simple → direct → none", () => {
      let mode: InputMode = "none"
      mode = transitionGoalDecision()
      expect(mode).toBe("choice")

      const step2 = transitionInputMethodChoice("ai-simple")
      mode = step2.inputMode
      expect(mode).toBe("ai-simple")

      const step3 = transitionAIChatComplete()
      mode = step3.inputMode
      expect(mode).toBe("direct")
      expect(step3.isAIGenerated).toBe(true)

      mode = transitionSaveComplete()
      expect(mode).toBe("none")
    })

    it("none → choice → ai-full → cancel → choice → direct → none", () => {
      let mode: InputMode = "none"
      mode = transitionGoalDecision()
      expect(mode).toBe("choice")

      const step2 = transitionInputMethodChoice("ai-full")
      mode = step2.inputMode
      expect(mode).toBe("ai-full")

      mode = transitionAIChatCancel()
      expect(mode).toBe("choice")

      const step3 = transitionInputMethodChoice("direct")
      mode = step3.inputMode
      expect(mode).toBe("direct")
      expect(step3.isAIGenerated).toBe(false)

      mode = transitionSaveComplete()
      expect(mode).toBe("none")
    })

    it("ai-simple 中にテスト切替 → none にリセット", () => {
      let mode: InputMode = "none"
      mode = transitionGoalDecision()
      const step2 = transitionInputMethodChoice("ai-simple")
      mode = step2.inputMode
      expect(mode).toBe("ai-simple")

      const reset = transitionTestChange()
      mode = reset.inputMode
      expect(mode).toBe("none")
      expect(reset.isAIGenerated).toBe(false)
    })
  })
})
