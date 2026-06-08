export function AITypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg p-4 max-w-[75%]">
        <div className="text-xs font-semibold mb-2 text-indigo-700">
          🧠 AI Therapist
        </div>
        <div className="flex gap-1">
          <div
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}
