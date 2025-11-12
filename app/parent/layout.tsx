import { UserProfileProvider } from "@/lib/hooks/use-user-profile"
import { getParentChildren } from "@/app/actions/parent-dashboard"

/**
 * 保護者セクション共通レイアウト
 *
 * UserProfileProvider を配置することで、保護者配下の全ページで
 * 子ども選択状態が共有され、ページ遷移時にリセットされない
 *
 * サーバー側で子供リストを取得し、initialChildren として渡すことで
 * localStorage の検証が正しく機能する
 */
export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // サーバー側で子供リストを取得
  const { children: childrenList } = await getParentChildren()

  // localStorage に保存されている selectedChildId が有効な場合はそれを、
  // そうでない場合は最初の子供の ID を initialSelectedChildId として渡す
  const initialSelectedChildId = childrenList.length > 0 ? childrenList[0].id : undefined

  return (
    <UserProfileProvider
      initialChildren={childrenList}
      initialSelectedChildId={initialSelectedChildId}
    >
      {children}
    </UserProfileProvider>
  )
}
