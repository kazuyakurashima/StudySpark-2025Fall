/**
 * アバター定義
 * 既存のセットアップフローで使用されているアバターと同一
 */

export interface Avatar {
  id: string
  name: string
  src: string
}

export type UserRole = "student" | "parent" | "coach" | "admin"

/**
 * 生徒用アバター（6種類）
 */
export const STUDENT_AVATARS: Avatar[] = [
  {
    id: "student1",
    name: "スマイルボーイ",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
  },
  {
    id: "student2",
    name: "ハッピーガール",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
  },
  {
    id: "student3",
    name: "クールキッズ",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
  },
  {
    id: "student4",
    name: "スマートガール",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
  },
  {
    id: "student5",
    name: "チャレンジャー",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
  },
  {
    id: "student6",
    name: "ピースメーカー",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
  },
]

/**
 * 保護者用アバター（6種類）
 */
export const PARENT_AVATARS: Avatar[] = [
  {
    id: "parent1",
    name: "保護者1",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
  },
  {
    id: "parent2",
    name: "保護者2",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
  },
  {
    id: "parent3",
    name: "保護者3",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
  },
  {
    id: "parent4",
    name: "保護者4",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
  },
  {
    id: "parent5",
    name: "保護者5",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
  },
  {
    id: "parent6",
    name: "保護者6",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
  },
]

/**
 * ロール別にアバターリストを取得
 */
export function getAvatarsByRole(role: UserRole): Avatar[] {
  switch (role) {
    case "student":
      return STUDENT_AVATARS
    case "parent":
      return PARENT_AVATARS
    case "coach":
    case "admin":
      // 暫定: 保護者用を流用
      return PARENT_AVATARS
    default:
      return STUDENT_AVATARS
  }
}

/**
 * アバターIDからアバター情報を取得
 */
export function getAvatarById(avatarId: string): Avatar | undefined {
  const allAvatars = [...STUDENT_AVATARS, ...PARENT_AVATARS]
  return allAvatars.find((avatar) => avatar.id === avatarId)
}

/**
 * ロール別のデフォルトアバターIDを取得
 */
export function getDefaultAvatarId(role: UserRole): string {
  switch (role) {
    case "student":
      return "student1"
    case "parent":
      return "parent1"
    case "coach":
    case "admin":
      return "parent1"
    default:
      return "student1"
  }
}
