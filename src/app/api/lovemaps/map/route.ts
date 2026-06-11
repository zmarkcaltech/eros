import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/lovemaps/map - Get full map state for couple
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's active relationship
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('id, partner_a_id, partner_b_id')
      .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (relError || !relationships) {
      return NextResponse.json({ error: 'No active relationship found' }, { status: 404 })
    }

    const relationshipId = relationships.id

    // Fetch all territories
    const { data: territories, error: territoriesError } = await supabase
      .from('map_territories')
      .select('*')
      .order('display_order', { ascending: true })

    if (territoriesError) {
      console.error('Error fetching territories:', territoriesError)
      return NextResponse.json({ error: 'Failed to fetch territories' }, { status: 500 })
    }

    // Fetch or initialize progress for each territory
    const { data: existingProgress, error: progressError } = await supabase
      .from('relationship_territory_progress')
      .select('*')
      .eq('relationship_id', relationshipId)

    if (progressError) {
      console.error('Error fetching progress:', progressError)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    // Create progress entries for any missing territories
    const existingTerritoryIds = new Set(existingProgress?.map(p => p.territory_id) || [])
    const missingTerritories = territories.filter(t => !existingTerritoryIds.has(t.id))

    if (missingTerritories.length > 0) {
      const newProgressEntries = missingTerritories.map(territory => ({
        relationship_id: relationshipId,
        territory_id: territory.id,
        total_points: 0,
        questions_answered: 0,
        status: 'available' // Free exploration - all start as available
      }))

      const { error: insertError } = await supabase
        .from('relationship_territory_progress')
        .insert(newProgressEntries)

      if (insertError) {
        console.error('Error initializing progress:', insertError)
        // Non-fatal - continue with existing progress
      }
    }

    // Re-fetch all progress after initialization
    const { data: allProgress, error: allProgressError } = await supabase
      .from('relationship_territory_progress')
      .select('*')
      .eq('relationship_id', relationshipId)

    if (allProgressError) {
      console.error('Error fetching all progress:', allProgressError)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    // Build progress map indexed by territory_id
    const progressMap: Record<string, any> = {}
    let totalCaptured = 0
    let totalPoints = 0
    let totalQuestions = 0

    allProgress?.forEach(p => {
      progressMap[p.territory_id] = {
        total_points: p.total_points,
        questions_answered: p.questions_answered,
        status: p.status,
        captured_at: p.captured_at,
        ai_insight: p.ai_insight
      }

      totalPoints += p.total_points
      totalQuestions += p.questions_answered
      if (p.status === 'captured') totalCaptured++
    })

    return NextResponse.json({
      territories,
      progress: progressMap,
      stats: {
        total_captured: totalCaptured,
        total_points: totalPoints,
        total_questions: totalQuestions
      }
    })
  } catch (error) {
    console.error('Map endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
