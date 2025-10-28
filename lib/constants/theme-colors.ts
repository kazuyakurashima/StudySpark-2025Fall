/**
 * テーマカラー定義
 */

export interface ThemeColor {
  id: number
  name: string
  value: string
}

/**
 * テーマカラー選択肢（7色: デフォルト + 6色）
 */
export const THEME_COLORS: ThemeColor[] = [
  {
    id: 0,
    name: "デフォルト",
    value: "default",
  },
  {
    id: 1,
    name: "ブルー",
    value: "#3B82F6",
  },
  {
    id: 2,
    name: "グリーン",
    value: "#10B981",
  },
  {
    id: 3,
    name: "パープル",
    value: "#8B5CF6",
  },
  {
    id: 4,
    name: "ピンク",
    value: "#EC4899",
  },
  {
    id: 5,
    name: "オレンジ",
    value: "#F59E0B",
  },
  {
    id: 6,
    name: "ティール",
    value: "#14B8A6",
  },
]

/**
 * デフォルトのテーマカラー
 */
export const DEFAULT_THEME_COLOR = "#3B82F6"

/**
 * HEXカラー形式の検証（"default"も許可）
 */
export function isValidHexColor(color: string): boolean {
  return color === "default" || /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * テーマカラーが適用されているかチェック
 */
export function isThemeColorActive(color: string): boolean {
  return color !== "default"
}
