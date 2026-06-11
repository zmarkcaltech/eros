import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import TerritoryQuestionClient from './TerritoryQuestionClient'

export default async function TerritoryPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ round?: string }>
}) {
  const { id: territoryId } = await params
  const { round: roundId } = await searchParams
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch territory
  const { data: territory, error: territoryError } = await supabase
    .from('map_territories')
    .select('*')
    .eq('id', territoryId)
    .single()

  if (territoryError || !territory) {
    notFound()
  }

  // Get user's active relationship
  const { data: relationship, error: relError } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(full_name, preferred_name),
      partner_b:profiles!relationships_partner_b_id_fkey(full_name, preferred_name)
    `)
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .eq('status', 'active')
    .single()

  if (relError || !relationship) {
    redirect('/lovemaps')
  }

  // Determine user role and names
  const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'
  const partnerA = relationship.partner_a as any
  const partnerB = relationship.partner_b as any
  const partnerAName = partnerA.preferred_name || partnerA.full_name
  const partnerBName = partnerB.preferred_name || partnerB.full_name
  const yourName = userRole === 'partner_a' ? partnerAName : partnerBName
  const partnerName = userRole === 'partner_a' ? partnerBName : partnerAName

  // Fetch territory progress
  const { data: progress } = await supabase
    .from('relationship_territory_progress')
    .select('*')
    .eq('relationship_id', relationship.id)
    .eq('territory_id', territoryId)
    .single()

  // If roundId provided, fetch that round
  // Otherwise, fetch the latest active round for this territory
  let currentRound = null

  if (roundId) {
    const { data: round } = await supabase
      .from('love_map_rounds')
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .eq('id', roundId)
      .eq('territory_id', territoryId)
      .single()

    currentRound = round
  } else {
    // Find latest non-completed round
    const { data: round } = await supabase
      .from('love_map_rounds')
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .eq('relationship_id', relationship.id)
      .eq('territory_id', territoryId)
      .neq('status', 'completed')
      .neq('status', 'skipped')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    currentRound = round
  }

  // If no active round, redirect back to map (they need to start a question)
  if (!currentRound) {
    redirect('/lovemaps')
  }

  // Fetch all territories for mini map
  const { data: allTerritories } = await supabase
    .from('map_territories')
    .select('*')
    .order('display_order', { ascending: true })

  // Fetch all progress for mini map
  const { data: allProgress } = await supabase
    .from('relationship_territory_progress')
    .select('*')
    .eq('relationship_id', relationship.id)

  const progressMap: Record<string, any> = {}
  allProgress?.forEach(p => {
    progressMap[p.territory_id] = p
  })

  return (
    <TerritoryQuestionClient
      territory={territory}
      progress={progress}
      currentRound={currentRound}
      allTerritories={allTerritories || []}
      allProgress={progressMap}
      relationshipId={relationship.id}
      userRole={userRole}
      yourName={yourName}
      partnerName={partnerName}
    />
  )
}
