/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wand2, Save } from 'lucide-react';
import { CreatedCharacter, CreatedPlotline, CreatedWorldBuilding } from '@/types';

const GENRES = [
  { value: 'ROMANCE', label: 'Romance', emoji: '💕', description: 'Love stories with Korean dynamics' },
  { value: 'FANTASY', label: 'Fantasy', emoji: '🧙‍♀️', description: 'Magic systems and adventures' },
  { value: 'MARTIAL_ARTS', label: 'Martial Arts', emoji: '⚔️', description: 'Cultivation and sect politics' },
  { value: 'REGRESSION', label: 'Regression', emoji: '🔄', description: 'Second chance narratives' },
  { value: 'ISEKAI', label: 'Isekai', emoji: '🌟', description: 'Modern knowledge in new worlds' },
  { value: 'VILLAINESS', label: 'Villainess', emoji: '👑', description: 'Redemption and subversion' },
  { value: 'SYSTEM', label: 'System', emoji: '📊', description: 'Game-like mechanics' },
  { value: 'MODERN_URBAN', label: 'Modern Urban', emoji: '🏙️', description: 'Contemporary Korean settings' },
  { value: 'HISTORICAL', label: 'Historical', emoji: '🏛️', description: 'Historical Korean periods' }
];

const SETTINGS = [
  { value: 'MODERN_KOREA', label: 'Modern Korea', description: 'Contemporary Korean society' },
  { value: 'HISTORICAL_KOREA', label: 'Historical Korea', description: 'Joseon Dynasty and earlier periods' },
  { value: 'FANTASY_WORLD', label: 'Fantasy World', description: 'Magical realms and kingdoms' },
  { value: 'MURIM_WORLD', label: 'Murim World', description: 'Martial arts and cultivation world' },
  { value: 'ISEKAI_WORLD', label: 'Isekai World', description: 'Another world with game elements' },
  { value: 'ROYAL_COURT', label: 'Royal Court', description: 'Palace intrigue and nobility' },
  { value: 'SCHOOL_OFFICE', label: 'School/Office', description: 'Educational or workplace settings' },
  { value: 'POST_APOCALYPTIC', label: 'Post-Apocalyptic', description: 'Survival in destroyed world' }
];

export default function CreateNovel() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    setting: '',
    basicPremise: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{ title?: string; synopsis?: string; characters?: any[]; plotOutline?: any[] } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePlan = async () => {
    if (!formData.genre || !formData.setting || !formData.basicPremise) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/generate/novel-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: formData.genre,
          setting: formData.setting,
          basicPremise: formData.basicPremise
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedPlan(data.plan);
        setStep(3);
      } else {
        alert('Failed to generate novel plan');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Error generating novel plan');
    } finally {
      setLoading(false);
    }
  };

  const createNovel = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || generatedPlan?.title || 'Untitled Novel',
          description: formData.description || generatedPlan?.synopsis,
          genre: formData.genre,
          setting: formData.setting,
          authorId: 'demo-user-id', // In production, this would come from authentication
          createFromPlan: !!generatedPlan,
          novelPlan: generatedPlan
        })
      });

      const data = await response.json();
      if (data.success) {
        // Show tracking information if available
        if (data.tracking && data.tracking.totalElements > 0) {
          const tracking = data.tracking;
          let message = `Novel created successfully!\n\n`;
          
          message += `📚 Novel: "${data.novel.title}"\n`;
          message += `🎭 Genre: ${formData.genre.replace('_', ' ')}\n`;
          message += `🌍 Setting: ${formData.setting.replace('_', ' ')}\n\n`;
          
          if (tracking.charactersCreated.length > 0) {
            message += `👥 Characters Created (${tracking.charactersCreated.length}):\n`;
            tracking.charactersCreated.forEach((c: CreatedCharacter) => {
              message += `  • ${c.name} (${c.role})\n`;
            });
            message += '\n';
          }
          
          if (tracking.plotlinesCreated.length > 0) {
            message += `📖 Plot Lines Created (${tracking.plotlinesCreated.length}):\n`;
            tracking.plotlinesCreated.forEach((p: CreatedPlotline) => {
              message += `  • ${p.name} (${p.type})\n`;
            });
            message += '\n';
          }
          
          if (tracking.worldBuildingCreated.length > 0) {
            message += `🏰 World Building Created:\n`;
            tracking.worldBuildingCreated.forEach((w: CreatedWorldBuilding) => {
              message += `  • ${w.elementsCreated.join(', ')}\n`;
            });
            message += '\n';
          }
          
          message += `✨ Total Elements: ${tracking.totalElements}\n\n`;
          message += `Your novel foundation is ready! Start writing your first chapter.`;
          
          alert(message);
        }
        
        router.push(`/dashboard/novel/${data.novel.id}`);
      } else {
        alert('Failed to create novel');
      }
    } catch (error) {
      console.error('Error creating novel:', error);
      alert('Error creating novel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link
              href="/dashboard"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Korean Web Novel</h1>
              <p className="text-gray-600">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNum <= step
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    stepNum < step ? 'bg-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Basic Info</span>
            <span>AI Planning</span>
            <span>Review & Create</span>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-6">Basic Novel Information</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Novel Title (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Leave blank to auto-generate"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {GENRES.map((genre) => (
                    <button
                      key={genre.value}
                      onClick={() => handleInputChange('genre', genre.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.genre === genre.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">{genre.emoji}</span>
                        <span className="font-medium">{genre.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{genre.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setting *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SETTINGS.map((setting) => (
                    <button
                      key={setting.value}
                      onClick={() => handleInputChange('setting', setting.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.setting === setting.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium mb-1">{setting.label}</div>
                      <p className="text-sm text-gray-600">{setting.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Premise *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                  placeholder="Describe the main character and initial situation..."
                  value={formData.basicPremise}
                  onChange={(e) => handleInputChange('basicPremise', e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.genre || !formData.setting || !formData.basicPremise}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Next: Generate Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: AI Planning */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-6">AI Novel Planning</h2>
            
            <div className="text-center py-8">
              <Wand2 className="mx-auto h-16 w-16 text-purple-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Generate Your Novel Plan</h3>
              <p className="text-gray-600 mb-6">
                Our AI will create a comprehensive plan including characters, plot outline, and world-building based on your preferences.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <h4 className="font-medium mb-2">Your Selections:</h4>
                <p><strong>Genre:</strong> {GENRES.find(g => g.value === formData.genre)?.label}</p>
                <p><strong>Setting:</strong> {SETTINGS.find(s => s.value === formData.setting)?.label}</p>
                <p><strong>Premise:</strong> {formData.basicPremise.substring(0, 100)}...</p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={generatePlan}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      Generate Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && generatedPlan && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-6">Review Your Novel Plan</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.title || generatedPlan.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                  value={formData.description || generatedPlan.synopsis}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Genre & Setting</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p><strong>Genre:</strong> {GENRES.find(g => g.value === formData.genre)?.label}</p>
                    <p><strong>Setting:</strong> {SETTINGS.find(s => s.value === formData.setting)?.label}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Generated Elements</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p><strong>Characters:</strong> {generatedPlan.characters?.length || 0} main characters</p>
                    <p><strong>Plot Points:</strong> {generatedPlan.plotOutline?.length || 0} major arcs</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Regenerate Plan
                </button>
                <button
                  onClick={createNovel}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Create Novel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 