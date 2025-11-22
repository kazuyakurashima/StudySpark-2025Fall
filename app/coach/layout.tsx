import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

/**
 * 指導者セクション共通レイアウト
 *
 * UserProfileProvider を配置することで、指導者配下の全ページで
 * プロフィール情報が共有される
 */
export default async function CoachLayout({
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
