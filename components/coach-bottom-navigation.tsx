"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Target, Heart, BarChart3 } from "lucide-react"

const tabs = [
  {
    id: "home",
    label: "ホーム",
    icon: Home,
    href: "/coach",
  },
  {
    id: "goal",
    label: "ゴールナビ",
    icon: Target,
    href: "/coach/goal",
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          // ホームは完全一致、他はプレフィックスマッチ
          const isActive = tab.id === "home"
            ? pathname === tab.href
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
