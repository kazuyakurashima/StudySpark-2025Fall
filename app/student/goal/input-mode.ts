/**
 * ゴールナビ入力モード状態マシン
 *
 * page.tsx の inputMode state 遷移ロジックを純関数として抽出。
 * テストと実装の両方から参照することで、テストのドリフトを防止する。
 */

export type InputMode = "none" | "choice" | "ai-simple" | "ai-full" | "direct"

export type InputMethod = "ai-simple" | "ai-full" | "direct" | "later"

/** 目標決定 → choice メニューを表示 */
export function transitionGoalDecision(): InputMode {
  return "choice"
}

/** 入力方法選択 → 各モードに遷移 */
export function transitionInputMethodChoice(method: InputMethod): {
  inputMode: InputMode
  isAIGenerated: boolean | null // null = 変更なし
} {
  if (method === "ai-simple") {
    return { inputMode: "ai-simple", isAIGenerated: null }
  } else if (method === "ai-full") {
    return { inputMode: "ai-full", isAIGenerated: null }
  } else {
    return { inputMode: "direct", isAIGenerated: false }
  }
}

/** AI対話完了 → direct（AI生成済み） */
export function transitionAIChatComplete(): {
  inputMode: InputMode
  isAIGenerated: true
} {
  return { inputMode: "direct", isAIGenerated: true }
}

/** AI対話キャンセル → choice に復帰 */
export function transitionAIChatCancel(): InputMode {
  return "choice"
}

/** AI生成失敗時の手動入力フォールバック → direct（AI未生成） */
export function transitionFallbackToDirect(): {
  inputMode: InputMode
  isAIGenerated: false
} {
  return { inputMode: "direct", isAIGenerated: false }
}

/** 保存完了 → none にリセット */
export function transitionSaveComplete(): InputMode {
  return "none"
}

/** テスト選択変更 → none にリセット */
export function transitionTestChange(): {
  inputMode: InputMode
  isAIGenerated: false
} {
  return { inputMode: "none", isAIGenerated: false }
}

// ── 表示判定ヘルパー ──

/** 現在のモードで表示すべきコンポーネントを返す */
export function getVisibleComponent(
  mode: InputMode,
): "none" | "choice-menu" | "GoalSimpleChat" | "GoalNavigationChat" | "direct-input" {
  switch (mode) {
    case "none":
      return "none"
    case "choice":
      return "choice-menu"
    case "ai-simple":
      return "GoalSimpleChat"
    case "ai-full":
      return "GoalNavigationChat"
    case "direct":
      return "direct-input"
  }
}
