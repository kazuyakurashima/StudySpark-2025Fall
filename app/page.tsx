"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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
      if (userId.startsWith("student")) {
        window.location.href = "/setup/avatar"
      } else if (userId.startsWith("parent")) {
        window.location.href = "/setup/parent-avatar"
      } else if (userId.startsWith("coach")) {
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
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">S</span>
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
                  <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                <form onSubmit={handleNewRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserId">ユーザーID</Label>
                    <Input
                      id="newUserId"
                      type="text"
                      placeholder="新しいユーザーIDを入力"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
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
                  <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
                    {isLoading ? "登録中..." : "新規登録"}
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
            student1 / parent1 / coach1 で始まるIDを入力してください
          </p>
        </div>
      </div>
    </div>
  )
}
