"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function RegistrationComplete() {
  const router = useRouter()

  useEffect(() => {
    // Create default membership for student
    async function completeSetup() {
      try {
        await fetch('/api/setup/complete', {
          method: 'POST',
        })
      } catch (error) {
        console.error('Error completing setup:', error)
      }
    }
    completeSetup()
  }, [])

  const handleStart = () => {
    router.push("/student")
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

          <div className="pt-4">
            <Button onClick={handleStart} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium">
              始める
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
