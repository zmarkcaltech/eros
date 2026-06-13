import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Use service role to bypass RLS for dev testing
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch all test relationships (emails starting with test-partner-)
    // This excludes real user relationships from showing up in dev mode
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select(`
        *,
        partner_a:profiles!relationships_partner_a_id_fkey(id, full_name, preferred_name, avatar_url, email),
        partner_b:profiles!relationships_partner_b_id_fkey(id, full_name, preferred_name, avatar_url, email)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Filter to only test relationships
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

    if (error) {
      throw error
    }

    return NextResponse.json({ relationships: testRelationships || [] })
  } catch (error) {
    console.error('Error fetching dev relationships:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch relationships: ${errorMessage}` },
      { status: 500 }
    )
  }
}
