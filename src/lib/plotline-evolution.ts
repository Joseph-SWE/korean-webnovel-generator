import { prisma } from '@/lib/db';
import { PlotStatus } from '@/types';

interface PlotlineDevelopmentWithChapter {
  id: string;
  developmentType: string;
  description: string;
  createdAt: Date;
  chapter: {
    number: number;
    title?: string;
  };
}

interface PlotlineWithStatus {
  id: string;
  name: string;
  status: string;
}

/**
 * Automatically updates plotline status based on the latest developments
 * @param plotlineId - The ID of the plotline to update
 * @returns The updated plotline status
 */
export async function updatePlotlineStatus(plotlineId: string): Promise<PlotStatus> {
  // Get all developments for this plotline ordered by creation date
  const developments = await prisma.plotlineDevelopment.findMany({
    where: { plotlineId },
    orderBy: { createdAt: 'desc' },
    include: {
      chapter: {
        select: { number: true }
      }
    }
  });

  if (developments.length === 0) {
    return 'PLANNED';
  }

  // Get the current plotline status
  const currentPlotline = await prisma.plotline.findUnique({
    where: { id: plotlineId },
    select: { status: true }
  });

  if (!currentPlotline) {
    throw new Error('Plotline not found');
  }

  // Determine new status based on development types
  const newStatus = determineStatusFromDevelopments(developments.map((d: { developmentType: string }) => d.developmentType));

  // Only update if status has changed
  if (newStatus !== currentPlotline.status) {
    await prisma.plotline.update({
      where: { id: plotlineId },
      data: { status: newStatus }
    });
  }

  return newStatus;
}

/**
 * Determines the plotline status based on development types
 * @param developmentTypes - Array of development types in chronological order (most recent first)
 * @returns The appropriate PlotStatus
 */
function determineStatusFromDevelopments(developmentTypes: string[]): PlotStatus {
  // Check for resolution first (final state)
  if (developmentTypes.includes('resolution')) {
    return 'RESOLVED';
  }

  // Get the most recent development type
  const latestDevelopment = developmentTypes[0];

  // Status progression based on latest development
  switch (latestDevelopment) {
    case 'introduction':
      return 'INTRODUCED';
    
    case 'advancement':
      // Check if there have been multiple advancements to indicate developing
      const advancementCount = developmentTypes.filter(type => type === 'advancement').length;
      return advancementCount >= 2 ? 'DEVELOPING' : 'INTRODUCED';
    
    case 'complication':
      return 'COMPLICATED';
    
    case 'resolution':
      return 'RESOLVED';
    
    default:
      return 'PLANNED';
  }
}

/**
 * Analyzes plotline developments to suggest status progression
 * @param plotlineId - The ID of the plotline to analyze
 * @returns Analysis with suggested status and reasoning
 */
export async function analyzePlotlineProgression(plotlineId: string) {
  const developments = await prisma.plotlineDevelopment.findMany({
    where: { plotlineId },
    orderBy: { createdAt: 'asc' },
    include: {
      chapter: {
        select: { number: true, title: true }
      }
    }
  });

  const plotline = await prisma.plotline.findUnique({
    where: { id: plotlineId },
    select: { name: true, status: true, description: true }
  });

  if (!plotline) {
    throw new Error('Plotline not found');
  }

  const progressionAnalysis = {
    plotlineName: plotline.name,
    currentStatus: plotline.status,
    suggestedStatus: determineStatusFromDevelopments(developments.map((d: { developmentType: string }) => d.developmentType).reverse()),
    developmentHistory: developments.map((dev: PlotlineDevelopmentWithChapter) => ({
      chapterNumber: dev.chapter.number,
      chapterTitle: dev.chapter.title,
      developmentType: dev.developmentType,
      description: dev.description,
      createdAt: dev.createdAt
    })),
    progressionSummary: generateProgressionSummary(developments),
    recommendations: generateRecommendations(developments, plotline.status as PlotStatus)
  };

  return progressionAnalysis;
}

/**
 * Generates a summary of plotline progression
 */
