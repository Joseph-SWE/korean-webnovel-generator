/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from './db';
import { ConsistencyCheck, ConsistencyIssue } from '@/types';
import { generateWithRetry } from './gemini';
import { CONSISTENCY_CHECK_PROMPT } from './prompts';

export class ConsistencyManager {
  
  async checkChapterConsistency(chapterId: string, useAI: boolean = false): Promise<ConsistencyCheck> {
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

    const issues: ConsistencyIssue[] = [];

    // Check character consistency
    const characterIssues = await this.checkCharacterConsistency(chapter);
    issues.push(...characterIssues);

    // Check plot consistency
    const plotIssues = await this.checkPlotConsistency(chapter);
    issues.push(...plotIssues);

    // Check world-building consistency
    const worldIssues = await this.checkWorldBuildingConsistency(chapter);
    issues.push(...worldIssues);

    // Check timeline consistency
    const timelineIssues = await this.checkTimelineConsistency(chapter);
    issues.push(...timelineIssues);

    // AI-powered consistency check if requested
    if (useAI) {
      const aiIssues = await this.performAIConsistencyCheck(chapter);
      issues.push(...aiIssues);
    }

    return {
      hasIssues: issues.length > 0,
      issues
    };
  }

  private async checkCharacterConsistency(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    // Get all previous chapters to check character consistency
    const previousChapters = await prisma.chapter.findMany({
      where: {
        novelId: chapter.novelId,
        number: { lt: chapter.number }
      },
      orderBy: { number: 'desc' },
      take: 5 // Check last 5 chapters for patterns
    });

    // Check each character mentioned in the chapter
    for (const character of chapter.novel.characters) {
      const characterMentions = this.findCharacterMentions(chapter.content, character.name);
      
      if (characterMentions.length > 0) {
        // Check if character behavior is consistent with personality
        const personalityIssues = this.analyzeCharacterPersonality(
          chapter.content,
          character,
          characterMentions
        );
        issues.push(...personalityIssues);

        // Check dialogue consistency
        const dialogueIssues = this.analyzeCharacterDialogue(
          chapter.content,
          character,
          characterMentions
        );
        issues.push(...dialogueIssues);

        // Check character relationships
        const relationshipIssues = await this.analyzeCharacterRelationships(
          chapter,
          character,
          characterMentions
        );
        issues.push(...relationshipIssues);
      }
    }

    return issues;
  }

  private async checkPlotConsistency(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Check for plot holes
    const events = chapter.events;
    for (const event of events) {
      if (event.eventType === 'PLOT_ADVANCEMENT') {
        // Verify the plot advancement makes sense
        const plotlineIssues = await this.validatePlotAdvancement(event, chapter);
        issues.push(...plotlineIssues);
      }
    }

    // Check for unresolved plotlines
    const unresolvedIssues = await this.checkUnresolvedPlotlines(chapter);
    issues.push(...unresolvedIssues);

    return issues;
  }

  private async checkWorldBuildingConsistency(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    if (chapter.novel.worldBuilding) {
      // Safely parse world rules
      let worldRules = {};
      if (chapter.novel.worldBuilding.rules) {
        try {
          worldRules = JSON.parse(chapter.novel.worldBuilding.rules);
        } catch (error) {
          console.warn('Failed to parse world rules as JSON, treating as plain text');
          worldRules = { rules: chapter.novel.worldBuilding.rules };
        }
      }

      // Safely parse magic system
      let magicSystem = {};
      if (chapter.novel.worldBuilding.magicSystem) {
        try {
          magicSystem = JSON.parse(chapter.novel.worldBuilding.magicSystem);
        } catch (error) {
          console.warn('Failed to parse magic system as JSON, treating as plain text');
          magicSystem = { description: chapter.novel.worldBuilding.magicSystem };
        }
      }

      // Check magic system consistency
      if (magicSystem && Object.keys(magicSystem).length > 0) {
        const magicIssues = this.checkMagicSystemConsistency(chapter.content, magicSystem);
        issues.push(...magicIssues);
      }

      // Check world rules consistency
      if (worldRules && Object.keys(worldRules).length > 0) {
        const ruleIssues = this.checkWorldRulesConsistency(chapter.content, worldRules);
        issues.push(...ruleIssues);
      }

      // Check location consistency
      const locationIssues = this.checkLocationConsistency(chapter);
      issues.push(...locationIssues);
    }

    return issues;
  }

