import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server Components用Supabaseクライアント
 *
 * 使用場所:
 * - Server Components
 * - Server Actions (Route Handlersではroute.tsを使用)
 *
 * 注意:
 * - cookieStore.set()はServer Component内で失敗する可能性があるためtry-catchで囲む
 * - 毎回新しいクライアントインスタンスを作成すること
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentではcookie設定が失敗する場合がある
            // Middlewareでトークンリフレッシュが行われるため問題なし
          }
        },
      },
    }
  )
}
