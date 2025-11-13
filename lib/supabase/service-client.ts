import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

/**
 * サービスロールクライアント
 * RLSをバイパスして管理操作を実行
 *
 * 使用場面:
 * - AI生成時のトレース保存
 * - バッチ処理
 * - システム自動処理
 *
 * 注意: ユーザーリクエスト処理では使わない
 */

let serviceClient: ReturnType<typeof createClient<Database>> | null = null

export function createServiceClient() {
  if (serviceClient) {
    return serviceClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
    )
  }

  serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceClient
}

/**
 * サービスクライアントが利用可能かチェック
 */
export function isServiceClientAvailable(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
