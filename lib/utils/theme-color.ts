/**
 * テーマカラー用のユーティリティ関数
 */

/**
 * HEXカラーをRGBA形式に変換
 * @param hex HEXカラー（例: "#3B82F6"）
 * @param alpha 透明度（0-1）
 * @returns RGBA文字列（例: "rgba(59, 130, 246, 0.15)"）
 */
export function hexToRgba(hex: string, alpha: number): string {
  // "default"の場合は透明を返す
  if (hex === "default") {
    return `rgba(0, 0, 0, 0)`
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * HEXカラーに透明度を追加（HEX8形式）
 * @param hex HEXカラー（例: "#3B82F6"）
 * @param alpha 透明度（0-100）
 * @returns HEX8文字列（例: "#3B82F626" for 15%）
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  if (hex === "default") {
    return "transparent"
  }

  const alphaHex = Math.round((alpha / 100) * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${alphaHex}`
}

/**
 * テーマカラーに対して最適なテキストカラーを取得（白 or 黒）
 * @param hex HEXカラー
 * @returns "#ffffff" または "#000000"
 */
export function getContrastColor(hex: string): "#ffffff" | "#000000" {
  if (hex === "default") {
    return "#000000"
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // 相対輝度を計算（WCAG基準）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? "#000000" : "#ffffff"
}

/**
 * テーマカラーの明度を調整
 * @param hex HEXカラー
 * @param percent 調整パーセント（正の値で明るく、負の値で暗く）
 * @returns 調整後のHEXカラー
 */
export function adjustBrightness(hex: string, percent: number): string {
  if (hex === "default") {
    return "#000000"
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 - value) * (percent / 100))
    return Math.max(0, Math.min(255, adjusted))
  }

  const newR = adjust(r).toString(16).padStart(2, "0")
  const newG = adjust(g).toString(16).padStart(2, "0")
  const newB = adjust(b).toString(16).padStart(2, "0")

  return `#${newR}${newG}${newB}`
}

/**
 * テーマカラー用のCSSスタイルオブジェクトを生成
 * @param themeColor テーマカラー
 * @param options オプション設定
 * @returns CSSスタイルオブジェクト
 */
export function getThemeColorStyles(
  themeColor: string,
  options: {
    type: "background" | "border" | "shadow" | "gradient"
    intensity?: "light" | "medium" | "strong"
  }
): React.CSSProperties {
  // デフォルトの場合は空のスタイルを返す
  if (themeColor === "default") {
    return {}
  }

  const { type, intensity = "medium" } = options

  // 強度に応じた透明度マッピング
  const alphaMap = {
    light: { bg: 8, border: 20, shadow: 10 },
    medium: { bg: 15, border: 30, shadow: 20 },
    strong: { bg: 25, border: 50, shadow: 30 },
  }

  const alpha = alphaMap[intensity]

  switch (type) {
    case "background":
      return {
        backgroundColor: hexWithAlpha(themeColor, alpha.bg),
      }
    case "border":
      return {
        borderColor: hexWithAlpha(themeColor, alpha.border),
      }
    case "shadow":
      return {
        boxShadow: `0 0 0 2px ${hexWithAlpha(themeColor, alpha.shadow)}`,
      }
    case "gradient":
      return {
        background: `linear-gradient(135deg,
          ${hexWithAlpha(themeColor, alphaMap.light.bg)} 0%,
          ${hexWithAlpha(themeColor, alphaMap.medium.bg)} 100%)`,
      }
    default:
      return {}
  }
}

/**
 * テーマカラーがアクティブかどうかをチェック
 * @param themeColor テーマカラー
 * @returns アクティブならtrue
 */
export function isThemeActive(themeColor: string): boolean {
  return themeColor !== "default" && themeColor !== ""
}
