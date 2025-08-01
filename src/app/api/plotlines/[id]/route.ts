import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updatePlotlineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  status: z.enum(['PLANNED', 'INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING', 'RESOLVED', 'ABANDONED']).optional(),
  priority: z.number().min(1).max(5).optional(),
});

// GET /api/plotlines/[id] - Get a specific plotline
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const plotlineId = params.id;

    const plotline = await prisma.plotline.findUnique({
      where: { id: plotlineId },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            authorId: true
          }
        },
        events: {
          include: {
            chapter: {
              select: {
                id: true,
                number: true,
                title: true
              }
            }
          }
        }
      }
    });

    if (!plotline) {
      return NextResponse.json(
        { success: false, error: 'Plotline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plotline
    });

  } catch (error) {
    console.error('Plotline fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plotline' },
      { status: 500 }
    );
  }
}

// PUT /api/plotlines/[id] - Update a plotline
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const plotlineId = params.id;
    const body = await request.json();
    const validatedData = updatePlotlineSchema.parse(body);

    // Check if plotline exists
    const existingPlotline = await prisma.plotline.findUnique({
      where: { id: plotlineId },
      include: { novel: true }
    });

    if (!existingPlotline) {
      return NextResponse.json(
        { success: false, error: 'Plotline not found' },
        { status: 404 }
      );
    }

    // Check if name is being updated and if it conflicts with another plotline in the same novel
    if (validatedData.name && validatedData.name !== existingPlotline.name) {
      const nameConflict = await prisma.plotline.findFirst({
        where: {
          name: validatedData.name,
          novelId: existingPlotline.novelId,
          id: { not: plotlineId }
        }
      });

      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'A plotline with this name already exists in this novel' },
          { status: 400 }
        );
      }
    }

    // Update plotline
    const updatedPlotline = await prisma.plotline.update({
      where: { id: plotlineId },
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
      plotline: updatedPlotline,
      message: 'Plotline updated successfully'
    });

  } catch (error) {
    console.error('Plotline update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update plotline' },
      { status: 500 }
    );
  }
}

// DELETE /api/plotlines/[id] - Delete a plotline
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const plotlineId = params.id;

    // Check if plotline exists
    const existingPlotline = await prisma.plotline.findUnique({
      where: { id: plotlineId },
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        },
        events: true
      }
    });

    if (!existingPlotline) {
      return NextResponse.json(
        { success: false, error: 'Plotline not found' },
        { status: 404 }
      );
    }

    // Check if plotline has associated events
    if (existingPlotline.events.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete plotline with associated chapter events. Please resolve or move events first.',
          details: {
            eventCount: existingPlotline.events.length,
            suggestion: 'Consider changing the status to ABANDONED instead of deleting.'
          }
        },
        { status: 400 }
      );
    }

    // Delete plotline
    await prisma.plotline.delete({
      where: { id: plotlineId }
    });

    return NextResponse.json({
      success: true,
      message: 'Plotline deleted successfully',
      deletedPlotline: {
        id: existingPlotline.id,
        name: existingPlotline.name,
        novelTitle: existingPlotline.novel.title
      }
    });

  } catch (error) {
    console.error('Plotline deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete plotline' },
      { status: 500 }
    );
  }
}
