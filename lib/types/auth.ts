export type UserRole = 'student' | 'parent' | 'coach'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  name?: string
  avatar?: string
  created_at: string
  updated_at: string
}

export interface AuthContextType {
  user: any | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, role: UserRole) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
}