  private async checkTimelineConsistency(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Get previous chapters to check timeline
    const previousChapters = await prisma.chapter.findMany({
      where: {
        novelId: chapter.novelId,
        number: { lt: chapter.number }
      },
      orderBy: { number: 'asc' },
      include: {
        events: {
          where: {
            eventType: { in: ['PLOT_ADVANCEMENT', 'REVELATION'] }
          }
        }
      }
    });

    // Check for timeline inconsistencies
    const timelineIssues = this.analyzeTimelineFlow(chapter, previousChapters);
    issues.push(...timelineIssues);

    return issues;
  }

  private async performAIConsistencyCheck(chapter: any): Promise<ConsistencyIssue[]> {
    try {
      // Get recent events for context
      const recentEvents = await this.getRecentEventsForChapter(chapter.id);
      
      const prompt = CONSISTENCY_CHECK_PROMPT
        .replace('[CHAPTER_CONTENT]', chapter.content)
        .replace('[CHARACTER_PROFILES]', 
          chapter.novel.characters.map((c: any) => 
            `${c.name}: ${c.personality} - ${c.description}`
          ).join('\n')
        )
        .replace('[WORLD_RULES]', 
          chapter.novel.worldBuilding?.rules || 'No specific world rules defined'
        )
        .replace('[PREVIOUS_EVENTS]', recentEvents);

      const aiResponse = await generateWithRetry(prompt, 2, false);
      
      // Parse AI response to extract issues
      return this.parseAIConsistencyResponse(aiResponse);

    } catch (error) {
      console.error('AI consistency check failed:', error);
      return [{
        type: 'timeline',
        severity: 'low',
        description: 'AI consistency analysis failed',
        suggestion: 'Manual review recommended'
      }];
    }
  }

  private parseAIConsistencyResponse(aiResponse: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const lines = aiResponse.split('\n');
    
    let currentIssue: Partial<ConsistencyIssue> = {};
    
    for (const line of lines) {
      if (line.includes('캐릭터 일관성') || line.includes('character')) {
        if (currentIssue.description) {
          issues.push(currentIssue as ConsistencyIssue);
        }
        currentIssue = { type: 'character', severity: 'medium' };
      } else if (line.includes('플롯 연속성') || line.includes('plot')) {
        if (currentIssue.description) {
          issues.push(currentIssue as ConsistencyIssue);
        }
        currentIssue = { type: 'plot', severity: 'medium' };
      } else if (line.includes('세계관') || line.includes('worldbuilding')) {
        if (currentIssue.description) {
          issues.push(currentIssue as ConsistencyIssue);
        }
        currentIssue = { type: 'worldbuilding', severity: 'medium' };
      } else if (line.includes('문제') || line.includes('불일치')) {
        currentIssue.description = line.trim();
      } else if (line.includes('제안') || line.includes('권장')) {
        currentIssue.suggestion = line.trim();
      }
    }
    
    if (currentIssue.description) {
      issues.push(currentIssue as ConsistencyIssue);
    }
    
    return issues;
  }

