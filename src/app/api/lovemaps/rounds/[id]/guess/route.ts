import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lovemaps/rounds/[id]/guess - Submit guess (guessing partner only)
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
    const { guess } = await request.json()

    // Validate guess
    if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
      return NextResponse.json({ error: 'Guess is required' }, { status: 400 })
    }

    const trimmedGuess = guess.trim()
    if (trimmedGuess.length > 500) {
      return NextResponse.json({ error: 'Guess too long (max 500 characters)' }, { status: 400 })
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
    if (round.status !== 'awaiting_guess') {
      return NextResponse.json({ error: 'Round is not awaiting guess' }, { status: 400 })
    }

    // Verify user is the guessing partner (opposite of answering partner)
    const session = round.session as any
    const relationship = session.relationship
    const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'
    const guessingPartner = round.answering_partner === 'partner_a' ? 'partner_b' : 'partner_a'

    if (userRole !== guessingPartner) {
      return NextResponse.json({ error: 'Not your turn to guess' }, { status: 403 })
    }

    // Update round with guess and change status
    const { data: updatedRound, error: updateError } = await supabase
      .from('love_map_rounds')
      .update({
        guess: trimmedGuess,
        status: 'awaiting_rating'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating round:', updateError)
      return NextResponse.json({ error: 'Failed to save guess' }, { status: 500 })
    }

    // Return both answer and guess for reveal
    return NextResponse.json({
      round: updatedRound,
      private_answer: round.private_answer,
      guess: trimmedGuess
    })
  } catch (error) {
    console.error('Submit guess error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
