"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Flag, Heart, MessageCircle } from "lucide-react"

const tabs = [
  {
    id: "home",
    label: "ホーム",
    icon: Home,
    href: "/parent",
  },
  {
    id: "goal",
    label: "ゴールナビ",
    icon: Flag,
    href: "/parent/goal",
  },
  {
    id: "encouragement",
    label: "応援",
    icon: Heart,
    href: "/parent/encouragement",
  },
  {
    id: "reflect",
    label: "リフレクト",
    icon: MessageCircle,
    href: "/parent/reflect",
  },
]

export function ParentBottomNavigation({ activeTab, selectedChildId }: { activeTab?: string, selectedChildId?: number | null } = {}) {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border/50 z-50">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab ? activeTab === tab.id : pathname === tab.href
          // 子どもIDをクエリパラメータとして追加
          const href = selectedChildId ? `${tab.href}?child=${selectedChildId}` : tab.href

          return (
            <Link
              key={tab.id}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? "text-blue-700 bg-blue-50" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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

export default ParentBottomNavigation
