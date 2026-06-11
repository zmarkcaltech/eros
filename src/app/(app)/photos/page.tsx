import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PhotosClient from './PhotosClient'

export default async function PhotosPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get active relationship
  const { data: relationship } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(full_name, preferred_name),
      partner_b:profiles!relationships_partner_b_id_fkey(full_name, preferred_name)
    `)
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .eq('status', 'active')
    .single()

  if (!relationship) {
    redirect('/dashboard')
  }

  // Fetch relationship photos
  const { data: photos } = await supabase
    .from('relationship_photos')
    .select('*')
    .eq('relationship_id', relationship.id)
    .order('created_at', { ascending: false })

  return (
    <PhotosClient
      relationship={relationship}
      photos={photos || []}
      userId={user.id}
    />
  )
}
