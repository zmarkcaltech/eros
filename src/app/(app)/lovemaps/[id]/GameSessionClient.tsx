'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import MiniChat from './MiniChat'

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
  round_number: number
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

interface Session {
  id: string
  mode: string
  depth: string
  status: string
  current_round: number
  total_rounds: number
  map_points: number
  discovery_points: number
  care_coins: number
}

interface Props {
  session: Session
  currentRound: Round
  userRole: UserRole
  yourName: string
  partnerName: string
}

export default function GameSessionClient({
  session: initialSession,
  currentRound: initialRound,
  userRole,
  yourName,
  partnerName
}: Props) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [currentRound, setCurrentRound] = useState(initialRound)
  const [inputValue, setInputValue] = useState('')
  const [selectedRating, setSelectedRating] = useState<string | null>(null)
  const [clarification, setClarification] = useState('')
  const [feltGood, setFeltGood] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [celebration, setCelebration] = useState<{ type: 'points' | 'discovery' | 'care', amount: number } | null>(null)
  const [isPausing, setIsPausing] = useState(false)

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

    const channel = supabase
      .channel(`lovemap_session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'love_map_rounds',
          filter: `session_id=eq.${session.id}`
        },
        async (payload) => {
          console.log('Round update:', payload)

          if (payload.eventType === 'UPDATE' && payload.new.id === currentRound.id) {
            // Current round updated - fetch complete data with question
            await fetchRoundWithQuestion(payload.new.id)
          } else if (payload.eventType === 'INSERT') {
            // New round created - fetch complete data with question
            const newRound = payload.new as any
            // Only switch to new round if it's not skipped and is after current round
            if (newRound.status !== 'skipped' && newRound.round_number >= currentRound.round_number) {
              await fetchRoundWithQuestion(newRound.id)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'love_map_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          console.log('Session update:', payload)
          setSession(prev => ({ ...prev, ...payload.new }))

          // Check if session is complete
          if (payload.new.status === 'completed') {
            router.push(`/lovemaps/${session.id}/summary`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, currentRound.id, currentRound.round_number, supabase, router])

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

      setSession(data.session)
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

      if (data.sessionComplete) {
        router.push(`/lovemaps/${session.id}/summary`)
      }
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

  const handlePause = async () => {
    if (isPausing) return

    setIsPausing(true)
    try {
      const response = await fetch(`/api/lovemaps/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      })

      if (!response.ok) throw new Error('Failed to pause')

      const data = await response.json()
      setSession(data.session)
    } catch (error) {
      console.error('Pause error:', error)
      alert('Failed to pause session. Please try again.')
    } finally {
      setIsPausing(false)
    }
  }

  const handleResume = async () => {
    if (isPausing) return

    setIsPausing(true)
    try {
      const response = await fetch(`/api/lovemaps/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' })
      })

      if (!response.ok) throw new Error('Failed to resume')

      const data = await response.json()
      setSession(data.session)
    } catch (error) {
      console.error('Resume error:', error)
      alert('Failed to resume session. Please try again.')
    } finally {
      setIsPausing(false)
    }
  }

  const ratingOptions = [
    { value: 'nailed_it', label: 'Nailed it', emoji: '🎯', points: 3, color: 'bg-green-500' },
    { value: 'pretty_close', label: 'Pretty close', emoji: '👍', points: 2, color: 'bg-blue-500' },
    { value: 'partly_right', label: 'Partly right', emoji: '🤔', points: 1, color: 'bg-yellow-500' },
    { value: 'new_discovery', label: 'New discovery', emoji: '🔍', points: 0, color: 'bg-purple-500' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm text-gray-600">Round {currentRound.round_number} of {session.total_rounds}</div>
                {isUpdating && (
                  <div className="flex items-center gap-1 text-xs text-purple-600">
                    <div className="animate-pulse">●</div>
                    <span>Updating...</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentRound.round_number / session.total_rounds) * 100}%` }}
                />
              </div>

              <div className="flex gap-6 text-sm font-semibold">
                <span className="transition-all duration-300">🗺️ {session.map_points}</span>
                <span className="transition-all duration-300">🔍 {session.discovery_points}</span>
                <span className="transition-all duration-300">💝 {session.care_coins}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePause}
                disabled={isPausing || session.status === 'paused'}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                ⏸️ Pause
              </button>
              <button
                onClick={() => setShowSkipConfirm(true)}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip question →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
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
                  <div className="relative inline-block">
                    <div className="text-6xl mb-4 animate-bounce">⏳</div>
                    <div className="absolute inset-0 animate-ping opacity-20">⏳</div>
                  </div>
                  <p className="text-xl text-gray-700 animate-pulse">
                    Waiting for {partnerName} to answer privately...
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
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
                  <div className="relative inline-block">
                    <div className="text-6xl mb-4 animate-bounce">⏳</div>
                    <div className="absolute inset-0 animate-ping opacity-20">⏳</div>
                  </div>
                  <p className="text-xl text-gray-700 animate-pulse">
                    Waiting for {partnerName} to guess...
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
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
                          {option.value === 'new_discovery' ? '+2 Discovery' : `+${option.points} Map Points`}
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
                  <div className="relative inline-block">
                    <div className="text-6xl mb-4 animate-bounce">⏳</div>
                    <div className="absolute inset-0 animate-ping opacity-20">⏳</div>
                  </div>
                  <p className="text-xl text-gray-700 animate-pulse">
                    Waiting for {partnerName} to rate your guess...
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
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
                  <div className="relative inline-block">
                    <div className="text-6xl mb-4 animate-bounce">⏳</div>
                    <div className="absolute inset-0 animate-ping opacity-20">⏳</div>
                  </div>
                  <p className="text-xl text-gray-700 animate-pulse">
                    Waiting for {partnerName} to reflect...
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paused Overlay */}
      {session.status === 'paused' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">⏸️</div>
            <h3 className="text-2xl font-bold mb-4">Game Paused</h3>
            <p className="text-gray-700 mb-6">
              Take a break. Come back when you're both ready to continue.
            </p>
            <button
              onClick={handleResume}
              disabled={isPausing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-semibold transition-all"
            >
              {isPausing ? 'Resuming...' : '▶️ Resume Game'}
            </button>
          </div>
        </div>
      )}

      {/* Celebration Animation */}
      {celebration && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
          <div className="animate-[bounce_0.5s_ease-in-out_3]">
            <div className="bg-white rounded-full p-8 shadow-2xl transform scale-110">
              {celebration.type === 'points' && (
                <div className="text-center">
                  <div className="text-6xl mb-2 animate-pulse">🗺️</div>
                  <div className="text-3xl font-bold text-purple-600">+{celebration.amount}</div>
                  <div className="text-sm text-gray-600">Map Points!</div>
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

      {/* Mini Chat */}
      <MiniChat
        sessionId={session.id}
        userRole={userRole}
        yourName={yourName}
        partnerName={partnerName}
      />
    </div>
  )
}
