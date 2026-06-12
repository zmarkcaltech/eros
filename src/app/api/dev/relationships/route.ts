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

    // Fetch all active relationships for dev testing
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select(`
        *,
        partner_a:profiles!relationships_partner_a_id_fkey(id, full_name, preferred_name, avatar_url),
        partner_b:profiles!relationships_partner_b_id_fkey(id, full_name, preferred_name, avatar_url)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ relationships: relationships || [] })
  } catch (error) {
    console.error('Error fetching dev relationships:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch relationships: ${errorMessage}` },
      { status: 500 }
    )
  }
}
