import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get user info to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user has completed setup
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        const { data: memberships } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')

        const hasProfile = profile && profile.nickname && profile.avatar
        const hasActiveMembership = memberships && memberships.length > 0

        // Redirect based on setup status
        if (!hasProfile) {
          return NextResponse.redirect(`${origin}/setup/parent-avatar`)
        } else if (!hasActiveMembership) {
          return NextResponse.redirect(`${origin}/setup/complete`)
        } else {
          // Get role and redirect to appropriate dashboard
          const role = memberships[0].role
          const roleHome = role === 'parent' ? '/parent' : 
                          role === 'coach' ? '/coach' : 
                          role === 'student' ? '/student' : '/'
          return NextResponse.redirect(`${origin}${roleHome}`)
        }
      }
    }
  }

  // Return to login page with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
}