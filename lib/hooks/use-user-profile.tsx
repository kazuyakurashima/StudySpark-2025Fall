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
  selectedChildId: number | null
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

  // localStorageを優先、なければinitialSelectedChildId、最後にnull
  // ただし、childrenListに存在しない場合は無効とする
  const getInitialSelectedChildId = (): number | null => {
    const availableIds = (initialChildren || []).map(c => c.id)

    if (typeof window !== "undefined") {
      const savedChildId = localStorage.getItem("selectedChildId")
      if (savedChildId) {
        const parsedId = parseInt(savedChildId)
        // localStorageのIDが有効かチェック
        if (availableIds.includes(parsedId)) {
          return parsedId
        }
        // 無効な場合はlocalStorageをクリア
        console.log('[useUserProfile] Invalid savedChildId in localStorage, clearing:', parsedId)
        localStorage.removeItem("selectedChildId")
      }
    }

    // initialSelectedChildIdが有効かチェック
    if (initialSelectedChildId && availableIds.includes(initialSelectedChildId)) {
      return initialSelectedChildId
    }

    // どちらも無効な場合はnull（後でchildrenListから選択）
    return null
  }

  const [selectedChildId, setSelectedChildIdState] = useState<number | null>(getInitialSelectedChildId())

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
        console.log('[useUserProfile] Fetching parent children...')
        const childrenResult = await getParentChildren()
        console.log('[useUserProfile] getParentChildren result:', childrenResult)
        if (!childrenResult.error && childrenResult.children.length > 0) {
          console.log('[useUserProfile] Setting children list:', childrenResult.children)
          setChildrenList(childrenResult.children)

          // 有効な子供IDを選択（localStorage → 最初の子供）
          const availableIds = childrenResult.children.map(c => c.id)
          let validChildId: number | null = null

          // localStorageから復元を試みる
          if (typeof window !== "undefined") {
            const savedChildId = localStorage.getItem("selectedChildId")
            if (savedChildId) {
              const parsedId = parseInt(savedChildId)
              if (availableIds.includes(parsedId)) {
                validChildId = parsedId
                console.log('[useUserProfile] Restored valid child ID from localStorage:', validChildId)
              } else {
                console.log('[useUserProfile] Saved child ID not in current children list, ignoring:', parsedId)
              }
            }
          }

          // localStorageが無効または存在しない場合は最初の子供を選択
          if (!validChildId) {
            validChildId = childrenResult.children[0].id
            console.log('[useUserProfile] Selecting first child as default:', validChildId)
          }

          setSelectedChildIdState(validChildId)
          // localStorageも更新
          if (typeof window !== "undefined") {
            localStorage.setItem("selectedChildId", validChildId.toString())
          }
        } else {
          console.error('[useUserProfile] Failed to load children:', childrenResult.error)
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
        selectedChildId,
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
