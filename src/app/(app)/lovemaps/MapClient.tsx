'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import FantasyMapVisualization from './components/FantasyMapVisualization'
import CaptureModal from './components/CaptureModal'
import HelpModal from './components/HelpModal'
import Tutorial from './components/Tutorial'

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
  id: string
  territory_id: string
  total_points: number
  questions_answered: number
  status: 'locked' | 'available' | 'in_progress' | 'captured'
  captured_at: string | null
  ai_insight: string | null
}

interface Props {
  territories: Territory[]
  progress: Record<string, TerritoryProgress>
  relationshipId: string
  userRole: 'partner_a' | 'partner_b'
  yourName: string
  partnerName: string
}

export default function MapClient({
  territories: initialTerritories,
  progress: initialProgress,
  relationshipId,
  userRole,
  yourName,
  partnerName
}: Props) {
  const router = useRouter()
  const [territories] = useState(initialTerritories)
  const [progress, setProgress] = useState(initialProgress)
  const [capturedTerritory, setCapturedTerritory] = useState<{ territory: Territory, insight: string } | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const supabase = createClient()

  // Check if user has seen tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('lovemaps_tutorial_seen')
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }, [])

  // Calculate overall stats
  const stats = {
    total_captured: Object.values(progress).filter(p => p.status === 'captured').length,
    total_points: Object.values(progress).reduce((sum, p) => sum + p.total_points, 0),
    total_questions: Object.values(progress).reduce((sum, p) => sum + p.questions_answered, 0)
  }

  // Subscribe to real-time territory progress updates
  useEffect(() => {
    const channel = supabase
      .channel(`map_progress:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationship_territory_progress',
          filter: `relationship_id=eq.${relationshipId}`
        },
        (payload) => {
          console.log('Territory progress update:', payload)

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedProgress = payload.new as TerritoryProgress

            setProgress(prev => ({
              ...prev,
              [updatedProgress.territory_id]: updatedProgress
            }))

            // Check if this was a capture event
            if (payload.eventType === 'UPDATE' &&
                updatedProgress.status === 'captured' &&
                updatedProgress.captured_at) {
              const territory = territories.find(t => t.id === updatedProgress.territory_id)
              if (territory && updatedProgress.ai_insight) {
                setCapturedTerritory({
                  territory,
                  insight: updatedProgress.ai_insight
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [relationshipId, territories, supabase])

  const handleCompleteTutorial = () => {
    localStorage.setItem('lovemaps_tutorial_seen', 'true')
    setShowTutorial(false)
  }

  const handleSkipTutorial = () => {
    localStorage.setItem('lovemaps_tutorial_seen', 'true')
    setShowTutorial(false)
  }

  const handleSeedQuestions = async () => {
    setIsSeeding(true)
    try {
      const response = await fetch('/api/lovemaps/seed-questions', {
        method: 'POST'
      })
      const data = await response.json()

      if (response.ok) {
        alert(`Successfully seeded ${data.count} questions!`)
      } else {
        alert(`Seed info: ${data.message || data.error}`)
      }
    } catch (error) {
      console.error('Seed error:', error)
      alert('Error seeding questions')
    } finally {
      setIsSeeding(false)
    }
  }

  const handleTerritoryClick = async (territory: Territory) => {
    const territoryProgress = progress[territory.id]

    // If captured, show insight
    if (territoryProgress?.status === 'captured' && territoryProgress.ai_insight) {
      setCapturedTerritory({
        territory,
        insight: territoryProgress.ai_insight
      })
      return
    }

    // Otherwise, start a new question
    try {
      const response = await fetch(`/api/lovemaps/territories/${territory.id}/start-question`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Start question error:', errorData)
        alert(`Failed to start question: ${errorData.error || errorData.details || 'Please try again'}`)
        return
      }

      const { round } = await response.json()

      // Navigate to territory question screen
      router.push(`/lovemaps/territories/${territory.id}?round=${round.id}`)
    } catch (error) {
      console.error('Error starting question:', error)
      alert('Failed to start question. Please try again.')
    }
  }

  return (
    <div>
      {/* Stats Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-gray-800">Your Progress</div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help
            </button>
            <button
              onClick={handleSeedQuestions}
              disabled={isSeeding}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
            >
              {isSeeding ? 'Seeding...' : 'Seed Questions'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-4xl font-bold text-purple-600">{stats.total_captured}</div>
            <div className="text-sm text-gray-600 mt-1">Territories Captured</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600">{stats.total_points}</div>
            <div className="text-sm text-gray-600 mt-1">Total Points</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-600">{stats.total_questions}</div>
            <div className="text-sm text-gray-600 mt-1">Questions Answered</div>
          </div>
        </div>

        {stats.total_captured === territories.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700 mb-2">🎉 Map Complete!</div>
            <div className="text-purple-600">
              You've conquered every territory together. Well done, explorers!
            </div>
          </div>
        )}
      </div>

      {/* Fantasy Map Visualization */}
      <FantasyMapVisualization
        territories={territories}
        progress={progress}
        onTerritoryClick={handleTerritoryClick}
      />

      {/* Capture Modal */}
      {capturedTerritory && (
        <CaptureModal
          territory={capturedTerritory.territory}
          insight={capturedTerritory.insight}
          onClose={() => setCapturedTerritory(null)}
        />
      )}

      {/* Help Modal */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}

      {/* Tutorial */}
      {showTutorial && (
        <Tutorial
          onComplete={handleCompleteTutorial}
          onSkip={handleSkipTutorial}
        />
      )}
    </div>
  )
}
