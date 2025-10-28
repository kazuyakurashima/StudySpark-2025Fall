"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { hexWithAlpha, isThemeActive } from "@/lib/utils/theme-color"

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  actions?: React.ReactNode
  variant?: "student" | "parent"
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  variant = "student",
  className,
}: PageHeaderProps) {
  const { profile } = useUserProfile()
  const themeColor = profile?.theme_color || "default"

  return (
    <div
      className={cn(
        // ブラー効果
        "backdrop-blur-xl",
        // ボーダー
        "border-b",
        // シャドウ
        "shadow-sm",
        // パディング: レスポンシブ
        "px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6",
        // デフォルトの背景とボーダー（テーマカラーがない場合）
        !isThemeActive(themeColor) && "bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] border-border/30",
        className
      )}
      style={
        isThemeActive(themeColor)
          ? {
              backgroundImage: `linear-gradient(to bottom right, ${hexWithAlpha(themeColor, 3)}, ${hexWithAlpha(themeColor, 8)})`,
              borderBottomColor: hexWithAlpha(themeColor, 30),
            }
          : {}
      }
      data-variant={variant}
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
          {/* タイトルセクション */}
          <div className="flex items-center gap-3">
            {/* アイコンコンテナ */}
            <div
              className={cn(
                "flex items-center justify-center p-2 rounded-xl shrink-0",
                !isThemeActive(themeColor) && "bg-primary/10"
              )}
              style={
                isThemeActive(themeColor)
                  ? { backgroundColor: hexWithAlpha(themeColor, 10) }
                  : {}
              }
            >
              <Icon
                className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6",
                  !isThemeActive(themeColor) && "text-primary"
                )}
                style={
                  isThemeActive(themeColor)
                    ? { color: themeColor }
                    : {}
                }
                aria-hidden="true"
              />
            </div>

            {/* タイトル・サブタイトル */}
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* アクションエリア */}
          {actions && (
            <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
