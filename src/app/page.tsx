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
              AI-Powered Couples Therapy
            </p>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-12">
              Navigate conflicts together with the help of AI. Share your perspectives privately,
              receive balanced therapeutic guidance, and strengthen your relationship.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
            >
              Get Started
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
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
              <p className="text-gray-600">
                Your perspectives remain completely private. Partners never see each other's submissions.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Advice</h3>
              <p className="text-gray-600">
                Claude AI analyzes both perspectives to provide balanced, empathetic therapeutic guidance.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">💑</div>
              <h3 className="text-xl font-semibold mb-2">Designed for Couples</h3>
              <p className="text-gray-600">
                A structured approach to conflict resolution that helps both partners feel heard.
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
                <h4 className="font-semibold mb-2">Link Accounts</h4>
                <p className="text-sm text-gray-600">Both partners sign up and connect via a unique code</p>
              </div>
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  2
                </div>
                <h4 className="font-semibold mb-2">Submit Perspectives</h4>
                <p className="text-sm text-gray-600">Each partner privately shares their view of the conflict</p>
              </div>
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  3
                </div>
                <h4 className="font-semibold mb-2">AI Analysis</h4>
                <p className="text-sm text-gray-600">Claude analyzes both perspectives with empathy and balance</p>
              </div>
              <div>
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-purple-600">
                  4
                </div>
                <h4 className="font-semibold mb-2">Receive Guidance</h4>
                <p className="text-sm text-gray-600">Both partners view therapeutic advice to move forward together</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-sm text-gray-500">
            <p>Eros is an AI tool designed to complement, not replace, professional therapy.</p>
            <p>For serious relationship issues, please consult a licensed therapist.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
