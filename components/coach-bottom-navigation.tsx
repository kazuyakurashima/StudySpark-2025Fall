"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Flag, Users, MessageCircle } from "lucide-react"

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
    icon: Flag,
    href: "/coach/goal",
  },
  {
    id: "spark",
    label: "応援", // Changed from "管理" to "応援"
    icon: Users,
    href: "/coach/spark",
  },
  {
    id: "reflect",
    label: "リフレクト",
    icon: MessageCircle,
    href: "/coach/reflect",
  },
]

export default function CoachBottomNavigation() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border/50 z-50">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? "text-cyan-600 bg-cyan-50" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
