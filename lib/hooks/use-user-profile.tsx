"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { UserProfile, UpdateProfileInput, ChildProfile } from "@/lib/types/profile"
import { getProfile, updateProfileCustomization } from "@/app/actions/profile"
import { getParentChildren } from "@/app/actions/parent-dashboard"

interface UserProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  updateProfile: (input: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>
  refresh: () => Promise<void>
  // 保護者用：子供リストと選択状態
  children: ChildProfile[]
  selectedChild: ChildProfile | null
  setSelectedChildId: (childId: number) => void
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

interface UserProfileProviderProps {
  children: ReactNode
  // サーバーから渡された初期データ（保護者用）
  initialChildren?: ChildProfile[]
  initialSelectedChildId?: number
}

/**
 * ユーザープロフィール用プロバイダー
 */
export function UserProfileProvider({
  children,
  initialChildren,
  initialSelectedChildId
}: UserProfileProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 保護者用：子供リストと選択状態
  const [childrenList, setChildrenList] = useState<ChildProfile[]>(initialChildren || [])
  const [selectedChildId, setSelectedChildIdState] = useState<number | null>(initialSelectedChildId || null)

  // プロフィール取得
  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getProfile()

    if (result.error) {
      setError(result.error)
      setProfile(null)
    } else {
      setProfile(result.profile)

      // 保護者の場合、子供リストを取得（初期データがない場合のみ）
      if (result.profile?.role === "parent" && !initialChildren) {
        const childrenResult = await getParentChildren()
        if (!childrenResult.error && childrenResult.children.length > 0) {
          setChildrenList(childrenResult.children)
          // 最初の子供をデフォルトで選択（localStorage から復元も可能）
          const savedChildId = typeof window !== "undefined"
            ? localStorage.getItem("selectedChildId")
            : null
          const defaultChildId = savedChildId
            ? parseInt(savedChildId)
            : childrenResult.children[0].id
          setSelectedChildIdState(defaultChildId)
        }
      }
    }

    setLoading(false)
  }, [initialChildren])

  // 初回読み込み
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // プロフィール更新
  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<{ success: boolean; error?: string }> => {
      setError(null)

      const result = await updateProfileCustomization(input)

      if (result.success && result.profile) {
        // ローカル状態を即座に更新（楽観的更新）
        setProfile(result.profile)
        return { success: true }
      } else {
        setError(result.error || "更新に失敗しました")
        return { success: false, error: result.error }
      }
    },
    []
  )

  // 再読み込み
  const refresh = useCallback(() => {
    return fetchProfile()
  }, [fetchProfile])

  // 子供選択ハンドラー
  const setSelectedChildId = useCallback((childId: number) => {
    setSelectedChildIdState(childId)
    // localStorageに保存
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedChildId", childId.toString())
    }
  }, [])

  // 選択中の子供オブジェクト
  const selectedChild = childrenList.find((child) => child.id === selectedChildId) || null

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        updateProfile,
        refresh,
        children: childrenList,
        selectedChild,
        setSelectedChildId,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

/**
 * ユーザープロフィール管理用カスタムフック
 */
export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider")
  }
  return context
}
