"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft } from "lucide-react"

export default function ParentRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // フォーム状態
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [parentName, setParentName] = useState("")
  const [studentLoginId, setStudentLoginId] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!email || !password || !passwordConfirm || !parentName || !studentLoginId) {
      setError("すべての項目を入力してください")
      return
    }

    if (!email.includes("@")) {
      setError("正しいメールアドレス形式で入力してください")
      return
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください")
      return
    }

    if (password !== passwordConfirm) {
      setError("パスワードが一致しません")
      return
    }

    if (!agreedToTerms) {
      setError("利用規約に同意してください")
      return
    }

    setIsLoading(true)

    try {
      // API呼び出し（既存生徒との紐付け）
      const response = await fetch("/api/auth/parent-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          parentName,
          studentLoginId,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setError(result.error || "登録に失敗しました")
        setIsLoading(false)
        return
      }

      // 成功時はログインページへリダイレクト
      router.push("/?registered=true")
    } catch (err) {
      setError("登録処理中にエラーが発生しました")
      setIsLoading(false)
    }
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
          <h1 className="text-3xl font-bold text-foreground mb-2">保護者アカウント新規登録</h1>
          <p className="text-muted-foreground">お子様の学習をサポートするアカウントを作成します</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">新規登録</CardTitle>
            <CardDescription>
              既にStudySparkで学習しているお子様の学習IDを使って、保護者アカウントを作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 保護者情報 */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-medium text-sm text-muted-foreground">保護者の情報</h3>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentName">保護者氏名 *</Label>
                  <Input
                    id="parentName"
                    type="text"
                    placeholder="山田太郎"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">パスワード *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="8文字以上"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    8文字以上で入力してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">パスワード（確認） *</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="もう一度入力"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
              </div>

              {/* 生徒情報 */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">お子様の情報</h3>

                <div className="space-y-2">
                  <Label htmlFor="studentLoginId">お子様の学習ID *</Label>
                  <Input
                    id="studentLoginId"
                    type="text"
                    placeholder="例: demo-student5"
                    value={studentLoginId}
                    onChange={(e) => setStudentLoginId(e.target.value)}
                    required
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    お子様が既に使用している学習IDを入力してください
                  </p>
                </div>
              </div>

              {/* 利用規約 */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  利用規約とプライバシーポリシーに同意します
                </label>
              </div>

              {/* 登録ボタン */}
              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={isLoading || !agreedToTerms}
              >
                {isLoading ? "登録中..." : "登録する"}
              </Button>
            </form>

            {/* ログインリンク */}
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                既にアカウントをお持ちですか？{" "}
                <Link href="/" className="text-primary hover:text-primary/80 underline">
                  ログイン
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 戻るリンク */}
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
