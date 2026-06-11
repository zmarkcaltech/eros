'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Photo {
  id: string
  relationship_id: string
  photo_url: string
  caption: string | null
  uploaded_by: string
  created_at: string
  is_favorite: boolean
}

interface Relationship {
  id: string
  partner_a_id: string
  partner_b_id: string
  partner_a: { full_name: string; preferred_name: string | null }
  partner_b: { full_name: string; preferred_name: string | null }
}

interface Props {
  relationship: Relationship
  photos: Photo[]
  userId: string
}

export default function PhotosClient({ relationship, photos: initialPhotos, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [photos, setPhotos] = useState(initialPhotos)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [captionInput, setCaptionInput] = useState('')

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`relationship_photos:${relationship.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationship_photos',
          filter: `relationship_id=eq.${relationship.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPhotos(prev => [payload.new as Photo, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setPhotos(prev => prev.filter(p => p.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setPhotos(prev => prev.map(p => p.id === payload.new.id ? payload.new as Photo : p))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [relationship.id, supabase])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${relationship.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('relationship-photos')
        .upload(fileName, file, {
          contentType: file.type
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('relationship-photos')
        .getPublicUrl(fileName)

      // Create database record
      const { error: dbError } = await supabase
        .from('relationship_photos')
        .insert({
          relationship_id: relationship.id,
          photo_url: publicUrl,
          uploaded_by: userId
        })

      if (dbError) throw dbError

      router.refresh()
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      // Delete from storage
      const path = photo.photo_url.split('/').slice(-2).join('/')
      await supabase.storage.from('relationship-photos').remove([path])

      // Delete from database
      const { error } = await supabase
        .from('relationship_photos')
        .delete()
        .eq('id', photo.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Failed to delete photo')
    }
  }

  const handleUpdateCaption = async () => {
    if (!selectedPhoto) return

    try {
      const { error } = await supabase
        .from('relationship_photos')
        .update({ caption: captionInput.trim() || null })
        .eq('id', selectedPhoto.id)

      if (error) throw error

      setSelectedPhoto(null)
      setCaptionInput('')
      router.refresh()
    } catch (error) {
      console.error('Error updating caption:', error)
      alert('Failed to update caption')
    }
  }

  const handleToggleFavorite = async (photoId: string, currentFavoriteStatus: boolean) => {
    try {
      if (currentFavoriteStatus) {
        // Unfavorite this photo
        const { error } = await supabase
          .from('relationship_photos')
          .update({ is_favorite: false })
          .eq('id', photoId)

        if (error) throw error
      } else {
        // Set this photo as favorite (unique constraint will automatically unset previous favorite)
        const { error } = await supabase
          .from('relationship_photos')
          .update({ is_favorite: true })
          .eq('id', photoId)

        if (error) throw error
      }

      router.refresh()
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Failed to update favorite photo')
    }
  }

  const partnerA = relationship.partner_a as any
  const partnerB = relationship.partner_b as any
  const partnerAName = partnerA.preferred_name || partnerA.full_name
  const partnerBName = partnerB.preferred_name || partnerB.full_name

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Our Photos</h1>
              <p className="text-gray-600 mt-1">Memories of {partnerAName} & {partnerBName}</p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </span>
            </label>
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No photos yet</h2>
            <p className="text-gray-600 mb-6">Start building your collection of memories together</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                Upload Your First Photo
              </span>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl shadow-lg overflow-hidden group relative">
                {/* Favorite Badge */}
                {photo.is_favorite && (
                  <div className="absolute top-3 left-3 z-10 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Favorite
                  </div>
                )}
                <div className="relative aspect-square">
                  <Image
                    src={photo.photo_url}
                    alt={photo.caption || 'Couple photo'}
                    fill
                    className="object-cover"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(photo.id, photo.is_favorite)}
                      className={`p-2 rounded-full transition-colors ${
                        photo.is_favorite
                          ? 'bg-yellow-400/90 hover:bg-yellow-400'
                          : 'bg-white/90 hover:bg-white'
                      }`}
                      title={photo.is_favorite ? 'Remove from favorite' : 'Set as favorite'}
                    >
                      <svg className={`w-5 h-5 ${photo.is_favorite ? 'text-yellow-900' : 'text-gray-700'}`} fill={photo.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPhoto(photo)
                        setCaptionInput(photo.caption || '')
                      }}
                      className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      title="Edit caption"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {photo.uploaded_by === userId && (
                      <button
                        onClick={() => handleDelete(photo)}
                        className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 transition-colors"
                        title="Delete photo"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {photo.caption && (
                  <div className="p-4">
                    <p className="text-gray-700">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Caption Edit Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Caption</h3>
              <textarea
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="Add a caption..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent mb-4"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mb-4">{captionInput.length}/500</div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPhoto(null)
                    setCaptionInput('')
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCaption}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
