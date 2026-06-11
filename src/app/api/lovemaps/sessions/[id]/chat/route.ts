import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/lovemaps/sessions/[id]/chat - Get chat messages for session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch session to get relationship_id
    const { data: session, error: sessionError } = await supabase
      .from('love_map_sessions')
      .select('relationship_id')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch chat messages from new relationship chat table
    const { data: messages, error: messagesError } = await supabase
      .from('relationship_chat_messages')
      .select('*')
      .eq('relationship_id', session.relationship_id)
      .order('created_at', { ascending: true })
      .limit(100)

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

// POST /api/lovemaps/sessions/[id]/chat - Send chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    if (trimmedContent.length > 200) {
      return NextResponse.json({ error: 'Message too long (max 200 characters)' }, { status: 400 })
    }

    // Fetch session to verify ownership and get relationship
    const { data: session, error: sessionError } = await supabase
      .from('love_map_sessions')
      .select(`
        *,
        relationship:relationships(partner_a_id, partner_b_id)
      `)
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is a partner
    const relationship = session.relationship as any
    const isPartnerA = relationship.partner_a_id === user.id
    const isPartnerB = relationship.partner_b_id === user.id

    if (!isPartnerA && !isPartnerB) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Determine sender_type
    const sender_type = isPartnerA ? 'partner_a' : 'partner_b'

    // Insert message into relationship chat table
    const { data: message, error: messageError } = await supabase
      .from('relationship_chat_messages')
      .insert({
        relationship_id: session.relationship_id,
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
