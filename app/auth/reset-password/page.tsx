"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // URLハッシュからトークンを確認
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")

    if (type !== "recovery" || !accessToken) {
      setError("無効なリセットリンクです。もう一度パスワードリセットを申請してください。")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // パスワード検証
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

    // パスワード更新
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)

    // 3秒後にログイン画面へリダイレクト
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                  minLength={6}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "変更中..." : "パスワードを変更"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
