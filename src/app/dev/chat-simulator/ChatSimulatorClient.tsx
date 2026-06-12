'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ProfileForm from './ProfileForm'

interface Profile {
  id: string
  full_name: string
  preferred_name: string | null
}

interface Relationship {
  id: string
  partner_a_id: string
  partner_b_id: string
  partner_a: Profile
  partner_b: Profile
}

interface Message {
  id: string
  sender_id: string | null
  sender_type: 'partner_a' | 'partner_b' | 'ai'
  content: string
  created_at: string
}

interface Props {
  relationships: Relationship[]
  currentUserId: string
}

export default function ChatSimulatorClient({ relationships, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(
    relationships[0] || null
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [messageA, setMessageA] = useState('')
  const [messageB, setMessageB] = useState('')
  const [scenario, setScenario] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationStatus, setSimulationStatus] = useState('')
  const [isCreatingRelationship, setIsCreatingRelationship] = useState(false)

  const messagesEndRefA = useRef<HTMLDivElement>(null)
  const messagesEndRefB = useRef<HTMLDivElement>(null)

  // Load messages for selected relationship
  useEffect(() => {
    if (!selectedRelationship) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('relationship_id', selectedRelationship.id)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data)
      }
    }

    loadMessages()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`chat:${selectedRelationship.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `relationship_id=eq.${selectedRelationship.id}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRelationship, supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRefA.current?.scrollIntoView({ behavior: 'smooth' })
    messagesEndRefB.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (asPartner: 'partner_a' | 'partner_b', content: string) => {
    if (!selectedRelationship || !content.trim()) return

    const senderId = asPartner === 'partner_a'
      ? selectedRelationship.partner_a_id
      : selectedRelationship.partner_b_id

    try {
      const response = await fetch('/api/dev/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId: selectedRelationship.id,
          senderId,
          senderType: asPartner,
          content: content.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      // Clear input
      if (asPartner === 'partner_a') {
        setMessageA('')
      } else {
        setMessageB('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

  const generateAIMessage = async (asPartner: 'partner_a' | 'partner_b') => {
    if (!selectedRelationship) return

    setSimulationStatus(`Generating message for ${asPartner === 'partner_a' ? 'Partner A' : 'Partner B'}...`)

    try {
      const response = await fetch('/api/dev/simulate-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId: selectedRelationship.id,
          partner: asPartner,
          scenario: scenario || undefined,
          recentMessages: messages.slice(-10)
        })
      })

      if (!response.ok) throw new Error('Failed to generate message')

      const { message } = await response.json()

      // Set the generated message in the input
      if (asPartner === 'partner_a') {
        setMessageA(message)
      } else {
        setMessageB(message)
      }

      setSimulationStatus('')
    } catch (error) {
      console.error('Error generating AI message:', error)
      alert('Failed to generate AI message')
      setSimulationStatus('')
    }
  }

  const startAISimulation = async () => {
    if (!selectedRelationship || !scenario.trim()) {
      alert('Please enter a scenario/conflict topic first')
      return
    }

    setIsSimulating(true)
    setSimulationStatus('Starting AI simulation...')

    try {
      // Generate and send messages alternately
      for (let i = 0; i < 6; i++) {
        const partner = i % 2 === 0 ? 'partner_a' : 'partner_b'

        setSimulationStatus(`Turn ${i + 1}/6: ${partner === 'partner_a' ? 'Partner A' : 'Partner B'} thinking...`)

        const response = await fetch('/api/dev/simulate-partner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationshipId: selectedRelationship.id,
            partner,
            scenario,
            recentMessages: messages.slice(-10)
          })
        })

        if (!response.ok) throw new Error('Failed to generate message')

        const { message } = await response.json()

        // Send the message
        await sendMessage(partner, message)

        // Wait a bit for mediator response and to make it feel more natural
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      setSimulationStatus('Simulation complete!')
      setTimeout(() => setSimulationStatus(''), 3000)
    } catch (error) {
      console.error('Error during simulation:', error)
      alert('Simulation failed')
      setSimulationStatus('')
    } finally {
      setIsSimulating(false)
    }
  }

  const createTestRelationship = async (
    partnerA?: any,
    partnerB?: any,
    relationship?: any
  ) => {
    setIsCreatingRelationship(true)
    try {
      const response = await fetch('/api/dev/create-test-relationship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerA,
          partnerB,
          relationship
        })
      })

      if (!response.ok) throw new Error('Failed to create test relationship')

      const { relationship: rel } = await response.json()

      // Refresh the page to load new relationship
      router.refresh()
      alert('Test relationship created! Refreshing...')
    } catch (error) {
      console.error('Error creating test relationship:', error)
      alert('Failed to create test relationship')
    } finally {
      setIsCreatingRelationship(false)
    }
  }

  const clearChat = async () => {
    if (!selectedRelationship) return

    if (!confirm('Delete all messages in this chat?')) return

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('relationship_id', selectedRelationship.id)

      if (error) throw error

      setMessages([])
    } catch (error) {
      console.error('Error clearing chat:', error)
      alert('Failed to clear chat')
    }
  }

  const partnerAName = selectedRelationship?.partner_a.preferred_name || selectedRelationship?.partner_a.full_name
  const partnerBName = selectedRelationship?.partner_b.preferred_name || selectedRelationship?.partner_b.full_name

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-400 mb-2">Chat Simulator (Dev Mode)</h1>
          <p className="text-gray-400">Test the AI mediator with manual or simulated conversations</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4">
          {/* Create Relationship Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Create Test Relationship</h3>
            <ProfileForm
              onSubmit={(partnerA, partnerB, relationship) =>
                createTestRelationship(partnerA, partnerB, relationship)
              }
              isCreating={isCreatingRelationship}
            />
          </div>

          {/* Relationship Selector */}
          {relationships.length > 0 && (
            <div className="flex gap-4 items-center flex-wrap pt-4 border-t border-gray-700">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Existing Relationship
                </label>
                <select
                  value={selectedRelationship?.id || ''}
                  onChange={(e) => {
                    const rel = relationships.find(r => r.id === e.target.value)
                    setSelectedRelationship(rel || null)
                    setMessages([])
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                >
                  {relationships.map((rel) => (
                    <option key={rel.id} value={rel.id}>
                      {rel.partner_a.preferred_name || rel.partner_a.full_name} & {rel.partner_b.preferred_name || rel.partner_b.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={clearChat}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors mt-auto"
              >
                Clear Chat
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scenario / Conflict Topic (for AI simulation)
            </label>
            <input
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="e.g., Disagreement about household chores distribution"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-4 items-center">
            <button
              onClick={startAISimulation}
              disabled={isSimulating || !scenario.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {isSimulating ? 'Simulating...' : 'Start AI Simulation (6 turns)'}
            </button>
            {simulationStatus && (
              <p className="text-purple-300 animate-pulse">{simulationStatus}</p>
            )}
          </div>
        </div>

        {/* Split Screen Chat */}
        {selectedRelationship ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Partner A View */}
            <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-[600px]">
              <div className="bg-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold">{partnerAName} (Partner A)</h2>
                <p className="text-sm text-purple-100">ID: {selectedRelationship.partner_a_id.slice(0, 8)}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_type === 'partner_a' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.sender_type === 'partner_a'
                          ? 'bg-purple-600 text-white'
                          : msg.sender_type === 'ai'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {msg.sender_type === 'ai' ? 'AI Mediator' : msg.sender_type === 'partner_a' ? 'You' : partnerBName}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRefA} />
              </div>

              {/* Input */}
              <div className="p-4 bg-gray-900 border-t border-gray-700">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={messageA}
                    onChange={(e) => setMessageA(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage('partner_a', messageA)}
                    placeholder="Type message as Partner A..."
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => sendMessage('partner_a', messageA)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
                  >
                    Send
                  </button>
                </div>
                <button
                  onClick={() => generateAIMessage('partner_a')}
                  disabled={isSimulating}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                  AI Generate Message for Partner A
                </button>
              </div>
            </div>

            {/* Partner B View */}
            <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-[600px]">
              <div className="bg-pink-600 px-6 py-4">
                <h2 className="text-xl font-bold">{partnerBName} (Partner B)</h2>
                <p className="text-sm text-pink-100">ID: {selectedRelationship.partner_b_id.slice(0, 8)}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_type === 'partner_b' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.sender_type === 'partner_b'
                          ? 'bg-pink-600 text-white'
                          : msg.sender_type === 'ai'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {msg.sender_type === 'ai' ? 'AI Mediator' : msg.sender_type === 'partner_b' ? 'You' : partnerAName}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRefB} />
              </div>

              {/* Input */}
              <div className="p-4 bg-gray-900 border-t border-gray-700">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={messageB}
                    onChange={(e) => setMessageB(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage('partner_b', messageB)}
                    placeholder="Type message as Partner B..."
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    onClick={() => sendMessage('partner_b', messageB)}
                    className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold transition-colors"
                  >
                    Send
                  </button>
                </div>
                <button
                  onClick={() => generateAIMessage('partner_b')}
                  disabled={isSimulating}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                  AI Generate Message for Partner B
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg">No relationships found. Create one above to start testing.</p>
          </div>
        )}
      </div>
    </div>
  )
}
