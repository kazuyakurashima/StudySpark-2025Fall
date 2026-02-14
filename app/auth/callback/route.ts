import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Supabase Auth Callback Route Handler
 *
 * パスワードリセット・メール確認などで Supabase が発行する
 * ?code=... パラメータを受け取り、セッションに交換する。
 *
 * フロー:
 * 1. ユーザーがメール内リンクをクリック → /auth/callback?code=xxx
 * 2. この Route Handler が code をセッションに交換
 * 3. type に応じて適切なページへリダイレクト
 *
 * 注意:
 * - Vercel 環境では PKCE code_verifier cookie が Route Handler に届かない場合がある
 * - その場合、code をクライアント側ページに渡してブラウザ側で exchange する
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "recovery" | "signup" | "email" | null
  const rawNext = searchParams.get("next") ?? "/"
  // オープンリダイレクト防止: /始まりの内部パスのみ許可
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  const cookieStore = await cookies()
  const supabase = createServerClient(
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
            // Route Handler では cookie 設定が失敗する場合がある
          }
        },
      },
    }
  )

  let exchangeError: Error | null = null

  if (code) {
    // PKCE フロー: code → セッション交換
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    exchangeError = error
    if (error) {
      // code_verifier が cookie に届かない場合（Vercel 環境など）、
      // クライアント側で exchange するためにリダイレクト
      if (error.message?.includes("code verifier") && next === "/auth/reset-password") {
        return NextResponse.redirect(
          `${origin}/auth/reset-password?code=${encodeURIComponent(code)}`
        )
      }
    }
  } else if (token_hash && type) {
    // token_hash フロー（メールテンプレート設定次第で発生）
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    exchangeError = error
  } else {
    // code も token_hash もない場合はエラー
    return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
  }

  if (!exchangeError) {
    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"

    let redirectBase: string
    if (isLocalEnv) {
      redirectBase = origin
    } else if (forwardedHost) {
      redirectBase = `https://${forwardedHost}`
    } else {
      redirectBase = origin
    }

    return NextResponse.redirect(`${redirectBase}${next}`)
  }

  // exchange/verify 失敗時はログインページへ
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
}
