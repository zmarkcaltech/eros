import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lovemaps/rounds/[id]/answer - Submit private answer (answering partner only)
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
    const { private_answer } = await request.json()

    // Validate answer
    if (!private_answer || typeof private_answer !== 'string' || private_answer.trim().length === 0) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
    }

    const trimmedAnswer = private_answer.trim()
    if (trimmedAnswer.length > 500) {
      return NextResponse.json({ error: 'Answer too long (max 500 characters)' }, { status: 400 })
    }

    // Fetch round with session and relationship info
    const { data: round, error: roundError } = await supabase
      .from('love_map_rounds')
      .select(`
        *,
        session:love_map_sessions(
          *,
          relationship:relationships(partner_a_id, partner_b_id)
        )
      `)
      .eq('id', id)
      .single()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Check round status
    if (round.status !== 'awaiting_answer') {
      return NextResponse.json({ error: 'Round is not awaiting answer' }, { status: 400 })
    }

    // Verify user is the answering partner
    const session = round.session as any
    const relationship = session.relationship
    const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'

    if (userRole !== round.answering_partner) {
      return NextResponse.json({ error: 'Not your turn to answer' }, { status: 403 })
    }

    // Update round with answer and change status
    const { data: updatedRound, error: updateError } = await supabase
      .from('love_map_rounds')
      .update({
        private_answer: trimmedAnswer,
        status: 'awaiting_guess'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating round:', updateError)
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
    }

    return NextResponse.json({ round: updatedRound })
  } catch (error) {
    console.error('Submit answer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
