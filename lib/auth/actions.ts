// Client-side authentication actions  
import { createClient } from '@/lib/supabase/client'
import { 
  studentLoginSchema, 
  parentCoachLoginSchema, 
  registrationSchema,
  type StudentLoginInput,
  type ParentCoachLoginInput,
  type RegistrationInput 
} from '@/lib/schemas/auth'

export async function studentLogin(data: StudentLoginInput) {
  const supabase = createClient()
  
  try {
    // Validate input
    const validatedData = studentLoginSchema.parse(data)
    
    // Use Edge Function for student authentication
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/student-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        login_id: validatedData.login_id,
        password: validatedData.password,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return { success: false, error: result.error || 'ログインIDまたはパスワードが正しくありません' }
    }

    // Set the session with the returned tokens
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.token,
      refresh_token: result.refresh_token,
    })

    if (sessionError) {
      return { success: false, error: 'セッションの設定に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('Student login error:', error)
    return { success: false, error: 'ログインに失敗しました' }
  }
}

export async function parentCoachLogin(data: ParentCoachLoginInput) {
  const supabase = createClient()
  
  try {
    // Validate input
    const validatedData = parentCoachLoginSchema.parse(data)
    
    const { data: user, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    })

    if (error) {
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' }
    }

    return { success: true }
  } catch (error) {
    console.error('Parent/Coach login error:', error)
    return { success: false, error: 'ログインに失敗しました' }
  }
}

export async function registerUser(data: RegistrationInput) {
  const supabase = createClient()
  
  try {
    // Validate input
    const validatedData = registrationSchema.parse(data)
    
    // Check invite code if provided
    let role = 'parent' // Default role
    if (validatedData.inviteCode) {
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('role, expires_at, used_count, max_uses')
        .eq('code_hash', validatedData.inviteCode) // In production, hash the code
        .single()
      
      if (inviteError || !invite) {
        return { success: false, error: '招待コードが無効です' }
      }
      
      if (new Date(invite.expires_at) < new Date()) {
        return { success: false, error: '招待コードの有効期限が切れています' }
      }
      
      if (invite.used_count >= invite.max_uses) {
        return { success: false, error: '招待コードは既に使用されています' }
      }
      
      role = invite.role
    }

    // Create user account
    const { data: user, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: role,
          invite_code: validatedData.inviteCode,
        }
      }
    })

    if (error) {
      return { success: false, error: 'アカウントの作成に失敗しました' }
    }

    return { success: true, needsEmailConfirmation: true }
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, error: '登録に失敗しました' }
  }
}


export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/'
}