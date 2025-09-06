import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const validateInviteSchema = z.object({
  code: z.string().min(6).max(20),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const validatedData = validateInviteSchema.parse(body)

    // Look up invite code
    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .eq('code_hash', validatedData.code) // In production, hash the incoming code
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json({ 
        valid: false, 
        message: '招待コードが見つかりません' 
      })
    }

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ 
        valid: false, 
        message: '招待コードの有効期限が切れています' 
      })
    }

    // Check if invite has reached max uses
    if (invite.used_count >= invite.max_uses) {
      return NextResponse.json({ 
        valid: false, 
        message: '招待コードは既に使用済みです' 
      })
    }

    return NextResponse.json({
      valid: true,
      message: '有効な招待コードです',
      role: invite.role,
      organizationId: invite.organization_id,
    })

  } catch (error) {
    console.error('Validate invite error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        valid: false, 
        message: '無効なリクエストです' 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      valid: false, 
      message: 'サーバーエラーが発生しました' 
    }, { status: 500 })
  }
}