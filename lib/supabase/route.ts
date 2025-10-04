import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Route Handlers用Supabaseクライアント
 *
 * 使用場所:
 * - API Routes (app/api/**.ts)
 * - Route Handlers
 *
 * 注意:
 * - Route Handlers内ではcookie設定が必ず成功する
 * - Server Actions用にはserver.tsを使用すること
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
