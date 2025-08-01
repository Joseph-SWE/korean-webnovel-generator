/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './db';
import { comprehensiveConsistencyManager, type StoryMemory } from './comprehensive-consistency';

interface ComprehensiveStoryContext {
  // Core story elements (always included)
  mainCharacters: {
    name: string;
    corePersonality: string;
    currentGoals: string[];
    recentDevelopment: string;
    relationships: Record<string, string>;
    abilities: string[];
  }[];
  
  // Active plot threads requiring attention
  activePlotThreads: {
    name: string;
    currentStatus: string;
    lastDevelopment: string;
    urgency: 'high' | 'medium' | 'low';
    nextExpectedDevelopment: string;
  }[];
  
  // Critical world rules that must be maintained
  worldRules: {
    category: string;
    rule: string;
    applications: string[];
    limitations: string[];
  }[];
  
  // Recent story flow (last 3-5 chapters)
  recentFlow: {
    chapterNumber: number;
    keyEvents: string[];
    characterDevelopments: string[];
    plotAdvances: string[];
    cliffhanger?: string;
    contentSummary: string;
  }[];
  
  // Unresolved elements that need attention
  unresolved: {
    mysteries: string[];
    promises: string[];
    conflicts: string[];
    relationships: string[];
  };
  
  // Story-wide consistency requirements
  consistencyRequirements: {
    characterPersonalities: Record<string, string[]>;
    establishedFacts: string[];
    timeline: string[];
    consequences: string[];
  };
}

export class StoryContextBuilder {
  
  async buildComprehensiveContext(novelId: string, upToChapter: number): Promise<ComprehensiveStoryContext> {
    // Build story memory first
    const storyMemory = await comprehensiveConsistencyManager.buildStoryMemory(novelId);
    
    // Get recent chapters for flow analysis
    const recentChapters = await this.getRecentChapters(novelId, upToChapter, 5);
    
    // Build comprehensive context
    const context: ComprehensiveStoryContext = {
      mainCharacters: await this.buildMainCharacterSummaries(storyMemory),
      activePlotThreads: await this.buildActivePlotThreads(storyMemory, upToChapter),
      worldRules: await this.buildWorldRulesSummary(storyMemory),
      recentFlow: await this.buildRecentFlow(recentChapters),
      unresolved: await this.buildUnresolvedElements(storyMemory),
      consistencyRequirements: await this.buildConsistencyRequirements(storyMemory)
    };
    
    return context;
  }
  
