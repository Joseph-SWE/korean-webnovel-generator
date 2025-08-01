'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ChevronLeft,
  ChevronRight,
  BookOpen,
  User,
  Calendar,
  Eye,
  RotateCcw
} from 'lucide-react';

interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  cliffhanger?: string;
  createdAt: string;
  novel: {
    id: string;
    title: string;
    genre: string;
    setting: string;
    author: {
      username: string;
    };
  };
  events: Array<{
    id: string;
    eventType: string;
    description: string;
    character?: {
      name: string;
    };
    plotline?: {
      name: string;
    };
  }>;
}

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);

  const chapterId = params.chapterId as string;
  const novelId = params.id as string; // Changed from novelId to id

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const response = await fetch(`/api/chapters/${chapterId}`);
        const data = await response.json();

        if (data.success) {
          setChapter(data.chapter);
        } else {
          setError(data.error || 'Failed to fetch chapter');
        }
      } catch {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (chapterId) {
      fetchChapter();
    }
  }, [chapterId]);

  const formatContent = (content: string) => {
    // Format content for mobile reading
    return content
      .split('\n')
      .map((paragraph, index) => {
        if (paragraph.trim() === '') return null;
        
        // Check if it's dialogue (starts with quotes)
        const isDialogue = paragraph.trim().startsWith('"') || paragraph.trim().startsWith("'");
        
        return (
          <p 
            key={index} 
            className={`mb-4 leading-relaxed ${
              isDialogue ? 'pl-4 border-l-2 border-blue-200 italic' : ''
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {paragraph}
          </p>
        );
      })
      .filter(Boolean);
  };

  const getGenreColor = (genre: string) => {
    const colors: Record<string, string> = {
      ROMANCE: 'bg-pink-100 text-pink-800',
      FANTASY: 'bg-purple-100 text-purple-800',
      MARTIAL_ARTS: 'bg-red-100 text-red-800',
      ISEKAI: 'bg-blue-100 text-blue-800',
      REGRESSION: 'bg-green-100 text-green-800',
      VILLAINESS: 'bg-yellow-100 text-yellow-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
      MODERN_URBAN: 'bg-indigo-100 text-indigo-800',
      HISTORICAL: 'bg-amber-100 text-amber-800'
    };
    return colors[genre] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Chapter Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The chapter you are looking for does not exist.'}</p>
          <button 
            onClick={() => router.push(`/dashboard/novel/${novelId}`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Novel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push(`/dashboard/novel/${novelId}`)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Back to Novel</span>
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Rewrite Button */}
              <button 
                onClick={() => router.push(`/dashboard/novel/${novelId}?rewrite=${chapterId}`)}
                className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md"
                title="Rewrite this chapter"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Rewrite</span>
              </button>
              
              {/* Font Size Controls */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  disabled={fontSize <= 12}
                >
                  A-
                </button>
                <span className="text-sm text-gray-500">{fontSize}px</span>
                <button 
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  disabled={fontSize >= 24}
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chapter Header */}
        <div className="mb-8">
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGenreColor(chapter.novel.genre)}`}>
              {chapter.novel.genre.replace('_', ' ')}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {chapter.novel.title}
          </h1>
          
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
            Chapter {chapter.number}: {chapter.title}
          </h2>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {chapter.novel.author.username}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(chapter.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              {chapter.wordCount.toLocaleString()} words
            </div>
          </div>
        </div>

        {/* Chapter Content */}
        <div className="prose max-w-none">
          <div className="text-gray-800 leading-relaxed">
            {formatContent(chapter.content)}
          </div>
        </div>

        {/* Cliffhanger */}
        {chapter.cliffhanger && (
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 rounded-r-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Next Episode Preview:</h3>
            <p className="text-gray-700 italic">{chapter.cliffhanger}</p>
          </div>
        )}

        {/* Chapter Events (for debugging/development) */}
        {chapter.events && chapter.events.length > 0 && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Chapter Events:</h3>
            <div className="space-y-2">
              {chapter.events.map((event) => (
                <div key={event.id} className="text-sm text-gray-600">
                  <span className="font-medium">{event.eventType}:</span> {event.description}
                  {event.character && (
                    <span className="text-blue-600 ml-2">({event.character.name})</span>
                  )}
                  {event.plotline && (
                    <span className="text-purple-600 ml-2">[{event.plotline.name}]</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              className="flex items-center px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              disabled={chapter.number <= 1}
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Previous
            </button>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">Chapter {chapter.number}</p>
              <p className="text-xs text-gray-400">{chapter.wordCount} words</p>
            </div>
            
            <button className="flex items-center px-4 py-2 text-gray-500 hover:text-gray-700">
              Next
              <ChevronRight className="h-5 w-5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 