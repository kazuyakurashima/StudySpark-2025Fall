"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, Check, Hourglass, Sparkles, Trophy } from "lucide-react"
import { hexWithAlpha, isThemeActive } from "@/lib/utils/theme-color"

interface StreakCardProps {
  streak: number
  maxStreak: number
  lastStudyDate: string | null
  todayStudied: boolean
  streakState: "active" | "grace" | "warning" | "reset"
  themeColor?: string
}

/**
 * 時間帯別メッセージを生成
 */
function getTimeBasedMessage(hour: number, streakState: string, todayStudied: boolean): string {
  // 6:00-21:59 通常時間帯
  if (hour >= 6 && hour < 22) {
    if (streakState === "active" && todayStudied) {
      return "今日の記録: 完了"
    } else if (streakState === "grace") {
      return "今日の記録: 未完了 → 記録で継続！"
    } else if (streakState === "reset") {
      return "新しいスタート！ 今日から記録しよう"
    }
  }

  // 22:00-23:59 夜遅め（健康配慮）
  if (hour >= 22 && hour < 24) {
    if (streakState === "active" && todayStudied) {
      return "今日もお疲れさま！ ゆっくり休んでね"
    } else if (streakState === "grace") {
      return "今日の記録: 未完了 → でも、無理しないでね"
    } else if (streakState === "reset") {
      return "また明日から頑張ろう！"
    }
  }

  // 0:00-5:59 深夜〜早朝（健康配慮強め）
  if (hour >= 0 && hour < 6) {
    if (streakState === "active" && todayStudied) {
      return "お疲れさま！ 早く休んでね"
    } else if (streakState === "grace") {
      return "記録は明日でも大丈夫！ まずは休もう"
    } else if (streakState === "reset") {
      return "今は休んで、また明日から頑張ろう"
    }
  }

  return "今日も一緒に頑張ろう！"
}

/**
 * 連続学習日数カード（グレースピリオド & セルフコンパッション対応）
 */
