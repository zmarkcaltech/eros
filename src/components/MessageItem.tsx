import Image from 'next/image'

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
  senderAvatar: string | null
}

export function MessageItem({ message, isCurrentUser, senderName, senderAvatar }: MessageItemProps) {
  const isAI = message.sender_type === 'ai'

  return (
    <div className={`flex gap-3 ${isCurrentUser && !isAI ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Avatar on left for non-current-user */}
      {!isCurrentUser && (
        <div className="flex-shrink-0">
          {isAI ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              🧠
            </div>
          ) : senderAvatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={senderAvatar}
                alt={senderName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[75%] rounded-lg p-4 ${
        isAI
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 text-gray-900'
          : isCurrentUser
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-900'
      }`}>
        {/* Sender name for non-current-user messages */}
        {!isCurrentUser && (
          <div className={`text-xs font-semibold mb-2 ${isAI ? 'text-indigo-700' : 'text-gray-600'}`}>
            {isAI ? 'AI Therapist' : senderName}
          </div>
        )}

        {/* Message content */}
        <div className={`whitespace-pre-wrap break-words ${
          isAI ? 'text-gray-900' : isCurrentUser ? 'text-white' : 'text-gray-900'
        }`}>
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

      {/* Avatar on right for current user */}
      {isCurrentUser && !isAI && (
        <div className="flex-shrink-0">
          {senderAvatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={senderAvatar}
                alt={senderName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
