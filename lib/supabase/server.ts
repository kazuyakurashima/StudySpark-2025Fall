import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

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
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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

/**
 * Service Role用Supabaseクライアント（RLSバイパス）
 *
 * 使用場所:
 * - Server Actions（管理者操作、クロステーブルクエリ）
 *
 * 注意:
 * - RLSをバイパスするため、使用前に必ずユーザー権限を検証すること
 * - 機密データへのアクセスには細心の注意を払うこと
 * - SUPABASE_SERVICE_ROLE_KEYが未設定の場合はエラーをスローする
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. This is required for admin operations.')
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
