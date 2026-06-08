interface MessageItemProps {
  message: {
    id: string
    content: string
    sender_type: 'partner_a' | 'partner_b' | 'ai'
    sender_id: string | null
    created_at: string
    sender?: {
      full_name: string
    }
  }
  isCurrentUser: boolean
  senderName: string
}

export function MessageItem({ message, isCurrentUser, senderName }: MessageItemProps) {
  const isAI = message.sender_type === 'ai'

  return (
    <div className={`flex ${isCurrentUser && !isAI ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] rounded-lg p-4 ${
        isAI
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200'
          : isCurrentUser
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-900'
      }`}>
        {/* Sender name for non-current-user messages */}
        {!isCurrentUser && (
          <div className={`text-xs font-semibold mb-2 ${isAI ? 'text-indigo-700' : 'text-gray-600'}`}>
            {isAI ? '🧠 AI Therapist' : senderName}
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Timestamp */}
        <div className={`text-xs mt-2 ${
          isAI ? 'text-indigo-500' : isCurrentUser ? 'text-purple-100' : 'text-gray-500'
        }`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
