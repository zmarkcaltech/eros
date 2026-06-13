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
      partner_a:profiles!relationships_partner_a_id_fkey(id, full_name, preferred_name, avatar_url, email),
      partner_b:profiles!relationships_partner_b_id_fkey(id, full_name, preferred_name, avatar_url, email)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Filter to only test relationships (exclude real user relationships)
  const testRelationships = relationships?.filter(rel => {
    const partnerA = rel.partner_a as any
    const partnerB = rel.partner_b as any
    return partnerA?.email?.startsWith('test-partner-') &&
           partnerB?.email?.startsWith('test-partner-')
  }).map(rel => {
    // Remove email from response
    const { partner_a, partner_b, ...rest } = rel
    const partnerA = partner_a as any
    const partnerB = partner_b as any
    return {
      ...rest,
      partner_a: {
        id: partnerA.id,
        full_name: partnerA.full_name,
        preferred_name: partnerA.preferred_name,
        avatar_url: partnerA.avatar_url
      },
      partner_b: {
        id: partnerB.id,
        full_name: partnerB.full_name,
        preferred_name: partnerB.preferred_name,
        avatar_url: partnerB.avatar_url
      }
    }
  })

  return (
    <ChatSimulatorClient
      relationships={testRelationships || []}
      currentUserId={user.id}
    />
  )
}
