import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role to bypass RLS for dev testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { relationshipId, senderId, senderType, content } = await request.json()

    if (!relationshipId || !senderId || !senderType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the relationship exists and sender is valid
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('partner_a_id, partner_b_id')
      .eq('id', relationshipId)
      .single()

    if (relError || !relationship) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      )
    }

    // Verify sender matches the relationship
    const validSender =
      (senderType === 'partner_a' && senderId === relationship.partner_a_id) ||
      (senderType === 'partner_b' && senderId === relationship.partner_b_id)

    if (!validSender) {
      return NextResponse.json(
        { error: 'Invalid sender for this relationship' },
        { status: 400 }
      )
    }

    // Insert message using service role (bypasses RLS)
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        relationship_id: relationshipId,
        sender_id: senderId,
        sender_type: senderType,
        content
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    // Trigger AI response generation (fire-and-forget) - same as real app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${appUrl}/api/agent/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relationship_id: relationshipId })
    }).catch(err => console.error('Failed to trigger AI response:', err))

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
