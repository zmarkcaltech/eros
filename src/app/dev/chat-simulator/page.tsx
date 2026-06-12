import { createClient } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ChatSimulatorClient from './ChatSimulatorClient'

export default async function ChatSimulatorPage() {
  const supabase = await createClient()

  // Get current user (for dev testing, you should be logged in)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use service role to fetch all relationships (bypasses RLS for dev)
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data: relationships } = await adminSupabase
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
