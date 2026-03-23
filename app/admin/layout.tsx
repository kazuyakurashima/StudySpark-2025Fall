import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

/**
 * 管理者画面レイアウト
 * UserProfileProvider を配置することで、管理者配下の全ページで
 * UserProfileHeader（アバター・ログアウト等）が利用可能
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProfileProvider>
      {children}
    </UserProfileProvider>
  )
}
