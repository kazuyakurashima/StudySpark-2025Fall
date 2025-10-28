"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { UserProfile, UpdateProfileInput } from "@/lib/types/profile"
import { getProfile, updateProfileCustomization } from "@/app/actions/profile"

interface UserProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  updateProfile: (input: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>
  refresh: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

/**
 * ユーザープロフィール用プロバイダー
 */
export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    }

    setLoading(false)
  }, [])

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

  return (
    <UserProfileContext.Provider value={{ profile, loading, error, updateProfile, refresh }}>
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
