"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Heart, BarChart3 } from "lucide-react"

/**
 * コーチ用ボトムナビゲーション（3項目）
 * - ホーム: 生徒一覧 + アラート + 応援待ちサマリー
 * - 応援: 全生徒横断の応援待ちリスト（アクション実行の場）
 * - 分析: 全体傾向・生徒間比較・週次レポート（俯瞰の場）
 *
 * 設定はアバターメニュー（UserProfileHeader）に統合
 */
const tabs = [
  {
    id: "home",
    label: "ホーム",
    icon: Home,
    href: "/coach",
  },
  {
    id: "encouragement",
    label: "応援",
    icon: Heart,
    href: "/coach/encouragement",
  },
  {
    id: "analysis",
    label: "分析",
    icon: BarChart3,
    href: "/coach/analysis",
  },
]

export { CoachBottomNavigation }
export default function CoachBottomNavigation() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-3 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          // ホームは完全一致、他はプレフィックスマッチ
          const isActive = tab.id === "home"
            ? pathname === tab.href
            : pathname?.startsWith(tab.href) ?? false

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-primary bg-primary/5 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
