'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MessageList } from '@/components/MessageList'
import { MessageInput } from '@/components/MessageInput'

interface Message {
  id: string
  content: string
  sender_type: 'partner_a' | 'partner_b' | 'ai'
  sender_id: string | null
  created_at: string
  sender?: {
    full_name: string
  }
}

interface Conflict {
  id: string
  title: string
  status: string
  created_at: string
  relationships: {
    partner_a_id: string
    partner_b_id: string
    partner_a: { full_name: string }
    partner_b: { full_name: string }
  }
}

export default function ConflictChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conflictId } = use(params)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const supabase = createClient()

  // Fetch initial data and set up Realtime subscription
  useEffect(() => {
    const init = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          setLoading(false)
          return
        }
        setCurrentUserId(user.id)

        // Fetch conflict details
        const { data: conflictData, error: conflictError } = await supabase
          .from('conflicts')
          .select(`
            *,
            relationships!inner (
              partner_a_id,
              partner_b_id,
              partner_a:profiles!relationships_partner_a_id_fkey(full_name),
              partner_b:profiles!relationships_partner_b_id_fkey(full_name)
            )
          `)
          .eq('id', conflictId)
          .single()

        if (conflictError || !conflictData) {
          setError('Conflict not found')
          setLoading(false)
          return
        }

        setConflict(conflictData as any)

        // Fetch initial messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conflict_id', conflictId)
          .order('created_at', { ascending: true })

        if (!messagesError && messagesData) {
          setMessages(messagesData)
        }

        setLoading(false)
      } catch (err) {
        console.error('Init error:', err)
        setError('Failed to load chat')
        setLoading(false)
      }
    }

    init()

    // Set up Realtime subscription for new messages
    const channel = supabase
      .channel(`conflict:${conflictId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conflict_id=eq.${conflictId}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(prev => [...prev, newMessage])

          // Hide AI typing indicator when AI message arrives
          if (newMessage.sender_type === 'ai') {
            setIsAITyping(false)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conflictId])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !conflict) return

    const content = inputValue.trim()
    setIsSending(true)
    setError('')
    setIsAITyping(true) // Show AI typing indicator immediately

    // Optimistic UI update
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      content,
      sender_type: conflict.relationships.partner_a_id === currentUserId ? 'partner_a' : 'partner_b',
      sender_id: currentUserId,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempMessage])
    setInputValue('') // Clear input immediately

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_id: conflictId,
          content
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      // Real message will arrive via Realtime subscription
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))

    } catch (err: any) {
      console.error('Send message error:', err)
      setError(err.message || 'Failed to send message. Please try again.')
      setIsAITyping(false)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      // Restore input
      setInputValue(content)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading chat...</div>
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

  if (!conflict) return null

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-purple-600 hover:text-purple-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{conflict.title}</h1>
              <p className="text-xs text-gray-500">
                {conflict.relationships.partner_a.full_name} & {conflict.relationships.partner_b.full_name}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            conflict.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {conflict.status === 'active' ? 'Active' : 'Archived'}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto max-w-4xl px-4 py-2">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 container mx-auto max-w-4xl flex flex-col overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          partnerAId={conflict.relationships.partner_a_id}
          partnerBId={conflict.relationships.partner_b_id}
          partnerAName={conflict.relationships.partner_a.full_name}
          partnerBName={conflict.relationships.partner_b.full_name}
          isAITyping={isAITyping}
        />

        {/* Input Area */}
        {conflict.status === 'active' && (
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            isSending={isSending}
          />
        )}

        {conflict.status === 'archived' && (
          <div className="bg-gray-100 p-4 text-center text-gray-600 text-sm">
            This conversation has been archived and is read-only.
          </div>
        )}
      </div>
    </div>
  )
}
