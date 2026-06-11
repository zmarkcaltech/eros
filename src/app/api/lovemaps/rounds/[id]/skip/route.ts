import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lovemaps/rounds/[id]/skip - Skip current question
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

    const session = round.session as any
    const relationship = session.relationship

    // Verify user is part of the relationship
    const isPartner = relationship.partner_a_id === user.id || relationship.partner_b_id === user.id
    if (!isPartner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Mark current round as skipped
    await supabase
      .from('love_map_rounds')
      .update({
        status: 'skipped',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)

    // Get random question for replacement round
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

    // Pick random question (different from current if possible)
    let randomQuestion
    if (questions.length > 1) {
      const availableQuestions = questions.filter(q => q.id !== round.question_id)
      randomQuestion = availableQuestions.length > 0
        ? availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
        : questions[Math.floor(Math.random() * questions.length)]
    } else {
      randomQuestion = questions[0]
    }

    // Create new round with same round_number (replacing skipped)
    const { data: newRound, error: newRoundError } = await supabase
      .from('love_map_rounds')
      .insert({
        session_id: session.id,
        round_number: round.round_number,
        question_id: randomQuestion.id,
        answering_partner: round.answering_partner,
        status: 'awaiting_answer'
      })
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .single()

    if (newRoundError) {
      console.error('Error creating new round:', newRoundError)
      return NextResponse.json({ error: 'Failed to create new round' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Question skipped',
      newRound
    })
  } catch (error) {
    console.error('Skip round error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
