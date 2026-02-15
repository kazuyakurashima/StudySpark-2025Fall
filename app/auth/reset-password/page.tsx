"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

/**
 * パスワードリセットページ
 *
 * 正規フロー（token_hash 方式）:
 *   メールリンク → /auth/reset-password?token_hash=xxx&type=recovery
 *   → verifyOtp でセッション確立 → パスワード変更
 *   ※ Supabase メールテンプレートで token_hash 方式を設定する必要あり
 *
 * 後方互換（PKCE code 方式）:
 *   メールリンク → Supabase verify → /auth/callback → /auth/reset-password?code=xxx
 *   → exchangeCodeForSession でセッション確立
 *   ※ code_verifier cookie 依存のため Vercel 環境で不安定
 */

const RESET_ERROR_MESSAGE = "リセットリンクが無効または期限切れです。もう一度パスワードリセットを申請してください。"
const INVALID_LINK_MESSAGE = "無効なリセットリンクです。もう一度パスワードリセットを申請してください。"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initSession = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const tokenHash = params.get("token_hash")
      const type = params.get("type")

      // 正規フロー: token_hash + type=recovery（PKCE code_verifier 不要）
      if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        })
        if (verifyError) {
          console.error("[reset-password] verifyOtp failed:", verifyError.message)
          setError(RESET_ERROR_MESSAGE)
          return
        }
        window.history.replaceState({}, "", "/auth/reset-password")
        setIsSessionReady(true)
        return
      }

      // 後方互換: code パラメータ（PKCE フロー）
      // Supabase クライアントが URL の code を自動交換済みの場合があるため、
      // まず既存セッションを確認する。
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession()

      if (existingSession) {
        if (code) {
          window.history.replaceState({}, "", "/auth/reset-password")
        }
        setIsSessionReady(true)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          // 交換失敗でも、自動交換済みの可能性があるため再確認
          const {
            data: { session: sessionAfterFailedExchange },
          } = await supabase.auth.getSession()
          if (sessionAfterFailedExchange) {
            window.history.replaceState({}, "", "/auth/reset-password")
            setIsSessionReady(true)
            return
          }
          console.error("[reset-password] exchangeCodeForSession failed:", exchangeError.message)
          setError(RESET_ERROR_MESSAGE)
          return
        }
        window.history.replaceState({}, "", "/auth/reset-password")
        setIsSessionReady(true)
        return
      }

      // code も token_hash もない場合
      setError(INVALID_LINK_MESSAGE)
    }

    initSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (newPassword.length < 6) {
      setError("パスワードは6文字以上で設定してください")
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しません")
      setIsLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error("[reset-password] updateUser failed:", updateError.message)
      setError("パスワードの変更に失敗しました。もう一度お試しください。")
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)

    setTimeout(() => {
      router.push("/")
    }, 3000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
          <CardDescription>
            6文字以上の新しいパスワードを入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert>
              <AlertDescription>
                パスワードを変更しました。
                <br />
                3秒後にログイン画面に移動します...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  新しいパスワード
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="6文字以上"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading || !isSessionReady}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  パスワード確認
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="もう一度入力"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !isSessionReady}
                  minLength={6}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !isSessionReady}>
                {isLoading ? "変更中..." : "パスワードを変更"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
