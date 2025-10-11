"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Key, Users, Settings, ScrollText } from "lucide-react"

export default function AdminBottomNavigation() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "ダッシュボード",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      name: "監査ログ",
      href: "/admin/audit-logs",
      icon: ScrollText,
      active: pathname === "/admin/audit-logs",
    },
    {
      name: "招待コード",
      href: "/admin/invitation-codes",
      icon: Key,
      active: pathname === "/admin/invitation-codes",
    },
    {
      name: "ユーザー",
      href: "/admin/users",
      icon: Users,
      active: pathname === "/admin/users",
    },
    {
      name: "設定",
      href: "/admin/settings",
      icon: Settings,
      active: pathname === "/admin/settings",
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 transition-colors ${
                  item.active
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-6 w-6 mb-1 ${item.active ? "text-primary" : ""}`} />
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
