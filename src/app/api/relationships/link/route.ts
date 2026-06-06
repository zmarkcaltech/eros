import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/relationships/link - Join an existing relationship (Partner B)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { linkCode } = await request.json()

    if (!linkCode) {
      return NextResponse.json({ error: 'Link code is required' }, { status: 400 })
    }

    // Check if user already has an active relationship
    const { data: existing } = await supabase
      .from('relationships')
      .select('*')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active relationship' },
        { status: 400 }
      )
    }

    // Find relationship with the provided link code
    const { data: relationship, error: fetchError } = await supabase
      .from('relationships')
      .select('*')
      .eq('link_code', linkCode.toUpperCase())
      .eq('status', 'pending')
      .single()

    if (fetchError || !relationship) {
      return NextResponse.json(
        { error: 'Invalid or expired link code' },
        { status: 404 }
      )
    }

    // Prevent linking with yourself
    if (relationship.partner_a_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot link with yourself' },
        { status: 400 }
      )
    }

    // Use service role to update relationship (bypasses RLS)
    // This is safe because we've already validated the link code and user
    const supabaseAdmin = createServiceClient()
    const { error: updateError } = await supabaseAdmin
      .from('relationships')
      .update({
        partner_b_id: user.id,
        status: 'active',
      })
      .eq('id', relationship.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send notification to partner A (using service role)
    await supabaseAdmin.from('notifications').insert({
      user_id: relationship.partner_a_id,
      type: 'partner_linked',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link relationship error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
