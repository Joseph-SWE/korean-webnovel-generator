import { prisma } from './db';
import { ConsistencyCheck, ConsistencyIssue } from '@/types';
import { generateWithRetry } from './gemini';

// Types for better type safety
type ChapterData = {
  id: string;
  content: string;
  novelId: string;
  novel: {
    characters: Array<{
      id: string;
      name: string;
      personality: string;
      relationships?: string;
    }>;
    worldBuilding?: {
      rules?: string;
      magicSystem?: string;
    };
    plotlines?: Array<{
      id: string;
      name: string;
      status: string;
      priority: number;
    }>;
  };
};

interface CharacterProfile {
  id: string;
  name: string;
  personality: string;
  speechPatterns: string[];
  behaviorPatterns: string[];
  relationships: Record<string, string>;
  dialogueEmbeddings: number[][];
  actionEmbeddings: number[][];
}

export class AdvancedConsistencyManager {
  private characterProfiles: Map<string, CharacterProfile> = new Map();
  private narrativeGraph: Map<string, Set<string>> = new Map();

  // Semantic similarity using cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Generate embeddings for text (using AI model)
  private async generateEmbedding(text: string): Promise<number[]> {
    const prompt = `Generate a semantic embedding vector for this text. Return only a JSON array of 512 numbers between -1 and 1: "${text}"`;
    
    try {
      const response = await generateWithRetry(prompt, 2, false);
      const embedding = JSON.parse(response);
      return Array.isArray(embedding) ? embedding : new Array(512).fill(0);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return new Array(512).fill(0);
    }
  }

