'use client'

interface Props {
  onClose: () => void
}

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">How to Play MapQuest for Couples</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Game Objective */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Game Objective
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Work together with your partner to conquer all 12 territories on the Love Map by answering questions
              about each other and your relationship. The more you know each other, the faster you'll capture territories!
            </p>
          </section>

          {/* How to Play */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎮</span> How to Play
            </h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-purple-600 min-w-[24px]">1.</span>
                <span><strong>Click any territory</strong> on the map to start a question from that region's category</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600 min-w-[24px]">2.</span>
                <span><strong>Answer the question</strong> - One partner answers while the other waits</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600 min-w-[24px]">3.</span>
                <span><strong>Make your guess</strong> - The guessing partner tries to predict the answer</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600 min-w-[24px]">4.</span>
                <span><strong>Rate the guess</strong> - The answering partner rates how accurate the guess was</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-purple-600 min-w-[24px]">5.</span>
                <span><strong>Reflect together</strong> - Share your thoughts and learn from each other</span>
              </li>
            </ol>
          </section>

          {/* Scoring */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">⭐</span> Scoring System
            </h3>
            <div className="bg-purple-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-900">Nailed It!</span>
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">+3 points</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-900">Pretty Close</span>
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">+2 points</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-900">Partly Right</span>
                <span className="bg-purple-400 text-white px-3 py-1 rounded-full text-sm font-bold">+1 point</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-900">New Discovery</span>
                <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold">+2 points</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3 italic">
              Both partners' points combine to capture territories together!
            </p>
          </section>

          {/* Territories */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🗺️</span> Territory Types
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900">☕ Daily Life</div>
                <div className="text-sm text-gray-600">Routines and everyday moments</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900">⛰️ Stress & Support</div>
                <div className="text-sm text-gray-600">How you handle challenges together</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900">🌹 Romance & Affection</div>
                <div className="text-sm text-gray-600">Love, intimacy, and connection</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900">🛤️ History & Memories</div>
                <div className="text-sm text-gray-600">Your shared story together</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900">🌾 Dreams & Identity</div>
                <div className="text-sm text-gray-600">Personal growth and aspirations</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-semibold text-gray-900">🏜️ Conflict & Repair</div>
                <div className="text-sm text-gray-600">Disagreements and healing</div>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span> Pro Tips
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span>Use the <strong>Strategy Chat</strong> to plan which territories to tackle together</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span>Territories alternate who answers - everyone gets a turn!</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span>There's no time limit - take your time to have meaningful conversations</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">•</span>
                <span>When a territory is captured, you'll receive an AI insight about your discoveries!</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Got it, let's play!
          </button>
        </div>
      </div>
    </div>
  )
}
