'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  TrendingUp,
  Target,
  X,
  Globe,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { CharacterUsage, PlotlineDevelopment, WorldBuildingUsage } from '@/types';

interface Novel {
  id: string;
  title: string;
  description?: string;
  genre: string;
  setting: string;
  createdAt: string;
  updatedAt: string;
  author: {
    username: string;
    email: string;
  };
  chapters: Array<{
    id: string;
    number: number;
    title: string;
    wordCount: number;
    createdAt: string;
    cliffhanger?: string;
  }>;
  characters: Array<{
    id: string;
    name: string;
    description: string;
    personality: string;
    background: string;
  }>;
  plotlines: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    priority: number;
  }>;
  worldBuilding?: {
    id: string;
    magicSystem?: string;
    locations?: string;
    cultures?: string;
    timeline?: string;
    rules?: string;
  };
  _count: {
    chapters: number;
    characters: number;
    plotlines: number;
  };
}

export default function NovelPage() {
  const params = useParams();
  const router = useRouter();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showPlotlineModal, setShowPlotlineModal] = useState(false);
  const [showWorldBuildingModal, setShowWorldBuildingModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [showDeleteChapterModal, setShowDeleteChapterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit states
  const [editingPlotline, setEditingPlotline] = useState<{
    id: string;
    name: string;
    description: string;
    status: 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED';
    priority: number;
  } | null>(null);
  
  const [editingChapter, setEditingChapter] = useState<{
    id: string;
    number: number;
    title: string;
    content: string;
    cliffhanger?: string;
    wordCount: number;
  } | null>(null);

  const [chapterToDelete, setChapterToDelete] = useState<{
    id: string;
    title: string;
    number: number;
  } | null>(null);
  
  const [showRewriteChapterModal, setShowRewriteChapterModal] = useState(false);
  const [chapterToRewrite, setChapterToRewrite] = useState<{
    id: string;
    title: string;
    number: number;
  } | null>(null);
  const [rewriteForm, setRewriteForm] = useState({
    rewriteReason: '',
    rewriteInstructions: '',
    targetWordCount: 2500,
    maintainPlotPoints: true,
    maintainCharacterDevelopment: true
  });
  
  // Form data states
  const [characterForm, setCharacterForm] = useState({
    name: '',
    description: '',
    personality: '',
    background: ''
  });
  
  const [plotlineForm, setPlotlineForm] = useState<{
    name: string;
    description: string;
    status: 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED';
    priority: number;
  }>({
    name: '',
    description: '',
    status: 'PLANNED',
    priority: 1
  });
  
  const [worldBuildingForm, setWorldBuildingForm] = useState({
    magicSystem: '',
    locations: '',
    cultures: '',
    timeline: '',
    rules: ''
  });

  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    autoGenerate: true,
    targetWordCount: 2500,
    cliffhanger: ''
  });

  const [editChapterForm, setEditChapterForm] = useState({
    title: '',
    content: '',
    cliffhanger: '',
    summary: ''
  });

  const novelId = params.id as string;

  useEffect(() => {
    const fetchNovel = async () => {
      try {
        const response = await fetch(`/api/novels/${novelId}`);
        const data = await response.json();

        if (data.success) {
          setNovel(data.novel);
        } else {
          setError(data.error || 'Failed to fetch novel');
        }
      } catch {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (novelId) {
      fetchNovel();
    }
  }, [novelId]);

  // Handle rewrite parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rewriteChapterId = urlParams.get('rewrite');
    
    if (rewriteChapterId && novel) {
      // Find the chapter to rewrite
      const chapterToRewrite = novel.chapters.find(c => c.id === rewriteChapterId);
      if (chapterToRewrite) {
        setChapterToRewrite({
          id: chapterToRewrite.id,
          title: chapterToRewrite.title,
          number: chapterToRewrite.number
        });
        setShowRewriteChapterModal(true);
        setActiveTab('chapters');
        
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [novel]);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: 'bg-blue-100 text-blue-800',
      INTRODUCED: 'bg-indigo-100 text-indigo-800',
      DEVELOPING: 'bg-green-100 text-green-800',
      COMPLICATED: 'bg-yellow-100 text-yellow-800',
      CLIMAXING: 'bg-orange-100 text-orange-800',
      RESOLVED: 'bg-gray-100 text-gray-800',
      ABANDONED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Handler functions
  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...characterForm,
          novelId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Failed to create character');
    } finally {
      setIsSubmitting(false);
      setShowCharacterModal(false);
      setCharacterForm({ name: '', description: '', personality: '', background: '' });
    }
  };

  const handleCreatePlotline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/plotlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...plotlineForm,
          novelId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating plotline:', error);
      alert('Failed to create plotline');
    } finally {
      setIsSubmitting(false);
      setShowPlotlineModal(false);
      setPlotlineForm({ name: '', description: '', status: 'PLANNED', priority: 1 });
    }
  };

  const handleEditPlotline = (plotline: { id: string; name: string; description: string; status: string; priority: number; }) => {
    setEditingPlotline({
      id: plotline.id,
      name: plotline.name,
      description: plotline.description,
      status: plotline.status as 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED',
      priority: plotline.priority
    });
    setShowPlotlineModal(true);
  };

  const handleUpdatePlotline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlotline) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/plotlines/${editingPlotline.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPlotline.name,
          description: editingPlotline.description,
          status: editingPlotline.status,
          priority: editingPlotline.priority
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error updating plotline:', error);
      alert('Failed to update plotline');
    } finally {
      setIsSubmitting(false);
      setShowPlotlineModal(false);
      setEditingPlotline(null);
    }
  };

  const handleDeletePlotline = async (plotlineId: string, plotlineName: string) => {
    if (!confirm(`Are you sure you want to delete the plotline "${plotlineName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/plotlines/${plotlineId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting plotline:', error);
      alert('Failed to delete plotline');
    }
  };



  const handleCreateWorldBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/world-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...worldBuildingForm,
          novelId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error updating world building:', error);
      alert('Failed to update world building');
    } finally {
      setIsSubmitting(false);
      setShowWorldBuildingModal(false);
      setWorldBuildingForm({ magicSystem: '', locations: '', cultures: '', timeline: '', rules: '' });
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (chapterForm.autoGenerate) {
        // Use AI generation endpoint
        const nextChapterNumber = (novel?.chapters.length || 0) + 1;
        
        const response = await fetch('/api/generate/chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            novelId,
            chapterNumber: nextChapterNumber,
            title: chapterForm.title,
            targetWordCount: chapterForm.targetWordCount,
            plotFocus: chapterForm.description || undefined, // Use description as plot focus
          })
        });
        
        const data = await response.json();
        if (data.success) {
          // Show tracking information if available
          if (data.tracking) {
            const trackingInfo = data.tracking;
            let message = `Chapter generated successfully!\n\n`;
            
            if (trackingInfo.charactersUsed.length > 0) {
              message += `📝 Characters Featured: ${trackingInfo.charactersUsed.map((c: CharacterUsage) => 
                `${c.characterName} (${c.appearances} mentions, ${c.role})`
              ).join(', ')}\n\n`;
            }
            
            if (trackingInfo.plotlinesDeveloped.length > 0) {
              message += `📖 Plot Development: ${trackingInfo.plotlinesDeveloped.map((p: PlotlineDevelopment) => 
                `${p.plotlineName} (${p.developmentType})`
              ).join(', ')}\n\n`;
            }
            
            if (trackingInfo.worldBuildingElements.length > 0) {
              message += `🌍 World Building: ${trackingInfo.worldBuildingElements.map((w: WorldBuildingUsage) => 
                w.name
              ).join(', ')}\n\n`;
            }
            
            if (data.consistencyReport?.hasIssues) {
              message += `⚠️ Consistency Issues: ${data.consistencyReport.issueCount} found\n\n`;
            } else {
              message += `✅ No consistency issues detected\n\n`;
            }
            
            message += `Word count: ${data.chapter?.wordCount || 0} words`;
            alert(message);
          }
          
          // Navigate to the new chapter for viewing
          router.push(`/dashboard/novel/${novelId}/chapter/${data.chapter.id}`);
        } else {
          alert(data.error || 'Failed to generate chapter');
        }
      } else {
        // Create empty chapter manually
        const response = await fetch('/api/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: chapterForm.title,
            content: '', // Empty content for manual editing
            cliffhanger: chapterForm.cliffhanger,
            novelId
          })
        });
        
        const data = await response.json();
        if (data.success) {
          // Navigate to the new chapter for editing
          router.push(`/dashboard/novel/${novelId}/chapter/${data.chapter.id}`);
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      console.error('Error creating chapter:', error);
      alert('Failed to create chapter');
    } finally {
      setIsSubmitting(false);
      setShowChapterModal(false);
      setChapterForm({ title: '', description: '', autoGenerate: true, targetWordCount: 2500, cliffhanger: '' });
    }
  };

  const handleEditChapter = async (chapter: { id: string; number: number; title: string; wordCount: number; cliffhanger?: string }) => {
    try {
      // Fetch full chapter data
      const response = await fetch(`/api/chapters/${chapter.id}`);
      const data = await response.json();
      
      if (data.success) {
        setEditingChapter({
          id: data.chapter.id,
          number: data.chapter.number,
          title: data.chapter.title,
          content: data.chapter.content,
          cliffhanger: data.chapter.cliffhanger || '',
          wordCount: data.chapter.wordCount
        });
        setEditChapterForm({
          title: data.chapter.title,
          content: data.chapter.content,
          cliffhanger: data.chapter.cliffhanger || '',
          summary: data.chapter.summary || ''
        });
        setShowEditChapterModal(true);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
      alert('Failed to fetch chapter data');
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/chapters/${editingChapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editChapterForm.title,
          content: editChapterForm.content,
          cliffhanger: editChapterForm.cliffhanger,
          summary: editChapterForm.summary
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Chapter updated successfully!');
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error updating chapter:', error);
      alert('Failed to update chapter');
    } finally {
      setIsSubmitting(false);
      setShowEditChapterModal(false);
      setEditingChapter(null);
    }
  };

  const handleDeleteChapter = async (chapter: { id: string; title: string; number: number }) => {
    setChapterToDelete(chapter);
    setShowDeleteChapterModal(true);
  };

  const confirmDeleteChapter = async () => {
    if (!chapterToDelete) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/chapters/${chapterToDelete.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Chapter deleted successfully!');
        // Refresh novel data
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter');
    } finally {
      setIsSubmitting(false);
      setShowDeleteChapterModal(false);
      setChapterToDelete(null);
    }
  };

  const handleRewriteChapter = async (chapter: { id: string; title: string; number: number }) => {
    setChapterToRewrite(chapter);
    // Reset form with helpful placeholder focus
    setRewriteForm({
      rewriteReason: '',
      rewriteInstructions: '',
      targetWordCount: 2500,
      maintainPlotPoints: true,
      maintainCharacterDevelopment: true
    });
    setShowRewriteChapterModal(true);
  };

  const confirmRewriteChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterToRewrite) return;
    
    if (!rewriteForm.rewriteReason.trim()) {
      alert('Please specify why you want to rewrite this chapter. This helps the AI understand what to improve.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/chapters/${chapterToRewrite.id}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewriteReason: rewriteForm.rewriteReason,
          rewriteInstructions: rewriteForm.rewriteInstructions,
          targetWordCount: rewriteForm.targetWordCount,
          maintainPlotPoints: rewriteForm.maintainPlotPoints,
          maintainCharacterDevelopment: rewriteForm.maintainCharacterDevelopment
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error occurred' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        let message = `Chapter rewritten successfully!\n\n`;
        message += `Word count: ${data.rewriteInfo.originalWordCount} → ${data.rewriteInfo.newWordCount} words\n`;
        
        if (data.metadata?.generatedMetadata?.reasonAnalysis) {
          message += `\nHow your concerns were addressed:\n${data.metadata.generatedMetadata.reasonAnalysis}`;
        }
        
        if (data.metadata?.generatedMetadata?.improvements) {
          message += `\n\nKey improvements made:\n${data.metadata.generatedMetadata.improvements}`;
        }
        
        alert(message);
        // Refresh novel data
        window.location.reload();
      } else {
        alert(`Rewrite failed: ${data.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error rewriting chapter:', error);
      
      let errorMessage = 'Failed to rewrite chapter';
      if (error instanceof Error) {
        if (error.message.includes('JSON.parse') || error.message.includes('Unexpected token')) {
          errorMessage = 'The AI returned an invalid response format. Please try again, or try simplifying your rewrite instructions.';
        } else if (error.message.includes('AI response format error')) {
          errorMessage = 'The AI had trouble understanding the request. Please try rewording your reason for rewriting and try again.';
        } else {
          errorMessage = `Rewrite failed: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setShowRewriteChapterModal(false);
      setChapterToRewrite(null);
      setRewriteForm({
        rewriteReason: '',
        rewriteInstructions: '',
        targetWordCount: 2500,
        maintainPlotPoints: true,
        maintainCharacterDevelopment: true
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Novel Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The novel you are looking for does not exist.'}</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{novel.title}</h1>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getGenreColor(novel.genre)}`}>
                  {novel.genre.replace('_', ' ')}
                </span>
                <span className="px-2 py-1 rounded-full text-sm font-medium border border-gray-300 text-gray-700">
                  {novel.setting.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">
                  by {novel.author.username}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                <Edit className="mr-2 h-4 w-4" />
                Edit Novel
              </button>
              <button 
                onClick={() => setShowChapterModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Chapter
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chapters</p>
                <p className="text-2xl font-bold text-gray-900">{novel._count.chapters}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Characters</p>
                <p className="text-2xl font-bold text-gray-900">{novel._count.characters}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Plotlines</p>
                <p className="text-2xl font-bold text-gray-900">{novel._count.plotlines}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Words</p>
                <p className="text-2xl font-bold text-gray-900">
                  {novel.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'chapters', name: 'Chapters' },
                { id: 'characters', name: 'Characters' },
                { id: 'plotlines', name: 'Plotlines' },
                { id: 'worldbuilding', name: 'World Building' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Novel Description</h3>
                  <p className="text-gray-700">
                    {novel.description || 'No description available.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Novel created</span>
                      <span className="text-gray-500">
                        {new Date(novel.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Last updated</span>
                      <span className="text-gray-500">
                        {new Date(novel.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chapters Tab */}
            {activeTab === 'chapters' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Chapters ({novel.chapters.length})</h3>
                  <button 
                    onClick={() => setShowChapterModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Chapter
                  </button>
                </div>
                
                <div className="space-y-4">
                  {novel.chapters.length > 0 ? (
                                         novel.chapters.map((chapter) => (
                       <div key={chapter.id} className="border border-gray-200 rounded-lg p-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <button
                               onClick={() => router.push(`/dashboard/novel/${novel.id}/chapter/${chapter.id}`)}
                               className="text-left hover:text-blue-600 transition-colors"
                             >
                               <h4 className="font-semibold">
                                 Chapter {chapter.number}: {chapter.title}
                               </h4>
                             </button>
                            <p className="text-sm text-gray-600">
                              {chapter.wordCount.toLocaleString()} words • {new Date(chapter.createdAt).toLocaleDateString()}
                            </p>
                            {chapter.cliffhanger && (
                              <p className="text-sm text-blue-600 mt-1">
                                Cliffhanger: {chapter.cliffhanger}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEditChapter(chapter)}
                              className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                              title="Edit chapter"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleRewriteChapter(chapter)}
                              className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600"
                              title="Rewrite chapter with AI"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteChapter(chapter)}
                              className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:border-red-300 hover:text-red-600"
                              title="Delete chapter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No chapters yet</h3>
                      <p className="text-gray-600 mb-4">Start writing your Korean web novel!</p>
                      <button 
                        onClick={() => setShowChapterModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Write First Chapter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Characters Tab */}
            {activeTab === 'characters' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Characters ({novel.characters.length})</h3>
                  <button 
                    onClick={() => setShowCharacterModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Character
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {novel.characters.map((character) => (
                    <div key={character.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold mb-2">{character.name}</h4>
                      <p className="text-gray-600 mb-3">{character.description}</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Personality:</span>
                          <p className="text-gray-600">{character.personality}</p>
                        </div>
                        <div>
                          <span className="font-medium">Background:</span>
                          <p className="text-gray-600">{character.background}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {novel.characters.length === 0 && (
                    <div className="md:col-span-2 text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No characters yet</h3>
                      <p className="text-gray-600 mb-4">Create compelling characters for your story!</p>
                      <button 
                        onClick={() => setShowCharacterModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Character
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Plotlines Tab */}
            {activeTab === 'plotlines' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Plotlines ({novel.plotlines.length})</h3>
                  <button 
                    onClick={() => {
                      setEditingPlotline(null);
                      setPlotlineForm({ name: '', description: '', status: 'PLANNED', priority: 1 });
                      setShowPlotlineModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plotline
                  </button>
                </div>
                
                <div className="space-y-4">
                  {novel.plotlines
                    .sort((a, b) => b.priority - a.priority)
                    .map((plotline) => (
                      <div key={plotline.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold">{plotline.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(plotline.status)}`}>
                            {plotline.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{plotline.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Priority: {plotline.priority}
                          </span>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEditPlotline(plotline)}
                              className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                              title="Edit plotline"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeletePlotline(plotline.id, plotline.name)}
                              className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:border-red-300 hover:text-red-600"
                              title="Delete plotline"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {novel.plotlines.length === 0 && (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No plotlines yet</h3>
                      <p className="text-gray-600 mb-4">Plan your story arcs and plot development!</p>
                      <button 
                        onClick={() => {
                          setEditingPlotline(null);
                          setPlotlineForm({ name: '', description: '', status: 'PLANNED', priority: 1 });
                          setShowPlotlineModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Plotline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* World Building Tab */}
            {activeTab === 'worldbuilding' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">World Building</h3>
                  <button 
                    onClick={() => setShowWorldBuildingModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Edit World Building
                  </button>
                </div>

                {novel.worldBuilding ? (
                  <div className="space-y-4">
                    {novel.worldBuilding.magicSystem && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-2">Magic System</h4>
                        <p className="text-gray-600">{novel.worldBuilding.magicSystem}</p>
                      </div>
                    )}
                    
                    {novel.worldBuilding.locations && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-2">Locations</h4>
                        <p className="text-gray-600">{novel.worldBuilding.locations}</p>
                      </div>
                    )}
                    
                    {novel.worldBuilding.cultures && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-2">Cultures</h4>
                        <p className="text-gray-600">{novel.worldBuilding.cultures}</p>
                      </div>
                    )}
                    
                    {novel.worldBuilding.timeline && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-2">Timeline</h4>
                        <p className="text-gray-600">{novel.worldBuilding.timeline}</p>
                      </div>
                    )}
                    
                    {novel.worldBuilding.rules && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-2">World Rules</h4>
                        <p className="text-gray-600">{novel.worldBuilding.rules}</p>
                      </div>
                    )}
                    
                    {!novel.worldBuilding.magicSystem && 
                     !novel.worldBuilding.locations && 
                     !novel.worldBuilding.cultures && 
                     !novel.worldBuilding.timeline && 
                     !novel.worldBuilding.rules && (
                      <div className="text-center py-12">
                        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No world building yet</h3>
                        <p className="text-gray-600 mb-4">Define your story world!</p>
                        <button 
                          onClick={() => setShowWorldBuildingModal(true)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create World Building
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No world building yet</h3>
                    <p className="text-gray-600 mb-4">Define your story world!</p>
                    <button 
                      onClick={() => setShowWorldBuildingModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create World Building
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Character Modal */}
      {showCharacterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Character</h3>
              <button
                onClick={() => setShowCharacterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateCharacter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personality
                </label>
                <textarea
                  value={characterForm.personality}
                  onChange={(e) => setCharacterForm({ ...characterForm, personality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background
                </label>
                <textarea
                  value={characterForm.background}
                  onChange={(e) => setCharacterForm({ ...characterForm, background: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCharacterModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Chapter</h3>
              <button
                onClick={() => setShowChapterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateChapter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter chapter title..."
                  required
                />
              </div>
                              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chapter Description (Optional)
                  </label>
                  <textarea
                    value={chapterForm.description}
                    onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Describe what should happen in this chapter. If left empty, AI will generate based on your novel's context..."
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="autoGenerate"
                    checked={chapterForm.autoGenerate}
                    onChange={(e) => setChapterForm({ ...chapterForm, autoGenerate: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoGenerate" className="text-sm font-medium text-gray-700">
                    Auto-generate chapter content with AI
                  </label>
                </div>
                {chapterForm.autoGenerate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Word Count
                    </label>
                    <input
                      type="number"
                      min="500"
                      max="5000"
                      value={chapterForm.targetWordCount}
                      onChange={(e) => setChapterForm({ ...chapterForm, targetWordCount: parseInt(e.target.value) || 2500 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 2000-3000 words</p>
                  </div>
                )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliffhanger (Optional)
                </label>
                <input
                  type="text"
                  value={chapterForm.cliffhanger}
                  onChange={(e) => setChapterForm({ ...chapterForm, cliffhanger: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a cliffhanger ending..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting 
                    ? (chapterForm.autoGenerate ? 'Generating...' : 'Creating...') 
                    : (chapterForm.autoGenerate ? 'Generate Chapter' : 'Create Chapter')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plotline Modal */}
      {showPlotlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingPlotline ? 'Edit Plotline' : 'Add Plotline'}</h3>
              <button
                onClick={() => {
                  setShowPlotlineModal(false);
                  setEditingPlotline(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={editingPlotline ? handleUpdatePlotline : handleCreatePlotline} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingPlotline ? editingPlotline.name : plotlineForm.name}
                  onChange={(e) => {
                    if (editingPlotline) {
                      setEditingPlotline({ ...editingPlotline, name: e.target.value });
                    } else {
                      setPlotlineForm({ ...plotlineForm, name: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingPlotline ? editingPlotline.description : plotlineForm.description}
                  onChange={(e) => {
                    if (editingPlotline) {
                      setEditingPlotline({ ...editingPlotline, description: e.target.value });
                    } else {
                      setPlotlineForm({ ...plotlineForm, description: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editingPlotline ? editingPlotline.status : plotlineForm.status}
                  onChange={(e) => {
                    const status = e.target.value as 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED';
                    if (editingPlotline) {
                      setEditingPlotline({ ...editingPlotline, status });
                    } else {
                      setPlotlineForm({ ...plotlineForm, status });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="INTRODUCED">Introduced</option>
                  <option value="DEVELOPING">Developing</option>
                  <option value="COMPLICATED">Complicated</option>
                  <option value="CLIMAXING">Climaxing</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editingPlotline ? editingPlotline.priority : plotlineForm.priority}
                  onChange={(e) => {
                    const priority = parseInt(e.target.value);
                    if (editingPlotline) {
                      setEditingPlotline({ ...editingPlotline, priority });
                    } else {
                      setPlotlineForm({ ...plotlineForm, priority });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlotlineModal(false);
                    setEditingPlotline(null);
                    setPlotlineForm({ name: '', description: '', status: 'PLANNED', priority: 1 });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting 
                    ? (editingPlotline ? 'Updating...' : 'Creating...')
                    : (editingPlotline ? 'Update Plotline' : 'Create Plotline')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Chapter Modal */}
      {showEditChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Edit Chapter {editingChapter?.number}: {editingChapter?.title}
              </h3>
              <button
                onClick={() => {
                  setShowEditChapterModal(false);
                  setEditingChapter(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateChapter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={editChapterForm.title}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter Content
                </label>
                <textarea
                  value={editChapterForm.content}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={15}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current word count: {editChapterForm.content.trim().split(/\s+/).filter(Boolean).length}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter Summary (Optional)
                </label>
                <textarea
                  value={editChapterForm.summary}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief summary of the chapter..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliffhanger (Optional)
                </label>
                <input
                  type="text"
                  value={editChapterForm.cliffhanger}
                  onChange={(e) => setEditChapterForm({ ...editChapterForm, cliffhanger: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a cliffhanger ending..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditChapterModal(false);
                    setEditingChapter(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Chapter Confirmation Modal */}
      {showDeleteChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold">Delete Chapter</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>Chapter {chapterToDelete?.number}: {chapterToDelete?.title}</strong>? 
              This action cannot be undone and will also delete all related character usage and plotline development data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteChapterModal(false);
                  setChapterToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChapter}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Chapter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rewrite Chapter Modal */}
      {showRewriteChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Rewrite Chapter {chapterToRewrite?.number}: {chapterToRewrite?.title}
              </h3>
              <button
                onClick={() => {
                  setShowRewriteChapterModal(false);
                  setChapterToRewrite(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">How Chapter Rewriting Works</h4>
              <p className="text-sm text-blue-800">
                The AI will analyze your existing chapter and rewrite it completely while maintaining continuity with your story. 
                Please specify why you want to rewrite this chapter so the AI can focus on the specific improvements you need.
              </p>
            </div>
            <form onSubmit={confirmRewriteChapter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Why do you want to rewrite this chapter? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rewriteForm.rewriteReason}
                  onChange={(e) => setRewriteForm({ ...rewriteForm, rewriteReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Be specific about what you want to improve. Examples:
• The pacing feels too slow in the middle section
• Character dialogue doesn't feel natural
• The emotional impact of the climax is lacking
• Plot progression feels rushed
• Need more tension and suspense
• Character motivations are unclear
• The chapter ending is weak"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  This helps the AI understand exactly what needs improvement and focus the rewrite accordingly.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Instructions (Optional)
                </label>
                <textarea
                  value={rewriteForm.rewriteInstructions}
                  onChange={(e) => setRewriteForm({ ...rewriteForm, rewriteInstructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Provide specific instructions for the rewrite (e.g., add more emotional depth, focus on character interaction, improve action sequences)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Word Count
                </label>
                <input
                  type="number"
                  value={rewriteForm.targetWordCount}
                  onChange={(e) => setRewriteForm({ ...rewriteForm, targetWordCount: parseInt(e.target.value) || 2500 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="500"
                  max="10000"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintainPlotPoints"
                    checked={rewriteForm.maintainPlotPoints}
                    onChange={(e) => setRewriteForm({ ...rewriteForm, maintainPlotPoints: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="maintainPlotPoints" className="ml-2 block text-sm text-gray-900">
                    Maintain core plot points <span className="text-gray-500">(recommended)</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="maintainCharacterDevelopment"
                    checked={rewriteForm.maintainCharacterDevelopment}
                    onChange={(e) => setRewriteForm({ ...rewriteForm, maintainCharacterDevelopment: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="maintainCharacterDevelopment" className="ml-2 block text-sm text-gray-900">
                    Preserve character development <span className="text-gray-500">(recommended)</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRewriteChapterModal(false);
                    setChapterToRewrite(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Rewriting...' : 'Rewrite Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* World Building Modal */}
      {showWorldBuildingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">World Building</h3>
              <button
                onClick={() => setShowWorldBuildingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateWorldBuilding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Magic System
                </label>
                <textarea
                  value={worldBuildingForm.magicSystem}
                  onChange={(e) => setWorldBuildingForm({ ...worldBuildingForm, magicSystem: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the magic system..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locations
                </label>
                <textarea
                  value={worldBuildingForm.locations}
                  onChange={(e) => setWorldBuildingForm({ ...worldBuildingForm, locations: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe important locations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cultures
                </label>
                <textarea
                  value={worldBuildingForm.cultures}
                  onChange={(e) => setWorldBuildingForm({ ...worldBuildingForm, cultures: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe cultures and societies..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline
                </label>
                <textarea
                  value={worldBuildingForm.timeline}
                  onChange={(e) => setWorldBuildingForm({ ...worldBuildingForm, timeline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the timeline and history..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rules
                </label>
                <textarea
                  value={worldBuildingForm.rules}
                  onChange={(e) => setWorldBuildingForm({ ...worldBuildingForm, rules: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe world rules and laws..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWorldBuildingModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save World Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 