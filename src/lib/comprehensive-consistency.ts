/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './db';
import { ConsistencyIssue } from '@/types';

interface StoryMemory {
  coreElements: {
    mainCharacters: CharacterProfile[];
    primaryPlotThreads: PlotThread[];
    worldRules: WorldRule[];
    keyEvents: StoryEvent[];
  };
  timeline: TimelineEvent[];
  unresolved: {
    plotThreads: string[];
    mysteries: string[];
    promises: string[];
    conflicts: string[];
  };
}

interface CharacterProfile {
  id: string;
  name: string;
  corePersonality: string[];
  relationships: Record<string, string>;
  abilities: string[];
  goals: string[];
  developmentArc: string;
  lastSignificantChange: number; // chapter number
}

interface PlotThread {
  id: string;
  name: string;
  type: 'main' | 'subplot' | 'romance' | 'mystery' | 'conflict';
  status: 'introduced' | 'developing' | 'climax' | 'resolved' | 'abandoned';
  importance: number;
  introducedIn: number;
  lastDevelopment: number;
  keyEvents: string[];
  dependencies: string[]; // other plot thread IDs this depends on
  mustResolveBy: number | null; // chapter number if there's a deadline
}

interface WorldRule {
  id: string;
  category: 'magic' | 'technology' | 'social' | 'physical' | 'supernatural';
  rule: string;
  establishedIn: number;
  applications: string[];
  limitations: string[];
}

interface StoryEvent {
  id: string;
  chapter: number;
  description: string;
  importance: number;
  consequences: string[];
  involvedCharacters: string[];
  relatedPlotThreads: string[];
}

interface TimelineEvent {
  chapter: number;
  timeReference: string; // "3 days later", "meanwhile", etc.
  actualTimeElapsed?: string;
}

export class ComprehensiveConsistencyManager {
  
