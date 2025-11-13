/**
 * 環境変数アクセスユーティリティ
 *
 * Next.jsのビルド時undefinedエラーを防ぐための安全なアクセサ
 */

/**
 * クライアント側の環境変数を安全に取得
 *
 * @param key - 環境変数名（NEXT_PUBLIC_プレフィックス付き）
 * @param defaultValue - デフォルト値
 * @returns 環境変数の値、なければデフォルト値
 */
export function getPublicEnv(key: string, defaultValue: string = ""): string {
  if (typeof window === "undefined") {
    // サーバー側: process.env
    return process.env[key] || defaultValue
  } else {
    // クライアント側: ビルド時に埋め込まれた値
    return (process.env[key] as string | undefined) || defaultValue
  }
}

/**
 * Langfuseが有効かチェック（クライアント側で安全に使える）
 */
export function isLangfuseEnabled(): boolean {
  const enabled = getPublicEnv("NEXT_PUBLIC_LANGFUSE_ENABLED", "false")
  return enabled === "true"
}

/**
 * サーバー側の環境変数を安全に取得
 *
 * @param key - 環境変数名
 * @param required - 必須かどうか（trueの場合、なければエラー）
 * @returns 環境変数の値
 * @throws 必須なのに値がない場合
 */
export function getServerEnv(key: string, required: boolean = false): string {
  const value = process.env[key]

  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }

  return value || ""
}

/**
 * 環境変数の存在チェック（ビルド時検証用）
 */
export function validateEnv() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please check your .env.local file.`
    )
  }
}
