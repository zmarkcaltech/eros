'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [selfDescription, setSelfDescription] = useState('')
  const [conflictResolutionPreferences, setConflictResolutionPreferences] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('No user returned from signup')
      }

      // Create profile in profiles table
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
        bio,
        self_description: selfDescription,
        conflict_resolution_preferences: conflictResolutionPreferences,
      })

      if (profileError) throw profileError

      // Redirect to partner linking
      router.push('/link-partner')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred during signup')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Eros</h1>
          <p className="text-gray-600">Your AI couples therapy companion</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio (Optional)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Tell us a bit about yourself"
            />
          </div>

          <div>
            <label htmlFor="selfDescription" className="block text-sm font-medium text-gray-700 mb-1">
              How would you describe yourself?
            </label>
            <textarea
              id="selfDescription"
              value={selfDescription}
              onChange={(e) => setSelfDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="This helps our AI provide better advice tailored to you"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How do you typically resolve conflicts best? (Optional)
            </label>
            <div className="space-y-2">
              {[
                { value: 'talk_right_away', label: 'Talk it out right away' },
                { value: 'cool_down_first', label: 'Take time to cool down first' },
                { value: 'need_space', label: 'Need space before discussing' },
                { value: 'process_alone_first', label: 'Process alone then come together' },
                { value: 'write_first', label: 'Write/text thoughts first' },
                { value: 'sleep_on_it', label: 'Better after a good night\'s sleep' }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={conflictResolutionPreferences.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConflictResolutionPreferences([...conflictResolutionPreferences, option.value])
                      } else {
                        setConflictResolutionPreferences(
                          conflictResolutionPreferences.filter(p => p !== option.value)
                        )
                      }
                    }}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This helps our AI provide personalized recommendations during conflicts
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
