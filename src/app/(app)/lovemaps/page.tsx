import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MapClient from './MapClient'

export default async function MapQuestPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's active relationship
  const { data: relationship } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(full_name, preferred_name),
      partner_b:profiles!relationships_partner_b_id_fkey(full_name, preferred_name)
    `)
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .eq('status', 'active')
    .single()

  if (!relationship) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 shadow-md text-center">
            <h1 className="text-3xl font-bold mb-4">No Active Relationship</h1>
            <p className="text-gray-600 mb-6">
              You need an active relationship to play MapQuest for Couples.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fetch all territories
  const { data: territories } = await supabase
    .from('map_territories')
    .select('*')
    .order('display_order', { ascending: true })

  // Fetch or initialize territory progress
  const { data: existingProgress } = await supabase
    .from('relationship_territory_progress')
    .select('*')
    .eq('relationship_id', relationship.id)

  // Initialize missing territories
  if (territories && existingProgress) {
    const existingTerritoryIds = new Set(existingProgress.map(p => p.territory_id))
    const missingTerritories = territories.filter(t => !existingTerritoryIds.has(t.id))

    if (missingTerritories.length > 0) {
      await supabase
        .from('relationship_territory_progress')
        .insert(
          missingTerritories.map(t => ({
            relationship_id: relationship.id,
            territory_id: t.id,
            status: 'available'
          }))
        )
    }
  }

  // Re-fetch all progress
  const { data: allProgress } = await supabase
    .from('relationship_territory_progress')
    .select('*')
    .eq('relationship_id', relationship.id)

  // Build progress map
  const progressMap: Record<string, any> = {}
  allProgress?.forEach(p => {
    progressMap[p.territory_id] = p
  })

  // Determine partner names and role
  const partnerA = relationship.partner_a as any
  const partnerB = relationship.partner_b as any
  const partnerAName = partnerA.preferred_name || partnerA.full_name
  const partnerBName = partnerB.preferred_name || partnerB.full_name
  const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'
  const yourName = userRole === 'partner_a' ? partnerAName : partnerBName
  const partnerName = userRole === 'partner_a' ? partnerBName : partnerAName

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-700 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🗺️ MapQuest for Couples
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl">
            Conquer territories together by answering questions and learning about each other.
            The goal is not perfection. The goal is curiosity.
          </p>
        </div>

        {/* Map Client */}
        <MapClient
          territories={territories || []}
          progress={progressMap}
          relationshipId={relationship.id}
          userRole={userRole}
          yourName={yourName}
          partnerName={partnerName}
        />
      </div>
    </div>
  )
}
