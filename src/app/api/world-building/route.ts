import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createWorldBuildingSchema = z.object({
  novelId: z.string(),
  magicSystem: z.string().optional(),
  locations: z.string().optional(),
  cultures: z.string().optional(),
  timeline: z.string().optional(),
  rules: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createWorldBuildingSchema.parse(body);

    // Check if novel exists
    const novel = await prisma.novel.findUnique({
      where: { id: validatedData.novelId }
    });

    if (!novel) {
      return NextResponse.json(
        { success: false, error: 'Novel not found' },
        { status: 404 }
      );
    }

    // Check if world building already exists for this novel
    const existingWorldBuilding = await prisma.worldBuilding.findUnique({
      where: { novelId: validatedData.novelId }
    });

    let worldBuilding;
    if (existingWorldBuilding) {
      // Update existing world building
      worldBuilding = await prisma.worldBuilding.update({
        where: { novelId: validatedData.novelId },
        data: {
          magicSystem: validatedData.magicSystem,
          locations: validatedData.locations,
          cultures: validatedData.cultures,
          timeline: validatedData.timeline,
          rules: validatedData.rules,
        }
      });
    } else {
      // Create new world building
      worldBuilding = await prisma.worldBuilding.create({
        data: {
          novelId: validatedData.novelId,
          magicSystem: validatedData.magicSystem,
          locations: validatedData.locations,
          cultures: validatedData.cultures,
          timeline: validatedData.timeline,
          rules: validatedData.rules,
        }
      });
    }

    return NextResponse.json({
      success: true,
      worldBuilding
    });

  } catch (error) {
    console.error('World building creation/update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'World building operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const novelId = searchParams.get('novelId');

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: 'Novel ID is required' },
        { status: 400 }
      );
    }

    const worldBuilding = await prisma.worldBuilding.findUnique({
      where: { novelId }
    });

    return NextResponse.json({
      success: true,
      worldBuilding
    });

  } catch (error) {
    console.error('World building fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch world building' },
      { status: 500 }
    );
  }
} 