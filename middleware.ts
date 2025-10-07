import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js Middleware
 *
 * 機能:
 * - すべてのリクエストでSupabaseセッションを更新
 * - 認証状態のチェックとリダイレクト
 *
 * 実行対象:
 * - 静的ファイル(_next/static, _next/image)以外のすべてのリクエスト
 * - 画像ファイル(.svg, .png等)以外のすべてのリクエスト
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 以下を除く全てのリクエストパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     * - 画像ファイル拡張子 (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