  async buildStoryMemory(novelId: string): Promise<StoryMemory> {
    // Get all chapters with their data
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            events: {
              include: {
                character: true,
                plotline: true
              }
            },
            characterUsages: {
              include: {
                character: true
              }
            },
            plotlineDevelopments: {
              include: {
                plotline: true
              }
            }
          }
        },
        characters: true,
        plotlines: true,
        worldBuilding: true
      }
    });

    if (!novel) {
      throw new Error('Novel not found');
    }

    // Build character profiles
    const mainCharacters = await this.buildCharacterProfiles(novel.characters, novel.chapters);
    
    // Build plot threads
    const primaryPlotThreads = await this.buildPlotThreads(novel.plotlines, novel.chapters);
    
    // Extract world rules
    const worldRules = await this.extractWorldRules(novel.worldBuilding, novel.chapters);
    
    // Extract key events
    const keyEvents = await this.extractKeyEvents(novel.chapters);
    
    // Build timeline
    const timeline = await this.buildTimeline(novel.chapters);
    
    // Identify unresolved elements
    const unresolved = await this.identifyUnresolvedElements(novel.chapters, primaryPlotThreads);

    return {
      coreElements: {
        mainCharacters,
        primaryPlotThreads,
        worldRules,
        keyEvents
      },
      timeline,
      unresolved
    };
  }

  private async buildCharacterProfiles(characters: any[], chapters: any[]): Promise<CharacterProfile[]> {
    const profiles: CharacterProfile[] = [];

    for (const character of characters) {
      // Get all usages of this character
      const usages = chapters.flatMap(c => 
        c.characterUsages.filter((u: any) => u.characterId === character.id)
      );

      // Extract personality traits from development notes
      const personalityTraits = this.extractPersonalityTraits(character, usages);
      
      // Build relationships
      const relationships = this.extractRelationships(character, chapters);
      
      // Track abilities/powers
      const abilities = this.extractAbilities(character, chapters);
      
      // Identify goals
      const goals = this.extractGoals(character, usages);
      
      // Track development arc
      const developmentArc = this.buildDevelopmentArc(usages);
      
      // Find last significant change
      const lastSignificantChange = this.findLastSignificantChange(usages);

      profiles.push({
        id: character.id,
        name: character.name,
        corePersonality: personalityTraits,
        relationships,
        abilities,
        goals,
        developmentArc,
        lastSignificantChange
      });
    }

    return profiles;
  }

  private async buildPlotThreads(plotlines: any[], chapters: any[]): Promise<PlotThread[]> {
    const threads: PlotThread[] = [];

    for (const plotline of plotlines) {
      const developments = chapters.flatMap(c => 
        c.plotlineDevelopments.filter((d: any) => d.plotlineId === plotline.id)
      );

      const keyEvents = developments.map((d: any) => d.description);
      const introducedIn = developments.length > 0 ? developments[0].chapter.number : 0;
      const lastDevelopment = developments.length > 0 ? 
        Math.max(...developments.map((d: any) => d.chapter.number)) : 0;

      threads.push({
        id: plotline.id,
        name: plotline.name,
        type: this.classifyPlotType(plotline.name, plotline.description),
        status: plotline.status.toLowerCase() as any,
        importance: plotline.priority,
        introducedIn,
        lastDevelopment,
        keyEvents,
        dependencies: [], // TODO: Implement dependency detection
        mustResolveBy: null // TODO: Implement deadline detection
      });
    }

    return threads;
  }

  private async extractWorldRules(worldBuilding: any, chapters: any[]): Promise<WorldRule[]> {
    const rules: WorldRule[] = [];
    
    if (!worldBuilding) return rules;

    // Parse world building data
    const magicSystem = this.safeJsonParse(worldBuilding.magicSystem, null);
    const locations = this.safeJsonParse(worldBuilding.locations, []);
    const cultures = this.safeJsonParse(worldBuilding.cultures, []);
    const systemRules = this.safeJsonParse(worldBuilding.rules, []);

    // Extract magic system rules
    if (magicSystem) {
      rules.push({
        id: 'magic-system',
        category: 'magic',
        rule: typeof magicSystem === 'string' ? magicSystem : JSON.stringify(magicSystem),
        establishedIn: 1,
        applications: [],
        limitations: []
      });
    }

    // Extract other rules from system rules
    if (Array.isArray(systemRules)) {
      systemRules.forEach((rule, index) => {
        rules.push({
          id: `system-rule-${index}`,
          category: 'social',
          rule: rule,
          establishedIn: 1,
          applications: [],
          limitations: []
        });
      });
    }

    return rules;
  }

  private async extractKeyEvents(chapters: any[]): Promise<StoryEvent[]> {
    const events: StoryEvent[] = [];

    for (const chapter of chapters) {
      for (const event of chapter.events) {
        if (event.importance >= 3) { // Only track important events
          events.push({
            id: event.id,
            chapter: chapter.number,
            description: event.description,
            importance: event.importance,
            consequences: [], // TODO: Detect consequences
            involvedCharacters: event.characterId ? [event.characterId] : [],
            relatedPlotThreads: event.plotlineId ? [event.plotlineId] : []
          });
        }
      }
    }

    return events;
  }

  private async buildTimeline(chapters: any[]): Promise<TimelineEvent[]> {
    const timeline: TimelineEvent[] = [];
    
    // TODO: Implement timeline parsing from chapter content
    // For now, just track chapter sequence
    chapters.forEach(chapter => {
      timeline.push({
        chapter: chapter.number,
        timeReference: `Chapter ${chapter.number}`,
        actualTimeElapsed: undefined
      });
    });

    return timeline;
  }

  private async identifyUnresolvedElements(chapters: any[], plotThreads: PlotThread[]): Promise<{
    plotThreads: string[];
    mysteries: string[];
    promises: string[];
    conflicts: string[];
  }> {
    const unresolved = {
      plotThreads: [] as string[],
      mysteries: [] as string[],
      promises: [] as string[],
      conflicts: [] as string[]
    };

    // Find unresolved plot threads
    plotThreads.forEach(thread => {
      if (thread.status !== 'resolved' && thread.status !== 'abandoned') {
        unresolved.plotThreads.push(thread.name);
      }
    });

    // TODO: Implement detection of unresolved mysteries, promises, conflicts

    return unresolved;
  }

  async checkComprehensiveConsistency(
    chapterId: string, 
    newContent: string,
    storyMemory: StoryMemory
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Get chapter details
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        novel: true
      }
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Check character consistency
    const characterIssues = await this.checkCharacterConsistency(newContent, storyMemory.coreElements.mainCharacters);
    issues.push(...characterIssues);

    // Check plot thread consistency
    const plotIssues = await this.checkPlotThreadConsistency(newContent, storyMemory.coreElements.primaryPlotThreads);
    issues.push(...plotIssues);

    // Check world rule consistency
    const worldIssues = await this.checkWorldRuleConsistency(newContent, storyMemory.coreElements.worldRules);
    issues.push(...worldIssues);

    // Check for abandoned plot threads
    const abandonedIssues = await this.checkAbandonedPlotThreads(chapter.number, storyMemory);
    issues.push(...abandonedIssues);

    // Check timeline consistency
    const timelineIssues = await this.checkTimelineConsistency(newContent, storyMemory.timeline);
    issues.push(...timelineIssues);

    return issues;
  }

  private async checkCharacterConsistency(content: string, characters: CharacterProfile[]): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    for (const character of characters) {
      if (content.includes(character.name)) {
        // Check personality consistency
        const personalityInconsistencies = this.detectPersonalityInconsistencies(content, character);
        issues.push(...personalityInconsistencies);

        // Check relationship consistency
        const relationshipInconsistencies = this.detectRelationshipInconsistencies(content, character);
        issues.push(...relationshipInconsistencies);

        // Check ability consistency
        const abilityInconsistencies = this.detectAbilityInconsistencies(content, character);
        issues.push(...abilityInconsistencies);
      }
    }

    return issues;
  }

  private async checkPlotThreadConsistency(content: string, plotThreads: PlotThread[]): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    for (const thread of plotThreads) {
      // Check if plot thread is mentioned
      const mentioned = content.toLowerCase().includes(thread.name.toLowerCase()) ||
                       thread.keyEvents.some(event => content.toLowerCase().includes(event.toLowerCase()));

      if (mentioned) {
        // Check if development is consistent with status
        if (thread.status === 'resolved' && content.includes('new development')) {
          issues.push({
            type: 'PLOT',
            severity: 'high',
            description: `Plot thread "${thread.name}" was already resolved but new developments are being added`,
            suggestion: `Ensure resolved plot threads don't get reopened unless intentionally`
          });
        }
      }
    }

    return issues;
  }

  private async checkWorldRuleConsistency(content: string, worldRules: WorldRule[]): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    for (const rule of worldRules) {
      // TODO: Implement sophisticated rule violation detection
      // For now, basic keyword checking
      if (content.includes('magic') && rule.category === 'magic') {
        // Check for potential violations
      }
    }

    return issues;
  }

  private async checkAbandonedPlotThreads(currentChapter: number, storyMemory: StoryMemory): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    for (const thread of storyMemory.coreElements.primaryPlotThreads) {
      const chaptersWithoutDevelopment = currentChapter - thread.lastDevelopment;
      
      if (chaptersWithoutDevelopment > 5 && thread.status !== 'resolved' && thread.importance >= 3) {
        issues.push({
          type: 'PLOT',
          severity: 'medium',
          description: `Important plot thread "${thread.name}" hasn't been developed for ${chaptersWithoutDevelopment} chapters`,
          suggestion: `Consider advancing or addressing the "${thread.name}" plot thread to maintain narrative momentum`
        });
      }
    }

    return issues;
  }

  private async checkTimelineConsistency(content: string, timeline: TimelineEvent[]): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    // TODO: Implement timeline consistency checking
    
    return issues;
  }

  // Helper methods
  private extractPersonalityTraits(character: any, usages: any[]): string[] {
    const traits: string[] = [];
    
    // Extract from character description and personality
    if (character.personality) {
      traits.push(...character.personality.split(',').map((t: string) => t.trim()));
    }

    // Extract from development notes
    usages.forEach(usage => {
      if (usage.developmentNotes) {
        // Simple extraction - could be enhanced with NLP
        const notes = usage.developmentNotes.toLowerCase();
        if (notes.includes('brave')) traits.push('brave');
        if (notes.includes('kind')) traits.push('kind');
        if (notes.includes('angry')) traits.push('hot-tempered');
        // TODO: Add more sophisticated trait extraction
      }
    });

    return [...new Set(traits)]; // Remove duplicates
  }

  private extractRelationships(character: any, chapters: any[]): Record<string, string> {
    const relationships: Record<string, string> = {};
    
    // Parse existing relationships JSON
    try {
      const existing = JSON.parse(character.relationships || '{}');
      Object.assign(relationships, existing);
    } catch {
      // Ignore parsing errors
    }

    // TODO: Extract relationships from chapter content

    return relationships;
  }

  private extractAbilities(character: any, chapters: any[]): string[] {
    const abilities: string[] = [];
    
    // TODO: Extract abilities from chapter events and content
    
    return abilities;
  }

  private extractGoals(character: any, usages: any[]): string[] {
    const goals: string[] = [];
    
    // TODO: Extract goals from development notes and character arcs
    
    return goals;
  }

  private buildDevelopmentArc(usages: any[]): string {
    // TODO: Build comprehensive development arc from usages
    return usages.map(u => u.developmentNotes).filter(Boolean).join(' -> ');
  }

  private findLastSignificantChange(usages: any[]): number {
    // TODO: Detect when character last had significant change
    return usages.length > 0 ? Math.max(...usages.map(u => u.chapter?.number || 0)) : 0;
  }

  private classifyPlotType(name: string, description: string): 'main' | 'subplot' | 'romance' | 'mystery' | 'conflict' {
    const text = (name + ' ' + description).toLowerCase();
    
    if (text.includes('love') || text.includes('romance') || text.includes('relationship')) {
      return 'romance';
    }
    if (text.includes('mystery') || text.includes('secret') || text.includes('unknown')) {
      return 'mystery';
    }
    if (text.includes('conflict') || text.includes('fight') || text.includes('battle')) {
      return 'conflict';
    }
    if (text.includes('main') || text.includes('primary') || text.includes('central')) {
      return 'main';
    }
    
    return 'subplot';
  }

  private detectPersonalityInconsistencies(content: string, character: CharacterProfile): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // TODO: Implement sophisticated personality inconsistency detection
    
    return issues;
  }

  private detectRelationshipInconsistencies(content: string, character: CharacterProfile): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // TODO: Implement relationship inconsistency detection
    
    return issues;
  }

  private detectAbilityInconsistencies(content: string, character: CharacterProfile): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // TODO: Implement ability inconsistency detection
    
    return issues;
  }

  private safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }
}

export const comprehensiveConsistencyManager = new ComprehensiveConsistencyManager();