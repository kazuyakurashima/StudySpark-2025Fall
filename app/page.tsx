"use client"

import type React from "react"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { studentLogin, parentLogin, coachLogin } from "@/app/actions/auth"

export default function LoginPage() {
  const [studentId, setStudentId] = useState("")
  const [studentPassword, setStudentPassword] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [parentPassword, setParentPassword] = useState("")
  const [coachEmail, setCoachEmail] = useState("")
  const [coachPassword, setCoachPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await studentLogin(studentId, studentPassword)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
    // 成功時は自動リダイレクトされるため、ここでは何もしない
  }

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await parentLogin(parentEmail, parentPassword)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  const handleCoachLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await coachLogin(coachEmail, coachPassword)

    if (result?.error) {
      setError(result.error)
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
          <h1 className="text-3xl font-bold text-foreground mb-2">StudySpark</h1>
          <p className="text-muted-foreground">毎日の学習を楽しく記録しよう</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">ログイン</CardTitle>
            <CardDescription className="text-center">ロールを選択してログインしてください</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="student">生徒</TabsTrigger>
                <TabsTrigger value="parent">保護者</TabsTrigger>
                <TabsTrigger value="coach">指導者</TabsTrigger>
              </TabsList>

              {/* エラーメッセージ */}
              {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}

              {/* 生徒ログイン */}
              <TabsContent value="student" className="space-y-4 mt-4">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">ログインID</Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="ログインIDを入力"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentPassword">パスワード</Label>
                    <Input
                      id="studentPassword"
                      type="password"
                      placeholder="パスワードを入力"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
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

              {/* 保護者ログイン */}
              <TabsContent value="parent" className="space-y-4 mt-4">
                <form onSubmit={handleParentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">メールアドレス</Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPassword">パスワード</Label>
                    <Input
                      id="parentPassword"
                      type="password"
                      placeholder="パスワードを入力"
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-medium bg-green-500 hover:bg-green-600 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                  <div className="text-center">
                    <a
                      href="/register/parent"
                      className="text-sm text-primary hover:text-primary/80 underline transition-colors"
                    >
                      保護者アカウントをお持ちでない方はこちら
                    </a>
                  </div>
                </form>
              </TabsContent>

              {/* 指導者ログイン */}
              <TabsContent value="coach" className="space-y-4 mt-4">
                <form onSubmit={handleCoachLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coachEmail">メールアドレス</Label>
                    <Input
                      id="coachEmail"
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={coachEmail}
                      onChange={(e) => setCoachEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coachPassword">パスワード</Label>
                    <Input
                      id="coachPassword"
                      type="password"
                      placeholder="パスワードを入力"
                      value={coachPassword}
                      onChange={(e) => setCoachPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-medium bg-purple-500 hover:bg-purple-600 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
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
            生徒: student5a / password123
            <br />
            保護者: parent1@example.com / password123
            <br />
            指導者: coach1@example.com / password123
          </p>
        </div>
      </div>
    </div>
  )
}
