'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LinkPartnerPage() {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [relationshipDescription, setRelationshipDescription] = useState('')
  const [linkCode, setLinkCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationshipDescription }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create relationship')
      }

      setGeneratedCode(data.linkCode)
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

  const handleJoinRelationship = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/relationships/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkCode: joinCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join relationship')
      }

      // Use window.location for hard redirect to ensure fresh data
      window.location.href = '/dashboard'
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode)
    alert('Link code copied to clipboard!')
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Link with Your Partner
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Choose how you want to set up your relationship
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors text-left"
            >
              <div className="font-semibold text-lg mb-1">Create New Relationship</div>
              <div className="text-sm text-purple-100">
                Generate a link code to share with your partner
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full bg-white border-2 border-purple-600 text-purple-600 py-4 px-6 rounded-lg hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors text-left"
            >
              <div className="font-semibold text-lg mb-1">Join Existing Relationship</div>
              <div className="text-sm text-purple-600">
                Enter the link code your partner shared with you
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    if (generatedCode) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Relationship Created!</h2>
              <p className="text-gray-600">Share this code with your partner</p>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
              <div className="text-sm text-gray-600 mb-2 text-center">Your Link Code</div>
              <div className="text-4xl font-bold text-purple-600 text-center tracking-wider mb-4">
                {generatedCode}
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>

            <p className="text-sm text-gray-600 text-center mb-6">
              Your partner can use this code to link their account with yours. Once they join, you can start
              resolving conflicts together with Eros.
            </p>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <button
            onClick={() => setMode('choose')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Relationship</h2>

          <form onSubmit={handleCreateRelationship} className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Describe your relationship (Optional)
              </label>
              <textarea
                id="description"
                value={relationshipDescription}
                onChange={(e) => setRelationshipDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 'We've been together for 3 years and are working on better communication'"
              />
              <p className="text-xs text-gray-500 mt-1">
                This helps our AI provide more personalized advice
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
              {loading ? 'Creating...' : 'Generate Link Code'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Join mode
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <button
          onClick={() => setMode('choose')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Relationship</h2>
        <p className="text-gray-600 mb-6">Enter the code your partner shared with you</p>

        <form onSubmit={handleJoinRelationship} className="space-y-4">
          <div>
            <label htmlFor="linkCode" className="block text-sm font-medium text-gray-700 mb-1">
              Link Code
            </label>
            <input
              id="linkCode"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              maxLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl font-bold tracking-wider"
              placeholder="XXXXXXXX"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || joinCode.length !== 8}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Joining...' : 'Join Relationship'}
          </button>
        </form>
      </div>
    </div>
  )
}
