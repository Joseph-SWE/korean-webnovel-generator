/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './db';
import { ConsistencyCheck, ConsistencyIssue } from '@/types';
import { generateWithRetry } from './gemini';
import { ADVANCED_CONSISTENCY_PROMPTS } from './prompts';
import { semanticAnalyzer } from './semantic-analyzer';

interface CharacterBehaviorProfile {
  name: string;
  personalityEmbeddings: string[];
  speechPatterns: string[];
  behaviorHistory: Array<{
    action: string;
    context: string;
    chapter: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  emotionalBaseline: {
    aggression: number;
    confidence: number;
    empathy: number;
    intelligence: number;
  };
  relationshipDynamics: Map<string, {
    type: string;
    development: string[];
    consistencyScore: number;
  }>;
}

interface MultiPerspectiveAnalysis {
  psychologyIssues: ConsistencyIssue[];
  narrativeIssues: ConsistencyIssue[];
  worldBuildingIssues: ConsistencyIssue[];
  emotionalIssues: ConsistencyIssue[];
  overallScores: {
    psychology: number;
    narrative: number;
    worldBuilding: number;
    emotional: number;
  };
  insights: string[];
}

export class EnhancedConsistencyManager {
  private characterProfiles: Map<string, CharacterBehaviorProfile> = new Map();
  private statisticalPatterns: Map<string, any> = new Map();

  async checkChapterConsistencyEnhanced(chapterId: string): Promise<ConsistencyCheck> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        novel: {
          include: {
            characters: true,
            worldBuilding: true,
            plotlines: {
              where: { status: { in: ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'] } }
            }
          }
        },
        events: {
          include: {
            character: true,
            plotline: true
          }
        }
      }
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Build character profiles if not already built
    await this.buildCharacterProfiles(chapter.novelId);

    // Get context for analysis
    const context = await this.gatherAnalysisContext(chapter);

    // Run multi-perspective analysis in parallel
    const multiPerspectiveAnalysis = await this.performMultiPerspectiveAnalysis(chapter, context);

    // Run statistical analysis in parallel
    const statisticalIssues = await this.analyzeStatisticalPatterns(chapter);

    // Run semantic analysis
    const semanticIssues = await this.analyzeSemanticConsistency(chapter);

    // Combine all issues
    const allIssues = [
      ...multiPerspectiveAnalysis.psychologyIssues,
      ...multiPerspectiveAnalysis.narrativeIssues,
      ...multiPerspectiveAnalysis.worldBuildingIssues,
      ...multiPerspectiveAnalysis.emotionalIssues,
      ...statisticalIssues,
      ...semanticIssues
    ];

    // Get semantic insights
    const semanticInsights = await this.getSemanticInsights(chapter);

    // Update learning data
    await this.updateLearningData(chapter, allIssues);

    return {
      hasIssues: allIssues.length > 0,
      issues: allIssues,
      metadata: {
        scores: multiPerspectiveAnalysis.overallScores,
        insights: [...multiPerspectiveAnalysis.insights, ...semanticInsights],
        analysisTimestamp: new Date().toISOString()
      }
    };
  }

  private async buildCharacterProfiles(novelId: string): Promise<void> {
    const characters = await prisma.character.findMany({
      where: { novelId }
    });

    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' },
      include: {
        events: {
          include: { character: true }
        }
      }
    });

