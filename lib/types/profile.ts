import { UserRole } from "@/lib/constants/avatars"

/**
 * ユーザープロフィール型定義
 */
export interface UserProfile {
  id: string
  nickname: string
  avatar_id: string
  theme_color: string
  role: UserRole
  created_at: string
  updated_at: string
  // 生徒ロールの場合のみ存在する情報
  student?: {
    id: number
    grade: number
    course: "A" | "B" | "C" | "S"
  }
}

/**
 * プロフィール更新用の型
 */
export interface UpdateProfileInput {
  nickname?: string
  avatar_id?: string
  theme_color?: string
}

/**
 * プロフィールバリデーションエラー
 */
export interface ProfileValidationError {
  field: "nickname" | "avatar_id" | "theme_color"
  message: string
}

/**
 * 子供のプロフィール型定義（保護者画面用）
 */
export interface ChildProfile {
  id: number // student_id
  user_id: string
  nickname: string
  avatar_id: string
  theme_color: string
  grade: number
  course: "A" | "B" | "C" | "S"
}
