import { NextRequest, NextResponse } from 'next/server';
import { AutoEvolutionService } from '@/lib/auto-evolution';
import { z } from 'zod';

const evolutionSchema = z.object({
  type: z.enum(['character', 'plotline', 'novel', 'chapter']),
  targetId: z.string(),
  options: z.object({
    forceEvolution: z.boolean().optional().default(false),
    includeAI: z.boolean().optional().default(true),
  }).optional().default({})
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, targetId } = evolutionSchema.parse(body);

    const autoEvolutionService = new AutoEvolutionService();
    
    switch (type) {
      case 'character': {
        const result = await autoEvolutionService.evolveCharacterData(targetId);
        return NextResponse.json({
          success: true,
          type: 'character',
          result: {
            characterId: targetId,
            updated: result.updated,
            changes: result.changes
          }
        });
      }

      case 'plotline': {
        const result = await autoEvolutionService.advancePlotlineStatus(targetId);
        return NextResponse.json({
          success: true,
          type: 'plotline',
          result: {
            plotlineId: targetId,
            updated: result.updated,
            oldStatus: result.oldStatus,
            newStatus: result.newStatus
          }
        });
      }

      case 'chapter': {
        const result = await autoEvolutionService.performPostChapterEvolution(targetId);
        return NextResponse.json({
          success: true,
          type: 'chapter',
          result: {
            chapterId: targetId,
            evolution: result
          }
        });
      }

      case 'novel': {
        // For novel-wide evolution, we need to get all chapters and run evolution on the latest ones
        const { prisma } = await import('@/lib/db');
        const novel = await prisma.novel.findUnique({
          where: { id: targetId },
          include: {
            chapters: {
              orderBy: { number: 'desc' },
              take: 3 // Evolution for last 3 chapters
            }
          }
        });

        if (!novel) {
          return NextResponse.json(
            { success: false, error: 'Novel not found' },
            { status: 404 }
          );
        }

        const evolutionResults = [];
        for (const chapter of novel.chapters) {
          const result = await autoEvolutionService.performPostChapterEvolution(chapter.id);
          evolutionResults.push({
            chapterId: chapter.id,
            chapterNumber: chapter.number,
            evolution: result
          });
        }

        return NextResponse.json({
          success: true,
          type: 'novel',
          result: {
            novelId: targetId,
            chaptersProcessed: evolutionResults.length,
            evolution: evolutionResults
          }
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid evolution type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Evolution error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Evolution failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const novelId = searchParams.get('novelId');
    const type = searchParams.get('type') || 'summary';

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      );
    }

    const { prisma } = await import('@/lib/db');
    
    if (type === 'summary') {
      // Return evolution summary for the novel
      const novel = await prisma.novel.findUnique({
        where: { id: novelId },
        include: {
          characters: {
            include: {
              usages: {
                where: {
                  developmentNotes: {
                    not: null
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 1
              }
            }
          },
          plotlines: {
            include: {
              developments: {
                orderBy: {
                  createdAt: 'desc'
                },
                take: 1
              }
            }
          },
          chapters: {
            orderBy: { number: 'desc' },
            take: 5
          }
        }
      });

      if (!novel) {
        return NextResponse.json(
          { success: false, error: 'Novel not found' },
          { status: 404 }
        );
      }

      type CharacterWithUsages = {
        id: string;
        name: string;
        usages: Array<{ developmentNotes: string | null }>;
      };
      
      type PlotlineWithDevelopments = {
        id: string;
        name: string;
        status: string;
        developments: Array<{ description: string }>;
      };
      
      type ChapterBasic = {
        id: string;
        number: number;
        title: string;
        wordCount: number;
      };

      const evolutionSummary = {
        charactersWithDevelopment: novel.characters.filter((c: CharacterWithUsages) => c.usages.length > 0).map((c: CharacterWithUsages) => ({
          id: c.id,
          name: c.name,
          lastDevelopment: c.usages[0]?.developmentNotes || null,
          totalDevelopments: c.usages.length
        })),
        plotlinesWithDevelopment: novel.plotlines.filter((p: PlotlineWithDevelopments) => p.developments.length > 0).map((p: PlotlineWithDevelopments) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          lastDevelopment: p.developments[0]?.description || null,
          totalDevelopments: p.developments.length
        })),
        recentChapters: novel.chapters.map((c: ChapterBasic) => ({
          id: c.id,
          number: c.number,
          title: c.title,
          wordCount: c.wordCount
        }))
      };

      return NextResponse.json({
        success: true,
        novelId,
        evolutionSummary
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Evolution summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get evolution summary' },
      { status: 500 }
    );
  }
} 