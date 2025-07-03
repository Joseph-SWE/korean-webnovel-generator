import Link from 'next/link';
import { ArrowLeft, Brain, Users, Target, Globe } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link
              href="/"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">About Korean Web Novel Generator</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-3xl font-bold mb-4">Revolutionizing Korean Web Novel Creation</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            Our Korean Web Novel Generator combines the power of Google Gemini AI with deep understanding 
            of Korean web novel conventions to help authors create compelling, authentic stories. Whether you&apos;re 
            a seasoned writer or just getting started, our platform provides the tools and guidance you need.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">What Makes Us Special</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Authentic Korean web novel conventions</li>
                <li>• Genre-specific plot templates</li>
                <li>• Character consistency tracking</li>
                <li>• Mobile-optimized formatting</li>
                <li>• Advanced AI storytelling</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">Supported Genres</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Romance & Romantic Fantasy</li>
                <li>• Fantasy & Magic Systems</li>
                <li>• Martial Arts & Cultivation</li>
                <li>• Regression & Time Travel</li>
                <li>• Isekai & Portal Fantasy</li>
                <li>• Villainess & Redemption</li>
                <li>• System & GameLit</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold">AI-Powered Generation</h3>
            </div>
            <p className="text-gray-600">
              Leveraging Google Gemini&apos;s advanced language capabilities, specifically trained on Korean 
              web novel patterns, tropes, and storytelling conventions.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Consistency Management</h3>
            </div>
            <p className="text-gray-600">
              Advanced tracking system ensures character personalities, plot lines, and world-building 
              rules remain consistent across all chapters.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Character Development</h3>
            </div>
            <p className="text-gray-600">
              Comprehensive character creation tools with personality tracking, relationship 
              management, and authentic Korean cultural context.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold">Cultural Authenticity</h3>
            </div>
            <p className="text-gray-600">
              Deep understanding of Korean social dynamics, honorifics, cultural nuances, 
              and web novel reader expectations.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Plan Your Novel</h3>
              <p className="text-sm text-gray-600">
                Choose your genre, setting, and provide a basic premise. Our AI will generate a comprehensive plan.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Create Characters</h3>
              <p className="text-sm text-gray-600">
                Develop rich characters with detailed personalities, backgrounds, and relationship dynamics.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Generate Chapters</h3>
              <p className="text-sm text-gray-600">
                Our AI creates engaging chapters while maintaining consistency and following Korean web novel conventions.
              </p>
            </div>
          </div>
        </div>

        {/* Korean Web Novel Conventions */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Korean Web Novel Conventions</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Writing Style</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Short, mobile-friendly paragraphs</li>
                <li>• Dialogue-heavy content</li>
                <li>• Fast-paced plot development</li>
                <li>• Cliffhanger chapter endings</li>
                <li>• Internal monologue integration</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Cultural Elements</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Korean honorifics and speech levels</li>
                <li>• Social hierarchy awareness</li>
                <li>• Family dynamics and obligations</li>
                <li>• Educational and workplace culture</li>
                <li>• Modern Korean lifestyle</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Popular Tropes</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Weak-to-strong progression</li>
                <li>• Regression/reincarnation themes</li>
                <li>• Villainess redemption arcs</li>
                <li>• System/game mechanics</li>
                <li>• Revenge and justice themes</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Story Structure</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Strong opening hooks</li>
                <li>• Serialized chapter format</li>
                <li>• Character development arcs</li>
                <li>• Emotional climax points</li>
                <li>• Satisfying resolution patterns</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">AI & Backend</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Google Gemini Pro API</li>
                <li>• Advanced prompt engineering</li>
                <li>• SQLite database with Prisma ORM</li>
                <li>• TypeScript for type safety</li>
                <li>• Next.js API routes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Frontend & UX</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Next.js 14 with App Router</li>
                <li>• Tailwind CSS for styling</li>
                <li>• React with TypeScript</li>
                <li>• Responsive mobile-first design</li>
                <li>• Real-time generation updates</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Create Your Korean Web Novel?</h2>
          <p className="text-lg mb-6 opacity-90">
            Join thousands of writers creating compelling Korean web novels with AI assistance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Creating
            </Link>
            <Link 
              href="/" 
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 