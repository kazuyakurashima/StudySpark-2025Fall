import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware用セッション更新関数
 *
 * 機能:
 * - 認証トークンのリフレッシュ
 * - リフレッシュしたトークンをServer Componentsに渡す
 * - ブラウザ側のトークンも更新
 *
 * 使用場所:
 * - middleware.ts
 *
 * 重要:
 * - すべてのリクエストで実行される
 * - 認証状態のチェックとリダイレクトはここで行う
 */
export async function updateSession(request: NextRequest) {
  // メンテナンスモードチェック（Supabaseクライアント生成前に判定）
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    const pathname = request.nextUrl.pathname
    // メンテナンスページ、ログインページ、管理者パスは通過させる
    // ログインページ(/)を許可する理由: 管理者がログインして/adminにアクセスするため
    // 非管理者はログイン後に/student等へリダイレクトされ、そこでメンテナンスページに飛ばされる
    if (pathname !== '/maintenance' && pathname !== '/' && !pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.redirect(url)
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 重要: getUser()を呼び出してトークンをリフレッシュ
  // getSession()はサーバー側で使用してはいけない（偽装される可能性）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 認証が必要なパスの定義
  const protectedPaths = ['/student', '/parent', '/coach', '/admin']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // 未認証ユーザーが保護されたパスにアクセスしようとした場合
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーがルートパスにアクセスした場合、ロール別にリダイレクト
  if (user && request.nextUrl.pathname === '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, setup_completed')
      .eq('id', user.id)
      .single()

    if (profile) {
      const url = request.nextUrl.clone()

      // セットアップ未完了の場合
      if (!profile.setup_completed) {
        if (profile.role === 'student') {
          url.pathname = '/setup/avatar'
          return NextResponse.redirect(url)
        } else if (profile.role === 'parent') {
          url.pathname = '/setup/parent-avatar'
          return NextResponse.redirect(url)
        }
      }

      // ロール別ダッシュボードへリダイレクト
      const rolePathMap: Record<string, string> = {
        student: '/student',
        parent: '/parent',
        coach: '/coach',
        admin: '/admin',
      }
      const targetPath = rolePathMap[profile.role]
      if (targetPath) {
        url.pathname = targetPath
        return NextResponse.redirect(url)
      }
    }
    // profile が取得できない場合はログインページを表示（フォールバック）
  }

  return supabaseResponse
}
