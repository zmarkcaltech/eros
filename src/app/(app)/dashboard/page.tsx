import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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

  // Get user's relationship with partner profiles
  const { data: relationship } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(*),
      partner_b:profiles!relationships_partner_b_id_fkey(*)
    `)
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .single()

  // If no relationship, redirect to link-partner
  if (!relationship) {
    redirect('/link-partner')
  }

  // Determine if relationship is active (both partners linked)
  const isActive = relationship.status === 'active' && relationship.partner_b_id !== null

  // Get partner profile
  const isPartnerA = relationship.partner_a_id === user.id
  const partnerProfile = isPartnerA ? relationship.partner_b : relationship.partner_a
  const userProfile = isPartnerA ? relationship.partner_a : relationship.partner_b

  // Get favorite relationship photo
  const { data: favoritePhoto } = await supabase
    .from('relationship_photos')
    .select('*')
    .eq('relationship_id', relationship.id)
    .eq('is_favorite', true)
    .single()

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
          <div className="flex items-center gap-6">
            <span className="text-gray-600">Welcome, {userProfile?.preferred_name || userProfile?.full_name}</span>
            <Link
              href="/profile"
              className="text-gray-600 hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium">Profile</span>
            </Link>
            {isActive && (
              <Link
                href="/photos"
                className="text-gray-600 hover:text-purple-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Photos</span>
              </Link>
            )}
            <Link
              href="/dev/chat-simulator"
              className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              title="Dev Tools"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium">Dev</span>
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

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Relationship Status */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {isActive && favoritePhoto && (
              <div className="relative h-64 bg-gradient-to-br from-purple-100 to-pink-100">
                <Image
                  src={favoritePhoto.photo_url}
                  alt={favoritePhoto.caption || 'Favorite couple photo'}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {favoritePhoto.caption && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-lg font-semibold">{favoritePhoto.caption}</p>
                  </div>
                )}
                <Link
                  href="/photos"
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                >
                  Change favorite
                </Link>
              </div>
            )}

            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Relationship</h2>
              {isActive ? (
                <div className="space-y-4">
                  {/* Partner Avatars */}
                  <div className="flex items-center justify-center gap-6">
                    {/* User Avatar */}
                    <div className="flex flex-col items-center">
                      {userProfile?.avatar_url ? (
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-purple-200">
                          <Image
                            src={userProfile.avatar_url}
                            alt={userProfile.full_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold border-4 border-purple-200">
                          {userProfile?.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-medium text-gray-700 mt-2">You</p>
                    </div>

                    {/* Heart Icon */}
                    <div className="text-3xl text-red-500 animate-pulse">
                      ❤️
                    </div>

                    {/* Partner Avatar */}
                    <div className="flex flex-col items-center">
                      {partnerProfile?.avatar_url ? (
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-pink-200">
                          <Image
                            src={partnerProfile.avatar_url}
                            alt={partnerProfile.full_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold border-4 border-pink-200">
                          {partnerProfile?.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        {partnerProfile?.preferred_name || partnerProfile?.full_name}
                      </p>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-green-700">Active Relationship</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {relationship.message_count > 0
                        ? `${relationship.message_count} messages exchanged`
                        : 'Start a conversation in the chat'}
                    </p>
                  </div>

                  {/* Add Favorite Photo CTA */}
                  {!favoritePhoto && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg text-center border-2 border-dashed border-purple-200">
                      <p className="text-sm text-purple-900 font-medium mb-2">📸 Set a favorite photo</p>
                      <p className="text-xs text-purple-700 mb-3">Upload a photo and mark it as favorite to display it here</p>
                      <Link
                        href="/photos"
                        className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Go to Photos
                      </Link>
                    </div>
                  )}
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
          </div>

          {/* About You & Your Partner */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">About You & Your Partner</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Your Profile */}
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-purple-900">Your Profile</h3>
                  <span className="text-xs text-purple-600 hover:text-purple-700 cursor-pointer">
                    Edit (coming soon)
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {userProfile?.preferred_name || userProfile?.full_name}</p>
                  {userProfile?.age && <p><span className="font-medium">Age:</span> {userProfile.age}</p>}
                  {userProfile?.pronouns && <p><span className="font-medium">Pronouns:</span> {userProfile.pronouns}</p>}
                  {userProfile?.occupation && <p><span className="font-medium">Occupation:</span> {userProfile.occupation}</p>}
                  {userProfile?.interests && <p><span className="font-medium">Interests:</span> {userProfile.interests}</p>}
                  {userProfile?.self_description && (
                    <p><span className="font-medium">About:</span> {userProfile.self_description}</p>
                  )}
                  {!userProfile?.age && !userProfile?.pronouns && !userProfile?.occupation && (
                    <p className="text-gray-500 italic">No additional information yet</p>
                  )}
                </div>
              </div>

              {/* Partner's Profile */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3">Partner's Profile</h3>
                {isActive ? (
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {partnerProfile?.preferred_name || partnerProfile?.full_name}</p>
                    {partnerProfile?.age && <p><span className="font-medium">Age:</span> {partnerProfile.age}</p>}
                    {partnerProfile?.pronouns && <p><span className="font-medium">Pronouns:</span> {partnerProfile.pronouns}</p>}
                    {partnerProfile?.occupation && <p><span className="font-medium">Occupation:</span> {partnerProfile.occupation}</p>}
                    {partnerProfile?.interests && <p><span className="font-medium">Interests:</span> {partnerProfile.interests}</p>}
                    {partnerProfile?.self_description && (
                      <p><span className="font-medium">About:</span> {partnerProfile.self_description}</p>
                    )}
                    {!partnerProfile?.age && !partnerProfile?.pronouns && !partnerProfile?.occupation && (
                      <p className="text-gray-500 italic">No additional information yet</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">Waiting for partner to join...</p>
                )}
              </div>
            </div>

            {/* Relationship Details */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900">Relationship Details</h3>
                <span className="text-xs text-purple-600 hover:text-purple-700 cursor-pointer">
                  Edit (coming soon)
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {relationship.duration_months && (
                  <p><span className="font-medium">Together for:</span> {Math.floor(relationship.duration_months / 12)} years, {relationship.duration_months % 12} months</p>
                )}
                {relationship.relationship_description && (
                  <p><span className="font-medium">About us:</span> {relationship.relationship_description}</p>
                )}
                {relationship.relationship_goals && (
                  <p><span className="font-medium">Therapy goals:</span> {relationship.relationship_goals}</p>
                )}
                {relationship.how_we_met && (
                  <p><span className="font-medium">How we met:</span> {relationship.how_we_met}</p>
                )}
                {relationship.living_situation && (
                  <p><span className="font-medium">Living situation:</span> {relationship.living_situation}</p>
                )}
                {relationship.children_info && (
                  <p><span className="font-medium">Children:</span> {relationship.children_info}</p>
                )}
                {!relationship.duration_months && !relationship.relationship_description && !relationship.relationship_goals && (
                  <p className="text-gray-500 italic">No relationship details yet. Add information to help your AI therapist understand your relationship better.</p>
                )}
              </div>
            </div>
          </div>

          {/* Open Chat */}
          {isActive && (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-8 text-white text-center">
              <h2 className="text-2xl font-bold mb-2">Start Your Therapy Session</h2>
              <p className="mb-6 opacity-90">Chat with your partner and AI therapist</p>
              <Link
                href="/chat"
                className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md"
              >
                Open Chat
              </Link>
            </div>
          )}

          {/* Exercises */}
          {isActive && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Relationship Exercises</h2>

              {/* MapQuest Card */}
              <div className="border-2 border-purple-200 rounded-lg p-6 mb-4 hover:border-purple-400 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">🗺️</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">MapQuest for Couples</h3>
                    <p className="text-gray-600 mb-4">
                      Build your shared map by guessing, revealing, and learning about each other.
                      The goal is not perfection. The goal is curiosity.
                    </p>
                    <Link
                      href="/lovemaps"
                      className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                      Start MapQuest
                    </Link>
                  </div>
                </div>
              </div>

              {/* Future exercises placeholder */}
              <div className="text-center py-4 text-gray-500 text-sm">
                More exercises coming soon...
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
