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
    name: "オーシャン",
    value: "#0EA5E9", // Sky 500 - 爽やかで明るい青空色
  },
  {
    id: 2,
    name: "エメラルド",
    value: "#10B981", // Emerald 500 - 鮮やかな宝石緑
  },
  {
    id: 3,
    name: "アメジスト",
    value: "#A855F7", // Purple 500 - 高貴で鮮やかな紫
  },
  {
    id: 4,
    name: "コーラル",
    value: "#F43F5E", // Rose 500 - 温かみのある珊瑚ピンク
  },
  {
    id: 5,
    name: "サンセット",
    value: "#F97316", // Orange 500 - 夕焼けのような鮮やかなオレンジ
  },
  {
    id: 6,
    name: "ターコイズ",
    value: "#06B6D4", // Cyan 500 - 爽やかな青緑（宝石のトルコ石）
  },
]

/**
 * デフォルトのテーマカラー（オーシャン）
 */
export const DEFAULT_THEME_COLOR = "#0EA5E9"

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
