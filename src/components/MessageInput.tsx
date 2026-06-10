interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  maxLength?: number
}

export function MessageInput({
  value,
  onChange,
  onSend,
  isSending,
  maxLength = 2000
}: MessageInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t bg-white p-4">
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none border border-gray-300 rounded-lg p-3 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          rows={3}
          maxLength={maxLength}
          disabled={isSending}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || isSending}
          className="px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-1 text-right">
        {value.length} / {maxLength}
      </div>
    </div>
  )
}
