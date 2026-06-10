import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Eros
            </h1>
            <p className="text-2xl text-gray-600 mb-8">
              AI Couples Communication Assistant
            </p>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-12">
              Designed to easily mediate conflicts and enhance your understanding of your partner
              through exercises, games, and personalized daily advice.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-purple-600 shadow-lg"
            >
              Log In
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Chat</h3>
              <p className="text-gray-600">
                Communicate with your partner and an AI mediator in one continuous conversation.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Exercises & Games</h3>
              <p className="text-gray-600">
                Strengthen your bond through interactive relationship-building activities.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-semibold mb-2">Personalized Advice</h3>
              <p className="text-gray-600">
                Get daily insights tailored to your relationship dynamics and goals.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-16 bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-3xl font-bold mb-8">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6 text-left">
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  1
                </div>
                <h4 className="font-semibold mb-2">Link Together</h4>
                <p className="text-sm text-gray-600">Both partners sign up and connect via a unique code</p>
              </div>
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  2
                </div>
                <h4 className="font-semibold mb-2">Start Chatting</h4>
                <p className="text-sm text-gray-600">Open your relationship chat and discuss what's on your mind</p>
              </div>
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  3
                </div>
                <h4 className="font-semibold mb-2">AI Mediates</h4>
                <p className="text-sm text-gray-600">The AI helps facilitate productive dialogue and understanding</p>
              </div>
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  4
                </div>
                <h4 className="font-semibold mb-2">Grow Together</h4>
                <p className="text-sm text-gray-600">Build better communication habits and deepen your connection</p>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div className="mt-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-6">What You Get</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💭</div>
                <div>
                  <h4 className="font-semibold mb-1">Conflict Mediation</h4>
                  <p className="text-sm text-gray-700">AI-assisted conversations to work through disagreements calmly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎮</div>
                <div>
                  <h4 className="font-semibold mb-1">Interactive Exercises</h4>
                  <p className="text-sm text-gray-700">Games and activities designed to strengthen your bond</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">📱</div>
                <div>
                  <h4 className="font-semibold mb-1">Daily Check-ins</h4>
                  <p className="text-sm text-gray-700">Personalized prompts to keep you connected every day</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h4 className="font-semibold mb-1">Relationship Insights</h4>
                  <p className="text-sm text-gray-700">Track patterns and progress in your communication</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-sm text-gray-500">
            <p>Eros is a communication tool designed to support healthy relationships.</p>
            <p>For serious relationship challenges, please consult a licensed professional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