export function StreakCard({
  streak,
  maxStreak,
  lastStudyDate,
  todayStudied,
  streakState,
  themeColor = "default"
}: StreakCardProps) {
  // 現在の時刻を取得（JST）
  const now = new Date()
  const jstHour = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getHours()

  // 時間帯別メッセージ
  const timeMessage = getTimeBasedMessage(jstHour, streakState, todayStudied)

  // 状態別のスタイル設定
  const getStateStyles = () => {
    switch (streakState) {
      case "active":
        // 今日記録済み → 祝福モード（オレンジ〜ゴールド）
        return {
          bgGradient: isThemeActive(themeColor)
            ? `linear-gradient(135deg, ${hexWithAlpha(themeColor, 8)} 0%, ${hexWithAlpha(themeColor, 18)} 100%)`
            : "linear-gradient(135deg, rgba(255, 237, 213, 0.6) 0%, rgba(254, 215, 170, 0.8) 100%)",
          borderColor: isThemeActive(themeColor) ? hexWithAlpha(themeColor, 30) : "rgba(251, 146, 60, 0.3)",
          iconBg: isThemeActive(themeColor) ? hexWithAlpha(themeColor, 15) : "rgba(255, 237, 213, 0.9)",
          iconColor: isThemeActive(themeColor) ? themeColor : "rgb(234, 88, 12)",
          streakColor: isThemeActive(themeColor) ? themeColor : "rgb(234, 88, 12)",
          emoji: "🔥",
          badgeBg: isThemeActive(themeColor) ? hexWithAlpha(themeColor, 12) : "rgba(255, 247, 237, 0.95)",
          badgeText: isThemeActive(themeColor) ? themeColor : "rgb(194, 65, 12)",
          badgeBorder: isThemeActive(themeColor) ? hexWithAlpha(themeColor, 35) : "rgba(251, 146, 60, 0.4)",
          badgeTextShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          animation: "animate-pulse",
        }
      case "grace":
        // グレースピリオド → 励ましモード（イエロー〜オレンジ）
        return {
          bgGradient: "linear-gradient(135deg, rgba(254, 249, 195, 0.6) 0%, rgba(253, 230, 138, 0.8) 100%)",
          borderColor: "rgba(252, 211, 77, 0.4)",
          iconBg: "rgba(254, 249, 195, 0.9)",
          iconColor: "rgb(217, 119, 6)",
          streakColor: "rgb(217, 119, 6)",
          emoji: "⏳",
          badgeBg: "rgba(254, 252, 232, 0.95)",
          badgeText: "rgb(161, 98, 7)",
          badgeBorder: "rgba(252, 211, 77, 0.5)",
          badgeTextShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          animation: "animate-bounce-slow",
        }
      case "reset":
        // リセット → セルフコンパッションモード（パープル〜ピンク）
        return {
          bgGradient: "linear-gradient(135deg, rgba(243, 232, 255, 0.6) 0%, rgba(233, 213, 255, 0.8) 100%)",
          borderColor: "rgba(196, 181, 253, 0.4)",
          iconBg: "rgba(243, 232, 255, 0.9)",
          iconColor: "rgb(147, 51, 234)",
          streakColor: "rgb(147, 51, 234)",
          emoji: "✨",
          badgeBg: "rgba(250, 245, 255, 0.95)",
          badgeText: "rgb(107, 33, 168)",
          badgeBorder: "rgba(196, 181, 253, 0.5)",
          badgeTextShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          animation: "",
        }
      default:
        return {
          bgGradient: "linear-gradient(135deg, rgba(241, 245, 249, 0.6) 0%, rgba(226, 232, 240, 0.8) 100%)",
          borderColor: "rgba(203, 213, 225, 0.4)",
          iconBg: "rgba(241, 245, 249, 0.9)",
          iconColor: "rgb(100, 116, 139)",
          streakColor: "rgb(100, 116, 139)",
          emoji: "📚",
          badgeBg: "rgba(248, 250, 252, 0.95)",
          badgeText: "rgb(71, 85, 105)",
          badgeBorder: "rgba(203, 213, 225, 0.5)",
          badgeTextShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          animation: "",
        }
    }
  }

  const styles = getStateStyles()

  return (
    <Card
      className="shadow-xl backdrop-blur-sm border-2 transition-all duration-300 hover:shadow-2xl"
      style={{
        background: styles.bgGradient,
        borderColor: styles.borderColor,
      }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div
              className="p-2 rounded-full shadow-md transition-transform duration-300 hover:scale-110"
              style={{ backgroundColor: styles.iconBg }}
            >
              <Flame className={`h-6 w-6 ${styles.animation}`} style={{ color: styles.iconColor }} />
            </div>
            <span className="text-slate-800">連続学習</span>
          </CardTitle>
          {maxStreak > 0 && (
            <Badge
              className="border font-semibold px-3 py-1 flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: styles.badgeBg,
                color: styles.badgeText,
                borderColor: styles.badgeBorder,
                textShadow: styles.badgeTextShadow
              }}
            >
              <Trophy className="h-3.5 w-3.5" />
              最高 {maxStreak}日
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* メイン表示: 連続日数 */}
        <div className="flex items-center gap-4">
          <div className="text-6xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>
            {styles.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight" style={{ color: styles.streakColor }}>
                {streak}
              </span>
              <span className="text-2xl font-bold text-slate-600">日連続</span>
            </div>
            {lastStudyDate && streakState !== "reset" && (
              <p className="text-sm text-slate-600 mt-1">
                {streakState === "grace" ? "昨日まで継続中！" : "学習継続中！"}
              </p>
            )}
          </div>
        </div>

        {/* 今日の記録状態 */}
        <div
          className="p-4 rounded-xl border-2 transition-all duration-300"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderColor: styles.borderColor,
            borderStyle: streakState === "grace" ? "dashed" : "solid",
          }}
        >
          <div className="flex items-center gap-3">
            {todayStudied ? (
              <>
                <div
                  className="p-1.5 rounded-full"
                  style={{ backgroundColor: isThemeActive(themeColor) ? hexWithAlpha(themeColor, 15) : "rgba(134, 239, 172, 0.3)" }}
                >
                  <Check
                    className="h-5 w-5 animate-bounce-in"
                    style={{ color: isThemeActive(themeColor) ? themeColor : "rgb(34, 197, 94)" }}
                  />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-800 text-base">{timeMessage}</span>
                </div>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-full" style={{ backgroundColor: styles.iconBg }}>
                  {streakState === "grace" ? (
                    <Hourglass className={`h-5 w-5 ${styles.animation}`} style={{ color: styles.iconColor }} />
                  ) : (
                    <Sparkles className="h-5 w-5" style={{ color: styles.iconColor }} />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-700 text-base">{timeMessage}</span>
                </div>
              </>
            )}
          </div>

          {/* グレースピリオド追加説明 */}
          {streakState === "grace" && (
            <div className="mt-3 text-sm text-slate-600 leading-relaxed bg-yellow-50/50 p-3 rounded-lg border border-yellow-200/50">
              <span className="font-medium">記録すると </span>
              <span className="font-bold" style={{ color: styles.streakColor }}>
                {streak + 1}日連続
              </span>
              <span className="font-medium"> に！</span>
            </div>
          )}

          {/* リセット時のセルフコンパッション */}
          {streakState === "reset" && maxStreak > 0 && (
            <div className="mt-3 text-sm text-slate-600 leading-relaxed bg-purple-50/50 p-3 rounded-lg border border-purple-200/50">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-800">これまでの最高記録</span>
              </div>
              <span className="font-bold text-2xl text-purple-700">{maxStreak}</span>
              <span className="text-purple-600 ml-1">日連続</span>
              <p className="mt-2 text-slate-600">
                また新しい記録を作ろう！
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  )
}
