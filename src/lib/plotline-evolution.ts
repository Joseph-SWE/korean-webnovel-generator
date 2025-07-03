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