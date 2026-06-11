import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/lovemaps/sessions/[id] - Get session details
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

    // Fetch session with all rounds and question details
    const { data: session, error: sessionError } = await supabase
      .from('love_map_sessions')
      .select(`
        *,
        relationship:relationships(
          id,
          partner_a_id,
          partner_b_id,
          partner_a:profiles!relationships_partner_a_id_fkey(full_name, preferred_name),
          partner_b:profiles!relationships_partner_b_id_fkey(full_name, preferred_name)
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch all rounds for this session with question details
    const { data: rounds, error: roundsError } = await supabase
      .from('love_map_rounds')
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .eq('session_id', id)
      .order('round_number', { ascending: true })

    if (roundsError) {
      console.error('Error fetching rounds:', roundsError)
      return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 })
    }

    // Determine user's role (partner_a or partner_b)
    const relationship = session.relationship as any
    const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'

    return NextResponse.json({ session, rounds, userRole })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/lovemaps/sessions/[id] - Update session (pause, resume, complete)
export async function PATCH(
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
    const { action, tiny_action, learned_items } = await request.json()

    // Validate action
    if (!['pause', 'resume', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Fetch session to verify ownership
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

    // Verify user is part of the relationship
    const relationship = session.relationship as any
    const isPartner = relationship.partner_a_id === user.id || relationship.partner_b_id === user.id
    if (!isPartner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Build update object
    const updates: any = {}

    if (action === 'pause') {
      updates.status = 'paused'
    } else if (action === 'resume') {
      updates.status = 'in_progress'
    } else if (action === 'complete') {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
      if (tiny_action) updates.tiny_action = tiny_action
      if (learned_items) updates.learned_items = learned_items
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('love_map_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
