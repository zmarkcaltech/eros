import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lovemaps/territories/[id]/start-question - Begin a question in this territory
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: territoryId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's active relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (relError || !relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    const relationshipId = relationship.id
    const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'

    // Fetch territory
    const { data: territory, error: territoryError } = await supabase
      .from('map_territories')
      .select('*')
      .eq('id', territoryId)
      .single()

    if (territoryError || !territory) {
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 })
    }

    // Get most recent round in this territory to determine next answerer
    const { data: lastRound } = await supabase
      .from('love_map_rounds')
      .select('answering_partner')
      .eq('relationship_id', relationshipId)
      .eq('territory_id', territoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Alternate answering partner (or start with partner_a if no rounds yet)
    const nextAnswerer = lastRound
      ? (lastRound.answering_partner === 'partner_a' ? 'partner_b' : 'partner_a')
      : 'partner_a'

    // Fetch random question matching territory's category and depth filter
    let questionQuery = supabase
      .from('love_map_questions')
      .select('*')
      .eq('category', territory.category)

    // Apply depth filter if specified
    if (territory.depth_filter) {
      questionQuery = questionQuery.eq('depth', territory.depth_filter)
    }

    const { data: questions, error: questionsError } = await questionQuery

    if (questionsError || !questions || questions.length === 0) {
      console.error('No questions found:', {
        category: territory.category,
        depth_filter: territory.depth_filter,
        questionsError,
        questionCount: questions?.length
      })
      return NextResponse.json({
        error: `No questions found for category: ${territory.category}, depth: ${territory.depth_filter || 'any'}`
      }, { status: 404 })
    }

    // Pick random question
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)]

    // Create new round
    const { data: newRound, error: roundError } = await supabase
      .from('love_map_rounds')
      .insert({
        relationship_id: relationshipId,
        territory_id: territoryId,
        question_id: randomQuestion.id,
        answering_partner: nextAnswerer,
        status: 'awaiting_answer'
      })
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .single()

    if (roundError) {
      console.error('Error creating round:', {
        error: roundError,
        message: roundError.message,
        details: roundError.details,
        hint: roundError.hint,
        code: roundError.code
      })
      return NextResponse.json({
        error: 'Failed to create round',
        details: roundError.message || roundError.hint || 'Unknown error'
      }, { status: 500 })
    }

    // Update territory progress to 'in_progress' if not already captured
    const { error: progressError } = await supabase
      .from('relationship_territory_progress')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('relationship_id', relationshipId)
      .eq('territory_id', territoryId)
      .neq('status', 'captured')

    if (progressError) {
      console.error('Error updating territory progress:', progressError)
      // Non-fatal - round is still created
    }

    return NextResponse.json({
      round: newRound,
      territory,
      userRole
    })
  } catch (error) {
    console.error('Start question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
