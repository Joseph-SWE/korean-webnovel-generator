/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateNovelResponse, CreatedCharacter, CreatedPlotline, CreatedWorldBuilding } from '@/types';
import { z } from 'zod';

const createNovelSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  genre: z.enum(['ROMANCE', 'FANTASY', 'MARTIAL_ARTS', 'MODERN_URBAN', 'HISTORICAL', 'ISEKAI', 'REGRESSION', 'VILLAINESS', 'SYSTEM']),
  setting: z.enum(['MODERN_KOREA', 'HISTORICAL_KOREA', 'FANTASY_WORLD', 'MURIM_WORLD', 'ISEKAI_WORLD', 'ROYAL_COURT', 'SCHOOL_OFFICE', 'POST_APOCALYPTIC']),
  authorId: z.string(),
  createFromPlan: z.boolean().optional(),
  novelPlan: z.object({
    title: z.string().max(100),
    synopsis: z.string().max(2000),
    characters: z.array(z.object({
      name: z.string().max(50),
      age: z.number().optional(),
      appearance: z.string().max(500).optional(),
      personality: z.string().max(800),
      background: z.string().max(1000),
      motivation: z.string().max(500).optional(),
      role: z.string().max(50),
    })).optional(),
    plotOutline: z.array(z.object({
      name: z.string().max(100),
      description: z.string().max(800),
      order: z.number(),
      type: z.enum(['beginning', 'development', 'climax', 'resolution']),
    })).optional(),
    worldBuilding: z.object({
      locations: z.array(z.string().max(100)).optional(),
      magicSystem: z.string().max(1000).optional(),
      socialStructure: z.string().max(800).optional(),
      importantRules: z.array(z.string().max(200)).optional(),
    }).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createNovelSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.authorId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Create novel
    const novel = await prisma.novel.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        genre: validatedData.genre,
        setting: validatedData.setting,
        authorId: validatedData.authorId,
      },
    });

    // If creating from plan, create related entities and track them
    let tracking = undefined;
    if (validatedData.createFromPlan && validatedData.novelPlan) {
      const trackingData = await createNovelEntitiesFromPlan(novel.id, validatedData.novelPlan);
      tracking = trackingData;
    }

    const response: CreateNovelResponse = {
      success: true,
      novel: {
        id: novel.id,
        title: novel.title,
        description: novel.description || undefined,
        genre: novel.genre,
        setting: novel.setting,
      },
      tracking,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Novel creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Novel creation failed' },
      { status: 500 }
    );
  }
}

// Helper function to create novel entities from generated plan
async function createNovelEntitiesFromPlan(
  novelId: string,
  novelPlan: any
): Promise<{
  charactersCreated: CreatedCharacter[];
  plotlinesCreated: CreatedPlotline[];
  worldBuildingCreated: CreatedWorldBuilding[];
  totalElements: number;
}> {
  const charactersCreated: CreatedCharacter[] = [];
  const plotlinesCreated: CreatedPlotline[] = [];
  const worldBuildingCreated: CreatedWorldBuilding[] = [];

  // Create characters from plan
  if (novelPlan.characters && Array.isArray(novelPlan.characters)) {
    for (const characterPlan of novelPlan.characters) {
      try {
        const character = await prisma.character.create({
          data: {
            name: characterPlan.name,
            description: characterPlan.appearance || `A ${characterPlan.role.toLowerCase()} character`,
            personality: characterPlan.personality,
            background: characterPlan.background,
            relationships: JSON.stringify({}), // Initialize empty relationships
            novelId: novelId,
          },
        });

        charactersCreated.push({
          id: character.id,
          name: character.name,
          role: characterPlan.role,
          description: character.description,
          personality: character.personality,
          background: character.background,
        });
      } catch (error) {
        console.error('Error creating character:', characterPlan.name, error);
      }
    }
  }

  // Create plotlines from plan
  if (novelPlan.plotOutline && Array.isArray(novelPlan.plotOutline)) {
    for (const plotPoint of novelPlan.plotOutline) {
      try {
        // Determine status based on plot type
        let status: 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED' = 'PLANNED';
        if (plotPoint.type === 'beginning') {
          status = 'INTRODUCED';
        }

        const plotline = await prisma.plotline.create({
          data: {
            name: plotPoint.name,
            description: plotPoint.description,
            status: status,
            priority: plotPoint.order,
            novelId: novelId,
          },
        });

        plotlinesCreated.push({
          id: plotline.id,
          name: plotline.name,
          description: plotline.description,
          status: plotline.status,
          priority: plotline.priority,
          type: plotPoint.type,
        });
      } catch (error) {
        console.error('Error creating plotline:', plotPoint.name, error);
      }
    }
  }

  // Create world building from plan
  if (novelPlan.worldBuilding) {
    try {
      const worldBuildingData = novelPlan.worldBuilding;
      const elementsCreated: string[] = [];
      
      let magicSystem = '';
      let locations = '';
      let cultures = '';
      const timeline = '';
      let rules = '';

      if (worldBuildingData.magicSystem) {
        magicSystem = worldBuildingData.magicSystem;
        elementsCreated.push('Magic System');
      }

      if (worldBuildingData.locations && Array.isArray(worldBuildingData.locations)) {
        locations = JSON.stringify(worldBuildingData.locations);
        elementsCreated.push('Locations');
      }

      if (worldBuildingData.socialStructure) {
        cultures = worldBuildingData.socialStructure;
        elementsCreated.push('Social Structure');
      }

      if (worldBuildingData.importantRules && Array.isArray(worldBuildingData.importantRules)) {
        rules = JSON.stringify(worldBuildingData.importantRules);
        elementsCreated.push('Important Rules');
      }

      if (elementsCreated.length > 0) {
        const worldBuilding = await prisma.worldBuilding.create({
          data: {
            novelId: novelId,
            magicSystem: magicSystem || null,
            locations: locations || null,
            cultures: cultures || null,
            timeline: timeline || null,
            rules: rules || null,
          },
        });

        worldBuildingCreated.push({
          id: worldBuilding.id,
          elementsCreated,
          magicSystemCreated: !!magicSystem,
          locationsCreated: !!locations,
          culturesCreated: !!cultures,
          timelineCreated: !!timeline,
          rulesCreated: !!rules,
        });
      }
    } catch (error) {
      console.error('Error creating world building:', error);
    }
  }

  return {
    charactersCreated,
    plotlinesCreated,
    worldBuildingCreated,
    totalElements: charactersCreated.length + plotlinesCreated.length + worldBuildingCreated.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authorId = searchParams.get('authorId');

    if (!authorId) {
      return NextResponse.json(
        { success: false, error: 'Author ID is required' },
        { status: 400 }
      );
    }

    const novels = await prisma.novel.findMany({
      where: { authorId },
      include: {
        author: {
          select: {
            username: true
          }
        },
        _count: {
          select: {
            chapters: true,
            characters: true,
            plotlines: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      novels
    });

  } catch (error) {
    console.error('Novels fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch novels' },
      { status: 500 }
    );
  }
} 