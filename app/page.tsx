"use client"

import type React from "react"
import Image from "next/image"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const [userId, setUserId] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showCoachCode, setShowCoachCode] = useState(false)
  const [coachCode, setCoachCode] = useState("")
  const [codeValidation, setCodeValidation] = useState<{ isValid: boolean; message: string } | null>(null)

  const validateCoachCode = (code: string) => {
    if (code.length === 0) {
      setCodeValidation(null)
      return
    }

    if (code.length < 6) {
      setCodeValidation({ isValid: false, message: "コードは6文字以上である必要があります" })
      return
    }

    // 簡単な検証ロジック（実際のアプリでは API 呼び出しを行う）
    const validCodes = ["COACH123", "TEACHER456", "MENTOR789"]
    const isValid = validCodes.includes(code.toUpperCase())

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

    // Simulate login process
    setTimeout(() => {
      const isReturningUser = localStorage.getItem("registrationComplete") === "true"

      if (userId.startsWith("student")) {
        if (isReturningUser) {
          window.location.href = "/student"
        } else {
          window.location.href = "/setup/avatar"
        }
      } else if (userId.startsWith("parent")) {
        if (isReturningUser) {
          window.location.href = "/parent"
        } else {
          window.location.href = "/setup/parent-avatar"
        }
      } else if (userId.startsWith("coach")) {
        window.location.href = "/coach"
      } else {
        window.location.href = "/setup/avatar"
      }
      setIsLoading(false)
    }, 1000)
  }

  const handleNewRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    localStorage.removeItem("registrationComplete")

    // Simulate registration process
    setTimeout(() => {
      if (email.includes("student")) {
        window.location.href = "/setup/avatar"
      } else if (email.includes("parent")) {
        window.location.href = "/setup/parent-avatar"
      } else if (email.includes("coach")) {
        window.location.href = "/coach"
      } else {
        window.location.href = "/setup/avatar"
      }
      setIsLoading(false)
    }, 1000)
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
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">ユーザーID</Label>
                    <Input
                      id="userId"
                      type="text"
                      placeholder="ユーザーIDを入力"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      required
                      className="h-12"
                    />
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
                    className="w-full h-12 text-lg font-medium bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                <form onSubmit={handleNewRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">パスワード</Label>
                    <Input
                      id="newPassword"
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
                    className="w-full h-12 text-lg font-medium bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "登録中..." : "新規登録"}
                  </Button>

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
            student1 / parent1 / coach1 で始まるIDを入力してください
            <br />
            <span className="text-xs">指導者コード例: COACH123, TEACHER456, MENTOR789</span>
          </p>
        </div>
      </div>
    </div>
  )
}
