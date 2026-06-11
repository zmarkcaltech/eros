import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/lovemaps/chat - Fetch relationship chat history
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (relError || !relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    // Fetch chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('relationship_chat_messages')
      .select('*')
      .eq('relationship_id', relationship.id)
      .order('created_at', { ascending: true })
      .limit(100) // Last 100 messages

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/lovemaps/chat - Send persistent chat message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { content } = await request.json()

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 })
    }

    // Fetch user's active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('id, partner_a_id, partner_b_id')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (relError || !relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    // Determine sender type
    const sender_type = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('relationship_chat_messages')
      .insert({
        relationship_id: relationship.id,
        sender_id: user.id,
        sender_type,
        content: trimmedContent
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error sending message:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Send chat message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
