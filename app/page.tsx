"use client"

import type React from "react"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { universalLogin } from "@/app/actions/auth"
import Link from "next/link"

export default function LoginPage() {
  const [emailOrId, setEmailOrId] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">ログイン</CardTitle>
            <CardDescription className="text-center">
              メールアドレスまたは学習IDでログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* エラーメッセージ */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            {/* 統合ログインフォーム */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailOrId">メールアドレス / 学習ID</Label>
                <Input
                  id="emailOrId"
                  type="text"
                  placeholder="例: student001 または parent@example.com"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  required
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  生徒の方は学習ID（例: student001）、保護者・指導者の方はメールアドレスを入力してください
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
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

        {/* Demo Instructions */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            <strong className="text-foreground">デモアカウント</strong>
            <br />
            <span className="text-xs mt-2 block">生徒（小5）</span>
            <strong>demo-student5</strong> / demo2024
            <br />
            <span className="text-xs mt-1 block">生徒（小6）</span>
            <strong>demo-student6</strong> / demo2024
            <br />
            <span className="text-xs mt-1 block">保護者</span>
            <strong>demo-parent@example.com</strong> / demo2024
          </p>
        </div>
      </div>
    </div>
  )
}
