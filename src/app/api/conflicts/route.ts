import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/conflicts - List all conflicts for user's relationship
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's relationship
    const { data: relationship } = await supabase
      .from('relationships')
      .select('id')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (!relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    // Get all conflicts for this relationship
    const { data: conflicts, error: conflictsError } = await supabase
      .from('conflicts')
      .select(`
        *,
        initiated_by_profile:profiles!initiated_by(full_name),
        perspectives(id, submitted_by),
        advice(id, created_at)
      `)
      .eq('relationship_id', relationship.id)
      .order('created_at', { ascending: false })

    if (conflictsError) {
      return NextResponse.json({ error: conflictsError.message }, { status: 500 })
    }

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('Get conflicts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conflicts - Create a new conflict
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await request.json()

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get user's relationship
    const { data: relationship } = await supabase
      .from('relationships')
      .select('*')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (!relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    // Determine if user is partner A or B
    const isPartnerA = relationship.partner_a_id === user.id
    const initialStatus = isPartnerA ? 'awaiting_partner_a' : 'awaiting_partner_b'

    // Create conflict
    const { data: conflict, error: createError } = await supabase
      .from('conflicts')
      .insert({
        relationship_id: relationship.id,
        title: title.trim(),
        status: initialStatus,
        initiated_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ conflict })
  } catch (error) {
    console.error('Create conflict error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
