'use client'

import { useState } from 'react'

interface Props {
  onComplete: () => void
  onSkip: () => void
}

export default function Tutorial({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: "Welcome to MapQuest for Couples! 🗺️",
      content: "Together, you'll explore 12 territories on the Love Map by answering questions about each other. The goal? Conquer every region and deepen your connection along the way!",
      highlight: null
    },
    {
      title: "Choose Your Territory",
      content: "Click any territory on the map to start. Each region has different types of questions - from daily routines to deep dreams. Pick what interests you!",
      highlight: "map"
    },
    {
      title: "Answer & Guess",
      content: "One partner answers a question privately, then the other partner tries to guess their answer. See how well you really know each other!",
      highlight: null
    },
    {
      title: "Earn Points Together",
      content: "Rate how close the guess was. Both partners' points combine! Get enough points to capture a territory and unlock special insights about your relationship.",
      highlight: null
    },
    {
      title: "Use Strategy Chat",
      content: "Chat with your partner while playing! Plan your next move, celebrate victories, or just have fun. The chat stays visible throughout your journey.",
      highlight: null
    },
    {
      title: "Ready to Explore?",
      content: "That's all you need to know! Click any territory to begin your adventure. Remember: there's no rush, no wrong answers - just discovery.",
      highlight: null
    }
  ]

  const currentStep = steps[step]
  const isLastStep = step === steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      {/* Tutorial Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step Counter */}
          <div className="text-sm text-gray-500 font-medium mb-2">
            Step {step + 1} of {steps.length}
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {currentStep.title}
          </h2>

          {/* Icon/Illustration */}
          <div className="flex justify-center my-6">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <span className="text-6xl">
                {step === 0 && '🗺️'}
                {step === 1 && '👆'}
                {step === 2 && '💭'}
                {step === 3 && '⭐'}
                {step === 4 && '💬'}
                {step === 5 && '🚀'}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-700 text-lg leading-relaxed mb-8">
            {currentStep.content}
          </p>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Skip Tutorial
            </button>

            {step > 0 && (
              <button
                onClick={handlePrev}
                className="px-6 py-3 border-2 border-purple-300 text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              {isLastStep ? "Start Playing!" : "Next"}
            </button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === step
                    ? 'bg-purple-600 w-8'
                    : index < step
                    ? 'bg-purple-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
