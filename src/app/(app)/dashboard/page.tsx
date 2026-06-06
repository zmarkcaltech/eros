import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
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

  // Get user's relationship
  const { data: relationship } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!partner_a_id(*),
      partner_b:profiles!partner_b_id(*)
    `)
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .single()

  // If no relationship, redirect to link-partner
  if (!relationship) {
    redirect('/link-partner')
  }

  // Determine if relationship is active (both partners linked)
  const isActive = relationship.status === 'active' && relationship.partner_b_id !== null
  const partnerProfile = relationship.partner_a_id === user.id
    ? relationship.partner_b
    : relationship.partner_a

  // Get conflicts for this relationship
  const { data: conflicts } = await supabase
    .from('conflicts')
    .select(`
      *,
      perspectives (submitted_by)
    `)
    .eq('relationship_id', relationship.id)
    .order('created_at', { ascending: false })

  // Get unread notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('read', false)
    .order('created_at', { ascending: false })

  // Logout function
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
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {profile?.full_name}</span>
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

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Relationship Status */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Relationship Status</h2>
            {isActive ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Linked with {partnerProfile?.full_name}</p>
                  <p className="text-sm text-gray-600">You can now start resolving conflicts together</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Waiting for partner to join</p>
                  <p className="text-sm text-gray-600">Share your link code: <span className="font-mono font-bold text-purple-600">{relationship.link_code}</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          {notifications && notifications.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🔔</span> Notifications
              </h2>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="bg-white rounded-lg p-4 shadow-sm">
                    {notification.type === 'partner_submitted' && (
                      <p className="text-gray-800">
                        <strong>{partnerProfile?.full_name}</strong> has submitted their perspective. It's your turn!
                      </p>
                    )}
                    {notification.type === 'advice_ready' && (
                      <p className="text-gray-800">
                        <strong>AI advice is ready</strong> for your conflict
                      </p>
                    )}
                    {notification.conflict_id && (
                      <Link
                        href={`/conflicts/${notification.conflict_id}`}
                        className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block"
                      >
                        View Conflict →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflicts Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Conflicts</h2>
              {isActive && (
                <Link
                  href="/conflicts/new"
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Create Conflict
                </Link>
              )}
            </div>

            {!isActive ? (
              <div className="text-center py-8 text-gray-500">
                <p>Link with your partner to start resolving conflicts together</p>
              </div>
            ) : conflicts && conflicts.length > 0 ? (
              <div className="space-y-4">
                {conflicts.map((conflict) => {
                  const userHasSubmitted = conflict.perspectives?.some((p: any) => p.submitted_by === user.id)
                  const statusColors = {
                    awaiting_partner_a: 'bg-yellow-100 text-yellow-800',
                    awaiting_partner_b: 'bg-yellow-100 text-yellow-800',
                    processing: 'bg-blue-100 text-blue-800',
                    completed: 'bg-green-100 text-green-800',
                  }
                  const statusLabels = {
                    awaiting_partner_a: userHasSubmitted ? 'Waiting for partner' : 'Your turn',
                    awaiting_partner_b: userHasSubmitted ? 'Waiting for partner' : 'Your turn',
                    processing: 'Processing...',
                    completed: 'Completed',
                  }

                  return (
                    <Link
                      key={conflict.id}
                      href={`/conflicts/${conflict.id}`}
                      className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{conflict.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Created {new Date(conflict.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[conflict.status as keyof typeof statusColors]}`}>
                          {statusLabels[conflict.status as keyof typeof statusLabels]}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No conflicts yet. Click "Create Conflict" to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
