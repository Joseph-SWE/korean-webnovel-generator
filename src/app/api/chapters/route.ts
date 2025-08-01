import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createChapterSchema = z.object({
  title: z.string().min(1).max(80),
  content: z.string().default(''),
  novelId: z.string(),
  cliffhanger: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createChapterSchema.parse(body);

    // Check if novel exists
    const novel = await prisma.novel.findUnique({
      where: { id: validatedData.novelId },
      include: {
        chapters: {
          orderBy: { number: 'desc' },
          take: 1
        }
      }
    });

    if (!novel) {
      return NextResponse.json(
        { success: false, error: 'Novel not found' },
        { status: 404 }
      );
    }

    // Determine the next chapter number
    const nextNumber = novel.chapters.length > 0 ? novel.chapters[0].number + 1 : 1;

    // Count words in content
    const wordCount = validatedData.content.trim() ? validatedData.content.split(/\s+/).length : 0;

    // Create chapter
    const chapter = await prisma.chapter.create({
      data: {
        number: nextNumber,
        title: validatedData.title,
        content: validatedData.content,
        wordCount,
        cliffhanger: validatedData.cliffhanger,
        novelId: validatedData.novelId,
        additionalData: JSON.stringify({}) // Initialize with empty object instead of null
      }
    });

    return NextResponse.json({
      success: true,
      chapter
    });

  } catch (error) {
    console.error('Chapter creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Chapter creation failed' },
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

    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { number: 'asc' }
    });

    return NextResponse.json({
      success: true,
      chapters
    });

  } catch (error) {
    console.error('Chapters fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
} 