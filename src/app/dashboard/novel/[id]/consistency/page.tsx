'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Brain,
  TrendingUp,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface ConsistencyData {
  overallConsistency: number;
  issuesSummary: Record<string, number>;
  recommendations: string[];
  detailedAnalysis: {
    characterConsistency: number;
    plotConsistency: number;
    worldBuildingConsistency: number;
    timelineConsistency: number;
  };
}

interface Novel {
  id: string;
  title: string;
  genre: string;
  author: { username: string };
}

export default function ConsistencyDashboard() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;

  const [consistencyData, setConsistencyData] = useState<ConsistencyData | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchNovelData();
    fetchConsistencyData();
  }, [novelId]);

  const fetchNovelData = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}`);
      const data = await response.json();
      
      if (data.success) {
        setNovel(data.novel);
      } else {
        setError(data.error || 'Failed to fetch novel data');
      }
    } catch (err) {
      setError('Failed to fetch novel data');
      console.error('Novel fetch error:', err);
    }
  };

  const fetchConsistencyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/consistency/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          novelId,
          useAI: false // Start with automated analysis
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConsistencyData(data.novelConsistency.automated);
      } else {
        setError(data.error || 'Failed to fetch consistency data');
      }
    } catch (err) {
      setError('Failed to fetch consistency data');
      console.error('Consistency fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/consistency/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          novelId,
          useAI: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConsistencyData(data.novelConsistency.automated);
        setUseAI(true);
      } else {
        setError(data.error || 'AI analysis failed');
      }
    } catch (err) {
      setError('AI analysis failed');
      console.error('AI analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
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
          <p className="text-gray-600">Analyzing consistency...</p>
        </div>
      </div>
    );
  }

  if (error || !consistencyData || !novel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Failed to analyze consistency'}</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => router.push(`/dashboard/novel/${novelId}`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Novel
            </button>
            
            <div className="flex gap-4">
              <button 
                onClick={fetchConsistencyData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Analysis
              </button>
              
              <button 
                onClick={runAIAnalysis}
                disabled={analyzing}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <Brain className="mr-2 h-4 w-4" />
                {analyzing ? 'Running AI Analysis...' : 'AI Deep Analysis'}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGenreColor(novel.genre)}`}>
              {novel.genre.replace('_', ' ')}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{novel.title}</h1>
          <p className="text-gray-600">Consistency Analysis Dashboard</p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Overall Consistency Score</h2>
              {useAI && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <Brain className="mr-1 h-3 w-3" />
                  AI Enhanced
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                  <div className={`text-3xl font-bold ${getConsistencyColor(consistencyData.overallConsistency).split(' ')[0]}`}>
                    {consistencyData.overallConsistency}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getConsistencyColor(consistencyData.overallConsistency)}`}>
                {consistencyData.overallConsistency >= 80 ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Excellent Consistency
                  </>
                ) : consistencyData.overallConsistency >= 60 ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Good Consistency
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Needs Improvement
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.characterConsistency).split(' ')[0]}`}>
                {consistencyData.detailedAnalysis.characterConsistency}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Character Consistency</h3>
            <p className="text-sm text-gray-600">Personality & behavior analysis</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="h-8 w-8 text-green-600" />
              <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.plotConsistency).split(' ')[0]}`}>
                {consistencyData.detailedAnalysis.plotConsistency}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Plot Consistency</h3>
            <p className="text-sm text-gray-600">Story progression & logic</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <MapPin className="h-8 w-8 text-purple-600" />
              <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.worldBuildingConsistency).split(' ')[0]}`}>
                {consistencyData.detailedAnalysis.worldBuildingConsistency}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">World Building</h3>
            <p className="text-sm text-gray-600">Setting & rules adherence</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-8 w-8 text-orange-600" />
              <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.timelineConsistency).split(' ')[0]}`}>
                {consistencyData.detailedAnalysis.timelineConsistency}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Timeline Consistency</h3>
            <p className="text-sm text-gray-600">Chronological accuracy</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Issues Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Issues Summary</h2>
            </div>
            <div className="p-6">
              {Object.keys(consistencyData.issuesSummary).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(consistencyData.issuesSummary).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        {type === 'character' && <Users className="h-4 w-4 text-blue-600 mr-2" />}
                        {type === 'plot' && <BookOpen className="h-4 w-4 text-green-600 mr-2" />}
                        {type === 'worldbuilding' && <MapPin className="h-4 w-4 text-purple-600 mr-2" />}
                        {type === 'timeline' && <Clock className="h-4 w-4 text-orange-600 mr-2" />}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {type.replace('_', ' ')} Issues
                        </span>
                      </div>
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No consistency issues detected!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recommendations</h2>
            </div>
            <div className="p-6">
              {consistencyData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {consistencyData.recommendations.slice(0, 8).map((recommendation, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                      </div>
                      <p className="ml-3 text-sm text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No recommendations needed!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">How Consistency Checking Works</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Automated Analysis</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Character personality tracking across chapters</li>
                  <li>• Plot progression validation</li>
                  <li>• World building rule enforcement</li>
                  <li>• Timeline consistency checking</li>
                  <li>• Relationship dynamics monitoring</li>
                  <li>• Location-specific rule adherence</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">AI-Powered Deep Analysis</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Korean webnovel genre convention analysis</li>
                  <li>• Cultural authenticity verification</li>
                  <li>• Advanced narrative flow assessment</li>
                  <li>• Character development arc validation</li>
                  <li>• Contextual dialogue consistency</li>
                  <li>• Subtle plot hole detection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 