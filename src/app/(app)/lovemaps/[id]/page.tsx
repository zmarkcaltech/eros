import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GameSessionClient from './GameSessionClient'

export default async function GameSessionPage({
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

  // Fetch session with relationship and partner info
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
            <p className="text-gray-600 mb-6">
              This MapQuest session doesn't exist or you don't have access to it.
            </p>
            <a
              href="/lovemaps"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              Back to MapQuest
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Check if session is completed - redirect to summary
  if (session.status === 'completed') {
    redirect(`/lovemaps/${id}/summary`)
  }

  // Fetch all rounds for this session
  const { data: rounds } = await supabase
    .from('love_map_rounds')
    .select(`
      *,
      question:love_map_questions(*)
    `)
    .eq('session_id', id)
    .order('round_number', { ascending: true })

  // Find current round (first non-completed, non-skipped round)
  const currentRound = rounds?.find(r =>
    r.status !== 'completed' && r.status !== 'skipped'
  )

  if (!currentRound) {
    // No active round - session might be complete
    redirect(`/lovemaps/${id}/summary`)
  }

  // Determine user's role
  const relationship = session.relationship as any
  const userRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b'

  // Get partner names
  const partnerA = relationship.partner_a
  const partnerB = relationship.partner_b
  const partnerAName = partnerA.preferred_name || partnerA.full_name
  const partnerBName = partnerB.preferred_name || partnerB.full_name

  const userIsPartnerA = userRole === 'partner_a'
  const yourName = userIsPartnerA ? partnerAName : partnerBName
  const partnerName = userIsPartnerA ? partnerBName : partnerAName

  return (
    <GameSessionClient
      session={session}
      currentRound={currentRound}
      userRole={userRole}
      yourName={yourName}
      partnerName={partnerName}
    />
  )
}
