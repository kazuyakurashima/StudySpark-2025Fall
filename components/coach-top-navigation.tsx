"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Heart, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    id: "home",
    label: "ホーム",
    icon: Home,
    href: "/coach",
  },
  {
    id: "encouragement",
    label: "応援一覧",
    icon: Heart,
    href: "/coach/encouragement",
  },
  {
    id: "students",
    label: "生徒一覧",
    icon: Users,
    href: "/coach/students",
  },
  {
    id: "analysis",
    label: "分析機能",
    icon: BarChart3,
    href: "/coach/analysis",
  },
]

export function CoachTopNavigation() {
  const pathname = usePathname()

  return (
    <div className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.id} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