  // Build character behavioral profiles from all chapters
  async buildCharacterProfiles(novelId: string): Promise<void> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' },
      include: {
        novel: {
          include: { characters: true }
        }
      }
    });

    for (const chapter of chapters) {
      for (const character of chapter.novel.characters) {
        await this.updateCharacterProfile(character, chapter.content);
      }
    }
  }

  private async updateCharacterProfile(character: { id: string; name: string; personality: string; relationships?: string }, chapterContent: string): Promise<void> {
    const profile: CharacterProfile = this.characterProfiles.get(character.id) || {
      id: character.id,
      name: character.name,
      personality: character.personality,
      speechPatterns: [] as string[],
      behaviorPatterns: [] as string[],
      relationships: JSON.parse(character.relationships || '{}'),
      dialogueEmbeddings: [] as number[][],
      actionEmbeddings: [] as number[][]
    };

    // Extract character dialogue and actions
    const characterMentions = this.extractCharacterContext(chapterContent, character.name);
    
    for (const mention of characterMentions) {
      if (mention.type === 'dialogue') {
        const embedding = await this.generateEmbedding(mention.text);
        profile.dialogueEmbeddings.push(embedding);
        
        // Extract speech patterns
        const patterns = this.extractSpeechPatterns(mention.text);
        profile.speechPatterns.push(...patterns);
      } else if (mention.type === 'action') {
        const embedding = await this.generateEmbedding(mention.text);
        profile.actionEmbeddings.push(embedding);
        
        // Extract behavior patterns
        const behaviors = this.extractBehaviorPatterns(mention.text);
        profile.behaviorPatterns.push(...behaviors);
      }
    }

    this.characterProfiles.set(character.id, profile);
  }

  // Enhanced character context extraction
  private extractCharacterContext(content: string, characterName: string): Array<{
    text: string;
    type: 'dialogue' | 'action' | 'description';
    position: number;
  }> {
    const contexts: Array<{ text: string; type: 'dialogue' | 'action' | 'description'; position: number }> = [];
    
    // Extract dialogue
    const dialogueRegex = new RegExp(`["']([^"']*?)["'][^"']*?${characterName}|${characterName}[^"']*?["']([^"']*?)["']`, 'gi');
    let match;
    while ((match = dialogueRegex.exec(content)) !== null) {
      contexts.push({
        text: match[1] || match[2],
        type: 'dialogue',
        position: match.index
      });
    }

    // Extract actions and descriptions
    const actionRegex = new RegExp(`${characterName}[^.!?]*?[.!?]`, 'gi');
    while ((match = actionRegex.exec(content)) !== null) {
      const text = match[0];
      if (!text.includes('"') && !text.includes("'")) {
        contexts.push({
          text,
          type: 'action',
          position: match.index
        });
      }
    }

    return contexts;
  }

  // Advanced character consistency check using semantic analysis
  async checkCharacterConsistencyAdvanced(chapterId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        novel: { include: { characters: true } }
      }
    });

    if (!chapter) return issues;

    for (const character of chapter.novel.characters) {
      const profile = this.characterProfiles.get(character.id);
      if (!profile) continue;

      const currentContexts = this.extractCharacterContext(chapter.content, character.name);
      
      // Check dialogue consistency
      for (const context of currentContexts.filter(c => c.type === 'dialogue')) {
        const currentEmbedding = await this.generateEmbedding(context.text);
        const similarities = profile.dialogueEmbeddings.map(emb => 
          this.cosineSimilarity(currentEmbedding, emb)
        );
        
        const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        
        if (avgSimilarity < 0.3) { // Threshold for inconsistent dialogue
          issues.push({
            type: 'character',
            severity: 'medium',
            description: `${character.name}'s dialogue style is inconsistent with established speech patterns`,
            suggestion: `Adjust dialogue to match character's typical speech patterns`
          });
        }
      }

      // Check behavior consistency
      for (const context of currentContexts.filter(c => c.type === 'action')) {
        const currentEmbedding = await this.generateEmbedding(context.text);
        const similarities = profile.actionEmbeddings.map(emb => 
          this.cosineSimilarity(currentEmbedding, emb)
        );
        
        const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        
        if (avgSimilarity < 0.2) { // Threshold for inconsistent behavior
          issues.push({
            type: 'character',
            severity: 'medium',
            description: `${character.name}'s behavior is inconsistent with established patterns`,
            suggestion: `Ensure actions align with character's personality and past behavior`
          });
        }
      }
    }

    return issues;
  }

  // Graph-based narrative consistency
  async buildNarrativeGraph(novelId: string): Promise<void> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' },
      include: {
        events: {
          include: {
            character: true,
            plotline: true
          }
        }
      }
    });

    // Build connections between narrative elements
    for (const chapter of chapters) {
      for (const event of chapter.events) {
        const eventKey = `${event.eventType}_${event.id}`;
        
        if (!this.narrativeGraph.has(eventKey)) {
          this.narrativeGraph.set(eventKey, new Set());
        }

        // Connect to character events
        if (event.character) {
          const connections = this.narrativeGraph.get(eventKey)!;
          connections.add(`character_${event.character.id}`);
        }

        // Connect to plotline events
        if (event.plotline) {
          const connections = this.narrativeGraph.get(eventKey)!;
          connections.add(`plotline_${event.plotline.id}`);
        }
      }
    }
  }

  // Multi-layered AI consistency analysis
  async performMultiLayeredAICheck(chapterId: string): Promise<ConsistencyIssue[]> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        novel: {
          include: {
            characters: true,
            worldBuilding: true,
            plotlines: true
          }
        }
      }
    });

    if (!chapter) return [];

    const analyses = await Promise.all([
      this.analyzeCharacterPsychology(chapter),
      this.analyzeNarrativeFlow(chapter),
      this.analyzeEmotionalConsistency(chapter),
      this.analyzeWorldBuildingLogic(chapter)
    ]);

    return analyses.flat();
  }

  private async analyzeCharacterPsychology(chapter: any): Promise<ConsistencyIssue[]> {
    const prompt = `
    Analyze the psychological consistency of characters in this chapter:
    
    Chapter: ${chapter.content}
    
    Character Profiles:
    ${chapter.novel.characters.map((c: any) => `${c.name}: ${c.personality}`).join('\n')}
    
    Focus on:
    1. Internal motivations vs. external actions
    2. Emotional responses appropriateness
    3. Decision-making patterns
    4. Character growth arcs
    
    Return a JSON array of issues with type, severity, description, and suggestion.
    `;

    try {
      const response = await generateWithRetry(prompt, 2, false);
      const issues = JSON.parse(response);
      return Array.isArray(issues) ? issues : [];
    } catch (error) {
      console.error('Psychology analysis failed:', error);
      return [];
    }
  }

  private async analyzeNarrativeFlow(chapter: any): Promise<ConsistencyIssue[]> {
    const prompt = `
    Analyze the narrative flow and pacing of this chapter:
    
    Chapter: ${chapter.content}
    
    Check for:
    1. Logical event progression
    2. Cause and effect relationships
    3. Information delivery pacing
    4. Scene transitions
    5. Tension building and release
    
    Return a JSON array of issues with type, severity, description, and suggestion.
    `;

    try {
      const response = await generateWithRetry(prompt, 2, false);
      const issues = JSON.parse(response);
      return Array.isArray(issues) ? issues : [];
    } catch (error) {
      console.error('Narrative flow analysis failed:', error);
      return [];
    }
  }

  private async analyzeEmotionalConsistency(chapter: any): Promise<ConsistencyIssue[]> {
    const prompt = `
    Analyze emotional consistency in this chapter:
    
    Chapter: ${chapter.content}
    
    Check for:
    1. Emotional tone consistency
    2. Character emotional states
    3. Emotional transitions
    4. Mood appropriateness for events
    
    Return a JSON array of issues with type, severity, description, and suggestion.
    `;

    try {
      const response = await generateWithRetry(prompt, 2, false);
      const issues = JSON.parse(response);
      return Array.isArray(issues) ? issues : [];
    } catch (error) {
      console.error('Emotional consistency analysis failed:', error);
      return [];
    }
  }

  private async analyzeWorldBuildingLogic(chapter: any): Promise<ConsistencyIssue[]> {
    const prompt = `
    Analyze world-building logic and consistency:
    
    Chapter: ${chapter.content}
    
    World Rules: ${chapter.novel.worldBuilding?.rules || 'None specified'}
    Magic System: ${chapter.novel.worldBuilding?.magicSystem || 'None specified'}
    
    Check for:
    1. Internal world logic consistency
    2. Magic system adherence
    3. Physical law consistency
    4. Social/political system logic
    
    Return a JSON array of issues with type, severity, description, and suggestion.
    `;

    try {
      const response = await generateWithRetry(prompt, 2, false);
      const issues = JSON.parse(response);
      return Array.isArray(issues) ? issues : [];
    } catch (error) {
      console.error('World-building analysis failed:', error);
      return [];
    }
  }

  // Statistical pattern analysis
  async analyzeStatisticalPatterns(novelId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    // Analyze character appearance frequency
    const characterStats = await this.analyzeCharacterStatistics(novelId);
    
    // Analyze plot advancement patterns
    const plotStats = await this.analyzePlotStatistics(novelId);
    
    // Analyze dialogue patterns
    const dialogueStats = await this.analyzeDialogueStatistics(novelId);
    
    // Generate issues based on statistical anomalies
    issues.push(
      ...this.generateStatisticalIssues(characterStats, 'character'),
      ...this.generateStatisticalIssues(plotStats, 'plot'),
      ...this.generateStatisticalIssues(dialogueStats, 'dialogue')
    );
    
    return issues;
  }

  private async analyzeCharacterStatistics(novelId: string): Promise<any> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      include: { novel: { include: { characters: true } } }
    });

    const stats: Record<string, any> = {};
    
    for (const chapter of chapters) {
      for (const character of chapter.novel.characters) {
        const mentions = this.extractCharacterContext(chapter.content, character.name);
        
        if (!stats[character.id]) {
          stats[character.id] = {
            name: character.name,
            totalMentions: 0,
            dialogueCount: 0,
            actionCount: 0,
            chapterAppearances: new Set()
          };
        }
        
        stats[character.id].totalMentions += mentions.length;
        stats[character.id].dialogueCount += mentions.filter(m => m.type === 'dialogue').length;
        stats[character.id].actionCount += mentions.filter(m => m.type === 'action').length;
        
        if (mentions.length > 0) {
          stats[character.id].chapterAppearances.add(chapter.id);
        }
      }
    }

    return stats;
  }

  private async analyzePlotStatistics(novelId: string): Promise<any> {
    const plotlines = await prisma.plotline.findMany({
      where: { novelId },
      include: { events: { include: { chapter: true } } }
    });

    const stats: Record<string, any> = {};
    
    for (const plotline of plotlines) {
      stats[plotline.id] = {
        name: plotline.name,
        eventCount: plotline.events.length,
        chapterSpread: plotline.events.map(e => e.chapter.number),
        status: plotline.status,
        priority: plotline.priority
      };
    }

    return stats;
  }

  private async analyzeDialogueStatistics(novelId: string): Promise<any> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      include: { novel: { include: { characters: true } } }
    });

    const stats: Record<string, any> = {};
    
    for (const chapter of chapters) {
      for (const character of chapter.novel.characters) {
        const dialogues = this.extractCharacterContext(chapter.content, character.name)
          .filter(c => c.type === 'dialogue');
        
        if (!stats[character.id]) {
          stats[character.id] = {
            name: character.name,
            averageDialogueLength: 0,
            totalDialogues: 0,
            formalityLevel: 0
          };
        }
        
        stats[character.id].totalDialogues += dialogues.length;
        if (dialogues.length > 0) {
          const avgLength = dialogues.reduce((sum, d) => sum + d.text.length, 0) / dialogues.length;
          stats[character.id].averageDialogueLength = avgLength;
        }
      }
    }

    return stats;
  }

  private generateStatisticalIssues(stats: any, type: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // Example: Character disappearing for too long
    if (type === 'character') {
      for (const [id, data] of Object.entries(stats)) {
        const characterData = data as any;
        if (characterData.chapterAppearances.size < 3 && characterData.totalMentions > 10) {
          issues.push({
            type: 'character',
            severity: 'medium',
            description: `${characterData.name} appears in too few chapters despite being frequently mentioned`,
            suggestion: `Consider distributing ${characterData.name}'s appearances more evenly across chapters`
          });
        }
      }
    }
    
    return issues;
  }

  // Helper methods for pattern extraction
  private extractSpeechPatterns(dialogue: string): string[] {
    const patterns: string[] = [];
    
    // Extract formality patterns
    if (dialogue.includes('요') || dialogue.includes('습니다')) {
      patterns.push('formal');
    }
    if (dialogue.includes('야') || dialogue.includes('어')) {
      patterns.push('informal');
    }
    
    // Extract emotional patterns
    if (dialogue.includes('!')) {
      patterns.push('exclamatory');
    }
    if (dialogue.includes('...')) {
      patterns.push('hesitant');
    }
    
    return patterns;
  }

  private extractBehaviorPatterns(action: string): string[] {
    const patterns: string[] = [];
    
    // Extract action types
    if (action.includes('quickly') || action.includes('rushed')) {
      patterns.push('hasty');
    }
    if (action.includes('carefully') || action.includes('slowly')) {
      patterns.push('cautious');
    }
    if (action.includes('smiled') || action.includes('laughed')) {
      patterns.push('cheerful');
    }
    
    return patterns;
  }

  // Main enhanced consistency check
  async checkChapterConsistencyAdvanced(chapterId: string): Promise<ConsistencyCheck> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { novel: true }
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Build profiles if not exists
    if (this.characterProfiles.size === 0) {
      await this.buildCharacterProfiles(chapter.novelId);
    }

    const issues: ConsistencyIssue[] = [];

    // Run all advanced checks in parallel
    const [
      semanticIssues,
      multiLayeredIssues,
      statisticalIssues
    ] = await Promise.all([
      this.checkCharacterConsistencyAdvanced(chapterId),
      this.performMultiLayeredAICheck(chapterId),
      this.analyzeStatisticalPatterns(chapter.novelId)
    ]);

    issues.push(...semanticIssues, ...multiLayeredIssues, ...statisticalIssues);

    return {
      hasIssues: issues.length > 0,
      issues
    };
  }
} 