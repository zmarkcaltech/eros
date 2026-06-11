import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lovemaps/rounds/[id]/reflect - Submit reflection (guessing partner only)
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
    const { reflection, felt_good } = await request.json()

    // Validate reflection
    if (!reflection || typeof reflection !== 'string' || reflection.trim().length === 0) {
      return NextResponse.json({ error: 'Reflection is required' }, { status: 400 })
    }

    const trimmedReflection = reflection.trim()
    if (trimmedReflection.length > 500) {
      return NextResponse.json({ error: 'Reflection too long (max 500 characters)' }, { status: 400 })
    }

    // Fetch round with session info
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
    if (round.status !== 'awaiting_reflection') {
      return NextResponse.json({ error: 'Round is not awaiting reflection' }, { status: 400 })
    }

    // Verify user is the guessing partner
    const session = round.session as any
    const relationship = session.relationship
    const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'
    const guessingPartner = round.answering_partner === 'partner_a' ? 'partner_b' : 'partner_a'

    if (userRole !== guessingPartner) {
      return NextResponse.json({ error: 'Only guessing partner can reflect' }, { status: 403 })
    }

    // Award Care Coin if felt_good is true
    const careCoinAwarded = felt_good === true

    // Update round with reflection
    const { data: updatedRound, error: updateError } = await supabase
      .from('love_map_rounds')
      .update({
        reflection: trimmedReflection,
        care_coin_awarded: careCoinAwarded,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating round:', updateError)
      return NextResponse.json({ error: 'Failed to save reflection' }, { status: 500 })
    }

    // Update session with Care Coin if awarded
    if (careCoinAwarded) {
      await supabase
        .from('love_map_sessions')
        .update({
          care_coins: session.care_coins + 1
        })
        .eq('id', session.id)
    }

    // Check if this was the last round
    const isLastRound = round.round_number >= session.total_rounds

    if (isLastRound) {
      // Session complete
      return NextResponse.json({
        round: updatedRound,
        sessionComplete: true,
        sessionId: session.id
      })
    }

    // Create next round
    // Switch answerer for next round
    const nextAnswerer = round.answering_partner === 'partner_a' ? 'partner_b' : 'partner_a'

    // Get random question for next round
    let categoryFilter = []
    if (session.mode === 'daily') {
      categoryFilter = ['daily_life', 'affection_romance']
    } else if (session.mode === 'repair') {
      categoryFilter = ['stress_support', 'conflict_repair']
    } else if (session.mode === 'patch_notes') {
      categoryFilter = ['patch_notes', 'dreams_identity']
    } else {
      categoryFilter = ['daily_life', 'stress_support', 'affection_romance', 'history', 'dreams_identity', 'play_humor']
    }

    const { data: questions } = await supabase
      .from('love_map_questions')
      .select('id')
      .in('category', categoryFilter)
      .eq('depth', session.depth)

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 500 })
    }

    // Pick random question
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)]

    // Create next round
    const { data: nextRound, error: nextRoundError } = await supabase
      .from('love_map_rounds')
      .insert({
        session_id: session.id,
        round_number: round.round_number + 1,
        question_id: randomQuestion.id,
        answering_partner: nextAnswerer,
        status: 'awaiting_answer'
      })
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .single()

    if (nextRoundError) {
      console.error('Error creating next round:', nextRoundError)
      return NextResponse.json({ error: 'Failed to create next round' }, { status: 500 })
    }

    // Update session current_round and current_answerer
    await supabase
      .from('love_map_sessions')
      .update({
        current_round: round.round_number + 1,
        current_answerer: nextAnswerer
      })
      .eq('id', session.id)

    return NextResponse.json({
      round: updatedRound,
      nextRound,
      sessionComplete: false,
      careCoinAwarded
    })
  } catch (error) {
    console.error('Submit reflection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
