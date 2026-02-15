import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Supabase Auth Callback Route Handler
 *
 * メール確認・パスワードリセット等で Supabase が発行する
 * パラメータを受け取り、セッションに交換する。
 *
 * パスワードリセット:
 *   正規フロー（token_hash 方式）ではこの callback を経由せず、
 *   メールリンクから /auth/reset-password に直接遷移する。
 *   Supabase メールテンプレートの変更が必要（後述）。
 *
 *   後方互換（PKCE code 方式）では callback 経由で code を受け取り、
 *   クライアント側ページに転送する（サーバー側 exchange は行わない）。
 *   code_verifier cookie 依存のため Vercel 環境で不安定。
 *
 * その他（メール確認等）:
 *   サーバー側で code/token_hash → セッション交換を行う。
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

  // --- パスワードリセット（recovery）: クライアント側に転送 ---
  // サーバー側で exchange/verify すると code が消費されるリスクがあるため、
  // recovery はすべてクライアント側ページに委譲する。
  const isRecovery = type === "recovery" || next === "/auth/reset-password"

  if (code && isRecovery) {
    return NextResponse.redirect(
      `${origin}/auth/reset-password?code=${encodeURIComponent(code)}`
    )
  }
  if (token_hash && isRecovery) {
    return NextResponse.redirect(
      `${origin}/auth/reset-password?token_hash=${encodeURIComponent(token_hash)}&type=recovery`
    )
  }

  // --- その他のフロー: サーバー側でセッション交換 ---
  let exchangeError: Error | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    exchangeError = error
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    exchangeError = error
  } else {
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
