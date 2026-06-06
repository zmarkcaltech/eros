import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/conflicts/[id] - Get a single conflict with details
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

    // Get conflict with all related data
    const { data: conflict, error: conflictError } = await supabase
      .from('conflicts')
      .select(`
        *,
        relationships (
          partner_a_id,
          partner_b_id,
          partner_a:profiles!partner_a_id(full_name),
          partner_b:profiles!partner_b_id(full_name)
        ),
        initiated_by_profile:profiles!initiated_by(full_name),
        perspectives (
          id,
          submitted_by,
          content,
          created_at
        ),
        advice (
          content,
          model,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (conflictError || !conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
    }

    // Verify user is part of this relationship
    const isPartnerA = conflict.relationships.partner_a_id === user.id
    const isPartnerB = conflict.relationships.partner_b_id === user.id

    if (!isPartnerA && !isPartnerB) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Filter perspectives to only show user's own (privacy!)
    const userPerspective = conflict.perspectives.find(p => p.submitted_by === user.id)
    const hasUserSubmitted = !!userPerspective
    const hasPartnerSubmitted = conflict.perspectives.length === 2

    // Return conflict with limited perspective info
    return NextResponse.json({
      conflict: {
        ...conflict,
        // Only return user's own perspective content
        userPerspective: userPerspective || null,
        hasUserSubmitted,
        hasPartnerSubmitted,
        // Remove the full perspectives array to prevent leaking partner's content
        perspectives: undefined,
      }
    })
  } catch (error) {
    console.error('Get conflict error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
