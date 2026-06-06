'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function ConflictDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [conflict, setConflict] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchConflict = async () => {
    try {
      const response = await fetch(`/api/conflicts/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conflict')
      }

      setConflict(data.conflict)
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

  useEffect(() => {
    fetchConflict()
    // Poll for updates every 10 seconds if processing
    const interval = setInterval(() => {
      if (conflict?.status === 'processing') {
        fetchConflict()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [id, conflict?.status])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error) {
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

  const getStatusDisplay = () => {
    switch (conflict?.status) {
      case 'awaiting_partner_a':
      case 'awaiting_partner_b':
        return {
          icon: '⏳',
          color: 'yellow',
          title: conflict.hasUserSubmitted ? 'Waiting for Partner' : 'Your Turn',
          message: conflict.hasUserSubmitted
            ? 'Your partner will be notified to submit their perspective.'
            : 'Please submit your perspective to continue.',
        }
      case 'processing':
        return {
          icon: '🤖',
          color: 'blue',
          title: 'AI is Analyzing',
          message: 'Claude is reviewing both perspectives and generating therapeutic advice...',
        }
      case 'completed':
        return {
          icon: '✅',
          color: 'green',
          title: 'Advice Ready',
          message: 'Our AI therapist has analyzed both perspectives.',
        }
      default:
        return {
          icon: '❓',
          color: 'gray',
          title: 'Unknown Status',
          message: '',
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-700 mb-6 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Conflict Title */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{conflict?.title}</h1>
            <p className="text-sm text-gray-500">
              Started {new Date(conflict?.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Status */}
          <div className={`bg-${status.color}-50 border-2 border-${status.color}-200 rounded-lg p-6 mb-6`}>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{status.icon}</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{status.title}</h2>
                <p className="text-gray-700">{status.message}</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!conflict?.hasUserSubmitted && conflict?.status !== 'completed' && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="font-semibold mb-4">Next Step</h3>
              <Link
                href={`/conflicts/${id}/submit`}
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors"
              >
                Submit Your Perspective
              </Link>
            </div>
          )}

          {/* User's Own Perspective (if submitted) */}
          {conflict?.userPerspective && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Your Perspective</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 whitespace-pre-wrap">{conflict.userPerspective.content}</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Submitted {new Date(conflict.userPerspective.created_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* AI Advice (if completed) */}
          {conflict?.status === 'completed' && conflict?.advice && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">🧠</span>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">Therapeutic Advice</h3>
                  <p className="text-sm text-gray-600">
                    Generated {new Date(conflict.advice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="prose prose-sm max-w-none bg-white rounded-lg p-6">
                <ReactMarkdown>{conflict.advice.content}</ReactMarkdown>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border border-indigo-200">
                <p className="text-sm text-gray-700">
                  <strong>Important:</strong> This advice is AI-generated and designed to complement, not replace, professional therapy. If your relationship involves abuse, safety concerns, or severe mental health issues, please seek help from a licensed professional.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
