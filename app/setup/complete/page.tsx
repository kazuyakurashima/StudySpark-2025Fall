"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { completeSetup } from "@/app/actions/profile"
import { isRedirectError } from "next/dist/client/components/redirect"

export default function RegistrationComplete() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await completeSetup()
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      }
    } catch (e) {
      if (isRedirectError(e)) throw e
      setError("セットアップの完了に失敗しました")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8 space-y-6">
          {/* 登録完了アニメーション */}
          <div className="space-y-4">
            <div className="text-4xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
              登録完了！
            </div>
            <h2 className="text-xl font-semibold text-gray-700">StudySparkへようこそ！</h2>
            <p className="text-gray-600 leading-relaxed">
              これからあなたの学習をサポートします。まずは目標を設定して、学習を始めましょう！
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={handleStart}
              disabled={isLoading}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
            >
              {isLoading ? "準備中..." : "始める"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
