import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateWithRetry } from '@/lib/gemini';
import { CONSISTENCY_CHECK_PROMPT } from '@/lib/prompts';
import { ConsistencyManager } from '@/lib/consistency';
import { z } from 'zod';

// Types for database objects with includes
interface ChapterWithNovel {
  id: string;
  content: string;
  novel: {
    characters: Array<{ id: string; name: string; personality: string; description: string }>;
    worldBuilding: { rules: string | null } | null;
    plotlines: Array<{ id: string; name: string; description: string; status: string }>;
  };
}

interface NovelWithIncludes {
  id: string;
  title: string;
  genre: string;
  chapters: Array<{ id: string; content: string; number: number }>;
  characters: Array<{ id: string; name: string; personality: string }>;
  worldBuilding: { rules: string | null } | null;
  plotlines: Array<{ id: string; name: string; description: string; status: string }>;
}

interface ChapterEventWithIncludes {
  eventType: string;
  description: string;
  character?: { name: string } | null;
  plotline?: { name: string } | null;
}

const consistencyCheckSchema = z.object({
  chapterId: z.string().optional(),
  novelId: z.string().optional(),
  useAI: z.boolean().default(false),
}).refine(
  (data) => data.chapterId || data.novelId,
  {
    message: "Either chapterId or novelId must be provided",
    path: ["chapterId", "novelId"],
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, novelId, useAI } = consistencyCheckSchema.parse(body);

    const consistencyManager = new ConsistencyManager();

    if (chapterId) {
      // Check single chapter consistency
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
          novel: {
            include: {
              characters: true,
              worldBuilding: true,
              plotlines: true
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

      // Automated consistency check
      const automatedCheck = await consistencyManager.checkChapterConsistency(chapterId);

      let aiAnalysis = null;
      if (useAI) {
        // AI-powered consistency analysis
        aiAnalysis = await performAIConsistencyCheck(chapter);
      }

      return NextResponse.json({
        success: true,
        chapterConsistency: {
          automated: automatedCheck,
          ai: aiAnalysis,
          summary: {
            totalIssues: automatedCheck.issues.length + (aiAnalysis?.issues?.length || 0),
            hasIssues: automatedCheck.hasIssues || (aiAnalysis?.hasIssues || false),
            recommendations: [
              ...automatedCheck.issues.filter(i => i.suggestion).map(i => i.suggestion!),
              ...(aiAnalysis?.recommendations || [])
            ]
          }
        }
      });

    } else if (novelId) {
      // Check entire novel consistency
      const report = await consistencyManager.generateConsistencyReport(novelId);

      // Get novel details for AI analysis if requested
      let novelAIAnalysis = null;
      if (useAI) {
        const novel = await prisma.novel.findUnique({
          where: { id: novelId },
          include: {
            chapters: { orderBy: { number: 'asc' } },
            characters: true,
            worldBuilding: true,
            plotlines: true
          }
        });

        if (novel) {
          novelAIAnalysis = await performNovelAIConsistencyCheck(novel);
        }
      }

      return NextResponse.json({
        success: true,
        novelConsistency: {
          automated: report,
          ai: novelAIAnalysis,
          summary: {
            overallScore: report.overallConsistency,
            totalIssues: Object.values(report.issuesSummary).reduce((a, b) => a + b, 0),
            recommendations: report.recommendations,
            aiInsights: novelAIAnalysis?.insights || []
          }
        }
      });
    }

  } catch (error) {
    console.error('Consistency check error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Consistency check failed' },
      { status: 500 }
    );
  }
}

async function performAIConsistencyCheck(chapter: ChapterWithNovel) {
  try {
    const prompt = CONSISTENCY_CHECK_PROMPT
      .replace('[CHAPTER_CONTENT]', chapter.content)
      .replace('[CHARACTER_PROFILES]', 
        chapter.novel.characters.map(c => 
          `${c.name}: ${c.personality} - ${c.description}`
        ).join('\n')
      )
      .replace('[WORLD_RULES]', 
        chapter.novel.worldBuilding?.rules || 'No specific world rules defined'
      )
      .replace('[PREVIOUS_EVENTS]', 
        // Get recent events from database
        await getRecentEventsForChapter(chapter.id)
      );

    const aiResponse = await generateWithRetry(prompt, 2, false);
    
    // Parse AI response (this is simplified - in production you'd want more robust parsing)
    const hasIssues = aiResponse.includes('일관성 문제') || aiResponse.includes('문제가 발견');
    const recommendations = extractRecommendations(aiResponse);
    const issues = extractIssues(aiResponse);

    return {
      hasIssues,
      issues,
      recommendations,
      fullAnalysis: aiResponse
    };

  } catch (error) {
    console.error('AI consistency check failed:', error);
    return {
      hasIssues: false,
      issues: [],
      recommendations: [],
      fullAnalysis: 'AI analysis failed',
      error: (error instanceof Error ? error.message : String(error)) || 'AI analysis unavailable'
    };
  }
}

