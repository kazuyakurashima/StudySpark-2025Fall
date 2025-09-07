"use client"

import type React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/hooks/useAuth"
import type { UserRole } from "@/lib/types/auth"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp, user, profile, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showCoachCode, setShowCoachCode] = useState(false)
  const [coachCode, setCoachCode] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole>('student')
  const [error, setError] = useState<string | null>(null)
  const [codeValidation, setCodeValidation] = useState<{ isValid: boolean; message: string } | null>(null)

  const validateCoachCodeSync = (code: string): boolean => {
    const validCodes = ["COACH123", "TEACHER456", "MENTOR789"]
    return code.length >= 6 && validCodes.includes(code.toUpperCase())
  }

  const validateCoachCode = (code: string) => {
    if (code.length === 0) {
      setCodeValidation(null)
      return
    }

    if (code.length < 6) {
      setCodeValidation({ isValid: false, message: "コードは6文字以上である必要があります" })
      return
    }

    const isValid = validateCoachCodeSync(code)
    setCodeValidation({
      isValid,
      message: isValid ? "有効なコードです" : "無効なコードです",
    })
  }

  const handleCoachCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCoachCode(value)
    validateCoachCode(value)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate coach code if role is coach
    if (selectedRole === 'coach' && !validateCoachCodeSync(coachCode)) {
      setError('有効な指導者コードを入力してください。')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await signUp(email, password, selectedRole, coachCode || undefined)
      if (error) {
        setError('登録に失敗しました。入力内容を確認してください。')
      }
    } catch (err) {
      setError('登録中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user && profile) {
      const isReturningUser = localStorage.getItem("registrationComplete") === "true"
      
      if (profile.role === 'student') {
        router.push(isReturningUser ? '/student' : '/setup/avatar')
      } else if (profile.role === 'parent') {
        router.push(isReturningUser ? '/parent' : '/setup/parent-avatar')
      } else if (profile.role === 'coach') {
        router.push('/coach')
      }
    }
  }, [user, profile, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
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
            <CardTitle className="text-2xl text-center">アカウント</CardTitle>
            <CardDescription className="text-center">ログインまたは新規登録</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginEmail">メールアドレス</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginPassword">パスワード</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      placeholder="パスワードを入力"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                <form onSubmit={handleNewRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="registerRole">ユーザータイプ</Label>
                    <select
                      id="registerRole"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="w-full h-12 px-3 border border-input bg-background rounded-md text-sm"
                      required
                    >
                      <option value="student">学生</option>
                      <option value="parent">保護者</option>
                      <option value="coach">指導者</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">メールアドレス</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">パスワード</Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      placeholder="パスワードを入力（8文字以上）"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
                    {isLoading ? "登録中..." : "新規登録"}
                  </Button>

                  {selectedRole === 'coach' && (
                    <div className="space-y-2">
                      <Label htmlFor="coachCode">指導者コード（必須）</Label>
                      <Input
                        id="coachCode"
                        type="text"
                        placeholder="指導者コードを入力"
                        value={coachCode}
                        onChange={handleCoachCodeChange}
                        required
                        className="h-10"
                      />
                      {codeValidation && (
                        <p className={`text-xs ${codeValidation.isValid ? "text-green-600" : "text-red-600"}`}>
                          {codeValidation.message}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedRole !== 'coach' && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setShowCoachCode(!showCoachCode)}
                        className="text-primary hover:text-primary/80 underline text-sm transition-colors"
                      >
                        指導者コード/招待リンクをお持ちの方
                      </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showCoachCode ? "max-h-32 opacity-100 mt-3" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="coachCode">指導者コード</Label>
                        <Input
                          id="coachCode"
                          type="text"
                          placeholder="指導者コードを入力"
                          value={coachCode}
                          onChange={handleCoachCodeChange}
                          className="h-10"
                        />
                        {codeValidation && (
                          <p className={`text-xs ${codeValidation.isValid ? "text-green-600" : "text-red-600"}`}>
                            {codeValidation.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Demo Instructions */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            <strong>デモ用:</strong>
            <br />
            任意のメールアドレスとパスワード（8文字以上）で登録できます
            <br />
            <span className="text-xs">指導者コード例: COACH123, TEACHER456, MENTOR789</span>
          </p>
        </div>
      </div>
    </div>
  )
}
