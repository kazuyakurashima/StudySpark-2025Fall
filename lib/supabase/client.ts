import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Components用Supabaseクライアント
 *
 * 使用場所:
 * - Client Components ('use client'ディレクティブを持つコンポーネント)
 * - ブラウザ側で実行されるコード
 *
 * 注意:
 * - シングルトンパターンで実装（同一インスタンスを再利用）
 * - Realtime subscriptionsを使用する場合はこのクライアントを使用
 */

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return client
}
