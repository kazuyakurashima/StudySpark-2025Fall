"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
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
 * Phase 1: 生徒の達成のみ対応
 * Phase 2: 保護者の応援メッセージも反映
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

  // ロゴのスタイル
  const logoClasses = cn(
    "text-lg md:text-xl font-bold transition-all duration-700",
    level === "none" && "text-gray-700",
    level === "child" &&
      "bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent",
    level === "parent" &&
      "bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent",
    level === "both" &&
      "bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-yellow-400 bg-clip-text text-transparent animate-rainbow-shimmer"
  )

  // ローディング中は通常表示
  if (isLoading) {
    return <h1 className="text-lg md:text-xl font-bold text-gray-700">StudySpark</h1>
  }

  return (
    <div className="flex items-center gap-1">
      <h1 className={logoClasses}>StudySpark</h1>

      {/* Phase 1: 子供の達成のみ */}
      {level === "child" && <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />}

      {/* Phase 2: 保護者の応援（今後実装） */}
      {/* {level === "parent" && <Heart className="w-4 h-4 text-pink-400 animate-pulse" />} */}

      {/* Phase 2: 両方達成（今後実装） */}
      {/* {level === "both" && (
        <div className="flex gap-1">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <Heart
            className="w-4 h-4 text-pink-400 animate-pulse"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      )} */}
    </div>
  )
}
