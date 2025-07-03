'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, BookOpen, Users, FileText, TrendingUp } from 'lucide-react';

interface Novel {
  id: string;
  title: string;
  description?: string;
  genre: string;
  setting: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    chapters: number;
    characters: number;
    plotlines: number;
  };
}

export default function Dashboard() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNovels: 0,
    totalChapters: 0,
    totalCharacters: 0,
    recentActivity: 0
  });

  useEffect(() => {
    fetchNovels();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNovels = async () => {
    try {
      // For now, we'll create a dummy user ID
      const response = await fetch('/api/novels?authorId=demo-user-id&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setNovels(data.novels || []);
        calculateStats(data.novels || []);
      }
    } catch (error) {
      console.error('Error fetching novels:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (novelsList: Novel[]) => {
    const totalChapters = novelsList.reduce((sum, novel) => sum + novel._count.chapters, 0);
    const totalCharacters = novelsList.reduce((sum, novel) => sum + novel._count.characters, 0);
    
    setStats({
      totalNovels: novelsList.length,
      totalChapters,
      totalCharacters,
      recentActivity: novelsList.filter(n => 
        new Date(n.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    });
  };

  const getGenreEmoji = (genre: string) => {
    const emojis: Record<string, string> = {
      ROMANCE: '💕',
      FANTASY: '🧙‍♀️',
      MARTIAL_ARTS: '⚔️',
      REGRESSION: '🔄',
      ISEKAI: '🌟',
      VILLAINESS: '👑',
      SYSTEM: '📊',
      MODERN_URBAN: '🏙️',
      HISTORICAL: '🏛️'
    };
    return emojis[genre] || '📚';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your novels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Korean Web Novel Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your AI-generated Korean web novels</p>
            </div>
            <Link
              href="/dashboard/create-novel"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Create New Novel
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Novels</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalNovels}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Chapters</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalChapters}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Characters</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCharacters}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Novels Grid */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Novels</h2>
          </div>

          {novels.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No novels yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first Korean web novel.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/create-novel"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create Novel
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {novels.map((novel) => (
                <div key={novel.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-2xl">{getGenreEmoji(novel.genre)}</div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {novel.genre.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{novel.title}</h3>
                  
                  {novel.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {novel.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{novel.setting.replace('_', ' ')}</span>
                    <span>{formatDate(novel.updatedAt)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex gap-4">
                      <span>{novel._count.chapters} chapters</span>
                      <span>{novel._count.characters} characters</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/novel/${novel.id}`}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-center py-2 px-4 rounded-md text-sm font-medium transition-colors"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/dashboard/novel/${novel.id}/generate`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-2 px-4 rounded-md text-sm font-medium transition-colors"
                    >
                      Generate
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 