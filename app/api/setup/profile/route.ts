import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const profileSchema = z.object({
  realName: z.string().min(1).max(100),
  nickname: z.string().min(1).max(12),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('avatar, real_name, nickname')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({
      avatar: profile?.avatar,
      realName: profile?.real_name,
      nickname: profile?.nickname,
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { realName, nickname } = profileSchema.parse(body)

    // Update user profile
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        real_name: realName,
        nickname: nickname,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Profile setup error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}