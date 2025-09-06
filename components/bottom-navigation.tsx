"use client"

import { Home, Flag, Zap, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavigationProps {
  activeTab: "home" | "goal" | "spark" | "reflect"
}

const navigationItems = [
  {
    id: "home",
    label: "ホーム",
    icon: Home,
    href: "/student",
  },
  {
    id: "goal",
    label: "ゴールナビ",
    icon: Flag,
    href: "/student/goal",
  },
  {
    id: "spark",
    label: "スパーク",
    icon: Zap,
    href: "/student/spark",
  },
  {
    id: "reflect",
    label: "リフレクト",
    icon: MessageCircle,
    href: "/student/reflect",
  },
]

export function BottomNavigation({ activeTab }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-lg">
      <div className="flex items-center justify-around py-3 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <a
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive
                  ? "text-blue-700 bg-blue-50 font-semibold" // より濃い青色でコントラスト比を改善
                  : "text-slate-600 hover:text-primary hover:bg-slate-50",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
