'use client'

import { useEffect, useRef } from 'react'
import { MessageItem } from './MessageItem'
import { AITypingIndicator } from './AITypingIndicator'

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

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  partnerAId: string
  partnerBId: string
  partnerAName: string
  partnerBName: string
  partnerAAvatar: string | null
  partnerBAvatar: string | null
  isAITyping: boolean
}

export function MessageList({
  messages,
  currentUserId,
  partnerAId,
  partnerBId,
  partnerAName,
  partnerBName,
  partnerAAvatar,
  partnerBAvatar,
  isAITyping
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  const getSenderName = (message: Message) => {
    if (message.sender_type === 'ai') return 'AI Therapist'
    if (message.sender_id === partnerAId) return partnerAName
    if (message.sender_id === partnerBId) return partnerBName
    return 'Unknown'
  }

  const getSenderAvatar = (message: Message) => {
    if (message.sender_type === 'ai') return null
    if (message.sender_id === partnerAId) return partnerAAvatar
    if (message.sender_id === partnerBId) return partnerBAvatar
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-center">
          <div>
            <p className="text-lg font-semibold mb-2">Start the conversation</p>
            <p className="text-sm">Send a message to begin your mediation session with the AI therapist.</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isCurrentUser={message.sender_id === currentUserId}
              senderName={getSenderName(message)}
              senderAvatar={getSenderAvatar(message)}
            />
          ))}

          {isAITyping && <AITypingIndicator />}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  )
}
