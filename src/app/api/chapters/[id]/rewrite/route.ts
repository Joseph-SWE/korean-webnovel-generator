import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { generateWithRetry } from '@/lib/gemini';
import { AdditionalData, EventType } from '@/types';
import { Prisma } from '@prisma/client';
import { updatePlotlineStatus } from '@/lib/plotline-evolution';
import { KOREAN_WEBNOVEL_SYSTEM_PROMPT } from '@/lib/prompts';

const rewriteChapterSchema = z.object({
  rewriteReason: z.string().optional(),
  rewriteInstructions: z.string().optional(),
  targetWordCount: z.number().optional().default(2500),
  maintainPlotPoints: z.boolean().optional().default(true),
  maintainCharacterDevelopment: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = rewriteChapterSchema.parse(body);

    // Get the existing chapter with full context
    const existingChapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: {
          include: {
            characters: true,
            plotlines: {
              where: { status: { in: ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'] } }
            },
            chapters: {
              orderBy: { number: 'asc' },
              include: {
                characterUsages: {
                  include: {
                    character: true
                  }
                },
                plotlineDevelopments: {
                  include: {
                    plotline: true
                  }
                },
                events: true
              }
            },
            worldBuilding: true
          }
        },
        events: {
          include: {
            character: true,
            plotline: true
          }
        },
        characterUsages: {
          include: {
            character: true
          }
        },
        plotlineDevelopments: {
          include: {
            plotline: true
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

    // Get previous and next chapters for context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previousChapter = existingChapter.novel.chapters.find((c: any) => c.number === existingChapter.number - 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextChapter = existingChapter.novel.chapters.find((c: any) => c.number === existingChapter.number + 1);

    // Build context for the rewrite
    const rewriteContext = {
      originalChapter: {
        title: existingChapter.title,
        content: existingChapter.content,
        wordCount: existingChapter.wordCount,
        events: existingChapter.events,
        characterUsages: existingChapter.characterUsages,
        plotlineDevelopments: existingChapter.plotlineDevelopments
      },
      rewriteReason: validatedData.rewriteReason || 'User requested rewrite for improvement',
      rewriteInstructions: validatedData.rewriteInstructions || 'Improve the chapter while maintaining core plot points and character development',
      previousChapterSummary: previousChapter?.content ? previousChapter.content.substring(0, 500) + '...' : '',
      nextChapterExpectations: nextChapter ? `Next chapter starts with: ${nextChapter.content.substring(0, 200)}...` : '',
      maintainPlotPoints: validatedData.maintainPlotPoints,
      maintainCharacterDevelopment: validatedData.maintainCharacterDevelopment
    };

    // Generate rewrite prompt using Korean webnovel system prompt
    const rewritePrompt = `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**🔥 중요: 이 장을 다시 써야 하는 이유를 명확히 파악하고 해결하세요! 🔥**

**지금부터 "${existingChapter.novel.title}" ${existingChapter.number}화를 다시 작성해주세요.**

**사용자 요청사항:**
"${rewriteContext.rewriteReason}"

**분석 필수:**
1. 원본 챕터에서 사용자가 지적한 구체적인 문제점 파악
2. 왜 사용자가 현재 버전에 만족하지 않는지 이해
3. 이러한 문제를 해결하기 위해 어떤 변화가 필요한지 생각
4. 한국 웹소설 독자들이 좋아할 만한 개선 방향 모색

**원본 챕터 정보:**
- 제목: ${existingChapter.title}
- 원본 글자수: ${existingChapter.wordCount}자
- 원본 내용: ${existingChapter.content}

**재작성 요구사항:**
- 주요 초점: ${rewriteContext.rewriteReason}
- 추가 지시사항: ${rewriteContext.rewriteInstructions || '별도 지시사항 없음'}
- 목표 글자수: ${validatedData.targetWordCount}자
- 플롯 포인트 유지: ${validatedData.maintainPlotPoints ? '필수' : '융통성 있게'}
- 캐릭터 발전 유지: ${validatedData.maintainCharacterDevelopment ? '필수' : '융통성 있게'}

**소설 배경:**
- 장르: ${existingChapter.novel.genre}
- 배경: ${existingChapter.novel.setting}

**등장인물:**
${/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
existingChapter.novel.characters.map((c: any) => `- ${c.name}: ${c.personality} (${c.description})`).join('\n')}

**진행 중인 플롯라인:**
${/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
existingChapter.novel.plotlines.map((p: any) => `- ${p.name}: ${p.description} (상태: ${p.status})`).join('\n')}

**이전 화 요약:**
${rewriteContext.previousChapterSummary}

${rewriteContext.nextChapterExpectations ? `**다음 화 예상:**\n${rewriteContext.nextChapterExpectations}` : ''}

**세계관 설정:**
${existingChapter.novel.worldBuilding ? `
- 지리: ${existingChapter.novel.worldBuilding.geography || '명시되지 않음'}
- 마법 시스템: ${existingChapter.novel.worldBuilding.magicSystem || '명시되지 않음'}
- 규칙: ${existingChapter.novel.worldBuilding.rules || '명시되지 않음'}
` : '구체적인 세계관 설정 없음'}

**재작성 전략:**
다음 질문들을 통해 재작성 방향을 정하세요:
- 사용자가 지적한 구체적인 문제는 무엇인가?
- 원본 챕터의 어떤 부분이 이러한 문제를 보여주는가?
- 어떤 한국 웹소설 기법을 사용해서 이를 개선할 수 있는가?
- 스토리 연속성을 유지하면서 어떻게 개선할 수 있는가?

**필수 한국 웹소설 재작성 요구사항:**
1. **최우선 목표**: 사용자가 지적한 문제점을 직접적으로 해결
2. **한국 웹소설 특성 강화**: 모바일 최적화, 클리프행어, 몰입감 있는 대화
3. **연재 구조 완벽 반영**: 다음 화가 궁금해지는 마무리 필수
4. **자연스러운 한국어**: 번역투 절대 금지, 생생한 한국어 표현 사용
5. **장르 트로프 활용**: ${existingChapter.novel.genre} 장르 독자가 좋아하는 클리셰 적극 활용
6. **캐릭터 매력 강화**: 독자가 애착을 가질 수 있는 매력적인 캐릭터 구현
7. **감정적 몰입**: 독자가 감정적으로 몰입할 수 있는 장면 구성
8. **목표 글자수 준수**: 약 ${validatedData.targetWordCount}자 내외
9. **스토리 연속성 유지**: 이전/다음 화와의 자연스러운 연결
10. **원본 대비 명확한 개선**: 왜 다시 썼는지 독자가 느낄 수 있는 확실한 향상

**중요: 반드시 유효한 JSON으로만 응답하세요. 다른 설명이나 마크다운 형식 없이 순수 JSON만 제공하세요.**

Return your response in exactly this JSON format (replace the placeholders with actual content):
{
  "content": "The complete rewritten chapter content here",
  "metadata": {
    "title": "Chapter title (can be same or improved)",
    "summary": "Brief summary of the rewritten chapter",
    "changes": "Brief description of what was changed and why",
    "wordCount": 0,
    "reasonAnalysis": "Explain how you addressed the user's specific reason for rewriting",
    "improvements": "List the key improvements you made to solve the identified problems"
  },
  "additionalData": {
    "charactersInvolved": [
      {
        "name": "Character name",
        "role": "protagonist|antagonist|supporting|minor",
        "developmentNote": "How character developed in this chapter"
      }
    ],
    "plotlineDevelopment": [
      {
        "plotlineName": "Plotline name",
        "developmentType": "introduction|advancement|complication|resolution",
        "description": "How the plotline developed"
      }
    ],
    "chapterEvents": [
      {
        "eventType": "CHARACTER_INTRODUCTION|PLOT_ADVANCEMENT|ROMANCE_DEVELOPMENT|CONFLICT_ESCALATION|REVELATION|CLIFFHANGER|CLIFFHANGER_RESOLUTION|CHARACTER_DEVELOPMENT|WORLD_BUILDING|DIALOGUE_SCENE|ACTION_SCENE|FLASHBACK|FORESHADOWING|TWIST|RESOLUTION",
        "description": "Event description",
        "characterName": "Character name (if applicable)",
        "plotlineName": "Plotline name (if applicable)"
      }
    ],
    "cliffhanger": "Chapter ending cliffhanger (if applicable)"
  }
}`;

    // Generate the rewritten chapter
    const aiResponse = await generateWithRetry(rewritePrompt, 3, false);
    
    // Parse the AI response with improved error handling
    let parsedResponse;
    try {
      // Log the raw response for debugging
      console.log('Raw AI response:', aiResponse.substring(0, 500) + '...');
      
      // Try to extract JSON from the response if it's wrapped in text
      let jsonStr = aiResponse.trim();
      
      // Look for JSON object boundaries
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      
      // Remove any markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      parsedResponse = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw AI response that failed:', aiResponse);
      
      // Fallback: try to extract content manually if JSON parsing fails
      try {
        // Look for content in quotes or between markers
        const contentMatch = aiResponse.match(/"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const titleMatch = aiResponse.match(/"title"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        
        if (contentMatch && contentMatch[1]) {
          console.log('Using fallback content extraction');
          parsedResponse = {
            content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
            metadata: {
              title: titleMatch ? titleMatch[1] : existingChapter.title,
              summary: 'Generated via fallback parsing',
              changes: 'AI response parsing failed, used fallback method',
              wordCount: contentMatch[1].split(' ').length,
              reasonAnalysis: 'Parsing failed - content extracted using fallback method',
              improvements: 'Unable to analyze improvements due to parsing error'
            },
            additionalData: {}
          };
        } else {
          throw new Error('Could not extract content from AI response');
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'AI response format error - please try again. The AI may have returned malformed content.'
          },
          { status: 500 }
        );
      }
    }

    if (!parsedResponse || !parsedResponse.content) {
      return NextResponse.json(
        { success: false, error: 'AI response missing required content' },
        { status: 500 }
      );
    }

    const rewrittenContent = parsedResponse.content;
    const metadata = parsedResponse.metadata || {};
    const additionalData: AdditionalData = parsedResponse.additionalData || {};

    // Calculate actual word count
    const actualWordCount = rewrittenContent.split(/\s+/).filter(Boolean).length;

    // Update the chapter in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update the chapter
      const updatedChapter = await tx.chapter.update({
        where: { id },
        data: {
          content: rewrittenContent,
          title: metadata.title || existingChapter.title,
          summary: metadata.summary || rewrittenContent.substring(0, 500) + '...',
          wordCount: actualWordCount,
          cliffhanger: additionalData.cliffhanger || existingChapter.cliffhanger,
          additionalData: JSON.stringify(additionalData)
        },
        include: {
          novel: {
            include: {
              characters: true,
              plotlines: true
            }
          }
        }
      });

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
      if (additionalData.charactersInvolved) {
        for (const charData of additionalData.charactersInvolved) {
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
      if (additionalData.plotlineDevelopment) {
        for (const plotData of additionalData.plotlineDevelopment) {
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
      if (additionalData.chapterEvents) {
        for (const eventData of additionalData.chapterEvents) {
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
              importance: 1,
            },
          });
        }
      }

      return updatedChapter;
    });

    // Update plotline statuses after transaction completes
    if (additionalData.plotlineDevelopment) {
      for (const plotData of additionalData.plotlineDevelopment) {
        const plotline = result.novel.plotlines.find((p: { name: string; id: string }) => p.name === plotData.plotlineName);
        if (plotline) {
          await updatePlotlineStatus(plotline.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      chapter: {
        id: result.id,
        title: result.title,
        content: result.content,
        wordCount: result.wordCount,
        summary: result.summary,
        cliffhanger: result.cliffhanger,
        updatedAt: result.updatedAt
      },
      rewriteInfo: {
        originalWordCount: existingChapter.wordCount,
        newWordCount: actualWordCount,
        changes: metadata.changes || 'Chapter rewritten with improvements',
        reason: validatedData.rewriteReason || 'User requested rewrite'
      },
      metadata: {
        generatedMetadata: metadata,
        additionalData: additionalData
      }
    });

  } catch (error) {
    console.error('Chapter rewrite error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Chapter rewrite failed' },
      { status: 500 }
    );
  }
} 