async function performNovelAIConsistencyCheck(novel: NovelWithIncludes) {
  try {
    // Analyze overall novel consistency patterns
    const recentChapters = novel.chapters.slice(-5); // Last 5 chapters
    const combinedContent = recentChapters.map(c => c.content).join('\n\n');

    const prompt = `
한국 웹소설 "${novel.title}" 전체 일관성을 분석해주세요.

**장르**: ${novel.genre}
**최근 5개 장 내용**:
${combinedContent.substring(0, 3000)}...

**등장인물**:
${novel.characters.map(c => `${c.name}: ${c.personality}`).join('\n')}

**주요 플롯라인**:
${novel.plotlines.map(p => `${p.name}: ${p.description} (${p.status})`).join('\n')}

다음 관점에서 분석해주세요:
1. 전체적인 스토리 일관성
2. 캐릭터 발전의 논리성
3. 세계관 설정의 일관성
4. 한국 웹소설 장르 특성 부합도
5. 개선 제안사항

분석 결과를 구체적으로 제시해주세요.
    `;

    const aiResponse = await generateWithRetry(prompt, 2, false);
    
    return {
      insights: extractInsights(aiResponse),
      recommendations: extractRecommendations(aiResponse),
      fullAnalysis: aiResponse
    };

  } catch (error) {
    console.error('Novel AI consistency check failed:', error);
    return {
      insights: [],
      recommendations: [],
      fullAnalysis: 'AI analysis failed',
      error: 'AI analysis unavailable'
    };
  }
}

async function getRecentEventsForChapter(chapterId: string): Promise<string> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { novelId: true, number: true }
  });

  if (!chapter) return 'No previous events found';

  const recentEvents = await prisma.chapterEvent.findMany({
    where: { 
      chapter: { 
        novelId: chapter.novelId,
        number: { lte: chapter.number }
      }
    },
    orderBy: { chapter: { number: 'desc' } },
    take: 10,
    include: {
      character: { select: { name: true } },
      plotline: { select: { name: true } }
    }
  });

  return recentEvents.map((event: ChapterEventWithIncludes) => 
    `${event.eventType}: ${event.description} ${
      event.character ? `(${event.character.name})` : ''
    }`
  ).join('\n');
}

function extractRecommendations(aiResponse: string): string[] {
  const lines = aiResponse.split('\n');
  const recommendations: string[] = [];
  
  let inRecommendationSection = false;
  for (const line of lines) {
    if (line.includes('제안') || line.includes('권장') || line.includes('개선')) {
      inRecommendationSection = true;
      continue;
    }
    
    if (inRecommendationSection && line.trim().startsWith('-')) {
      recommendations.push(line.trim().substring(1).trim());
    }
  }
  
  return recommendations;
}

function extractIssues(aiResponse: string): Array<{type: string, description: string, severity: string}> {
  const issues: Array<{type: string, description: string, severity: string}> = [];
  const lines = aiResponse.split('\n');
  
  for (const line of lines) {
    if (line.includes('문제') || line.includes('오류') || line.includes('불일치')) {
      issues.push({
        type: 'ai-detected',
        description: line.trim(),
        severity: 'medium'
      });
    }
  }
  
  return issues;
}

function extractInsights(aiResponse: string): string[] {
  const lines = aiResponse.split('\n');
  const insights: string[] = [];
  
  for (const line of lines) {
    if (line.includes('분석') || line.includes('평가') || line.includes('특징')) {
      insights.push(line.trim());
    }
  }
  
  return insights.slice(0, 5); // Top 5 insights
} 