  private async getRecentChapters(novelId: string, upToChapter: number, count: number) {
    return await prisma.chapter.findMany({
      where: {
        novelId: novelId,
        number: {
          gte: Math.max(1, upToChapter - count + 1),
          lte: upToChapter
        }
      },
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
      },
      orderBy: { number: 'asc' }
    });
  }
  
  private async buildMainCharacterSummaries(storyMemory: StoryMemory) {
    return storyMemory.coreElements.mainCharacters.map(char => ({
      name: char.name,
      corePersonality: char.corePersonality.join(', '),
      currentGoals: char.goals,
      recentDevelopment: char.developmentArc.split(' -> ').pop() || '',
      relationships: char.relationships,
      abilities: char.abilities
    }));
  }
  
  private async buildActivePlotThreads(storyMemory: StoryMemory, currentChapter: number) {
    return storyMemory.coreElements.primaryPlotThreads
      .filter(thread => thread.status !== 'resolved' && thread.status !== 'abandoned')
      .map(thread => {
        const chaptersWithoutDevelopment = currentChapter - thread.lastDevelopment;
        let urgency: 'high' | 'medium' | 'low' = 'low';
        
        if (chaptersWithoutDevelopment > 5 && thread.importance >= 3) {
          urgency = 'high';
        } else if (chaptersWithoutDevelopment > 3) {
          urgency = 'medium';
        }
        
        return {
          name: thread.name,
          currentStatus: thread.status,
          lastDevelopment: thread.keyEvents[thread.keyEvents.length - 1] || 'No recent development',
          urgency,
          nextExpectedDevelopment: this.predictNextDevelopment(thread)
        };
      })
      .sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
  }
  
  private predictNextDevelopment(thread: any): string {
    switch (thread.status) {
      case 'introduced':
        return 'Initial development or complication';
      case 'developing':
        return 'Major advancement or new complication';
      case 'complicated':
        return 'Resolution attempt or climax preparation';
      case 'climax':
        return 'Final resolution';
      default:
        return 'Continue development';
    }
  }
  
  private async buildWorldRulesSummary(storyMemory: StoryMemory) {
    return storyMemory.coreElements.worldRules.map(rule => ({
      category: rule.category,
      rule: rule.rule,
      applications: rule.applications,
      limitations: rule.limitations
    }));
  }
  
  private async buildRecentFlow(recentChapters: any[]) {
    return recentChapters.map(chapter => ({
      chapterNumber: chapter.number,
      keyEvents: chapter.events.map((e: any) => e.description),
      characterDevelopments: chapter.characterUsages.map((u: any) => 
        `${u.character.name}: ${u.developmentNotes || 'appeared'}`
      ).filter((dev: string) => !dev.endsWith(': appeared')),
      plotAdvances: chapter.plotlineDevelopments.map((d: any) => 
        `${d.plotline.name}: ${d.description}`
      ),
      cliffhanger: chapter.cliffhanger || undefined,
      contentSummary: this.createContentSummary(chapter.content)
    }));
  }
  
  private createContentSummary(content: string): string {
    if (!content) return '';
    
    // Extract key sentences (first, middle, last)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length <= 3) {
      return content.substring(0, 500);
    }
    
    const firstSentence = sentences[0];
    const middleSentence = sentences[Math.floor(sentences.length / 2)];
    const lastSentence = sentences[sentences.length - 1];
    
    return `${firstSentence}. ... ${middleSentence}. ... ${lastSentence}.`;
  }
  
  private async buildUnresolvedElements(storyMemory: StoryMemory) {
    return {
      mysteries: storyMemory.unresolved.mysteries,
      promises: storyMemory.unresolved.promises,
      conflicts: storyMemory.unresolved.conflicts,
      relationships: [] // TODO: Extract unresolved relationship issues
    };
  }
  
  private async buildConsistencyRequirements(storyMemory: StoryMemory) {
    return {
      characterPersonalities: storyMemory.coreElements.mainCharacters.reduce((acc, char) => {
        acc[char.name] = char.corePersonality;
        return acc;
      }, {} as Record<string, string[]>),
      establishedFacts: storyMemory.coreElements.worldRules.map(rule => rule.rule),
      timeline: storyMemory.timeline.map(t => t.timeReference),
      consequences: storyMemory.coreElements.keyEvents.flatMap(event => event.consequences)
    };
  }
  
  // Generate context for AI prompts
  generateContextForPrompt(context: ComprehensiveStoryContext): string {
    let prompt = '\n**🎯 COMPREHENSIVE STORY CONTEXT (MAINTAIN ALL CONSISTENCY) 🎯**\n\n';
    
    // Main Characters
    if (context.mainCharacters.length > 0) {
      prompt += '**👥 MAIN CHARACTERS (personality must remain consistent):**\n';
      context.mainCharacters.forEach(char => {
        prompt += `• **${char.name}**: ${char.corePersonality}\n`;
        if (char.currentGoals.length > 0) {
          prompt += `  Goals: ${char.currentGoals.join(', ')}\n`;
        }
        if (char.recentDevelopment) {
          prompt += `  Recent: ${char.recentDevelopment}\n`;
        }
        if (Object.keys(char.relationships).length > 0) {
          prompt += `  Relationships: ${Object.entries(char.relationships).map(([name, rel]) => `${name} (${rel})`).join(', ')}\n`;
        }
      });
      prompt += '\n';
    }
    
    // Active Plot Threads
    if (context.activePlotThreads.length > 0) {
      prompt += '**🧵 ACTIVE PLOT THREADS (must be addressed):**\n';
      context.activePlotThreads.forEach(thread => {
        const urgencyIcon = thread.urgency === 'high' ? '🚨' : thread.urgency === 'medium' ? '⚠️' : '📌';
        prompt += `${urgencyIcon} **${thread.name}** (${thread.currentStatus})\n`;
        prompt += `  Last: ${thread.lastDevelopment}\n`;
        prompt += `  Next: ${thread.nextExpectedDevelopment}\n`;
      });
      prompt += '\n';
    }
    
    // World Rules
    if (context.worldRules.length > 0) {
      prompt += '**🌍 WORLD RULES (never violate these):**\n';
      context.worldRules.forEach(rule => {
        prompt += `• ${rule.rule}\n`;
        if (rule.limitations.length > 0) {
          prompt += `  Limitations: ${rule.limitations.join(', ')}\n`;
        }
      });
      prompt += '\n';
    }
    
    // Recent Flow
    if (context.recentFlow.length > 0) {
      prompt += '**📖 RECENT STORY FLOW (continue this flow):**\n';
      context.recentFlow.forEach(flow => {
        prompt += `\n**Chapter ${flow.chapterNumber}:**\n`;
        prompt += `Summary: ${flow.contentSummary}\n`;
        if (flow.keyEvents.length > 0) {
          prompt += `Key Events: ${flow.keyEvents.join(', ')}\n`;
        }
        if (flow.characterDevelopments.length > 0) {
          prompt += `Character Growth: ${flow.characterDevelopments.join(', ')}\n`;
        }
        if (flow.plotAdvances.length > 0) {
          prompt += `Plot Advances: ${flow.plotAdvances.join(', ')}\n`;
        }
        if (flow.cliffhanger) {
          prompt += `Cliffhanger: "${flow.cliffhanger}"\n`;
        }
      });
      prompt += '\n';
    }
    
    // Unresolved Elements
    const hasUnresolved = context.unresolved.mysteries.length > 0 || 
                         context.unresolved.promises.length > 0 || 
                         context.unresolved.conflicts.length > 0;
    
    if (hasUnresolved) {
      prompt += '**❗ UNRESOLVED ELEMENTS (address these eventually):**\n';
      if (context.unresolved.mysteries.length > 0) {
        prompt += `Mysteries: ${context.unresolved.mysteries.join(', ')}\n`;
      }
      if (context.unresolved.promises.length > 0) {
        prompt += `Promises: ${context.unresolved.promises.join(', ')}\n`;
      }
      if (context.unresolved.conflicts.length > 0) {
        prompt += `Conflicts: ${context.unresolved.conflicts.join(', ')}\n`;
      }
      prompt += '\n';
    }
    
    // Consistency Requirements
    prompt += '**🎯 CRITICAL CONSISTENCY REQUIREMENTS:**\n';
    prompt += '• Characters MUST behave according to their established personalities\n';
    prompt += '• World rules MUST be followed without exception\n';
    prompt += '• Plot threads MUST be addressed and not abandoned\n';
    prompt += '• Timeline MUST be logical and consistent\n';
    prompt += '• Previous events MUST have logical consequences\n';
    prompt += '• Character relationships MUST evolve naturally\n\n';
    
    return prompt;
  }
}

export const storyContextBuilder = new StoryContextBuilder();