    for (const character of characters) {
      if (!this.characterProfiles.has(character.id)) {
        const profile = await this.createCharacterProfile(character, chapters);
        this.characterProfiles.set(character.id, profile);
      }
    }
  }

  private async createCharacterProfile(character: any, chapters: any[]): Promise<CharacterBehaviorProfile> {
    const behaviorHistory: Array<{
      action: string;
      context: string;
      chapter: number;
      sentiment: 'positive' | 'negative' | 'neutral';
    }> = [];

    // Extract behavior patterns from chapters
    for (const chapter of chapters) {
      const mentions = this.extractCharacterMentions(chapter.content, character.name);
      for (const mention of mentions) {
        const sentiment = this.analyzeSentiment(mention.context);
        behaviorHistory.push({
          action: mention.action || 'general',
          context: mention.context,
          chapter: chapter.number,
          sentiment
        });
      }
    }

    // Analyze speech patterns
    const speechPatterns = this.extractSpeechPatterns(character.name, chapters);

    // Calculate emotional baseline
    const emotionalBaseline = this.calculateEmotionalBaseline(character.personality, behaviorHistory);

    return {
      name: character.name,
      personalityEmbeddings: [character.personality], // Would be actual embeddings in production
      speechPatterns,
      behaviorHistory,
      emotionalBaseline,
      relationshipDynamics: new Map()
    };
  }

  private async gatherAnalysisContext(chapter: any): Promise<{
    previousChapters: any[];
    characterProfiles: string;
    previousBehaviorPatterns: string;
    previousEvents: string;
    plotlineStatus: string;
    worldRules: string;
    magicSystem: string;
    previousEmotionalState: string;
    characterEmotionalBaseline: string;
  }> {
    const previousChapters = await prisma.chapter.findMany({
      where: {
        novelId: chapter.novelId,
        number: { lt: chapter.number }
      },
      orderBy: { number: 'desc' },
      take: 5,
      include: {
        events: {
          include: {
            character: true,
            plotline: true
          }
        }
      }
    });

    const characterProfiles = chapter.novel.characters.map((c: any) => 
      `${c.name}: ${c.personality} - ${c.description}`
    ).join('\n');

    const previousBehaviorPatterns = this.buildBehaviorPatternsContext(chapter.novel.characters);
    const previousEvents = this.buildPreviousEventsContext(previousChapters);
    const plotlineStatus = this.buildPlotlineStatusContext(chapter.novel.plotlines);
    const worldRules = chapter.novel.worldBuilding?.rules || 'No specific world rules defined';
    const magicSystem = chapter.novel.worldBuilding?.magicSystem || 'No magic system defined';
    const previousEmotionalState = this.buildEmotionalStateContext(previousChapters);
    const characterEmotionalBaseline = this.buildEmotionalBaselineContext(chapter.novel.characters);

    return {
      previousChapters,
      characterProfiles,
      previousBehaviorPatterns,
      previousEvents,
      plotlineStatus,
      worldRules,
      magicSystem,
      previousEmotionalState,
      characterEmotionalBaseline
    };
  }

  private async performMultiPerspectiveAnalysis(chapter: any, context: any): Promise<MultiPerspectiveAnalysis> {
    // Run all analyses in parallel for maximum efficiency
    const [
      psychologyAnalysis,
      narrativeAnalysis,
      worldBuildingAnalysis,
      emotionalAnalysis
    ] = await Promise.all([
      this.analyzeCharacterPsychology(chapter, context),
      this.analyzeNarrativeFlow(chapter, context),
      this.analyzeWorldBuilding(chapter, context),
      this.analyzeEmotionalTone(chapter, context)
    ]);

    return {
      psychologyIssues: psychologyAnalysis.issues,
      narrativeIssues: narrativeAnalysis.issues,
      worldBuildingIssues: worldBuildingAnalysis.issues,
      emotionalIssues: emotionalAnalysis.issues,
      overallScores: {
        psychology: psychologyAnalysis.score,
        narrative: narrativeAnalysis.score,
        worldBuilding: worldBuildingAnalysis.score,
        emotional: emotionalAnalysis.score
      },
      insights: [
        ...psychologyAnalysis.insights,
        ...narrativeAnalysis.insights,
        ...worldBuildingAnalysis.insights,
        ...emotionalAnalysis.insights
      ]
    };
  }

  private async analyzeCharacterPsychology(chapter: any, context: any): Promise<{
    issues: ConsistencyIssue[];
    score: number;
    insights: string[];
  }> {
    try {
      const prompt = ADVANCED_CONSISTENCY_PROMPTS.characterPsychology
        .replace('[CHAPTER_CONTENT]', chapter.content)
        .replace('[CHARACTER_PROFILES]', context.characterProfiles)
        .replace('[PREVIOUS_BEHAVIOR_PATTERNS]', context.previousBehaviorPatterns);

      const response = await generateWithRetry(prompt, 2, false);
      return this.parseAdvancedAnalysisResponse(response, 'character');
    } catch (error) {
      console.error('Character psychology analysis failed:', error);
      return {
        issues: [{
          type: 'character',
          severity: 'low',
          description: 'Character psychology analysis failed',
          suggestion: 'Manual review recommended'
        }],
        score: 50,
        insights: []
      };
    }
  }

  private async analyzeNarrativeFlow(chapter: any, context: any): Promise<{
    issues: ConsistencyIssue[];
    score: number;
    insights: string[];
  }> {
    try {
      const prompt = ADVANCED_CONSISTENCY_PROMPTS.narrativeFlow
        .replace('[CHAPTER_CONTENT]', chapter.content)
        .replace('[PREVIOUS_EVENTS]', context.previousEvents)
        .replace('[PLOTLINE_STATUS]', context.plotlineStatus);

      const response = await generateWithRetry(prompt, 2, false);
      return this.parseAdvancedAnalysisResponse(response, 'plot');
    } catch (error) {
      console.error('Narrative flow analysis failed:', error);
      return {
        issues: [{
          type: 'plot',
          severity: 'low',
          description: 'Narrative flow analysis failed',
          suggestion: 'Manual review recommended'
        }],
        score: 50,
        insights: []
      };
    }
  }

  private async analyzeWorldBuilding(chapter: any, context: any): Promise<{
    issues: ConsistencyIssue[];
    score: number;
    insights: string[];
  }> {
    try {
      const prompt = ADVANCED_CONSISTENCY_PROMPTS.worldBuilding
        .replace('[CHAPTER_CONTENT]', chapter.content)
        .replace('[WORLD_RULES]', context.worldRules)
        .replace('[MAGIC_SYSTEM]', context.magicSystem);

      const response = await generateWithRetry(prompt, 2, false);
      return this.parseAdvancedAnalysisResponse(response, 'worldbuilding');
    } catch (error) {
      console.error('World building analysis failed:', error);
      return {
        issues: [{
          type: 'worldbuilding',
          severity: 'low',
          description: 'World building analysis failed',
          suggestion: 'Manual review recommended'
        }],
        score: 50,
        insights: []
      };
    }
  }

  private async analyzeEmotionalTone(chapter: any, context: any): Promise<{
    issues: ConsistencyIssue[];
    score: number;
    insights: string[];
  }> {
    try {
      const prompt = ADVANCED_CONSISTENCY_PROMPTS.emotionalTone
        .replace('[CHAPTER_CONTENT]', chapter.content)
        .replace('[PREVIOUS_EMOTIONAL_STATE]', context.previousEmotionalState)
        .replace('[CHARACTER_EMOTIONAL_BASELINE]', context.characterEmotionalBaseline);

      const response = await generateWithRetry(prompt, 2, false);
      return this.parseAdvancedAnalysisResponse(response, 'timeline');
    } catch (error) {
      console.error('Emotional tone analysis failed:', error);
      return {
        issues: [{
          type: 'timeline',
          severity: 'low',
          description: 'Emotional tone analysis failed',
          suggestion: 'Manual review recommended'
        }],
        score: 50,
        insights: []
      };
    }
  }

  private async analyzeStatisticalPatterns(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Analyze character appearance patterns
    const characterMentions = this.analyzeCharacterMentions(chapter.content, chapter.novel.characters);
    const anomalies = this.detectStatisticalAnomalies(characterMentions);

    for (const anomaly of anomalies) {
      issues.push({
        type: 'character',
        severity: 'low',
        description: `Statistical anomaly detected: ${anomaly.description}`,
        suggestion: anomaly.suggestion
      });
    }

    // Analyze dialogue length distribution
    const dialogueAnalysis = this.analyzeDialoguePatterns(chapter.content);
    if (dialogueAnalysis.hasAnomalies) {
      issues.push({
        type: 'character',
        severity: 'low',
        description: 'Unusual dialogue length patterns detected',
        suggestion: 'Review dialogue distribution across characters'
      });
    }

    return issues;
  }

  private async analyzeSemanticConsistency(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      // Build semantic profiles for characters if not already built
      await this.buildSemanticProfiles(chapter.novel.characters, chapter.novelId);

      // Analyze semantic consistency for this chapter
      const semanticResult = await semanticAnalyzer.analyzeChapterSemantics(
        chapter.content,
        chapter.number,
        chapter.novel.characters.map((char: any) => ({ id: char.id, name: char.name }))
      );

      // Convert semantic deviations to consistency issues
      for (const deviation of semanticResult.detectedDeviations) {
        issues.push({
          type: this.mapSemanticType(deviation.type),
          severity: deviation.severity,
          description: `Semantic analysis: ${deviation.description}`,
          suggestion: deviation.suggestion
        });
      }

      // Add semantic insights as recommendations
      if (semanticResult.semanticInsights.length > 0) {
        // Store insights for later use in metadata
        console.log('Semantic insights:', semanticResult.semanticInsights);
      }

    } catch (error) {
      console.error('Semantic analysis failed:', error);
      issues.push({
        type: 'character',
        severity: 'low',
        description: 'Semantic analysis could not be completed',
        suggestion: 'Manual review recommended for character consistency'
      });
    }

    return issues;
  }

  private async buildSemanticProfiles(characters: any[], novelId: string): Promise<void> {
    for (const character of characters) {
      try {
        // Get character data from previous chapters
        const characterData = await this.extractCharacterDataForSemantic(character, novelId);
        
        // Build semantic profile
        await semanticAnalyzer.buildCharacterSemanticProfile(
          character.id,
          character.name,
          characterData
        );
      } catch (error) {
        console.error(`Failed to build semantic profile for ${character.name}:`, error);
      }
    }
  }

  private async extractCharacterDataForSemantic(character: any, novelId: string): Promise<{
    personality: string;
    dialogues: string[];
    actions: string[];
    emotions: string[];
    descriptions: string[];
  }> {
    // Get character's previous chapters for analysis
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' },
      take: 10 // Analyze last 10 chapters for semantic patterns
    });

    const dialogues: string[] = [];
    const actions: string[] = [];
    const emotions: string[] = [];
    const descriptions: string[] = [];

    // Extract character behaviors from chapters
    for (const chapter of chapters) {
      const characterMentions = this.extractCharacterMentions(chapter.content, character.name);
      
      for (const mention of characterMentions) {
        // Simple classification - in production this would be more sophisticated
        if (mention.context.includes('"') || mention.context.includes("'")) {
          dialogues.push(mention.context);
        } else if (mention.action && mention.action !== 'general') {
          actions.push(mention.context);
        } else if (this.containsEmotionalWords(mention.context)) {
          emotions.push(mention.context);
        } else {
          descriptions.push(mention.context);
        }
      }
    }

    return {
      personality: character.personality || 'No personality defined',
      dialogues: dialogues.slice(0, 20), // Limit to recent samples
      actions: actions.slice(0, 20),
      emotions: emotions.slice(0, 20),
      descriptions: descriptions.slice(0, 20)
    };
  }

  private containsEmotionalWords(text: string): boolean {
    const emotionalWords = ['기쁜', '슬픈', '화난', '놀란', '두려운', '흥분한', '만족한', '실망한'];
    const lowerText = text.toLowerCase();
    return emotionalWords.some(word => lowerText.includes(word));
  }

  private mapSemanticType(semanticType: string): 'character' | 'plot' | 'worldbuilding' | 'timeline' {
    switch (semanticType) {
      case 'personality':
      case 'dialogue':
      case 'behavior':
      case 'emotion':
        return 'character';
      default:
        return 'character';
    }
  }

  private parseAdvancedAnalysisResponse(response: string, defaultType: string): {
    issues: ConsistencyIssue[];
    score: number;
    insights: string[];
  } {
    try {
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[1]);
      
      // Extract issues from different response formats
      const issueArrays = [
        parsed.psychologyIssues,
        parsed.narrativeIssues,
        parsed.worldBuildingIssues,
        parsed.emotionalIssues,
        parsed.issues
      ].filter(Boolean);

      const issues: ConsistencyIssue[] = [];
      issueArrays.forEach(issueArray => {
        if (Array.isArray(issueArray)) {
          issueArray.forEach(issue => {
            issues.push({
              type: this.mapIssueType(issue.type || defaultType),
              severity: this.mapSeverity(issue.severity),
              description: issue.description || issue.issue,
              suggestion: issue.suggestion
            });
          });
        }
      });

      const score = parsed.overallPsychologyScore || 
                   parsed.overallNarrativeScore || 
                   parsed.overallWorldBuildingScore || 
                   parsed.overallEmotionalScore || 
                   75;

      const insights = parsed.insights || [];

      return { issues, score, insights };
    } catch (error) {
      console.error('Failed to parse advanced analysis response:', error);
      return {
        issues: [{
          type: defaultType as any,
          severity: 'low',
          description: 'Failed to parse analysis response',
          suggestion: 'Manual review recommended'
        }],
        score: 50,
        insights: []
      };
    }
  }

  private mapIssueType(type: string): 'character' | 'plot' | 'worldbuilding' | 'timeline' {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('character') || lowerType.includes('psychology')) return 'character';
    if (lowerType.includes('plot') || lowerType.includes('narrative')) return 'plot';
    if (lowerType.includes('world') || lowerType.includes('building')) return 'worldbuilding';
    return 'timeline';
  }

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' {
    const lowerSeverity = severity.toLowerCase();
    if (lowerSeverity.includes('high')) return 'high';
    if (lowerSeverity.includes('medium')) return 'medium';
    return 'low';
  }

  // Helper methods for context building and analysis
  private buildBehaviorPatternsContext(characters: any[]): string {
    return characters.map(char => {
      const profile = this.characterProfiles.get(char.id);
      if (profile) {
        const recentBehaviors = profile.behaviorHistory.slice(-3);
        return `${char.name}: ${recentBehaviors.map(b => b.action).join(', ')}`;
      }
      return `${char.name}: No behavior patterns recorded`;
    }).join('\n');
  }

  private buildPreviousEventsContext(chapters: any[]): string {
    const events = chapters.flatMap(chapter => 
      chapter.events.map((event: any) => 
        `Chapter ${chapter.number}: ${event.description}`
      )
    ).slice(-10);
    return events.join('\n');
  }

  private buildPlotlineStatusContext(plotlines: any[]): string {
    return plotlines.map(plotline => 
      `${plotline.name}: ${plotline.status} - ${plotline.description}`
    ).join('\n');
  }

  private buildEmotionalStateContext(chapters: any[]): string {
    // Extract emotional indicators from recent chapters
    const emotionalIndicators = chapters.flatMap(chapter => {
      const indicators = this.extractEmotionalIndicators(chapter.content);
      return indicators.map(indicator => `Chapter ${chapter.number}: ${indicator}`);
    }).slice(-5);
    return emotionalIndicators.join('\n');
  }

  private buildEmotionalBaselineContext(characters: any[]): string {
    return characters.map(char => {
      const profile = this.characterProfiles.get(char.id);
      if (profile) {
        const baseline = profile.emotionalBaseline;
        return `${char.name}: Aggression ${baseline.aggression}, Confidence ${baseline.confidence}, Empathy ${baseline.empathy}`;
      }
      return `${char.name}: No emotional baseline established`;
    }).join('\n');
  }

  private extractCharacterMentions(content: string, characterName: string): Array<{
    context: string;
    action?: string;
    position: number;
  }> {
    const mentions = [];
    const sentences = content.split(/[.!?]+/);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (sentence.includes(characterName)) {
        mentions.push({
          context: sentence.trim(),
          action: this.extractAction(sentence),
          position: i
        });
      }
    }
    
    return mentions;
  }

  private extractAction(sentence: string): string {
    // Simple action extraction - could be more sophisticated
    const actionWords = ['said', 'walked', 'ran', 'smiled', 'frowned', 'laughed', 'cried'];
    for (const action of actionWords) {
      if (sentence.toLowerCase().includes(action)) {
        return action;
      }
    }
    return 'general';
  }

  private extractSpeechPatterns(characterName: string, chapters: any[]): string[] {
    const patterns: string[] = [];
    
    for (const chapter of chapters) {
      const dialogues = this.extractCharacterDialogue(chapter.content, characterName);
      for (const dialogue of dialogues) {
        // Analyze speech patterns
        if (dialogue.includes('...')) patterns.push('hesitant');
        if (dialogue.includes('!')) patterns.push('exclamatory');
        if (dialogue.length > 100) patterns.push('verbose');
        if (dialogue.length < 20) patterns.push('terse');
      }
    }
    
    return [...new Set(patterns)];
  }

  private extractCharacterDialogue(content: string, characterName: string): string[] {
    const dialogues: string[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(characterName) && (line.includes('"') || line.includes("'"))) {
        // Extract dialogue - this is a simple implementation
        const dialogueMatch = line.match(/["']([^"']*)["']/);
        if (dialogueMatch) {
          dialogues.push(dialogueMatch[1]);
        }
      }
    }
    
    return dialogues;
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['happy', 'smile', 'laugh', 'joy', 'excited', 'pleased'];
    const negativeWords = ['sad', 'angry', 'fear', 'worry', 'disappointed', 'frustrated'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateEmotionalBaseline(personality: string, behaviorHistory: any[]): {
    aggression: number;
    confidence: number;
    empathy: number;
    intelligence: number;
  } {
    // Simple baseline calculation - would be more sophisticated in production
    const baseline = {
      aggression: 0.5,
      confidence: 0.5,
      empathy: 0.5,
      intelligence: 0.5
    };

    const lowerPersonality = personality.toLowerCase();
    if (lowerPersonality.includes('aggressive')) baseline.aggression = 0.8;
    if (lowerPersonality.includes('confident')) baseline.confidence = 0.8;
    if (lowerPersonality.includes('empathetic')) baseline.empathy = 0.8;
    if (lowerPersonality.includes('intelligent')) baseline.intelligence = 0.8;

    // In production, this would also analyze behaviorHistory for patterns
    console.log(`Analyzing behavior history for baseline: ${behaviorHistory.length} entries`);

    return baseline;
  }

  private analyzeCharacterMentions(content: string, characters: any[]): any[] {
    const mentions = [];
    
    for (const character of characters) {
      const characterMentions = this.extractCharacterMentions(content, character.name);
      mentions.push({
        character: character.name,
        count: characterMentions.length,
        contexts: characterMentions
      });
    }
    
    return mentions;
  }

  private detectStatisticalAnomalies(characterMentions: any[]): Array<{
    description: string;
    suggestion: string;
  }> {
    const anomalies = [];
    
    // Check for extreme mention imbalances
    const mentionCounts = characterMentions.map(m => m.count);
    const maxMentions = Math.max(...mentionCounts);
    const minMentions = Math.min(...mentionCounts);
    
    if (maxMentions > 0 && minMentions === 0) {
      anomalies.push({
        description: 'Some characters have no mentions in this chapter',
        suggestion: 'Consider balancing character presence across chapters'
      });
    }
    
    if (maxMentions > minMentions * 5) {
      anomalies.push({
        description: 'Significant imbalance in character mentions',
        suggestion: 'Review character screen time distribution'
      });
    }
    
    return anomalies;
  }

  private analyzeDialoguePatterns(content: string): {
    hasAnomalies: boolean;
    patterns: any[];
  } {
    // Simple dialogue analysis
    const dialogues = content.match(/["']([^"']*)["']/g) || [];
    const lengths = dialogues.map(d => d.length);
    
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const hasAnomalies = lengths.some(len => len > avgLength * 3 || len < avgLength / 3);
    
    return {
      hasAnomalies,
      patterns: lengths
    };
  }

  private extractEmotionalIndicators(content: string): string[] {
    const indicators = [];
    const emotionalWords = ['happy', 'sad', 'angry', 'excited', 'worried', 'calm', 'tense'];
    
    for (const word of emotionalWords) {
      if (content.toLowerCase().includes(word)) {
        indicators.push(`${word} emotion detected`);
      }
    }
    
    return indicators;
  }

  private async getSemanticInsights(chapter: any): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Get semantic insights for each character
      for (const character of chapter.novel.characters) {
        const characterInsights = semanticAnalyzer.getCharacterSemanticInsights(character.id);
        insights.push(...characterInsights);
      }

      // Get general semantic statistics
      const stats = semanticAnalyzer.getProfileStats();
      if (stats.totalProfiles > 0) {
        insights.push(`Semantic analysis covers ${stats.totalProfiles} character profiles with ${stats.totalEmbeddings} behavioral patterns`);
        insights.push(`Vocabulary index contains ${stats.vocabularySize} Korean terms for semantic matching`);
      }

      // Add semantic consistency summary
      insights.push(`Advanced semantic analysis completed for chapter ${chapter.number}`);

    } catch (error) {
      console.error('Failed to generate semantic insights:', error);
      insights.push('Semantic analysis insights unavailable');
    }

    return insights;
  }

  private async updateLearningData(chapter: any, issues: ConsistencyIssue[]): Promise<void> {
    // In a production system, this would update machine learning models
    // For now, we'll just log the data for future analysis
    console.log(`Learning data updated for chapter ${chapter.number}: ${issues.length} issues detected`);
  }

  async generateEnhancedConsistencyReport(novelId: string): Promise<{
    overallConsistency: number;
    detailedScores: {
      psychology: number;
      narrative: number;
      worldBuilding: number;
      emotional: number;
      statistical: number;
    };
    issuesSummary: Record<string, number>;
    recommendations: string[];
    insights: string[];
    trends: any[];
  }> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' }
    });

         const totalScores = {
       psychology: 0,
       narrative: 0,
       worldBuilding: 0,
       emotional: 0,
       statistical: 0
     };

    let totalIssues = 0;
    const issueTypes: Record<string, number> = {};
    const recommendations: string[] = [];
    const insights: string[] = [];
    const trends: any[] = [];

    for (const chapter of chapters) {
      const consistencyCheck = await this.checkChapterConsistencyEnhanced(chapter.id);
      totalIssues += consistencyCheck.issues.length;

      if (consistencyCheck.metadata?.scores) {
        totalScores.psychology += consistencyCheck.metadata.scores.psychology;
        totalScores.narrative += consistencyCheck.metadata.scores.narrative;
        totalScores.worldBuilding += consistencyCheck.metadata.scores.worldBuilding;
        totalScores.emotional += consistencyCheck.metadata.scores.emotional;
      }

      for (const issue of consistencyCheck.issues) {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
        
        if (issue.suggestion && !recommendations.includes(issue.suggestion)) {
          recommendations.push(issue.suggestion);
        }
      }

      if (consistencyCheck.metadata?.insights) {
        insights.push(...consistencyCheck.metadata.insights);
      }
    }

    const chaptersCount = chapters.length;
    const avgScores = {
      psychology: totalScores.psychology / chaptersCount,
      narrative: totalScores.narrative / chaptersCount,
      worldBuilding: totalScores.worldBuilding / chaptersCount,
      emotional: totalScores.emotional / chaptersCount,
      statistical: Math.max(0, 100 - (totalIssues / chaptersCount) * 10)
    };

    const overallConsistency = Math.round(
      (avgScores.psychology + avgScores.narrative + avgScores.worldBuilding + avgScores.emotional + avgScores.statistical) / 5
    );

    return {
      overallConsistency,
      detailedScores: {
        psychology: Math.round(avgScores.psychology),
        narrative: Math.round(avgScores.narrative),
        worldBuilding: Math.round(avgScores.worldBuilding),
        emotional: Math.round(avgScores.emotional),
        statistical: Math.round(avgScores.statistical)
      },
      issuesSummary: issueTypes,
      recommendations: recommendations.slice(0, 20),
      insights: [...new Set(insights)].slice(0, 15),
      trends
    };
  }
} 