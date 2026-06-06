'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewConflictPage() {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create conflict')
      }

      // Redirect to submit perspective page
      router.push(`/conflicts/${data.conflict.id}/submit`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-700 mb-6 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="bg-white rounded-lg shadow-md p-8 mt-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Conflict Resolution</h1>
            <p className="text-gray-600 mb-8">
              Begin by giving this conflict a clear, descriptive title. You'll share your perspective in the next step.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  What's this conflict about?
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={5}
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 'Disagreement about household chores' or 'Communication issues'"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Be specific but concise (5-100 characters)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">What happens next:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>You'll share your perspective privately</li>
                      <li>Your partner will be notified to share theirs</li>
                      <li>Neither of you will see each other's perspectives</li>
                      <li>Our AI will analyze both sides and provide balanced advice</li>
                    </ol>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || title.trim().length < 5}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Continue to Share Perspective'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
