'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PersistentChat from '../../components/PersistentChat'
import MiniMap from '../../components/MiniMap'

type RoundStatus = 'awaiting_answer' | 'awaiting_guess' | 'awaiting_rating' | 'awaiting_reflection' | 'completed' | 'skipped'
type UserRole = 'partner_a' | 'partner_b'

interface Question {
  id: string
  prompt: string
  category: string
  depth: string
}

interface Round {
  id: string
  territory_id: string
  question_id: string
  answering_partner: UserRole
  private_answer: string | null
  guess: string | null
  closeness_rating: string | null
  clarification: string | null
  reflection: string | null
  care_coin_awarded: boolean
  status: RoundStatus
  question: Question
}

interface Territory {
  id: string
  name: string
  display_order: number
  category: string
  depth_filter: string | null
  points_to_capture: number
  visual_theme: {
    color: string
    icon: string
    gradient: string[]
  }
  description: string
}

interface TerritoryProgress {
  total_points: number
  questions_answered: number
  status: string
}

interface Props {
  territory: Territory
  progress: TerritoryProgress | null
  currentRound: Round
  allTerritories: Territory[]
  allProgress: Record<string, any>
  relationshipId: string
  userRole: UserRole
  yourName: string
  partnerName: string
}

export default function TerritoryQuestionClient({
  territory: initialTerritory,
  progress: initialProgress,
  currentRound: initialRound,
  allTerritories,
  allProgress: initialAllProgress,
  relationshipId,
  userRole,
  yourName,
  partnerName
}: Props) {
  const router = useRouter()
  const [territory, setTerritory] = useState(initialTerritory)
  const [progress, setProgress] = useState(initialProgress)
  const [currentRound, setCurrentRound] = useState(initialRound)
  const [inputValue, setInputValue] = useState('')
  const [selectedRating, setSelectedRating] = useState<string | null>(null)
  const [clarification, setClarification] = useState('')
  const [feltGood, setFeltGood] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [celebration, setCelebration] = useState<{ type: 'points' | 'discovery' | 'care', amount: number } | null>(null)
  const [allProgress, setAllProgress] = useState(initialAllProgress)
  const [territoryCaptured, setTerritoryCaptured] = useState(false)

  const supabase = createClient()

  // Subscribe to real-time updates
  useEffect(() => {
    const fetchRoundWithQuestion = async (roundId: string) => {
      setIsUpdating(true)
      const { data } = await supabase
        .from('love_map_rounds')
        .select(`
          *,
          question:love_map_questions(*)
        `)
        .eq('id', roundId)
        .single()

      if (data) {
        setCurrentRound(data as Round)
      }
      setIsUpdating(false)
    }

    // Subscribe to round updates
    const roundChannel = supabase
      .channel(`territory_round:${territory.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'love_map_rounds',
          filter: `territory_id=eq.${territory.id}`
        },
        async (payload) => {
          console.log('Round update:', payload)

          if (payload.eventType === 'UPDATE' && payload.new.id === currentRound.id) {
            await fetchRoundWithQuestion(payload.new.id)
          } else if (payload.eventType === 'INSERT') {
            const newRound = payload.new as any
            if (newRound.status !== 'skipped') {
              await fetchRoundWithQuestion(newRound.id)
            }
          }
        }
      )
      .subscribe()

    // Subscribe to territory progress updates
    const progressChannel = supabase
      .channel(`progress:${territory.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'relationship_territory_progress',
          filter: `territory_id=eq.${territory.id}`
        },
        (payload) => {
          console.log('Progress update:', payload)
          const updated = payload.new as any
          setProgress(updated)
          setAllProgress(prev => ({
            ...prev,
            [territory.id]: updated
          }))

          // Check if just captured
          if (updated.status === 'captured' && progress?.status !== 'captured') {
            setTerritoryCaptured(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roundChannel)
      supabase.removeChannel(progressChannel)
    }
  }, [territory.id, currentRound.id, progress?.status, supabase])

  const isAnsweringPartner = userRole === currentRound.answering_partner
  const isGuessingPartner = !isAnsweringPartner

  const handleSubmitAnswer = async () => {
    if (!inputValue.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lovemaps/rounds/${currentRound.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ private_answer: inputValue.trim() })
      })

      if (!response.ok) throw new Error('Failed to submit answer')

      setInputValue('')
    } catch (error) {
      console.error('Submit answer error:', error)
      alert('Failed to submit answer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitGuess = async () => {
    if (!inputValue.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lovemaps/rounds/${currentRound.id}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: inputValue.trim() })
      })

      if (!response.ok) throw new Error('Failed to submit guess')

      setInputValue('')
    } catch (error) {
      console.error('Submit guess error:', error)
      alert('Failed to submit guess. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!selectedRating || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lovemaps/rounds/${currentRound.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closeness_rating: selectedRating,
          clarification: clarification.trim() || null
        })
      })

      if (!response.ok) throw new Error('Failed to submit rating')

      const data = await response.json()

      // Trigger celebration animation
      const option = ratingOptions.find(o => o.value === selectedRating)
      if (option) {
        if (selectedRating === 'new_discovery') {
          setCelebration({ type: 'discovery', amount: 2 })
        } else if (option.points > 0) {
          setCelebration({ type: 'points', amount: option.points })
        }
        setTimeout(() => setCelebration(null), 3000)
      }

      // Update progress if returned
      if (data.territoryProgress) {
        setProgress(data.territoryProgress)
      }

      setSelectedRating(null)
      setClarification('')
    } catch (error) {
      console.error('Submit rating error:', error)
      alert('Failed to submit rating. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReflection = async () => {
    if (!inputValue.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lovemaps/rounds/${currentRound.id}/reflect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflection: inputValue.trim(),
          felt_good: feltGood
        })
      })

      if (!response.ok) throw new Error('Failed to submit reflection')

      const data = await response.json()

      // Trigger celebration if care coin was awarded
      if (feltGood) {
        setCelebration({ type: 'care', amount: 1 })
        setTimeout(() => setCelebration(null), 3000)
      }

      setInputValue('')
      setFeltGood(true)

      // Round is complete - go back to map
      setTimeout(() => {
        router.push('/lovemaps')
      }, 2000)
    } catch (error) {
      console.error('Submit reflection error:', error)
      alert('Failed to submit reflection. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lovemaps/rounds/${currentRound.id}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) throw new Error('Failed to skip question')

      setShowSkipConfirm(false)
    } catch (error) {
      console.error('Skip error:', error)
      alert('Failed to skip question. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const ratingOptions = [
    { value: 'nailed_it', label: 'Nailed it', emoji: '🎯', points: 3, color: 'bg-green-500' },
    { value: 'pretty_close', label: 'Pretty close', emoji: '👍', points: 2, color: 'bg-blue-500' },
    { value: 'partly_right', label: 'Partly right', emoji: '🤔', points: 1, color: 'bg-yellow-500' },
    { value: 'new_discovery', label: 'New discovery', emoji: '🔍', points: 0, color: 'bg-purple-500' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Return to Map Button */}
            <button
              onClick={() => router.push('/lovemaps')}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back to Map</span>
            </button>

            <div className="flex-1 mx-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{territory.visual_theme.icon}</span>
                <div>
                  <h1 className="text-xl font-bold">{territory.name}</h1>
                  <div className="text-sm text-gray-600">
                    {progress?.total_points || 0}/{territory.points_to_capture} points
                    {isUpdating && <span className="ml-2 text-purple-600 animate-pulse">●</span>}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(((progress?.total_points || 0) / territory.points_to_capture) * 100, 100)}%`,
                    background: `linear-gradient(to right, ${territory.visual_theme.gradient[0]}, ${territory.visual_theme.gradient[1]})`
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowSkipConfirm(true)}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors ml-4"
            >
              Skip question →
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Question Flow (2/3) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Question */}
              <div className="mb-8">
                <div className="text-sm text-purple-600 mb-2">
                  {currentRound.question.category.replace('_', ' ')} • {currentRound.question.depth}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentRound.question.prompt}
                </h2>
              </div>

              {/* Awaiting Answer State */}
              {currentRound.status === 'awaiting_answer' && (
                <div>
                  {isAnsweringPartner ? (
                    <div>
                      <p className="text-gray-700 mb-4">
                        {yourName}, secretly answer this question. {partnerName} will guess your answer next.
                      </p>
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Your private answer..."
                        className="w-full border border-gray-300 rounded-lg p-4 mb-4 min-h-32 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        maxLength={500}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{inputValue.length}/500</span>
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={!inputValue.trim() || isSubmitting}
                          className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4 animate-bounce">⏳</div>
                      <p className="text-xl text-gray-700 animate-pulse">
                        Waiting for {partnerName} to answer privately...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Awaiting Guess State */}
              {currentRound.status === 'awaiting_guess' && (
                <div>
                  {isGuessingPartner ? (
                    <div>
                      <p className="text-gray-700 mb-4">
                        {yourName}, what do you think {partnerName} wrote? Guess with kindness.
                      </p>
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Your guess..."
                        className="w-full border border-gray-300 rounded-lg p-4 mb-4 min-h-32 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        maxLength={500}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{inputValue.length}/500</span>
                        <button
                          onClick={handleSubmitGuess}
                          disabled={!inputValue.trim() || isSubmitting}
                          className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Guess'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4 animate-bounce">⏳</div>
                      <p className="text-xl text-gray-700 animate-pulse">
                        Waiting for {partnerName} to guess...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Awaiting Rating State */}
              {currentRound.status === 'awaiting_rating' && (
                <div>
                  {isAnsweringPartner ? (
                    <div>
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Your answer:</div>
                        <div className="text-lg font-medium mb-4">{currentRound.private_answer}</div>
                        <div className="text-sm text-gray-600 mb-2">{partnerName}'s guess:</div>
                        <div className="text-lg font-medium">{currentRound.guess}</div>
                      </div>

                      <p className="text-gray-700 mb-4">How close was that?</p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {ratingOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSelectedRating(option.value)}
                            className={`
                              p-4 rounded-lg border-2 transition-all
                              ${selectedRating === option.value
                                ? `${option.color} text-white border-transparent`
                                : 'bg-white border-gray-300 hover:border-purple-400'
                              }
                            `}
                          >
                            <div className="text-3xl mb-2">{option.emoji}</div>
                            <div className="font-semibold">{option.label}</div>
                            <div className="text-sm mt-1">
                              {option.value === 'new_discovery' ? '+2 Discovery' : `+${option.points} Points`}
                            </div>
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={clarification}
                        onChange={(e) => setClarification(e.target.value)}
                        placeholder="Optional: Add clarification or context..."
                        className="w-full border border-gray-300 rounded-lg p-4 mb-4 min-h-24 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        maxLength={500}
                      />

                      <div className="text-right">
                        <button
                          onClick={handleSubmitRating}
                          disabled={!selectedRating || isSubmitting}
                          className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Your guess:</div>
                        <div className="text-lg font-medium">{currentRound.guess}</div>
                      </div>
                      <div className="text-6xl mb-4 animate-bounce">⏳</div>
                      <p className="text-xl text-gray-700 animate-pulse">
                        Waiting for {partnerName} to rate your guess...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Awaiting Reflection State */}
              {currentRound.status === 'awaiting_reflection' && (
                <div>
                  {isGuessingPartner ? (
                    <div>
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">{partnerName}'s answer:</div>
                        <div className="text-lg font-medium mb-4">{currentRound.private_answer}</div>
                        <div className="text-sm text-gray-600 mb-2">Your guess:</div>
                        <div className="text-lg font-medium mb-4">{currentRound.guess}</div>
                        <div className="text-sm text-gray-600 mb-2">Rating:</div>
                        <div className="text-lg font-medium">
                          {ratingOptions.find(o => o.value === currentRound.closeness_rating)?.label}
                        </div>
                        {currentRound.clarification && (
                          <>
                            <div className="text-sm text-gray-600 mb-2 mt-4">Clarification:</div>
                            <div className="text-lg font-medium">{currentRound.clarification}</div>
                          </>
                        )}
                      </div>

                      <p className="text-gray-700 mb-4">
                        Reflect what you learned in one sentence. Try starting with "I didn't realize..." or "It makes sense that..."
                      </p>

                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Your reflection..."
                        className="w-full border border-gray-300 rounded-lg p-4 mb-4 min-h-24 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        maxLength={500}
                      />

                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={feltGood}
                            onChange={(e) => setFeltGood(e.target.checked)}
                            className="w-5 h-5 text-purple-600"
                          />
                          <span className="text-gray-700">This reflection felt good (awards +1 Care Coin to you both)</span>
                        </label>
                      </div>

                      <div className="text-right">
                        <button
                          onClick={handleSubmitReflection}
                          disabled={!inputValue.trim() || isSubmitting}
                          className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Reflection'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4 animate-bounce">⏳</div>
                      <p className="text-xl text-gray-700 animate-pulse">
                        Waiting for {partnerName} to reflect...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Persistent Chat (1/3) */}
        <div className="hidden lg:block w-96 border-l border-gray-200 bg-white">
          <PersistentChat
            relationshipId={relationshipId}
            userRole={userRole}
            yourName={yourName}
            partnerName={partnerName}
          />
        </div>
      </div>

      {/* Bottom - Mini Map */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <MiniMap
          territories={allTerritories}
          progress={allProgress}
          currentTerritoryId={territory.id}
        />
      </div>

      {/* Celebration Animation */}
      {celebration && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
          <div className="animate-[bounce_0.5s_ease-in-out_3]">
            <div className="bg-white rounded-full p-8 shadow-2xl transform scale-110">
              {celebration.type === 'points' && (
                <div className="text-center">
                  <div className="text-6xl mb-2 animate-pulse">🗺️</div>
                  <div className="text-3xl font-bold text-purple-600">+{celebration.amount}</div>
                  <div className="text-sm text-gray-600">Points!</div>
                </div>
              )}
              {celebration.type === 'discovery' && (
                <div className="text-center">
                  <div className="text-6xl mb-2 animate-pulse">🔍</div>
                  <div className="text-3xl font-bold text-purple-600">+{celebration.amount}</div>
                  <div className="text-sm text-gray-600">Discovery Points!</div>
                </div>
              )}
              {celebration.type === 'care' && (
                <div className="text-center">
                  <div className="text-6xl mb-2 animate-pulse">💝</div>
                  <div className="text-3xl font-bold text-pink-600">+{celebration.amount}</div>
                  <div className="text-sm text-gray-600">Care Coin!</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Territory Captured Notification */}
      {territoryCaptured && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white p-6 rounded-lg shadow-2xl max-w-sm">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🏁</div>
              <div>
                <div className="font-bold text-lg">Territory Captured!</div>
                <div className="text-sm">{territory.name} is yours!</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h3 className="text-2xl font-bold mb-4">Skip this question?</h3>
            <p className="text-gray-700 mb-6">
              No penalty for skipping. You'll get a different question at the same depth.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Skipping...' : 'Yes, skip'}
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
