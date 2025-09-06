import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const avatarSchema = z.object({
  avatar: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { avatar } = avatarSchema.parse(body)

    // Update user profile with selected avatar
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        avatar: avatar,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error updating avatar:', error)
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Avatar setup error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}