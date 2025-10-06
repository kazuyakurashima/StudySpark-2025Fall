"use client"

import { useState } from "react"
import { sendPasswordResetEmail } from "@/app/actions/auth"
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

    const result = await sendPasswordResetEmail(email)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
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
