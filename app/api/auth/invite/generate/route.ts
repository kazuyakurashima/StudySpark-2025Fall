import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const generateInviteSchema = z.object({
  role: z.enum(['parent', 'coach']),
  maxUses: z.number().min(1).max(100).default(1),
  expiresIn: z.number().min(1).max(365).default(30), // days
  organizationId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    // Check authentication and permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to generate invites
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['coach', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = generateInviteSchema.parse(body)

    // Generate unique invite code
    const inviteCode = generateInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validatedData.expiresIn)

    // Create invite record
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        code_hash: inviteCode, // In production, hash this
        role: validatedData.role,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: validatedData.maxUses,
        used_count: 0,
        organization_id: validatedData.organizationId,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    return NextResponse.json({
      inviteCode,
      role: validatedData.role,
      expiresAt: expiresAt.toISOString(),
      maxUses: validatedData.maxUses,
    })

  } catch (error) {
    console.error('Generate invite error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}