import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatSimulatorClient from './ChatSimulatorClient'

export default async function ChatSimulatorPage() {
  const supabase = await createClient()

  // Get current user (for dev testing, you should be logged in)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all relationships (for dev, show all relationships to choose from)
  const { data: relationships } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(id, full_name, preferred_name, avatar_url),
      partner_b:profiles!relationships_partner_b_id_fkey(id, full_name, preferred_name, avatar_url)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <ChatSimulatorClient
      relationships={relationships || []}
      currentUserId={user.id}
    />
  )
}
