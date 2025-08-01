import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(500).optional(),
  personality: z.string().min(1).max(800).optional(),
  background: z.string().min(1).max(1000).optional(),
  relationships: z.string().optional(),
});

// GET /api/characters/[id] - Get a specific character
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const characterId = params.id;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            authorId: true
          }
        },
        usages: {
          include: {
            chapter: {
              select: {
                id: true,
                number: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        appearances: {
          include: {
            chapter: {
              select: {
                id: true,
                number: true,
                title: true
              }
            }
          },
          orderBy: {
            chapter: {
              number: 'asc'
            }
          }
        }
      }
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      character
    });

  } catch (error) {
    console.error('Character fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch character' },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[id] - Update a character
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const characterId = params.id;
    const body = await request.json();
    const validatedData = updateCharacterSchema.parse(body);

    // Check if character exists
    const existingCharacter = await prisma.character.findUnique({
      where: { id: characterId },
      include: { novel: true }
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    // Check if name is being updated and if it conflicts with another character in the same novel
    if (validatedData.name && validatedData.name !== existingCharacter.name) {
      const nameConflict = await prisma.character.findFirst({
        where: {
          name: validatedData.name,
          novelId: existingCharacter.novelId,
          id: { not: characterId }
        }
      });

      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'A character with this name already exists in this novel' },
          { status: 400 }
        );
      }
    }

    // Update character
    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: validatedData,
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      character: updatedCharacter,
      message: 'Character updated successfully'
    });

  } catch (error) {
    console.error('Character update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update character' },
      { status: 500 }
    );
  }
}

// DELETE /api/characters/[id] - Delete a character
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const characterId = params.id;

    // Check if character exists
    const existingCharacter = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        },
        usages: true,
        appearances: true
      }
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      );
    }

    // Check if character has associated usages or appearances
    const totalReferences = existingCharacter.usages.length + existingCharacter.appearances.length;
    if (totalReferences > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete character with associated chapter references. Please remove character from all chapters first.',
          details: {
            usageCount: existingCharacter.usages.length,
            appearanceCount: existingCharacter.appearances.length,
            totalReferences
          }
        },
        { status: 400 }
      );
    }

    // Delete character
    await prisma.character.delete({
      where: { id: characterId }
    });

    return NextResponse.json({
      success: true,
      message: 'Character deleted successfully',
      deletedCharacter: {
        id: existingCharacter.id,
        name: existingCharacter.name,
        novelTitle: existingCharacter.novel.title
      }
    });

  } catch (error) {
    console.error('Character deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete character' },
      { status: 500 }
    );
  }
} 