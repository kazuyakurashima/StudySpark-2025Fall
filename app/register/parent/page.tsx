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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"

interface ChildInfo {
  id: string
  grade: string
  fullName: string
  fullNameKana: string
  loginId: string
  password: string
}

export default function ParentRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // 保護者情報
  const [parentFullName, setParentFullName] = useState("")
  const [parentFullNameKana, setParentFullNameKana] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")

  // 子ども情報（複数対応）
  const [children, setChildren] = useState<ChildInfo[]>([
    {
      id: "1",
      grade: "",
      fullName: "",
      fullNameKana: "",
      loginId: "",
      password: "",
    },
  ])

  const addChild = () => {
    setChildren([
      ...children,
      {
        id: Date.now().toString(),
        grade: "",
        fullName: "",
        fullNameKana: "",
        loginId: "",
        password: "",
      },
    ])
  }

  const removeChild = (id: string) => {
    if (children.length > 1) {
      setChildren(children.filter((child) => child.id !== id))
    }
  }

  const updateChild = (id: string, field: keyof ChildInfo, value: string) => {
    setChildren(
      children.map((child) =>
        child.id === id ? { ...child, [field]: value } : child
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション - 保護者情報
    if (!parentFullName || !parentFullNameKana || !email || !password || !passwordConfirm) {
      setError("保護者のすべての項目を入力してください")
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

    // バリデーション - 子ども情報
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (!child.grade || !child.fullName || !child.fullNameKana || !child.loginId || !child.password) {
        setError(`お子様${i + 1}のすべての項目を入力してください`)
        return
      }

      if (child.password.length < 8) {
        setError(`お子様${i + 1}のパスワードは8文字以上で入力してください`)
        return
      }
    }

    // ログインIDの重複チェック
    const loginIds = children.map((child) => child.loginId)
    const uniqueLoginIds = new Set(loginIds)
    if (loginIds.length !== uniqueLoginIds.size) {
      setError("お子様のログインIDが重複しています")
      return
    }

    if (!agreedToTerms) {
      setError("利用規約に同意してください")
      return
    }

    setIsLoading(true)

    try {
      // API呼び出し（保護者と子どもを同時作成）
      const response = await fetch("/api/auth/parent-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: {
            fullName: parentFullName,
            fullNameKana: parentFullNameKana,
            email,
            password,
          },
          children: children.map((child) => ({
            grade: parseInt(child.grade),
            fullName: child.fullName,
            fullNameKana: child.fullNameKana,
            loginId: child.loginId,
            password: child.password,
          })),
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
      <div className="w-full max-w-2xl">
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
              保護者アカウントとお子様のアカウントを同時に作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 保護者情報 */}
              <div className="space-y-4 pb-6 border-b">
                <h3 className="font-semibold text-base text-foreground">保護者の情報</h3>

                <div className="space-y-2">
                  <Label htmlFor="parentFullName">保護者氏名 *</Label>
                  <Input
                    id="parentFullName"
                    type="text"
                    placeholder="山田太郎"
                    value={parentFullName}
                    onChange={(e) => setParentFullName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentFullNameKana">保護者氏名（ふりがな） *</Label>
                  <Input
                    id="parentFullNameKana"
                    type="text"
                    placeholder="やまだたろう"
                    value={parentFullNameKana}
                    onChange={(e) => setParentFullNameKana(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
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
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
              </div>

              {/* 子ども情報（複数対応） */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-foreground">お子様の情報</h3>
                  {children.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addChild}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      お子様を追加
                    </Button>
                  )}
                </div>

                {children.map((child, index) => (
                  <div
                    key={child.id}
                    className="space-y-3 p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">お子様 {index + 1}</h4>
                      {children.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChild(child.id)}
                          className="text-destructive hover:text-destructive/80 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`grade-${child.id}`}>学年 *</Label>
                      <Select
                        value={child.grade}
                        onValueChange={(value) => updateChild(child.id, "grade", value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="学年を選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">小学5年生</SelectItem>
                          <SelectItem value="6">小学6年生</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`fullName-${child.id}`}>お子様氏名 *</Label>
                      <Input
                        id={`fullName-${child.id}`}
                        type="text"
                        placeholder="山田花子"
                        value={child.fullName}
                        onChange={(e) => updateChild(child.id, "fullName", e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`fullNameKana-${child.id}`}>お子様氏名（ふりがな） *</Label>
                      <Input
                        id={`fullNameKana-${child.id}`}
                        type="text"
                        placeholder="やまだはなこ"
                        value={child.fullNameKana}
                        onChange={(e) => updateChild(child.id, "fullNameKana", e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`loginId-${child.id}`}>お子様のログインID *</Label>
                      <Input
                        id={`loginId-${child.id}`}
                        type="text"
                        placeholder="例: hanako123"
                        value={child.loginId}
                        onChange={(e) => updateChild(child.id, "loginId", e.target.value)}
                        required
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        お子様がログインする際に使用するIDです
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`childPassword-${child.id}`}>お子様のパスワード *</Label>
                      <Input
                        id={`childPassword-${child.id}`}
                        type="password"
                        placeholder="8文字以上"
                        value={child.password}
                        onChange={(e) => updateChild(child.id, "password", e.target.value)}
                        required
                        minLength={8}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        8文字以上で入力してください
                      </p>
                    </div>
                  </div>
                ))}
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
