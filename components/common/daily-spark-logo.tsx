"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getDailySparkLevel, type SparkLevel } from "@/lib/utils/daily-spark"

interface DailySparkLogoProps {
  studentId?: number
  parentUserId?: string
}

/**
 * Daily Spark Logo Component
 * 生徒の今日のミッション達成状況に応じてロゴの見た目が変わる
 *
 * 仕様:
 * - 未達成: グレー（text-gray-700）
 * - 達成: 青紫グラデーション（シンプル・イズ・ビューティフル、星は不要）
 *
 * 達成条件（厳格版）:
 * - 指定3科目すべて完了
 * - 月火: 算数、国語、社会
 * - 水木: 算数、国語、理科
 * - 金土: 算数、理科、社会
 * - 日曜: ミッション対象外（常にグレー）
 */
export function DailySparkLogo({ studentId, parentUserId }: DailySparkLogoProps) {
  const [level, setLevel] = useState<SparkLevel>("none")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false)
      return
    }

    const checkLevel = async () => {
      try {
        const newLevel = await getDailySparkLevel(studentId, parentUserId)
        setLevel(newLevel)
      } catch (error) {
        console.error("[DailySparkLogo] Error checking spark level:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkLevel()
  }, [studentId, parentUserId])

  // ローディング中は通常表示
  if (isLoading) {
    return <h1 className="text-lg md:text-xl font-bold text-gray-700">StudySpark</h1>
  }

  // 光るエフェクトの場合はインラインスタイルで確実に表示
  const isGlowing = level === "child" || level === "parent" || level === "both"

  if (isGlowing) {
    return (
      <h1
        className="text-lg md:text-xl font-bold transition-all duration-700"
        style={{
          background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        StudySpark
      </h1>
    )
  }

  return <h1 className="text-lg md:text-xl font-bold text-gray-700">StudySpark</h1>
}