  private async getRecentEventsForChapter(chapterId: string): Promise<string> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { novelId: true, number: true }
    });

    if (!chapter) return 'No previous events found';

    const recentEvents = await prisma.chapterEvent.findMany({
      where: { 
        chapter: { 
          novelId: chapter.novelId,
          number: { lte: chapter.number }
        }
      },
      orderBy: { chapter: { number: 'desc' } },
      take: 10,
      include: {
        character: { select: { name: true } },
        plotline: { select: { name: true } }
      }
    });

    return recentEvents.map(event => 
      `${event.eventType}: ${event.description} ${
        event.character ? `(${event.character.name})` : ''
      }`
    ).join('\n');
  }

  private async analyzeCharacterRelationships(
    chapter: any,
    character: any,
    mentions: Array<{ context: string; position: number }>
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      const relationships = JSON.parse(character.relationships || '{}');
      
      // Check if relationship dynamics are consistent
      for (const [relatedCharacter, relationship] of Object.entries(relationships)) {
        const interactionPattern = mentions.filter(m => 
          m.context.toLowerCase().includes(relatedCharacter.toLowerCase())
        );

        if (interactionPattern.length > 0) {
          // Analyze relationship consistency
          const relationshipType = relationship as string;
          const inconsistentInteractions = this.findInconsistentRelationshipBehavior(
            interactionPattern,
            relationshipType,
            character.name,
            relatedCharacter
          );
          
          issues.push(...inconsistentInteractions);
        }
      }
    } catch (error) {
      // If relationships parsing fails, skip this check
      console.warn('Failed to parse character relationships:', error);
    }

    return issues;
  }

  private findInconsistentRelationshipBehavior(
    interactions: Array<{ context: string; position: number }>,
    relationshipType: string,
    characterName: string,
    relatedCharacter: string
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Define expected behavior patterns for different relationship types
    const relationshipPatterns: Record<string, { positive: string[], negative: string[] }> = {
      'enemy': {
        positive: ['attack', 'fight', 'oppose', '적대', '싸움'],
        negative: ['friendly', 'help', 'support', '친근', '도움']
      },
      'friend': {
        positive: ['help', 'support', 'friendly', '도움', '친근', '지원'],
        negative: ['attack', 'betray', 'oppose', '공격', '배신', '반대']
      },
      'lover': {
        positive: ['love', 'kiss', 'embrace', '사랑', '키스', '포옹'],
        negative: ['hate', 'ignore', 'cold', '미움', '무시', '차가운']
      }
    };

    const pattern = relationshipPatterns[relationshipType.toLowerCase()];
    if (!pattern) return issues;

    for (const interaction of interactions) {
      const context = interaction.context.toLowerCase();
      
      // Check for behavior that contradicts the relationship
      const hasNegativeBehavior = pattern.negative.some(word => context.includes(word));
      const hasPositiveBehavior = pattern.positive.some(word => context.includes(word));

      if (hasNegativeBehavior && !hasPositiveBehavior) {
        issues.push({
          type: 'character',
          severity: 'medium',
          description: `${characterName}'s behavior toward ${relatedCharacter} contradicts their ${relationshipType} relationship`,
          suggestion: `Adjust interaction to match the established ${relationshipType} relationship or explain the change in dynamics`
        });
      }
    }

    return issues;
  }

  private async checkUnresolvedPlotlines(chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Get all active plotlines for this novel
    const activePlotlines = await prisma.plotline.findMany({
      where: {
        novelId: chapter.novelId,
        status: { in: ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'] }
      }
    });

    // Check if any plotline has been ignored for too long
    for (const plotline of activePlotlines) {
      const recentMentions = await prisma.chapterEvent.findMany({
        where: {
          plotlineId: plotline.id,
          chapter: {
            novelId: chapter.novelId,
            number: { gte: chapter.number - 5, lte: chapter.number }
          }
        }
      });

      if (recentMentions.length === 0 && plotline.priority > 2) {
        issues.push({
          type: 'plot',
          severity: 'medium',
          description: `High-priority plotline "${plotline.name}" has not been addressed in recent chapters`,
          suggestion: `Consider advancing or referencing the "${plotline.name}" plotline to maintain narrative momentum`
        });
      }
    }

    return issues;
  }

  private checkLocationConsistency(chapter: any): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    if (!chapter.novel.worldBuilding?.locations) return issues;

    try {
      const locations = JSON.parse(chapter.novel.worldBuilding.locations);
      
      // Extract location mentions from chapter content
      const locationMentions = this.extractLocationMentions(chapter.content, Object.keys(locations));
      
      // Check for location consistency issues
      for (const location of locationMentions) {
        const locationData = locations[location];
        if (locationData && locationData.rules) {
          const violatedRules = this.checkLocationRules(chapter.content, location, locationData.rules);
          issues.push(...violatedRules);
        }
      }
    } catch (error) {
      console.warn('Failed to parse location data:', error);
    }

    return issues;
  }

  private extractLocationMentions(content: string, locationNames: string[]): string[] {
    const mentions: string[] = [];
    
    for (const location of locationNames) {
      if (content.toLowerCase().includes(location.toLowerCase())) {
        mentions.push(location);
      }
    }
    
    return mentions;
  }

  private checkLocationRules(content: string, location: string, rules: string[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (const rule of rules) {
      // Simple rule checking - this could be more sophisticated
      if (rule.includes('no magic') && content.includes('magic') && content.includes(location)) {
        issues.push({
          type: 'worldbuilding',
          severity: 'high',
          description: `Magic is used in ${location} where it should be prohibited`,
          suggestion: `Remove magic usage in ${location} or modify the location rules`
        });
      }
    }

    return issues;
  }

  private analyzeTimelineFlow(chapter: any, previousChapters: any[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check for timeline jumps that aren't explained
    const timeIndicators = this.extractTimeIndicators(chapter.content);
    
    if (timeIndicators.length > 0) {
      // Analyze time progression
      const timelineIssues = this.validateTimeProgression(timeIndicators, previousChapters);
      issues.push(...timelineIssues);
    }

    return issues;
  }

  private extractTimeIndicators(content: string): Array<{ indicator: string, type: 'past' | 'present' | 'future' }> {
    const indicators: Array<{ indicator: string, type: 'past' | 'present' | 'future' }> = [];
    
    const timePatterns = [
      { pattern: /(어제|yesterday|지난|과거|전에)/, type: 'past' as const },
      { pattern: /(오늘|today|지금|현재|이제)/, type: 'present' as const },
      { pattern: /(내일|tomorrow|미래|나중에|다음)/, type: 'future' as const }
    ];

    for (const { pattern, type } of timePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        indicators.push({ indicator: matches[0], type });
      }
    }

    return indicators;
  }

  private validateTimeProgression(
    timeIndicators: Array<{ indicator: string, type: 'past' | 'present' | 'future' }>,
    previousChapters: any[]
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check for contradictory time references
    const hasBackward = timeIndicators.some(t => t.type === 'past');
    const hasForward = timeIndicators.some(t => t.type === 'future');

    if (hasBackward && hasForward && timeIndicators.length > 2) {
      issues.push({
        type: 'timeline',
        severity: 'medium',
        description: 'Chapter contains conflicting time references (past and future)',
        suggestion: 'Clarify the timeline progression or use clearer temporal transitions'
      });
    }

    return issues;
  }

  private findCharacterMentions(content: string, characterName: string): Array<{ context: string; position: number }> {
    const mentions: Array<{ context: string; position: number }> = [];
    const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(content.length, match.index + characterName.length + 50);
      const context = content.substring(start, end);
      
      mentions.push({
        context,
        position: match.index
      });
    }

    return mentions;
  }

  private analyzeCharacterPersonality(
    content: string, 
    character: any, 
    mentions: Array<{ context: string; position: number }>
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Simple personality consistency checks
    const personality = character.personality.toLowerCase();
    
    // Check for contradictory behaviors
    if (personality.includes('shy') || personality.includes('introverted')) {
      const boldActions = mentions.filter(m => 
        m.context.toLowerCase().includes('boldly') || 
        m.context.toLowerCase().includes('confidently spoke') ||
        m.context.toLowerCase().includes('loudly declared')
      );

      if (boldActions.length > 0) {
        issues.push({
          type: 'character',
          severity: 'medium',
          description: `${character.name} is described as ${personality} but shows bold/confident behavior`,
          suggestion: `Consider adjusting the character's actions to match their shy personality, or show character growth`
        });
      }
    }

    return issues;
  }

  private analyzeCharacterDialogue(
    content: string,
    character: any,
    mentions: Array<{ context: string; position: number }>
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Extract dialogue for this character
    const dialoguePattern = new RegExp(`"([^"]*)"[^"]*${character.name}|${character.name}[^"]*"([^"]*)"`, 'gi');
    const dialogues = [];
    let match;

    while ((match = dialoguePattern.exec(content)) !== null) {
      dialogues.push(match[1] || match[2]);
    }

    // Check for formal/informal speech consistency
    const personality = character.personality.toLowerCase();
    if (personality.includes('formal') || personality.includes('polite')) {
      const informalSpeech = dialogues.filter(d => 
        d && (d.includes('ya') || d.includes('hey') || d.includes('dude'))
      );

      if (informalSpeech.length > 0) {
        issues.push({
          type: 'character',
          severity: 'low',
          description: `${character.name} uses informal speech despite being described as formal/polite`,
          suggestion: 'Adjust dialogue to match character\'s formal personality'
        });
      }
    }

    return issues;
  }

  private async validatePlotAdvancement(event: any, chapter: any): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Check if plot advancement follows logical progression
    if (event.plotline) {
      const relatedEvents = await prisma.chapterEvent.findMany({
        where: {
          plotlineId: event.plotlineId,
          chapter: {
            novelId: chapter.novelId,
            number: { lt: chapter.number }
          }
        },
        orderBy: { chapter: { number: 'desc' } },
        take: 3
      });

      // Simple logical progression check
      if (relatedEvents.length === 0 && event.description.includes('resolved')) {
        issues.push({
          type: 'plot',
          severity: 'high',
          description: `Plot "${event.plotline.name}" appears to be resolved without proper setup`,
          suggestion: 'Add more development before resolving this plotline'
        });
      }
    }

    return issues;
  }

  private checkMagicSystemConsistency(content: string, magicSystem: any): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Example: Check if magic usage follows established rules
    if (magicSystem.requiresChanting && content.includes('cast spell')) {
      const hasChanting = content.includes('chant') || content.includes('incant') || content.includes('murmur');
      if (!hasChanting) {
        issues.push({
          type: 'worldbuilding',
          severity: 'medium',
          description: 'Magic is used without required chanting according to established magic system',
          suggestion: 'Add chanting/incantation before spell casting'
        });
      }
    }

    return issues;
  }

  private checkWorldRulesConsistency(content: string, worldRules: any): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Example world rule checks
    for (const [rule, requirement] of Object.entries(worldRules)) {
      if (typeof requirement === 'string' && content.includes(rule)) {
        // Check if the requirement is mentioned when the rule is triggered
        if (!content.includes(requirement)) {
          issues.push({
            type: 'worldbuilding',
            severity: 'low',
            description: `World rule "${rule}" triggered without mentioning "${requirement}"`,
            suggestion: `Include reference to ${requirement} when ${rule} occurs`
          });
        }
      }
    }

    return issues;
  }

  async generateConsistencyReport(novelId: string): Promise<{
    overallConsistency: number;
    issuesSummary: Record<string, number>;
    recommendations: string[];
    detailedAnalysis: {
      characterConsistency: number;
      plotConsistency: number;
      worldBuildingConsistency: number;
      timelineConsistency: number;
    };
  }> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' }
    });

    let totalIssues = 0;
    const issueTypes: Record<string, number> = {};
    const recommendations: string[] = [];
    
    const categoryIssues = {
      character: 0,
      plot: 0,
      worldbuilding: 0,
      timeline: 0
    };

    for (const chapter of chapters) {
      const consistencyCheck = await this.checkChapterConsistency(chapter.id);
      totalIssues += consistencyCheck.issues.length;

      for (const issue of consistencyCheck.issues) {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
        categoryIssues[issue.type as keyof typeof categoryIssues]++;
        
        if (issue.suggestion && !recommendations.includes(issue.suggestion)) {
          recommendations.push(issue.suggestion);
        }
      }
    }

    const totalChecks = chapters.length * 12; // Increased checks per chapter
    const consistencyScore = Math.max(0, Math.min(100, ((totalChecks - totalIssues) / totalChecks) * 100));

    // Calculate category-specific consistency scores
    const calculateCategoryScore = (issues: number) => {
      const maxIssuesPerCategory = chapters.length * 3;
      return Math.max(0, Math.min(100, ((maxIssuesPerCategory - issues) / maxIssuesPerCategory) * 100));
    };

    return {
      overallConsistency: Math.round(consistencyScore),
      issuesSummary: issueTypes,
      recommendations: recommendations.slice(0, 15), // Top 15 recommendations
      detailedAnalysis: {
        characterConsistency: Math.round(calculateCategoryScore(categoryIssues.character)),
        plotConsistency: Math.round(calculateCategoryScore(categoryIssues.plot)),
        worldBuildingConsistency: Math.round(calculateCategoryScore(categoryIssues.worldbuilding)),
        timelineConsistency: Math.round(calculateCategoryScore(categoryIssues.timeline))
      }
    };
  }
} 