"use client"

import type React from "react"
import Image from "next/image"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { universalLogin } from "@/app/actions/auth"
import Link from "next/link"

function SuccessMessageHandler({ setSuccessMessage }: { setSuccessMessage: (msg: string | null) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    // 登録完了時のメッセージ表示
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("登録が完了しました。ログインしてください。")
    }
  }, [searchParams, setSuccessMessage])

  return null
}

function LoginPageContent() {
  const [emailOrId, setEmailOrId] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await universalLogin(emailOrId, password)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
    // 成功時は自動リダイレクトされるため、ここでは何もしない
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <SuccessMessageHandler setSuccessMessage={setSuccessMessage} />
      </Suspense>
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <Image
              src="/images/spark-logo.png"
              alt="StudySpark Logo"
              width={96}
              height={96}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">StudySpark</h1>
          <p className="text-muted-foreground">毎日の学習を楽しく記録しよう</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 成功メッセージ */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
                {successMessage}
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            {/* 統合ログインフォーム */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="emailOrId" className="text-base">学習ID / メールアドレス</Label>
                <Input
                  id="emailOrId"
                  type="text"
                  placeholder="akira5"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  required
                  className="h-14 text-base"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 text-base"
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold mt-6"
                disabled={isLoading}
              >
                {isLoading ? "ログイン中..." : "ログイン"}
              </Button>
            </form>

            {/* サインアップ・パスワードリセットリンク */}
            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">または</span>
                </div>
              </div>

              <div className="space-y-2 text-center text-sm">
                <Link
                  href="/register/parent"
                  className="block text-primary hover:text-primary/80 underline transition-colors"
                >
                  保護者アカウント新規登録
                </Link>
                <Link
                  href="/auth/forgot-password"
                  className="block text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  パスワードをお忘れの方
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Account Info */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="space-y-2.5 text-sm">
            <p className="text-xs text-muted-foreground mb-2">
              デモアカウント（11/28まで有効）
            </p>
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-xs">生徒</span>
              <code className="text-xs bg-background px-2.5 py-1 rounded font-mono">akira5 / demo2025</code>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-xs">保護者</span>
              <code className="text-xs bg-background px-2.5 py-1 rounded font-mono">demo-parent2@example.com / Testdemo2025</code>
            </div>
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
              セキュリティのため期間後にパスワードを変更します
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginPageContent />
}
