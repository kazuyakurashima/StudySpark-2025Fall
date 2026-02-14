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

  // TODO: デバッグログ（原因特定後に削除）
  console.log("[auth/callback] params:", {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    origin,
    path: url.pathname,
  })

  const cookieStore = await cookies()

  // TODO: デバッグ — code_verifier cookie の存在確認（原因特定後に削除）
  const allCookieNames = cookieStore.getAll().map((c) => c.name)
  const authCookies = allCookieNames.filter((n) => n.includes("sb-") || n.includes("code"))
  console.log("[auth/callback] auth関連cookie名:", authCookies)

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
    console.log("[auth/callback] exchangeCodeForSession 開始")
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    exchangeError = error
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession 失敗:", error.message, error.status)

      // code_verifier が cookie に届かない場合（Vercel 環境など）、
      // クライアント側で exchange するためにリダイレクト
      if (error.message?.includes("code verifier") && next === "/auth/reset-password") {
        console.log("[auth/callback] クライアント側 exchange にフォールバック")
        return NextResponse.redirect(`${origin}/auth/reset-password?code=${code}`)
      }
    }
  } else if (token_hash && type) {
    // token_hash フロー（メールテンプレート設定次第で発生）
    console.log("[auth/callback] verifyOtp 開始:", { type })
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    exchangeError = error
    if (error) {
      console.error("[auth/callback] verifyOtp 失敗:", error.message, error.status)
    }
  } else {
    // code も token_hash もない場合はエラー
    console.warn("[auth/callback] code も token_hash もなし → エラーリダイレクト")
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
  console.error("[auth/callback] 最終エラー → ログインページへリダイレクト:", exchangeError?.message)
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
}