function generateProgressionSummary(developments: PlotlineDevelopmentWithChapter[]): string {
  const typeCount = developments.reduce((acc, dev) => {
    acc[dev.developmentType] = (acc[dev.developmentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const parts = [];
  
  if (typeCount.introduction) parts.push(`${typeCount.introduction} introduction(s)`);
  if (typeCount.advancement) parts.push(`${typeCount.advancement} advancement(s)`);
  if (typeCount.complication) parts.push(`${typeCount.complication} complication(s)`);
  if (typeCount.resolution) parts.push(`${typeCount.resolution} resolution(s)`);

  return `Total developments: ${developments.length} (${parts.join(', ')})`;
}

/**
 * Generates recommendations for plotline progression
 */
function generateRecommendations(developments: PlotlineDevelopmentWithChapter[], currentStatus: PlotStatus): string[] {
  const recommendations: string[] = [];
  const developmentTypes = developments.map((d: { developmentType: string }) => d.developmentType);

  // Check for missing progression steps
  if (developmentTypes.includes('complication') && !developmentTypes.includes('introduction')) {
    recommendations.push('Consider adding an introduction development to establish the plotline foundation');
  }

  if (developmentTypes.includes('resolution') && !developmentTypes.includes('complication')) {
    recommendations.push('Plotline resolved without complications - consider adding tension for more engaging storytelling');
  }

  if (developmentTypes.filter(t => t === 'advancement').length >= 3 && !developmentTypes.includes('complication')) {
    recommendations.push('Multiple advancements without complications - consider adding obstacles or conflicts');
  }

  if (currentStatus === 'RESOLVED' && developments.length < 3) {
    recommendations.push('Plotline resolved quickly - consider if more development would benefit the story');
  }

  if (developments.length === 0) {
    recommendations.push('No developments yet - this plotline needs to be introduced in upcoming chapters');
  }

  return recommendations;
}

/**
 * Batch update all plotlines for a novel
 * @param novelId - The ID of the novel
 * @returns Array of updated plotline statuses
 */
export async function updateAllPlotlineStatuses(novelId: string) {
  const plotlines = await prisma.plotline.findMany({
    where: { novelId },
    select: { id: true, name: true, status: true }
  });

  const updates = await Promise.all(
    plotlines.map(async (plotline: PlotlineWithStatus) => {
      const newStatus = await updatePlotlineStatus(plotline.id);
      return {
        id: plotline.id,
        name: plotline.name,
        oldStatus: plotline.status,
        newStatus
      };
    })
  );

  return updates.filter(update => update.oldStatus !== update.newStatus);
}

/**
 * Gets plotlines that need development attention based on their recent activity
 * @param novelId - The ID of the novel
 * @param chapterNumber - Current chapter number
 * @returns Plotlines that need attention, sorted by priority
 */
export async function getPlotlinesNeedingAttention(novelId: string, chapterNumber: number) {
  const activePlotlines = await prisma.plotline.findMany({
    where: { 
      novelId,
      status: { in: ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'] }
    },
    include: {
      developments: {
        include: {
          chapter: {
            select: { number: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      events: {
        include: {
          chapter: {
            select: { number: true }
          }
        },
        orderBy: { chapter: { number: 'desc' } },
        take: 5
      }
    },
    orderBy: { priority: 'desc' }
  });

  const plotlineActivity = activePlotlines.map(plotline => {
    // Calculate chapters since last development
    const lastDevelopment = plotline.developments[0];
    const chaptersSinceLastDev = lastDevelopment 
      ? chapterNumber - lastDevelopment.chapter.number
      : chapterNumber;

    // Calculate chapters since last mention
    const lastEvent = plotline.events[0];
    const chaptersSinceLastEvent = lastEvent 
      ? chapterNumber - lastEvent.chapter.number
      : chapterNumber;

    // Calculate urgency score
    const urgencyScore = calculatePlotlineUrgency(
      plotline.priority,
      chaptersSinceLastDev,
      chaptersSinceLastEvent,
      plotline.status as PlotStatus,
      plotline.developments.length
    );

    return {
      id: plotline.id,
      name: plotline.name,
      description: plotline.description,
      status: plotline.status,
      priority: plotline.priority,
      chaptersSinceLastDevelopment: chaptersSinceLastDev,
      chaptersSinceLastEvent: chaptersSinceLastEvent,
      urgencyScore,
      developmentCount: plotline.developments.length,
      needsAttention: urgencyScore > 35 // Lowered threshold to be more aggressive
    };
  });

  return plotlineActivity.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/**
 * Calculates urgency score for a plotline based on various factors
 */
function calculatePlotlineUrgency(
  priority: number,
  chaptersSinceLastDev: number,
  chaptersSinceLastEvent: number,
  status: PlotStatus,
  developmentCount: number
): number {
  let score = 0;

  // Base score from priority (1-5 scale) - increased multiplier
  score += priority * 15;

  // Penalty for not being developed recently - increased penalty
  score += chaptersSinceLastDev * 12;

  // Penalty for not being mentioned recently - increased penalty
  score += chaptersSinceLastEvent * 8;

  // Status-based urgency - increased urgency for all statuses
  switch (status) {
    case 'INTRODUCED':
      score += 30; // New plotlines need immediate development
      break;
    case 'COMPLICATED':
      score += 35; // Complicated plotlines need resolution
      break;
    case 'CLIMAXING':
      score += 40; // Climaxing plotlines are critical
      break;
    case 'DEVELOPING':
      score += 15; // Normal development priority
      break;
  }

  // Plotlines with very few developments need urgent attention
  if (developmentCount < 2) {
    score += 25; // Increased from 15
  }

  // Additional penalty for completely neglected plotlines
  if (chaptersSinceLastDev > 3) {
    score += 20;
  }

  return score;
}

/**
 * Suggests balanced plotline development for the next chapter
 * @param novelId - The ID of the novel
 * @param chapterNumber - Current chapter number
 * @param maxPlotlines - Maximum number of plotlines to focus on (default 2-3)
 * @returns Suggested plotlines for development
 */
export async function suggestPlotlineBalance(novelId: string, chapterNumber: number, maxPlotlines: number = 3) {
  const plotlineActivity = await getPlotlinesNeedingAttention(novelId, chapterNumber);
  
  // If no plotlines exist, return empty array
  if (plotlineActivity.length === 0) {
    return [];
  }
  
  // In aggressive mode, we want to ensure ALL plotlines get some attention
  const totalActivePlotlines = plotlineActivity.length;
  
  // Get high priority plotlines that need attention
  const urgentPlotlines = plotlineActivity.filter(p => p.urgencyScore > 50);
  
  // Get medium priority plotlines that should be touched
  const mediumPriorityPlotlines = plotlineActivity.filter(p => p.urgencyScore > 25 && p.urgencyScore <= 50);
  
  // Safety check: if no plotlines meet any threshold, take the top ones anyway
  if (urgentPlotlines.length === 0 && mediumPriorityPlotlines.length === 0) {
    console.log('No plotlines meet urgency thresholds, taking top plotlines by score');
    return plotlineActivity.slice(0, Math.min(maxPlotlines, totalActivePlotlines));
  }
  
  // If we have more than 3 active plotlines, we need to be more strategic
  if (totalActivePlotlines > 3) {
    // Always include the most urgent ones
    const mustInclude = urgentPlotlines.slice(0, 2);
    
    // Add at least one medium priority to ensure broad coverage
    const shouldInclude = mediumPriorityPlotlines.slice(0, 1);
    
    // If we still don't have enough, add more from available plotlines
    const currentSelection = [...mustInclude, ...shouldInclude];
    if (currentSelection.length < maxPlotlines) {
      const remaining = plotlineActivity
        .filter(p => !currentSelection.includes(p))
        .slice(0, maxPlotlines - currentSelection.length);
      currentSelection.push(...remaining);
    }
    
    return currentSelection;
  }
  
  // For fewer plotlines, try to include all urgent ones
  if (urgentPlotlines.length > maxPlotlines) {
    return urgentPlotlines.slice(0, maxPlotlines);
  }
  
  // Fill remaining slots with next highest priority plotlines
  const remainingSlots = maxPlotlines - urgentPlotlines.length;
  const additionalPlotlines = plotlineActivity
    .filter(p => p.urgencyScore <= 50)
    .slice(0, remainingSlots);
  
  return [...urgentPlotlines, ...additionalPlotlines];
}

/**
 * Analyzes plotline distribution across recent chapters
 * @param novelId - The ID of the novel
 * @param chapterCount - Number of recent chapters to analyze (default 5)
 * @returns Analysis of plotline development distribution
 */
export async function analyzePlotlineDistribution(novelId: string, chapterCount: number = 5) {
  const recentDevelopments = await prisma.plotlineDevelopment.findMany({
    where: {
      plotline: { novelId },
      chapter: {
        novelId,
        number: { gte: (await getLatestChapterNumber(novelId)) - chapterCount + 1 }
      }
    },
    include: {
      plotline: {
        select: { id: true, name: true, priority: true }
      },
      chapter: {
        select: { number: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Group developments by plotline
  const plotlineDevCounts = recentDevelopments.reduce((acc, dev) => {
    const plotlineId = dev.plotline.id;
    if (!acc[plotlineId]) {
      acc[plotlineId] = {
        plotlineName: dev.plotline.name,
        priority: dev.plotline.priority,
        developmentCount: 0,
        chapters: new Set()
      };
    }
    acc[plotlineId].developmentCount++;
    acc[plotlineId].chapters.add(dev.chapter.number);
    return acc;
  }, {} as Record<string, { plotlineName: string; priority: number; developmentCount: number; chapters: Set<number> }>);

  // Convert to array and calculate metrics
  const distribution = Object.entries(plotlineDevCounts).map(([plotlineId, data]) => ({
    plotlineId,
    plotlineName: data.plotlineName,
    priority: data.priority,
    developmentCount: data.developmentCount,
    chaptersActive: data.chapters.size,
    developmentDensity: data.developmentCount / chapterCount,
    activeRatio: data.chapters.size / chapterCount
  }));

  // Calculate balance metrics
  const totalDevelopments = recentDevelopments.length;
  const averageDevsPerPlotline = totalDevelopments / Math.max(distribution.length, 1);
  
  const imbalanceScore = distribution.reduce((score, plot) => {
    const deviation = Math.abs(plot.developmentCount - averageDevsPerPlotline);
    return score + deviation;
  }, 0) / Math.max(distribution.length, 1);

  return {
    totalPlotlines: distribution.length,
    totalDevelopments,
    averageDevsPerPlotline,
    imbalanceScore,
    isBalanced: imbalanceScore < averageDevsPerPlotline * 0.5,
    plotlineDistribution: distribution.sort((a, b) => b.developmentCount - a.developmentCount),
    recommendations: generateBalanceRecommendations(distribution, averageDevsPerPlotline)
  };
}

/**
 * Generates recommendations for better plotline balance
 */
function generateBalanceRecommendations(
  distribution: Array<{ plotlineName: string; priority: number; developmentCount: number; activeRatio: number }>,
  average: number
): string[] {
  const recommendations: string[] = [];
  
  const underdeveloped = distribution.filter(p => p.developmentCount < average * 0.7);
  const overdeveloped = distribution.filter(p => p.developmentCount > average * 1.5);
  
  if (underdeveloped.length > 0) {
    recommendations.push(`Focus more on underdeveloped plotlines: ${underdeveloped.map(p => p.plotlineName).join(', ')}`);
  }
  
  if (overdeveloped.length > 0) {
    recommendations.push(`Consider reducing focus on overdeveloped plotlines: ${overdeveloped.map(p => p.plotlineName).join(', ')}`);
  }
  
  const lowActivity = distribution.filter(p => p.activeRatio < 0.3);
  if (lowActivity.length > 0) {
    recommendations.push(`These plotlines need more frequent mentions: ${lowActivity.map(p => p.plotlineName).join(', ')}`);
  }
  
  return recommendations;
}

/**
 * Helper function to get the latest chapter number for a novel
 */
async function getLatestChapterNumber(novelId: string): Promise<number> {
  const latestChapter = await prisma.chapter.findFirst({
    where: { novelId },
    orderBy: { number: 'desc' },
    select: { number: true }
  });
  
  return latestChapter?.number || 0;
} 