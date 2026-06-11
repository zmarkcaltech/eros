'use client'

import { useEffect, useState } from 'react'

interface Territory {
  id: string
  name: string
  visual_theme: {
    color: string
    icon: string
    gradient: string[]
  }
  description: string
}

interface Props {
  territory: Territory
  insight: string
  onClose: () => void
}

export default function CaptureModal({ territory, insight, onClose }: Props) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['🎉', '✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Modal Content */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in">
        {/* Header with Territory Theme */}
        <div
          className="p-8 text-white text-center"
          style={{
            background: `linear-gradient(135deg, ${territory.visual_theme.gradient[0]}, ${territory.visual_theme.gradient[1]})`
          }}
        >
          <div className="text-7xl mb-4 animate-bounce">{territory.visual_theme.icon}</div>
          <h2 className="text-4xl font-bold mb-2">Territory Captured!</h2>
          <h3 className="text-2xl font-semibold">{territory.name}</h3>
        </div>

        {/* Insight Content */}
        <div className="p-8">
          <div className="mb-6">
            <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>💡</span>
              <span>What You Learned</span>
            </h4>
            <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-r-lg">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{insight}</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
