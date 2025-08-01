import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createPlotlineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  status: z.enum(['PLANNED', 'INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING', 'RESOLVED', 'ABANDONED']).default('PLANNED'),
  priority: z.number().min(1).max(5).default(1),
  novelId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPlotlineSchema.parse(body);

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

    // Check if plotline name already exists in this novel
    const existingPlotline = await prisma.plotline.findFirst({
      where: {
        name: validatedData.name,
        novelId: validatedData.novelId
      }
    });

    if (existingPlotline) {
      return NextResponse.json(
        { success: false, error: 'Plotline with this name already exists in this novel' },
        { status: 400 }
      );
    }

    // Create plotline
    const plotline = await prisma.plotline.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        status: validatedData.status,
        priority: validatedData.priority,
        novelId: validatedData.novelId,
      }
    });

    return NextResponse.json({
      success: true,
      plotline
    });

  } catch (error) {
    console.error('Plotline creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Plotline creation failed' },
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

    const plotlines = await prisma.plotline.findMany({
      where: { novelId },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }]
    });

    return NextResponse.json({
      success: true,
      plotlines
    });

  } catch (error) {
    console.error('Plotlines fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plotlines' },
      { status: 500 }
    );
  }
} 