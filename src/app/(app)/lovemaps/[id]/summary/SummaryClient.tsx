'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  sessionId: string
  relationshipId: string
  existingLearnedItems: string[]
  existingTinyAction: string | null
}

export default function SummaryClient({
  sessionId,
  relationshipId,
  existingLearnedItems,
  existingTinyAction
}: Props) {
  const router = useRouter()
  const [learnedItems, setLearnedItems] = useState<string[]>(existingLearnedItems)
  const [tinyAction, setTinyAction] = useState<string | null>(existingTinyAction)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Generate summary if it doesn't exist
    if (!existingTinyAction) {
      generateSummary()
    }
  }, [])

  const generateSummary = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/lovemaps/sessions/${sessionId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setLearnedItems(data.learned_items)
      setTinyAction(data.tiny_action)
    } catch (err) {
      console.error('Generate summary error:', err)
      setError('Failed to generate AI summary. You can still see your scores above.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      {/* AI Summary Section */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">What You Learned</h2>

        {isGenerating && (
          <div className="text-center py-12">
            <div className="animate-pulse text-6xl mb-4">✨</div>
            <p className="text-xl text-gray-700">
              Analyzing your session...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={generateSummary}
              className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isGenerating && !error && learnedItems.length > 0 && (
          <div className="space-y-4 mb-8">
            {learnedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg"
              >
                <div className="text-2xl">💡</div>
                <p className="text-gray-800 flex-1">{item}</p>
              </div>
            ))}
          </div>
        )}

        {!isGenerating && tinyAction && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🎯</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Tiny Action for Next 48 Hours</h3>
                <p className="text-lg text-gray-800">
                  {tinyAction}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/lovemaps"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg text-center"
        >
          Play Again
        </Link>
        <Link
          href="/dashboard"
          className="bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-purple-600 shadow-lg text-center"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Playful Footer Message */}
      <div className="text-center mt-12 text-gray-600">
        <p className="text-lg">
          You don't have to know everything already. You just have to keep updating the map.
        </p>
      </div>
    </>
  )
}
