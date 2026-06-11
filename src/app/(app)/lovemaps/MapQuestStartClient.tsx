'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'daily' | 'date_night' | 'repair' | 'patch_notes'
type Depth = 'light' | 'medium' | 'deep'

interface Session {
  id: string
  mode: Mode
  depth: Depth
  status: string
  map_points: number
  discovery_points: number
  care_coins: number
  total_rounds: number
  current_round: number
  created_at: string
  completed_at: string | null
}

interface Props {
  relationshipId: string
  partnerAName: string
  partnerBName: string
  pastSessions: Session[]
}

export default function MapQuestStartClient({
  relationshipId,
  partnerAName,
  partnerBName,
  pastSessions
}: Props) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null)
  const [selectedDepth, setSelectedDepth] = useState<Depth>('light')
  const [showDeepConsent, setShowDeepConsent] = useState(false)
  const [showRepairSafety, setShowRepairSafety] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modeConfig = {
    daily: {
      title: 'Daily Love Map',
      icon: '☕',
      duration: '2-4 minutes',
      rounds: 2,
      description: 'Quick daily check-in to stay connected'
    },
    date_night: {
      title: 'Date Night Love Map',
      icon: '🌙',
      duration: '10-15 minutes',
      rounds: 5,
      description: 'Playful, affectionate, and fun questions for date night'
    },
    repair: {
      title: 'Repair Love Map',
      icon: '🛠️',
      duration: '8-12 minutes',
      rounds: 4,
      description: 'Support, stress, conflict, and reconnection'
    },
    patch_notes: {
      title: 'Patch Notes',
      icon: '🔄',
      duration: '10 minutes',
      rounds: 4,
      description: 'Monthly update: what\'s changed recently'
    }
  }

  const handleStartSession = async () => {
    if (!selectedMode) return

    // Show safety modal for repair mode
    if (selectedMode === 'repair' && !showRepairSafety) {
      setShowRepairSafety(true)
      return
    }

    // Show consent modal for deep mode
    if (selectedDepth === 'deep' && !showDeepConsent) {
      setShowDeepConsent(true)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/lovemaps/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          depth: selectedDepth,
          total_rounds: modeConfig[selectedMode].rounds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const { session } = await response.json()
      router.push(`/lovemaps/${session.id}`)
    } catch (err) {
      console.error('Error creating session:', err)
      setError('Failed to start session. Please try again.')
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getModeLabel = (mode: string) => {
    return modeConfig[mode as Mode]?.title || mode
  }

  return (
    <div>
      {/* Mode Selection */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Choose Your Adventure</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(modeConfig).map(([mode, config]) => (
            <div
              key={mode}
              onClick={() => setSelectedMode(mode as Mode)}
              className={`
                bg-white rounded-lg p-6 shadow-md cursor-pointer transition-all
                ${selectedMode === mode ? 'ring-4 ring-purple-400 shadow-lg' : 'hover:shadow-lg'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{config.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{config.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{config.duration}</p>
                  <p className="text-gray-700">{config.description}</p>
                  {mode === 'repair' && (
                    <p className="text-sm text-purple-600 mt-2">
                      ⚠️ Gentle approach for sensitive topics
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Depth Selection */}
      {selectedMode && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How Deep?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div
              onClick={() => setSelectedDepth('light')}
              className={`
                bg-white rounded-lg p-6 shadow-md cursor-pointer transition-all
                ${selectedDepth === 'light' ? 'ring-4 ring-purple-400' : 'hover:shadow-lg'}
              `}
            >
              <h3 className="text-lg font-semibold mb-2">Light</h3>
              <p className="text-sm text-gray-600">Easy, playful, low-risk questions</p>
            </div>
            <div
              onClick={() => setSelectedDepth('medium')}
              className={`
                bg-white rounded-lg p-6 shadow-md cursor-pointer transition-all
                ${selectedDepth === 'medium' ? 'ring-4 ring-purple-400' : 'hover:shadow-lg'}
              `}
            >
              <h3 className="text-lg font-semibold mb-2">Medium</h3>
              <p className="text-sm text-gray-600">Mix of support, affection, and current stress</p>
            </div>
            <div
              onClick={() => setSelectedDepth('deep')}
              className={`
                bg-white rounded-lg p-6 shadow-md cursor-pointer transition-all
                ${selectedDepth === 'deep' ? 'ring-4 ring-purple-400' : 'hover:shadow-lg'}
              `}
            >
              <h3 className="text-lg font-semibold mb-2">Deep</h3>
              <p className="text-sm text-gray-600">Vulnerable questions about fears and needs</p>
            </div>
          </div>
        </div>
      )}

      {/* Start Button */}
      {selectedMode && (
        <div className="mb-12 text-center">
          <button
            onClick={handleStartSession}
            disabled={isCreating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-12 py-4 rounded-lg text-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Starting...' : 'Start MapQuest'}
          </button>
          {error && (
            <p className="text-red-600 mt-4">{error}</p>
          )}
        </div>
      )}

      {/* Repair Mode Safety Modal */}
      {showRepairSafety && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">🛠️</div>
              <h3 className="text-2xl font-bold">Repair Mode</h3>
            </div>
            <div className="space-y-3 mb-6 text-gray-700">
              <p>
                This mode explores stress, conflict, and what each of you needs to feel supported.
              </p>
              <p>
                <strong>Important:</strong> Repair works best when you're both ready to listen with curiosity, not criticism.
              </p>
              <p className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
                <strong>If things feel too tense:</strong> You can pause anytime, skip questions, or switch to a lighter mode. The goal is understanding, not blame.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRepairSafety(false)
                  handleStartSession()
                }}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
              >
                We're ready
              </button>
              <button
                onClick={() => {
                  setShowRepairSafety(false)
                  setSelectedMode('date_night')
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Try Date Night instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep Mode Consent Modal */}
      {showDeepConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h3 className="text-2xl font-bold mb-4">Deep Mode</h3>
            <p className="text-gray-700 mb-4">
              Deep Mode can include vulnerable questions. You can skip anything. Skipping is not a penalty.
            </p>
            <p className="text-gray-700 mb-6">
              Do both partners want to continue?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeepConsent(false)
                  handleStartSession()
                }}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
              >
                Yes, continue
              </button>
              <button
                onClick={() => {
                  setShowDeepConsent(false)
                  setSelectedDepth('medium')
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Keep it medium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Past Adventures</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {pastSessions.map((session) => (
              <div
                key={session.id}
                className="border-b last:border-b-0 p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{modeConfig[session.mode].icon}</span>
                      <h3 className="text-lg font-semibold">{getModeLabel(session.mode)}</h3>
                      <span className="text-sm text-gray-500">
                        {session.depth} mode
                      </span>
                      {session.status === 'completed' && (
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                          Completed
                        </span>
                      )}
                      {session.status === 'in_progress' && (
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          In Progress
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDate(session.created_at)} • Round {session.current_round}/{session.total_rounds}
                    </p>
                    {session.status === 'completed' && (
                      <div className="flex gap-6 mt-3 text-sm">
                        <span>🗺️ {session.map_points} Map Points</span>
                        <span>🔍 {session.discovery_points} Discoveries</span>
                        <span>💝 {session.care_coins} Care Coins</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {session.status === 'in_progress' && (
                      <button
                        onClick={() => router.push(`/lovemaps/${session.id}`)}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                      >
                        Resume
                      </button>
                    )}
                    {session.status === 'completed' && (
                      <button
                        onClick={() => router.push(`/lovemaps/${session.id}/summary`)}
                        className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
                      >
                        View Summary
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
