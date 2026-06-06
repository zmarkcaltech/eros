'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SubmitPerspectivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [conflict, setConflict] = useState<any>(null)
  const [perspective, setPerspective] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchConflict = async () => {
      try {
        const response = await fetch(`/api/conflicts/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load conflict')
        }

        setConflict(data.conflict)

        // If user already submitted, redirect to conflict page
        if (data.conflict.hasUserSubmitted) {
          router.push(`/conflicts/${id}`)
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load conflict')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchConflict()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`/api/conflicts/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: perspective }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit perspective')
      }

      // Redirect to conflict page
      router.push(`/conflicts/${id}`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error && !conflict) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
              {error}
            </div>
            <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 mt-4 inline-block">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{conflict?.title}</h1>
            <p className="text-gray-600 mb-8">
              Share your perspective on this conflict
            </p>

            {/* Privacy Notice */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    Your Perspective is Private
                  </h3>
                  <p className="text-purple-800 text-sm mb-3">
                    <strong>Your partner will NEVER see what you write here.</strong> This is a safe space for you to be completely honest.
                  </p>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>✓ Only you and our AI therapist will read this</li>
                    <li>✓ Your partner is writing their own separate perspective</li>
                    <li>✓ The AI will analyze both sides to provide balanced advice</li>
                    <li>✓ Both of you will see the advice, but never each other's perspectives</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="perspective" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Perspective
                </label>
                <textarea
                  id="perspective"
                  value={perspective}
                  onChange={(e) => setPerspective(e.target.value)}
                  required
                  minLength={50}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
                  placeholder="Describe what happened from your point of view. How do you feel? What do you need? Be honest and specific - this is your safe space."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    Minimum 50 characters
                  </p>
                  <p className={`text-sm ${perspective.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                    {perspective.length} characters
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tips for a helpful perspective:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                  <li>• Focus on your feelings and experiences, not blame</li>
                  <li>• Be specific about what happened and when</li>
                  <li>• Explain what you need from your partner</li>
                  <li>• Share what you're willing to do differently</li>
                </ul>
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
                  disabled={submitting || perspective.trim().length < 50}
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit My Perspective'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
