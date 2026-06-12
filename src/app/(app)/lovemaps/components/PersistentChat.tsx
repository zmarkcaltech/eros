'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface ChatMessage {
  id: string
  sender_type: 'partner_a' | 'partner_b'
  content: string
  created_at: string
}

interface Props {
  relationshipId: string
  userRole: 'partner_a' | 'partner_b'
  yourName: string
  partnerName: string
  yourAvatar: string | null
  partnerAvatar: string | null
}

export default function PersistentChat({
  relationshipId,
  userRole,
  yourName,
  partnerName,
  yourAvatar,
  partnerAvatar
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch('/api/lovemaps/chat')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setTimeout(scrollToBottom, 100)
      }
    }
    fetchMessages()
  }, [])

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`relationship_chat:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'relationship_chat_messages',
          filter: `relationship_id=eq.${relationshipId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages(prev => [...prev, newMessage])
          setTimeout(scrollToBottom, 100)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [relationshipId, supabase])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch('/api/lovemaps/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue.trim() })
      })

      if (!response.ok) throw new Error('Failed to send')

      setInputValue('')
    } catch (error) {
      console.error('Send error:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-semibold">Strategy Chat</span>
        </div>
        <div className="text-xs mt-1 opacity-90">Plan your conquest together</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start strategizing!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isYou = msg.sender_type === userRole
            const avatar = isYou ? yourAvatar : partnerAvatar
            const name = isYou ? yourName : partnerName
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isYou ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar on left for partner */}
                {!isYou && (
                  <div className="flex-shrink-0">
                    {avatar ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={avatar!}
                          alt={name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div className={`max-w-[75%]`}>
                  <div className="text-xs text-gray-500 mb-1 px-2">
                    {isYou ? 'You' : partnerName}
                  </div>
                  <div
                    className={`
                      rounded-lg px-3 py-2 text-sm
                      ${isYou
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }
                    `}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Avatar on right for you */}
                {isYou && (
                  <div className="flex-shrink-0">
                    {avatar ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={avatar!}
                          alt={name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {inputValue.length}/500
        </div>
      </div>
    </div>
  )
}
