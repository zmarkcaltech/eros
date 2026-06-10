import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/messages - Send a message in a relationship chat
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { relationship_id, content } = await request.json()

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < 1) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }

    // Fetch relationship
    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationship_id)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Verify user is a partner in this relationship
    const isPartnerA = relationship.partner_a_id === user.id
    const isPartnerB = relationship.partner_b_id === user.id

    if (!isPartnerA && !isPartnerB) {
      return NextResponse.json({ error: 'Not authorized for this relationship' }, { status: 403 })
    }

    // Check relationship is active
    if (relationship.status !== 'active') {
      return NextResponse.json({ error: 'This relationship is not active' }, { status: 400 })
    }

    // Determine sender_type
    const sender_type = isPartnerA ? 'partner_a' : 'partner_b'

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        relationship_id,
        sender_id: user.id,
        sender_type,
        content: trimmedContent
      })
      .select()
      .single()

    if (messageError) {
      console.error('Message insert error:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Relationship metadata (last_message_at, message_count) is updated automatically by database trigger

    // Trigger AI response generation (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${appUrl}/api/agent/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relationship_id })
    }).catch(err => console.error('Failed to trigger AI response:', err))

    // Send notification to other partner
    const supabaseAdmin = createServiceClient()
    const partnerId = isPartnerA
      ? relationship.partner_b_id
      : relationship.partner_a_id

    await supabaseAdmin.from('notifications').insert({
      user_id: partnerId,
      relationship_id,
      message_id: message.id,
      type: 'new_message'
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
