import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SummaryClient from './SummaryClient'

export default async function SessionSummaryPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch session with relationship info
  const { data: session, error: sessionError } = await supabase
    .from('love_map_sessions')
    .select(`
      *,
      relationship:relationships(
        id,
        partner_a_id,
        partner_b_id,
        partner_a:profiles!relationships_partner_a_id_fkey(full_name, preferred_name),
        partner_b:profiles!relationships_partner_b_id_fkey(full_name, preferred_name)
      )
    `)
    .eq('id', id)
    .single()

  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 shadow-md text-center">
            <h1 className="text-3xl font-bold mb-4">Session Not Found</h1>
            <Link
              href="/lovemaps"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              Back to MapQuest
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Verify user is part of the relationship
  const relationship = session.relationship as any
  const isPartner = relationship.partner_a_id === user.id || relationship.partner_b_id === user.id
  if (!isPartner) {
    redirect('/lovemaps')
  }

  // Fetch all completed rounds
  const { data: completedRounds } = await supabase
    .from('love_map_rounds')
    .select(`
      *,
      question:love_map_questions(*)
    `)
    .eq('session_id', id)
    .eq('status', 'completed')
    .order('round_number', { ascending: true })

  // Count different rating types
  const ratingCounts = {
    nailed_it: completedRounds?.filter(r => r.closeness_rating === 'nailed_it').length || 0,
    pretty_close: completedRounds?.filter(r => r.closeness_rating === 'pretty_close').length || 0,
    partly_right: completedRounds?.filter(r => r.closeness_rating === 'partly_right').length || 0,
    new_discovery: completedRounds?.filter(r => r.closeness_rating === 'new_discovery').length || 0
  }

  // Get partner names
  const partnerA = relationship.partner_a
  const partnerB = relationship.partner_b
  const partnerAName = partnerA.preferred_name || partnerA.full_name
  const partnerBName = partnerB.preferred_name || partnerB.full_name

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🗺️ MapQuest Complete!
          </h1>
          <p className="text-xl text-gray-700">
            {partnerAName} & {partnerBName}
          </p>
        </div>

        {/* Score Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-5xl mb-2">🗺️</div>
            <div className="text-4xl font-bold mb-2">{session.map_points}</div>
            <div className="text-lg">Map Points</div>
            <div className="text-sm opacity-90 mt-2">
              {ratingCounts.nailed_it} nailed it • {ratingCounts.pretty_close} pretty close • {ratingCounts.partly_right} partly right
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-5xl mb-2">🔍</div>
            <div className="text-4xl font-bold mb-2">{session.discovery_points}</div>
            <div className="text-lg">Discoveries</div>
            <div className="text-sm opacity-90 mt-2">
              {ratingCounts.new_discovery} new discoveries made
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-5xl mb-2">💝</div>
            <div className="text-4xl font-bold mb-2">{session.care_coins}</div>
            <div className="text-lg">Care Coins</div>
            <div className="text-sm opacity-90 mt-2">
              Emotionally skillful moments
            </div>
          </div>
        </div>

        {/* Client Component for AI Summary */}
        <SummaryClient
          sessionId={id}
          relationshipId={relationship.id}
          existingLearnedItems={session.learned_items || []}
          existingTinyAction={session.tiny_action || null}
        />
      </div>
    </div>
  )
}
