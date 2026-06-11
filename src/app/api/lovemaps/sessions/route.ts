import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/lovemaps/sessions - List sessions for user's relationship
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's active relationship
    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('id')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    // Fetch all sessions for this relationship
    const { data: sessions, error: sessionsError } = await supabase
      .from('love_map_sessions')
      .select('*')
      .eq('relationship_id', relationship.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/lovemaps/sessions - Start new session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { mode, depth, total_rounds } = await request.json()

    // Validate required fields
    if (!mode || !depth || !total_rounds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate mode
    if (!['daily', 'date_night', 'repair', 'patch_notes'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    // Validate depth
    if (!['light', 'medium', 'deep'].includes(depth)) {
      return NextResponse.json({ error: 'Invalid depth' }, { status: 400 })
    }

    // Validate rounds
    if (total_rounds < 1 || total_rounds > 20) {
      return NextResponse.json({ error: 'Invalid number of rounds' }, { status: 400 })
    }

    // Get user's active relationship
    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select('*')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    // Determine current answerer (alternate starting partner)
    // Simple approach: partner_a starts odd-numbered sessions, partner_b starts even
    const { count } = await supabase
      .from('love_map_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('relationship_id', relationship.id)

    const current_answerer = (count || 0) % 2 === 0 ? 'partner_a' : 'partner_b'

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('love_map_sessions')
      .insert({
        relationship_id: relationship.id,
        mode,
        depth,
        total_rounds,
        current_answerer,
        status: 'in_progress'
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Get a random question based on mode and depth
    // For mode selection: daily_life for daily, mix for date_night, conflict_repair for repair, patch_notes for patch_notes
    let categoryFilter = []
    if (mode === 'daily') {
      categoryFilter = ['daily_life', 'affection_romance']
    } else if (mode === 'repair') {
      categoryFilter = ['stress_support', 'conflict_repair']
    } else if (mode === 'patch_notes') {
      categoryFilter = ['patch_notes', 'dreams_identity']
    } else {
      // date_night - mix of everything except patch_notes
      categoryFilter = ['daily_life', 'stress_support', 'affection_romance', 'history', 'dreams_identity', 'play_humor']
    }

    const { data: questions, error: questionsError } = await supabase
      .from('love_map_questions')
      .select('id')
      .in('category', categoryFilter)
      .eq('depth', depth)

    if (questionsError || !questions || questions.length === 0) {
      console.error('Error fetching questions:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Pick random question
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)]

    // Create first round
    const { data: round, error: roundError } = await supabase
      .from('love_map_rounds')
      .insert({
        session_id: session.id,
        round_number: 1,
        question_id: randomQuestion.id,
        answering_partner: current_answerer,
        status: 'awaiting_answer'
      })
      .select()
      .single()

    if (roundError) {
      console.error('Error creating round:', roundError)
      return NextResponse.json({ error: 'Failed to create first round' }, { status: 500 })
    }

    return NextResponse.json({ session, round })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
