import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/conflicts/[id]/messages - Get message history for a conflict
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const before = searchParams.get('before') // For pagination

    // Fetch messages (RLS automatically enforces access control)
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(id, full_name)
      `)
      .eq('conflict_id', id)
      .order('created_at', { ascending: true })
      .limit(Math.min(limit, 100)) // Cap at 100 messages

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error: messagesError } = await query

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // If no messages returned and user requested them, verify they have access to this conflict
    if (!messages || messages.length === 0) {
      const { data: conflict, error: conflictError } = await supabase
        .from('conflicts')
        .select(`
          id,
          relationships (
            partner_a_id,
            partner_b_id
          )
        `)
        .eq('id', id)
        .single()

      if (conflictError || !conflict) {
        return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
      }

      const isPartner = conflict.relationships.partner_a_id === user.id ||
                       conflict.relationships.partner_b_id === user.id

      if (!isPartner) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
