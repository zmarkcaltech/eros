'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Profile {
  id: string
  email: string
  full_name: string
  preferred_name: string | null
  bio: string | null
  avatar_url: string | null
}

interface Props {
  profile: Profile
}

export default function ProfileClient({ profile: initialProfile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    preferred_name: profile.preferred_name || '',
    bio: profile.bio || ''
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          preferred_name: formData.preferred_name || null,
          bio: formData.bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        ...formData,
        preferred_name: formData.preferred_name || null,
        bio: formData.bio || null
      })
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      router.refresh()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!profile.avatar_url) return
    if (!confirm('Are you sure you want to delete your profile picture?')) return

    setIsUploading(true)
    try {
      // Delete from storage
      const oldPath = profile.avatar_url.split('/').slice(-2).join('/')
      await supabase.storage.from('avatars').remove([oldPath])

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, avatar_url: null })
      router.refresh()
    } catch (error) {
      console.error('Error deleting avatar:', error)
      alert('Failed to delete avatar')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
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
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {profile.avatar_url ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200">
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold border-4 border-purple-200">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <span className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                  {profile.avatar_url ? 'Change Photo' : 'Upload Photo'}
                </span>
              </label>
              {profile.avatar_url && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={isUploading}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Max 5MB • JPEG, PNG, WebP, or GIF</p>
          </div>

          {/* Profile Info */}
          <div className="space-y-6">
            {!isEditing ? (
              <>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                  <p className="text-lg text-gray-900 mt-1">{profile.email}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Full Name</label>
                  <p className="text-lg text-gray-900 mt-1">{profile.full_name}</p>
                </div>

                {profile.preferred_name && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Preferred Name</label>
                    <p className="text-lg text-gray-900 mt-1">{profile.preferred_name}</p>
                  </div>
                )}

                {profile.bio && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Bio</label>
                    <p className="text-gray-700 mt-1">{profile.bio}</p>
                  </div>
                )}

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">
                    Preferred Name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.preferred_name}
                    onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    placeholder="What should your partner call you?"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">
                    Bio (optional)
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    placeholder="Tell your partner a bit about yourself..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        full_name: profile.full_name,
                        preferred_name: profile.preferred_name || '',
                        bio: profile.bio || ''
                      })
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !formData.full_name.trim()}
                    className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
