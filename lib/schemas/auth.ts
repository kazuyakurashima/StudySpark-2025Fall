import { z } from 'zod'

// Login form schemas
export const loginSchema = z.object({
  identifier: z.string().min(1, 'ユーザーIDまたはメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
  remember: z.boolean().optional(),
})

export const studentLoginSchema = z.object({
  login_id: z
    .string()
    .min(4, 'ユーザーIDは4文字以上で入力してください')
    .max(20, 'ユーザーIDは20文字以内で入力してください')
    .regex(/^[A-Za-z0-9]+$/, 'ユーザーIDは英数字のみ使用できます'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

export const parentCoachLoginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

// Registration form schemas
export const registrationSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'パスワードは英数字を含む必要があります'),
  inviteCode: z.string().optional(),
})

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .regex(/^(COA|FAM)-[A-Z0-9]{4}-[A-Z0-9]{4}$/, '招待コード形式が正しくありません'),
})

// Profile setup schemas
export const profileSetupSchema = z.object({
  real_name: z.string().min(1, '氏名を入力してください').max(100),
  real_name_kana: z
    .string()
    .regex(/^[あ-んー\s]*$/, 'ひらがなで入力してください')
    .min(1, '氏名（かな）を入力してください')
    .max(100),
  nickname: z.string().min(1, 'ニックネームを入力してください').max(50),
  avatar: z
    .string()
    .regex(/^(student|parent|coach)[1-6]$/, 'アバターを選択してください'),
  grade: z.number().int().min(4).max(6).optional(),
})

export const studentAccountSchema = z.object({
  login_id: z
    .string()
    .min(4, 'ログインIDは4文字以上で入力してください')
    .max(20, 'ログインIDは20文字以内で入力してください')
    .regex(/^[A-Za-z0-9]+$/, 'ログインIDは英数字のみ使用できます'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
  real_name: z.string().min(1, '氏名を入力してください').max(100),
  real_name_kana: z
    .string()
    .regex(/^[あ-んー\s]*$/, 'ひらがなで入力してください')
    .min(1, '氏名（かな）を入力してください')
    .max(100),
  grade: z.number().int().min(4).max(6),
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type StudentLoginInput = z.infer<typeof studentLoginSchema>
export type ParentCoachLoginInput = z.infer<typeof parentCoachLoginSchema>
export type RegistrationInput = z.infer<typeof registrationSchema>
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>
export type ProfileSetupInput = z.infer<typeof profileSetupSchema>
export type StudentAccountInput = z.infer<typeof studentAccountSchema>

// User role types
export type UserRole = 'student' | 'parent' | 'coach' | 'admin'
export type ScopeType = 'family' | 'org'

export interface AuthUser {
  id: string
  email?: string
  login_id?: string
  role: UserRole
  profile?: {
    real_name?: string
    nickname?: string
    avatar?: string
    grade?: number
  }
  memberships: Array<{
    scope_type: ScopeType
    scope_id: string
    role: UserRole
    status: 'active' | 'invited' | 'revoked'
  }>
}