/**
 * 共通アバターURL解決ユーティリティ
 * lib/constants/avatars.ts のマッピングを活用し、一貫したアバター表示を提供
 */
import { STUDENT_AVATARS, PARENT_AVATARS, COACH_AVATARS } from "@/lib/constants/avatars"

// 全アバターを結合したマップを事前に作成（パフォーマンス最適化）
const ALL_AVATARS = [...STUDENT_AVATARS, ...PARENT_AVATARS, ...COACH_AVATARS]
const AVATAR_MAP = new Map(ALL_AVATARS.map(a => [a.id, a.src]))

/**
 * アバターIDからURLを解決
 *
 * @param avatarId - アバターID (例: "coach1", "parent2", "student3") または HTTP URL
 * @param role - 送信者のロール ("coach" | "parent" | "student") - フォールバック決定に使用
 * @returns アバター画像のURL
 *
 * @example
 * getAvatarUrl("coach1", "coach")  // → "/images/coach1.png"
 * getAvatarUrl("parent2", "parent") // → "https://...parent2..."
 * getAvatarUrl(null, "coach")       // → "/images/coach1.png" (フォールバック)
 * getAvatarUrl(null, undefined)     // → "https://...student1..." (デフォルト)
 */
export function getAvatarUrl(avatarId: string | null | undefined, role?: string): string {
  // 1. HTTP URLはそのまま返す（カスタムアバター対応）
  if (avatarId?.startsWith("http")) {
    return avatarId
  }

  // 2. マッピングから検索
  if (avatarId) {
    const found = AVATAR_MAP.get(avatarId)
    if (found) return found
  }

  // 3. ロール別フォールバック
  switch (role) {
    case "coach":
      return COACH_AVATARS[0].src   // coach1: /images/coach1.png
    case "parent":
      return PARENT_AVATARS[0].src  // parent1: Blob URL
    case "student":
    default:
      return STUDENT_AVATARS[0].src // student1: Blob URL
  }
}

/**
 * アバターIDが有効かどうかをチェック
 *
 * @param avatarId - チェックするアバターID
 * @returns 有効なアバターIDの場合true
 */
export function isValidAvatarId(avatarId: string | null | undefined): boolean {
  if (!avatarId) return false
  if (avatarId.startsWith("http")) return true
  return AVATAR_MAP.has(avatarId)
}
