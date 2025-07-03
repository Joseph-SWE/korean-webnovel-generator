import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Korean Web Novel Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create compelling Korean web novels with AI assistance. 
            Generate romance, fantasy, regression, and more with authentic Korean storytelling conventions.
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Genre Expertise</h3>
            <p className="text-gray-600">
              Specialized in popular Korean web novel genres: Romance, Fantasy, 
              Martial Arts, Regression, Isekai, and Villainess stories.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Consistency Tracking</h3>
            <p className="text-gray-600">
              Advanced character and plot consistency management ensures 
              coherent storytelling across multiple chapters.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Mobile-First</h3>
            <p className="text-gray-600">
              Generated content follows Korean web novel conventions with 
              short paragraphs and mobile-friendly formatting.
            </p>
          </div>
        </div>

        {/* Genre Showcase */}
        <div className="bg-white rounded-lg p-8 shadow-lg mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Supported Genres</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: "Romance", emoji: "💕", desc: "Love stories with Korean dynamics" },
              { name: "Fantasy", emoji: "🧙‍♀️", desc: "Magic systems and adventures" },
              { name: "Martial Arts", emoji: "⚔️", desc: "Cultivation and sect politics" },
              { name: "Regression", emoji: "🔄", desc: "Second chance narratives" },
              { name: "Isekai", emoji: "🌟", desc: "Modern knowledge in new worlds" },
              { name: "Villainess", emoji: "👑", desc: "Redemption and subversion" },
              { name: "System", emoji: "📊", desc: "Game-like mechanics" },
              { name: "Modern Urban", emoji: "🏙️", desc: "Contemporary Korean settings" }
            ].map((genre) => (
              <div key={genre.name} className="text-center p-4 border rounded-lg hover:bg-gray-50">
                <div className="text-2xl mb-2">{genre.emoji}</div>
                <h4 className="font-semibold">{genre.name}</h4>
                <p className="text-sm text-gray-600">{genre.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Writing?</h2>
            <p className="text-xl mb-6">
              Create your first Korean web novel with AI assistance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/dashboard" 
                className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                href="/about" 
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600">
          <p>Powered by Google Gemini AI • Built with Next.js</p>
        </footer>
      </div>
    </div>
  );
}
