import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lovemaps/rounds/[id]/rate - Rate closeness (answering partner only)
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
    const { closeness_rating, clarification } = await request.json()

    // Validate rating
    const validRatings = ['nailed_it', 'pretty_close', 'partly_right', 'new_discovery', 'want_to_explain']
    if (!closeness_rating || !validRatings.includes(closeness_rating)) {
      return NextResponse.json({ error: 'Invalid closeness rating' }, { status: 400 })
    }

    // Validate clarification if provided
    if (clarification && (typeof clarification !== 'string' || clarification.length > 500)) {
      return NextResponse.json({ error: 'Clarification too long (max 500 characters)' }, { status: 400 })
    }

    // Fetch round (with session for old system OR relationship for new territory system)
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
    if (round.status !== 'awaiting_rating') {
      return NextResponse.json({ error: 'Round is not awaiting rating' }, { status: 400 })
    }

    // Determine if this is territory-based (new system) or session-based (old system)
    const isTerritorySystem = !!round.territory_id

    // Get relationship for permission check
    let relationship: any
    if (isTerritorySystem) {
      const { data: rel, error: relError } = await supabase
        .from('relationships')
        .select('*')
        .eq('id', round.relationship_id)
        .single()

      if (relError || !rel) {
        return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
      }
      relationship = rel
    } else {
      const session = round.session as any
      relationship = session.relationship
    }

    // Verify user is the answering partner
    const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'

    if (userRole !== round.answering_partner) {
      return NextResponse.json({ error: 'Only answering partner can rate' }, { status: 403 })
    }

    // Calculate points based on rating
    const pointsMap: Record<string, number> = {
      'nailed_it': 3,
      'pretty_close': 2,
      'partly_right': 1,
      'new_discovery': 0
    }

    const mapPoints = pointsMap[closeness_rating] || 0
    const discoveryPoints = closeness_rating === 'new_discovery' ? 2 : 0

    // Update round
    const { data: updatedRound, error: updateError } = await supabase
      .from('love_map_rounds')
      .update({
        closeness_rating,
        clarification: clarification || null,
        status: 'awaiting_reflection'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating round:', updateError)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    // Update points based on system type
    let updatedSession = null
    let territoryProgress = null
    let territoryCaptured = false

    if (isTerritorySystem) {
      // NEW SYSTEM: Update territory progress
      const { data: progress, error: progressFetchError } = await supabase
        .from('relationship_territory_progress')
        .select('*, territory:map_territories(*)')
        .eq('relationship_id', round.relationship_id)
        .eq('territory_id', round.territory_id)
        .single()

      if (!progressFetchError && progress) {
        const newTotalPoints = progress.total_points + mapPoints + discoveryPoints
        const newQuestionsCount = progress.questions_answered + 1

        // Update progress
        const { data: updatedProgress, error: progressUpdateError } = await supabase
          .from('relationship_territory_progress')
          .update({
            total_points: newTotalPoints,
            questions_answered: newQuestionsCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', progress.id)
          .select('*')
          .single()

        if (progressUpdateError) {
          console.error('Error updating territory progress:', progressUpdateError)
        } else {
          territoryProgress = updatedProgress

          // Check if territory should be captured
          const territory = progress.territory as any
          if (newTotalPoints >= territory.points_to_capture && progress.status !== 'captured') {
            const { error: captureError } = await supabase
              .from('relationship_territory_progress')
              .update({
                status: 'captured',
                captured_at: new Date().toISOString()
              })
              .eq('id', progress.id)

            if (!captureError) {
              territoryCaptured = true
            }
          }
        }
      }
    } else {
      // OLD SYSTEM: Update session totals
      const session = round.session as any
      const { data: updated, error: sessionUpdateError } = await supabase
        .from('love_map_sessions')
        .update({
          map_points: session.map_points + mapPoints,
          discovery_points: session.discovery_points + discoveryPoints
        })
        .eq('id', session.id)
        .select()
        .single()

      if (sessionUpdateError) {
        console.error('Error updating session points:', sessionUpdateError)
      } else {
        updatedSession = updated
      }
    }

    return NextResponse.json({
      round: updatedRound,
      session: updatedSession, // null for territory system
      territoryProgress, // null for session system
      territoryCaptured,
      pointsAwarded: { mapPoints, discoveryPoints }
    })
  } catch (error) {
    console.error('Rate round error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
