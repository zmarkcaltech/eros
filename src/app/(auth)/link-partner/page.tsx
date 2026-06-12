import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LinkPartnerClient from './LinkPartnerClient'

export default async function LinkPartnerPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user already has a relationship (for debugging)
  const { data: relationship, error: relError } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(*),
      partner_b:profiles!relationships_partner_b_id_fkey(*)
    `)
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .single()

  const handleLogout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">Eros</h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-gray-600">Welcome, {profile?.preferred_name || profile?.full_name || 'User'}</span>
            <Link
              href="/profile"
              className="text-gray-600 hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium">Profile</span>
            </Link>
            <form action={handleLogout}>
              <button
                type="submit"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Debug info */}
      {relationship && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">Debug: Relationship Found</h3>
                <div className="text-sm text-yellow-800 space-y-1">
                  <p><strong>Relationship ID:</strong> {relationship.id}</p>
                  <p><strong>Status:</strong> {relationship.status}</p>
                  <p><strong>Partner A ID:</strong> {relationship.partner_a_id}</p>
                  <p><strong>Partner B ID:</strong> {relationship.partner_b_id || '(waiting)'}</p>
                  <p><strong>Your User ID:</strong> {user.id}</p>
                  <p><strong>Query Error:</strong> {relError ? relError.message : 'None'}</p>
                </div>
                <div className="mt-3">
                  <Link
                    href="/dashboard"
                    className="inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Go to Dashboard Instead
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LinkPartnerClient />
    </div>
  )
}
