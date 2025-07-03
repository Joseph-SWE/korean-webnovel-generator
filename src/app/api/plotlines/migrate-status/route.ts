import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateAllPlotlineStatuses } from '@/lib/plotline-evolution';

interface PlotlineWithDevelopments {
  id: string;
  name: string;
  status: string;
  developments: Array<{
    developmentType: string;
    description: string;
    createdAt: Date;
  }>;
}

// Mapping for old status values to new ones
const STATUS_MAPPING = {
  'ACTIVE': 'DEVELOPING',
  'PLANNED': 'PLANNED',
  'RESOLVED': 'RESOLVED',
  'ABANDONED': 'ABANDONED'
} as const;

/**
 * POST /api/plotlines/migrate-status
 * Migrates all plotlines to the new status system
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId');

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting plotline status migration for novel:', novelId);

    // First, handle the enum migration for this novel
    const plotlines = await prisma.plotline.findMany({
      where: { novelId },
      select: { id: true, name: true, status: true }
    });

    console.log(`📊 Found ${plotlines.length} plotlines to migrate`);

    let enumUpdated = 0;
    const enumMigrationResults = [];

    for (const plotline of plotlines) {
      const oldStatus = plotline.status;
      const newStatus = STATUS_MAPPING[oldStatus as keyof typeof STATUS_MAPPING];

      if (newStatus && newStatus !== oldStatus) {
        await prisma.plotline.update({
          where: { id: plotline.id },
          data: { status: newStatus }
        });
        
        enumMigrationResults.push({
          plotlineName: plotline.name,
          oldStatus,
          newStatus
        });
        enumUpdated++;
      }
    }

    // Then, update based on developments using the new function
    const developmentUpdates = await updateAllPlotlineStatuses(novelId);

    const results = {
      success: true,
      summary: {
        totalPlotlines: plotlines.length,
        enumUpdated,
        developmentUpdated: developmentUpdates.length
      },
      enumMigration: enumMigrationResults,
      developmentMigration: developmentUpdates,
      message: 'Plotline status migration completed successfully'
    };

    console.log('🎉 Migration completed:', results.summary);

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/plotlines/migrate-status
 * Preview what changes would be made without actually migrating
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId');

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      );
    }

    // Get all plotlines with their developments
    const plotlines = await prisma.plotline.findMany({
      where: { novelId },
      include: {
        developments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const previewResults = plotlines.map((plotline: PlotlineWithDevelopments) => {
      const currentStatus = plotline.status;
      
      // Check if enum migration is needed
      const enumMigrationNeeded = STATUS_MAPPING[currentStatus as keyof typeof STATUS_MAPPING] !== currentStatus;
      const newEnumStatus = STATUS_MAPPING[currentStatus as keyof typeof STATUS_MAPPING] || currentStatus;
      
      // Determine status based on developments
      const suggestedStatus = determineStatusFromDevelopments(
        plotline.developments.map((d: { developmentType: string }) => d.developmentType)
      );

      return {
        plotlineName: plotline.name,
        currentStatus,
        changes: {
          enumMigration: enumMigrationNeeded ? {
            from: currentStatus,
            to: newEnumStatus
          } : null,
          developmentBasedUpdate: suggestedStatus !== (enumMigrationNeeded ? newEnumStatus : currentStatus) ? {
            from: enumMigrationNeeded ? newEnumStatus : currentStatus,
            to: suggestedStatus
          } : null
        },
        developmentHistory: plotline.developments.map((dev: { developmentType: string; description: string; createdAt: Date }) => ({
          type: dev.developmentType,
          description: dev.description,
          createdAt: dev.createdAt
        }))
      };
    });

    return NextResponse.json({
      success: true,
      novelId,
      totalPlotlines: plotlines.length,
      preview: previewResults,
      summary: {
        needsEnumMigration: previewResults.filter((p: { changes: { enumMigration: unknown } }) => p.changes.enumMigration).length,
        needsDevelopmentUpdate: previewResults.filter((p: { changes: { developmentBasedUpdate: unknown } }) => p.changes.developmentBasedUpdate).length
      }
    });

  } catch (error) {
    console.error('❌ Migration preview failed:', error);
    return NextResponse.json(
      { success: false, error: 'Migration preview failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Determines the plotline status based on development types
 * @param developmentTypes - Array of development types in chronological order (most recent first)
 * @returns The appropriate PlotStatus
 */
function determineStatusFromDevelopments(developmentTypes: string[]): string {
  if (developmentTypes.length === 0) {
    return 'PLANNED';
  }

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