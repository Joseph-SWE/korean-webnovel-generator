import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            username: true,
            email: true
          }
        },
        chapters: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            wordCount: true,
            createdAt: true,
            cliffhanger: true
          }
        },
        characters: {
          select: {
            id: true,
            name: true,
            description: true,
            personality: true,
            background: true
          }
        },
        plotlines: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            priority: true
          }
        },
        worldBuilding: {
          select: {
            id: true,
            magicSystem: true,
            locations: true,
            cultures: true,
            timeline: true,
            rules: true
          }
        },
        _count: {
          select: {
            chapters: true,
            characters: true,
            plotlines: true
          }
        }
      }
    });

    if (!novel) {
      return NextResponse.json(
        { success: false, error: 'Novel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      novel
    });

  } catch (error) {
    console.error('Novel fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch novel' },
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

    const novel = await prisma.novel.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description
      },
      include: {
        author: {
          select: {
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            chapters: true,
            characters: true,
            plotlines: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      novel
    });

  } catch (error) {
    console.error('Novel update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update novel' },
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

    await prisma.novel.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Novel deleted successfully'
    });

  } catch (error) {
    console.error('Novel deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete novel' },
      { status: 500 }
    );
  }
} 