import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createCharacterSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  personality: z.string().min(1).max(800),
  background: z.string().min(1).max(1000),
  relationships: z.string().optional().default('{}'),
  novelId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCharacterSchema.parse(body);

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

    // Check if character name already exists in this novel
    const existingCharacter = await prisma.character.findFirst({
      where: {
        name: validatedData.name,
        novelId: validatedData.novelId
      }
    });

    if (existingCharacter) {
      return NextResponse.json(
        { success: false, error: 'Character with this name already exists in this novel' },
        { status: 400 }
      );
    }

    // Create character
    const character = await prisma.character.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        personality: validatedData.personality,
        background: validatedData.background,
        relationships: validatedData.relationships,
        novelId: validatedData.novelId,
      }
    });

    return NextResponse.json({
      success: true,
      character
    });

  } catch (error) {
    console.error('Character creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Character creation failed' },
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

    const characters = await prisma.character.findMany({
      where: { novelId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      characters
    });

  } catch (error) {
    console.error('Characters fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
} 