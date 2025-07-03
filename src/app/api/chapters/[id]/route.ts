import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AdditionalData, EventType } from '@/types';
import { Prisma } from '@prisma/client';
import { updatePlotlineStatus } from '@/lib/plotline-evolution';

// Validation schema for chapter updates
const updateChapterSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  cliffhanger: z.string().optional(),
  summary: z.string().optional(),
  additionalData: z.object({
    charactersInvolved: z.array(z.object({
      name: z.string(),
      role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
      developmentNote: z.string().optional(),
    })).optional(),
    plotlineDevelopment: z.array(z.object({
      plotlineName: z.string(),
      developmentType: z.enum(['introduction', 'advancement', 'complication', 'resolution']),
      description: z.string(),
    })).optional(),
    chapterEvents: z.array(z.object({
      eventType: z.enum(['CHARACTER_INTRODUCTION', 'PLOT_ADVANCEMENT', 'ROMANCE_DEVELOPMENT', 'CONFLICT_ESCALATION', 'REVELATION', 'CLIFFHANGER', 'CLIFFHANGER_RESOLUTION', 'CHARACTER_DEVELOPMENT', 'WORLD_BUILDING', 'DIALOGUE_SCENE', 'ACTION_SCENE', 'FLASHBACK', 'FORESHADOWING', 'TWIST', 'RESOLUTION']),
      description: z.string(),
      characterName: z.string().optional(),
      plotlineName: z.string().optional(),
    })).optional(),
    cliffhanger: z.string().optional(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            genre: true,
            setting: true,
            author: {
              select: {
                username: true
              }
            }
          }
        },
        events: {
          include: {
            character: {
              select: {
                name: true
              }
            },
            plotline: {
              select: {
                name: true
              }
            }
          }
        },
        characterUsages: {
          include: {
            character: {
              select: {
                name: true
              }
            }
          }
        },
        plotlineDevelopments: {
          include: {
            plotline: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Parse additional data if it exists
    let additionalData: AdditionalData = {};
    if (chapter.additionalData) {
      try {
        additionalData = JSON.parse(chapter.additionalData);
      } catch (error) {
        console.warn('Failed to parse additional data:', error);
      }
    }

    return NextResponse.json({
      success: true,
      chapter: {
        ...chapter,
        additionalData,
        characterUsages: chapter.characterUsages,
        plotlineDevelopments: chapter.plotlineDevelopments,
        events: chapter.events
      }
    });

  } catch (error) {
    console.error('Chapter fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate request data
    const validatedData = updateChapterSchema.parse(body);

    // Check if chapter exists and get novel data
    const existingChapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: {
          include: {
            characters: true,
            plotlines: true
          }
        },
        characterUsages: true,
        plotlineDevelopments: true,
        events: true
      }
    });

    if (!existingChapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Calculate word count if content is provided
    let wordCount = existingChapter.wordCount;
    if (validatedData.content) {
      wordCount = validatedData.content.trim().split(/\s+/).filter(Boolean).length;
    }

    // Prepare chapter update data
    const chapterUpdateData: {
      wordCount: number;
      title?: string;
      content?: string;
      cliffhanger?: string | null;
      summary?: string;
      additionalData?: string;
    } = {
      wordCount,
    };

    if (validatedData.title) chapterUpdateData.title = validatedData.title;
    if (validatedData.content) chapterUpdateData.content = validatedData.content;
    if (validatedData.cliffhanger !== undefined) chapterUpdateData.cliffhanger = validatedData.cliffhanger;
    if (validatedData.summary) chapterUpdateData.summary = validatedData.summary;
    if (validatedData.additionalData) {
      chapterUpdateData.additionalData = JSON.stringify(validatedData.additionalData);
    }

    // Use transaction to update all related data
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update the chapter
      const updatedChapter = await tx.chapter.update({
        where: { id },
        data: chapterUpdateData,
        include: {
          novel: {
            select: {
              title: true,
              characters: true,
              plotlines: true
            }
          }
        }
      });

      // If additional data is provided, update related tables
      if (validatedData.additionalData) {
        // Clear existing related data
        await tx.characterUsage.deleteMany({
          where: { chapterId: id }
        });
        await tx.plotlineDevelopment.deleteMany({
          where: { chapterId: id }
        });
        await tx.chapterEvent.deleteMany({
          where: { chapterId: id }
        });

        // Add new character usage data
        if (validatedData.additionalData.charactersInvolved) {
          for (const charData of validatedData.additionalData.charactersInvolved) {
            const character = updatedChapter.novel.characters.find((c: { name: string; id: string }) => c.name === charData.name);
            if (character) {
              await tx.characterUsage.create({
                data: {
                  chapterId: id,
                  characterId: character.id,
                  role: charData.role,
                  developmentNotes: charData.developmentNote || '',
                },
              });
            }
          }
        }

        // Add new plotline development data
        if (validatedData.additionalData.plotlineDevelopment) {
          for (const plotData of validatedData.additionalData.plotlineDevelopment) {
            const plotline = updatedChapter.novel.plotlines.find((p: { name: string; id: string }) => p.name === plotData.plotlineName);
            if (plotline) {
              await tx.plotlineDevelopment.create({
                data: {
                  chapterId: id,
                  plotlineId: plotline.id,
                  developmentType: plotData.developmentType,
                  description: plotData.description,
                },
              });
            }
          }
        }

        // Add new chapter events
        if (validatedData.additionalData.chapterEvents) {
          for (const eventData of validatedData.additionalData.chapterEvents) {
            let characterId: string | undefined = undefined;
            if (eventData.characterName) {
                             const char = updatedChapter.novel.characters.find((c: { name: string; id: string }) => c.name === eventData.characterName);
              if (char) characterId = char.id;
            }

            let plotlineId: string | undefined = undefined;
            if (eventData.plotlineName) {
                             const plot = updatedChapter.novel.plotlines.find((p: { name: string; id: string }) => p.name === eventData.plotlineName);
              if (plot) plotlineId = plot.id;
            }

            await tx.chapterEvent.create({
              data: {
                chapterId: id,
                eventType: eventData.eventType as EventType,
                description: eventData.description,
                characterId: characterId,
                plotlineId: plotlineId,
                importance: 1, // Default importance
              },
            });
          }
        }
      }

      return updatedChapter;
    });

    // Update plotline statuses after transaction completes
    if (validatedData.additionalData?.plotlineDevelopment) {
      for (const plotData of validatedData.additionalData.plotlineDevelopment) {
        const plotline = result.novel.plotlines.find((p: { name: string; id: string }) => p.name === plotData.plotlineName);
        if (plotline) {
          await updatePlotlineStatus(plotline.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      chapter: result,
      message: 'Chapter updated successfully'
    });

  } catch (error) {
    console.error('Chapter update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update chapter' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if chapter exists
    const existingChapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: {
          select: {
            title: true
          }
        }
      }
    });

    if (!existingChapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Use transaction to delete all related data
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete related data in correct order (children first)
      await tx.characterUsage.deleteMany({
        where: { chapterId: id }
      });
      
      await tx.plotlineDevelopment.deleteMany({
        where: { chapterId: id }
      });
      
      await tx.chapterEvent.deleteMany({
        where: { chapterId: id }
      });

      // Finally delete the chapter
      await tx.chapter.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Chapter and all related data deleted successfully'
    });

  } catch (error) {
    console.error('Chapter deletion error:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
} 