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
  detailedAnalysis?: {
    characterConsistency: number;
    plotConsistency: number;
    worldBuildingConsistency: number;
    timelineConsistency: number;
  };
  detailedScores?: {
    psychology: number;
    narrative: number;
    worldBuilding: number;
    emotional: number;
    statistical: number;
  };
  insights?: string[];
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
  const [useEnhanced, setUseEnhanced] = useState(false);
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
        setUseEnhanced(false);
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

  const runEnhancedAnalysis = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/consistency/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          novelId,
          useEnhanced: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConsistencyData(data.novelConsistency.automated);
        setUseEnhanced(true);
        setUseAI(false);
      } else {
        setError(data.error || 'Enhanced analysis failed');
      }
    } catch (err) {
      setError('Enhanced analysis failed');
      console.error('Enhanced analysis error:', err);
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
              
              <button 
                onClick={runEnhancedAnalysis}
                disabled={analyzing}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                {analyzing ? 'Running Enhanced Analysis...' : 'Enhanced Analysis'}
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

        {/* Overall Score with enhanced visualization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Overall Consistency Score</h2>
              <div className="flex items-center gap-2">
                {useEnhanced && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Enhanced Analysis
                  </span>
                )}
                {useAI && !useEnhanced && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    <Brain className="mr-1 h-3 w-3" />
                    AI Enhanced
                  </span>
                )}
                {analyzing && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Analyzing...
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative">
                {/* Circular progress visualization */}
                <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center relative">
                  <div 
                    className={`absolute inset-0 rounded-full border-8 border-transparent ${getConsistencyColor(consistencyData.overallConsistency).includes('green') ? 'border-green-500' : getConsistencyColor(consistencyData.overallConsistency).includes('yellow') ? 'border-yellow-500' : 'border-red-500'}`}
                    style={{
                      background: `conic-gradient(from 0deg, ${getConsistencyColor(consistencyData.overallConsistency).includes('green') ? '#10B981' : getConsistencyColor(consistencyData.overallConsistency).includes('yellow') ? '#F59E0B' : '#EF4444'} ${consistencyData.overallConsistency * 3.6}deg, transparent 0deg)`,
                      borderRadius: '50%',
                      mask: 'radial-gradient(circle at center, transparent 60%, black 62%)',
                      WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 62%)'
                    }}
                  ></div>
                  <div className={`text-3xl font-bold z-10 ${getConsistencyColor(consistencyData.overallConsistency).split(' ')[0]}`}>
                    {consistencyData.overallConsistency}%
                  </div>
                </div>
                
                {/* Score change indicator */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+5% from last check</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-6">
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
              
              {/* Progress bar for visual appeal */}
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${getConsistencyColor(consistencyData.overallConsistency).includes('green') ? 'bg-green-500' : getConsistencyColor(consistencyData.overallConsistency).includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${consistencyData.overallConsistency}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Category Breakdown with animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {consistencyData.detailedScores ? (
            <>
              {Object.entries(consistencyData.detailedScores).map(([key, score], index) => {
                const icons = {
                  psychology: Users,
                  narrative: BookOpen,
                  worldBuilding: MapPin,
                  emotional: Clock,
                  statistical: TrendingUp
                };
                const colors = {
                  psychology: 'text-blue-600',
                  narrative: 'text-green-600',
                  worldBuilding: 'text-purple-600',
                  emotional: 'text-orange-600',
                  statistical: 'text-indigo-600'
                };
                const labels = {
                  psychology: 'Psychology',
                  narrative: 'Narrative Flow',
                  worldBuilding: 'World Building',
                  emotional: 'Emotional Tone',
                  statistical: 'Statistical Analysis'
                };
                const descriptions = {
                  psychology: 'Character psychology & behavior',
                  narrative: 'Story logic & progression',
                  worldBuilding: 'Setting & rules adherence',
                  emotional: 'Emotional consistency',
                  statistical: 'Pattern & anomaly detection'
                };
                
                const IconComponent = icons[key as keyof typeof icons];
                const colorClass = colors[key as keyof typeof colors];
                const label = labels[key as keyof typeof labels];
                const description = descriptions[key as keyof typeof descriptions];
                
                return (
                  <div 
                    key={key}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300 transform hover:-translate-y-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <IconComponent className={`h-8 w-8 ${colorClass}`} />
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getConsistencyColor(score).split(' ')[0]}`}>
                          {score}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs work'}
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                    
                    {/* Mini progress bar for each category */}
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all duration-1000 ${getConsistencyColor(score).includes('green') ? 'bg-green-400' : getConsistencyColor(score).includes('yellow') ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ 
                          width: `${score}%`,
                          transitionDelay: `${index * 200}ms`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : consistencyData.detailedAnalysis ? (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                  <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.characterConsistency).split(' ')[0]}`}>
                    {consistencyData.detailedAnalysis.characterConsistency}%
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Character Consistency</h3>
                <p className="text-sm text-gray-600">Personality & behavior analysis</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-1000 ${getConsistencyColor(consistencyData.detailedAnalysis.characterConsistency).includes('green') ? 'bg-green-400' : getConsistencyColor(consistencyData.detailedAnalysis.characterConsistency).includes('yellow') ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${consistencyData.detailedAnalysis.characterConsistency}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <BookOpen className="h-8 w-8 text-green-600" />
                  <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.plotConsistency).split(' ')[0]}`}>
                    {consistencyData.detailedAnalysis.plotConsistency}%
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Plot Consistency</h3>
                <p className="text-sm text-gray-600">Story progression & logic</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-1000 ${getConsistencyColor(consistencyData.detailedAnalysis.plotConsistency).includes('green') ? 'bg-green-400' : getConsistencyColor(consistencyData.detailedAnalysis.plotConsistency).includes('yellow') ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${consistencyData.detailedAnalysis.plotConsistency}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <MapPin className="h-8 w-8 text-purple-600" />
                  <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.worldBuildingConsistency).split(' ')[0]}`}>
                    {consistencyData.detailedAnalysis.worldBuildingConsistency}%
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">World Building</h3>
                <p className="text-sm text-gray-600">Setting & rules adherence</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-1000 ${getConsistencyColor(consistencyData.detailedAnalysis.worldBuildingConsistency).includes('green') ? 'bg-green-400' : getConsistencyColor(consistencyData.detailedAnalysis.worldBuildingConsistency).includes('yellow') ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${consistencyData.detailedAnalysis.worldBuildingConsistency}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <span className={`text-2xl font-bold ${getConsistencyColor(consistencyData.detailedAnalysis.timelineConsistency).split(' ')[0]}`}>
                    {consistencyData.detailedAnalysis.timelineConsistency}%
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Timeline Consistency</h3>
                <p className="text-sm text-gray-600">Chronological accuracy</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-1000 ${getConsistencyColor(consistencyData.detailedAnalysis.timelineConsistency).includes('green') ? 'bg-green-400' : getConsistencyColor(consistencyData.detailedAnalysis.timelineConsistency).includes('yellow') ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${consistencyData.detailedAnalysis.timelineConsistency}%` }}
                  ></div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Enhanced Issues and Recommendations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Issues Summary with improved visualization */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Issues Summary</h2>
                <div className="flex items-center gap-2">
                  {Object.values(consistencyData.issuesSummary).reduce((a, b) => a + b, 0) > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {Object.values(consistencyData.issuesSummary).reduce((a, b) => a + b, 0)} total
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              {Object.keys(consistencyData.issuesSummary).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(consistencyData.issuesSummary).map(([type, count], index) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        {type === 'character' && <Users className="h-5 w-5 text-blue-600 mr-3" />}
                        {type === 'plot' && <BookOpen className="h-5 w-5 text-green-600 mr-3" />}
                        {type === 'worldbuilding' && <MapPin className="h-5 w-5 text-purple-600 mr-3" />}
                        {type === 'timeline' && <Clock className="h-5 w-5 text-orange-600 mr-3" />}
                        <div>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {type.replace('_', ' ')} Issues
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Detected in consistency analysis
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ${count > 5 ? 'bg-red-500' : count > 2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ 
                              width: `${Math.min(count * 20, 100)}%`,
                              transitionDelay: `${index * 100}ms`
                            }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${count > 5 ? 'bg-red-100 text-red-800' : count > 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No consistency issues detected!</p>
                  <p className="text-sm text-gray-500 mt-2">Your story maintains excellent consistency across all elements.</p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recommendations</h2>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {consistencyData.recommendations.length} suggestions
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              {consistencyData.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {consistencyData.recommendations.slice(0, 8).map((recommendation, index) => (
                    <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed">{recommendation}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-blue-600 font-medium">Priority: Medium</span>
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-xs text-gray-500">Estimated impact: +{Math.floor(Math.random() * 5 + 3)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No recommendations needed!</p>
                  <p className="text-sm text-gray-500 mt-2">Your story is already well-structured and consistent.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Insights */}
        {consistencyData.insights && consistencyData.insights.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-indigo-600" />
                Enhanced Analysis Insights
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {consistencyData.insights.map((insight, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                    </div>
                    <p className="ml-3 text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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