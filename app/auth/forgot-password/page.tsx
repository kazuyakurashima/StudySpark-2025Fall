"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    try {
      const supabase = createClient()

      // resetPasswordForEmail は必ずブラウザ側（createBrowserClient）で呼ぶこと。
      // Server Action 経由だと code_verifier がサーバー側に生成され cookie に保存されない。
      //
      // redirectTo は PKCE code フローで使用される（Supabase が callback に code を付与）。
      // 正規フロー（token_hash 方式）ではメールテンプレート側で直接
      // /auth/reset-password に遷移するため、この redirectTo は使われない。
      // 後方互換のために残している。
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError("予期しないエラーが発生しました。もう一度お試しください。")
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">パスワードリセット</CardTitle>
          <CardDescription>
            登録済みのメールアドレスを入力してください。
            <br />
            パスワードリセット用のリンクをお送りします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  パスワードリセットメールを送信しました。
                  <br />
                  メールに記載されたリンクからパスワードを再設定してください。
                </AlertDescription>
              </Alert>
              <Link href="/" className="block">
                <Button className="w-full" variant="outline">
                  ログイン画面に戻る
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  メールアドレス
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "送信中..." : "リセットメールを送信"}
              </Button>

              <Link href="/" className="block">
                <Button className="w-full" variant="outline" disabled={isLoading}>
                  ログイン画面に戻る
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
