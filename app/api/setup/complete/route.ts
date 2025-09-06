import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a membership
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!existingMembership) {
      // Create default membership for student
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          role: 'student',
          status: 'active',
          created_at: new Date().toISOString(),
        })

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
        return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Setup complete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}