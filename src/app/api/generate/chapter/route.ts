import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateWithRetry } from '@/lib/gemini';
import { generateChapterPrompt } from '@/lib/prompts';
import { GenerateChapterResponse, ConsistencyIssue, AdditionalData, EventType } from '@/types';
import { AutoEvolutionService } from '@/lib/auto-evolution';
import { updatePlotlineStatus } from '@/lib/plotline-evolution';
import { z } from 'zod';

interface GenerationContext {
  KOREAN_WEBNOVEL_SYSTEM_PROMPT: string;
  genre: string;
  setting: string;
  title: string;
  description?: string;
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    background: string;
  }>;
  plotlines: Array<{
    name: string;
    description: string;
    status: string;
  }>;
  chapterNumber: number;
  previousChapterSummary?: string;
  targetWordCount: number;
  focusCharacters?: string[];
  plotFocus?: string;
  worldBuilding?: {
    magicSystem?: string;
    locations?: string[];
    cultures?: string;
    rules?: string[];
  };
  storyContext: {
    recentEvents: string[];
    ongoingPlotThreads: string[];
    characterDevelopments: string[];
    previousChapterCliffhanger: string | null;
  };
}

const createChapterSchema = z.object({
  novelId: z.string(),
  chapterNumber: z.number().min(1),
  title: z.string().min(1),
  targetWordCount: z.number().min(500).max(5000).default(2500),
  focusCharacters: z.array(z.string()).optional(),
  plotFocus: z.string().optional(),
});

// Function to create improvement prompt when consistency issues are found
function createImprovementPrompt(
  originalContent: string,
  consistencyIssues: ConsistencyIssue[],
  context: GenerationContext
): string {
  const highSeverityIssues = consistencyIssues.filter(issue => issue.severity === 'high');
  const mediumSeverityIssues = consistencyIssues.filter(issue => issue.severity === 'medium');
  
  return `${context.KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**🔥 중요: 연재 소설의 연속성을 유지하면서 일관성 문제를 해결해주세요! 🔥**

**기존 장 내용에 일관성 문제가 발견되어 개선이 필요합니다.**

**원본 장 내용:**
${originalContent}

**발견된 일관성 문제들:**

${highSeverityIssues.length > 0 ? `**🚨 심각한 문제 (즉시 수정 필요):**
${highSeverityIssues.map((issue, index) => `${index + 1}. **${issue.type}** - ${issue.description}
   💡 개선 방안: ${issue.suggestion || '해당 문제를 해결하여 일관성을 유지하세요.'}`).join('\n')}
` : ''}

${mediumSeverityIssues.length > 0 ? `**⚠️ 보통 문제 (개선 권장):**
${mediumSeverityIssues.map((issue, index) => `${index + 1}. **${issue.type}** - ${issue.description}
   💡 개선 방안: ${issue.suggestion || '해당 문제를 해결하여 일관성을 유지하세요.'}`).join('\n')}
` : ''}

**작품 정보:**
- 장르: ${context.genre}
- 배경: ${context.setting}
- 제목: ${context.title}
- 목표 분량: ${context.targetWordCount}자

        **등장인물:**
        ${context.characters.map((c) => `- **${c.name}**: ${c.description} | 성격: ${c.personality}`).join('\n')}
        
        **진행 중인 스토리라인:**
        ${context.plotlines.filter((p) => ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'].includes(p.status)).map((p) => `- **${p.name}**: ${p.description}`).join('\n')}

${context.storyContext?.previousChapterCliffhanger ? `**🎯 이전 화의 클리프행어:**
"${context.storyContext.previousChapterCliffhanger}"
` : ''}

${context.storyContext?.recentEvents && context.storyContext.recentEvents.length > 0 ? `**⚡ 최근 중요 사건들 (연속성 유지 필수):**
${context.storyContext.recentEvents.map(e => `- ${e}`).join('\n')}
` : ''}

${context.storyContext?.ongoingPlotThreads && context.storyContext.ongoingPlotThreads.length > 0 ? `**🧵 진행 중인 플롯 스레드:**
${context.storyContext.ongoingPlotThreads.map(t => `- ${t}`).join('\n')}
` : ''}

**개선 요구사항:**
1. **원본 내용 유지**: 기본 스토리 흐름과 핵심 사건들은 그대로 유지
2. **일관성 문제 해결**: 위에서 지적된 모든 문제점들을 자연스럽게 수정
3. **자연스러운 개선**: 억지스럽지 않게 자연스럽게 문제점들을 해결
4. **웹소설 문체**: 한국 웹소설 독자들이 선호하는 문체와 호흡 유지
5. **분량 맞추기**: 목표 분량 ${context.targetWordCount}자에 맞춰 작성

**JSON 형식으로 개선된 버전을 제공해주세요:**

\`\`\`json
{
  "metadata": {
    "chapterNumber": ${context.chapterNumber},
    "title": "${context.title} ${context.chapterNumber}화",
    "improvements": "적용된 개선사항 요약",
    "version": "improved"
  },
  "content": {
    "chapter": "개선된 장 내용이 여기에 들어갑니다."
  },
  "additionalData": {
    "charactersInvolved": [
      {
        "name": "등장인물 이름",
        "role": "주인공" | "조연" | "악역",
        "developmentNote": "이 캐릭터의 이번 화에서의 변화/발전 요약"
      }
    ],
    "plotlineDevelopment": [
      {
        "plotlineName": "관련 플롯라인 이름",
        "developmentType": "introduction" | "advancement" | "complication" | "resolution",
        "description": "해당 플롯라인의 이번 화에서의 진행 상황 요약"
      }
    ],
    "chapterEvents": [
      {
        "eventType": "CHARACTER_INTRODUCTION" | "PLOT_ADVANCEMENT" | "ROMANCE_DEVELOPMENT" | "CONFLICT_ESCALATION" | "REVELATION" | "CLIFFHANGER" | "CLIFFHANGER_RESOLUTION" | "CHARACTER_DEVELOPMENT" | "WORLD_BUILDING" | "DIALOGUE_SCENE" | "ACTION_SCENE" | "FLASHBACK" | "FORESHADOWING" | "TWIST" | "RESOLUTION",
        "description": "사건 요약",
        "characterName": "관련 등장인물 이름 (선택사항)",
        "plotlineName": "관련 플롯라인 이름 (선택사항)"
      }
    ],
    "cliffhanger": "다음 화 예고 또는 강력한 클리프행어 문장",
    "fixedIssues": [
      {
        "originalIssue": "수정된 원본 문제",
        "solution": "적용된 해결책"
      }
    ]
  }
}
\`\`\`

**반드시 JSON 형식으로만 응답하고, 일관성 문제들을 자연스럽게 해결한 개선된 장을 만들어주세요!**`;
}

// Helper function to fix unescaped double quotes in JSON string values
function fixUnescapedQuotesInJson(jsonString: string): string {
  // Replace already escaped quotes with a placeholder
  const placeholder = '___ESCAPED_QUOTE___';
  let fixed = jsonString.replace(/\\"/g, placeholder);
  
  // Now escape all remaining unescaped quotes within string values
  // This is a simple heuristic - we'll escape quotes that appear between other quotes
  fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
    // If p2 contains quotes, escape them
    const escapedP2 = p2.replace(/"/g, '\\"');
    return `"${p1}"${escapedP2}"${p3}"`;
  });
  
  // Restore the originally escaped quotes
  fixed = fixed.replace(new RegExp(placeholder, 'g'), '\\"');
  
  return fixed;
}

// Helper function to clean up malformed JSON
function cleanupMalformedJson(jsonString: string): string {
  // Remove trailing commas and newlines that might break JSON parsing
  let cleaned = jsonString.trim();
  
  // Remove trailing comma followed by newlines or whitespace at the end
  cleaned = cleaned.replace(/,\s*[\n\r]*\s*$/, '');
  
  // Remove any trailing quote-comma-newline patterns that might occur
  cleaned = cleaned.replace(/",\s*[\n\r]*\s*"?\s*$/, '"');
  
  // Find the last proper closing brace and trim everything after it
  let lastBraceIndex = -1;
  let braceCount = 0;
  
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      braceCount++;
    } else if (cleaned[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastBraceIndex = i;
      }
    }
  }
  
  // If we found a proper closing brace, trim everything after it
  if (lastBraceIndex !== -1 && lastBraceIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBraceIndex + 1);
  }
  
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createChapterSchema.parse(body);

    // Get novel with related data
    const novel = await prisma.novel.findUnique({
      where: { id: validatedData.novelId },
      include: {
        characters: true,
        plotlines: {
          where: { status: { in: ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'] } }
        },
        chapters: {
          orderBy: { number: 'desc' },
          take: 5, // Look at last 5 chapters for better context
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
    });

    if (!novel) {
      return NextResponse.json(
        { success: false, error: 'Novel not found' },
        { status: 404 }
      );
    }

    // Check if chapter number already exists
    const existingChapter = await prisma.chapter.findUnique({
      where: {
        novelId_number: {
          novelId: validatedData.novelId,
          number: validatedData.chapterNumber
        }
      }
    });

    if (existingChapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter number already exists' },
        { status: 400 }
      );
    }

    // Enhanced previous chapter context and continuity tracking
    const previousChapter = novel.chapters[0];
    let previousChapterSummary = '';
    const previousEvents: string[] = [];
    const ongoingPlotThreads: string[] = [];
    const recentCharacterDevelopments: string[] = [];
    
    if (novel.chapters.length > 0) {
      // Create a comprehensive summary of the previous chapter
      if (previousChapter) {
        const prevContent = previousChapter.content;
        const prevLength = prevContent.length;
        
        // Extract key parts: beginning, middle, end for better context
        const beginning = prevContent.substring(0, Math.min(300, prevLength * 0.3));
        const middle = prevContent.substring(
          Math.max(0, Math.floor(prevLength * 0.4)), 
          Math.min(prevLength, Math.floor(prevLength * 0.6))
        );
        const ending = prevContent.substring(Math.max(0, prevLength - 300));
        
        previousChapterSummary = `
**${previousChapter.title} 주요 내용:**
시작: ${beginning}...
중간: ${middle}...
마무리: ${ending}

**클리프행어:** ${previousChapter.cliffhanger || '(클리프행어 없음)'}
        `.trim();
      }
      
      // Gather recent events from last 3 chapters
      const recentChapters = novel.chapters.slice(0, 3);
      for (const chapter of recentChapters) {
        // Extract events from chapter events
        chapter.events.forEach((event: { description: string }) => {
          previousEvents.push(`${chapter.number}화: ${event.description}`);
        });
        
        // Extract character developments
        chapter.characterUsages.forEach((usage: { developmentNotes: string | null; character: { name: string } }) => {
          if (usage.developmentNotes) {
            recentCharacterDevelopments.push(
              `${usage.character.name}: ${usage.developmentNotes} (${chapter.number}화)`
            );
          }
        });
        
        // Extract plot developments
        chapter.plotlineDevelopments.forEach((plotDev: { plotline: { name: string }; description: string; developmentType: string }) => {
          ongoingPlotThreads.push(
            `${plotDev.plotline.name}: ${plotDev.description} (${chapter.number}화에서 ${plotDev.developmentType})`
          );
        });
      }
    }

    // Create enhanced story context for continuity
    const storyContext = {
      recentEvents: previousEvents,
      ongoingPlotThreads: ongoingPlotThreads,
      characterDevelopments: recentCharacterDevelopments,
      previousChapterCliffhanger: previousChapter?.cliffhanger || null
    };

    // Prepare world building context
    const worldBuilding = novel.worldBuilding ? {
      magicSystem: novel.worldBuilding.magicSystem || undefined,
      locations: novel.worldBuilding.locations ? JSON.parse(novel.worldBuilding.locations) : undefined,
      cultures: novel.worldBuilding.cultures || undefined,
      rules: novel.worldBuilding.rules ? JSON.parse(novel.worldBuilding.rules) : undefined,
    } : undefined;

    // Prepare context for generation with enhanced continuity
    const generationContext = {
      KOREAN_WEBNOVEL_SYSTEM_PROMPT: `당신은 한국 웹소설 전문 작가입니다. 특히 **연재 소설의 연속성과 일관성**을 중요시합니다.`,
      genre: novel.genre,
      setting: novel.setting,
      title: novel.title,
      description: novel.description || undefined,
      characters: novel.characters.map((c: { name: string; description: string; personality: string; background: string; }) => ({
        name: c.name,
        description: c.description,
        personality: c.personality,
        background: c.background
      })),
      plotlines: novel.plotlines.map((p: { name: string; description: string; status: string; }) => ({
        name: p.name,
        description: p.description,
        status: p.status
      })),
      chapterNumber: validatedData.chapterNumber,
      previousChapterSummary,
      previousEvents,
      targetWordCount: validatedData.targetWordCount,
      focusCharacters: validatedData.focusCharacters,
      plotFocus: validatedData.plotFocus,
      worldBuilding,
      storyContext // Add the enhanced story context
    };

    // Generate chapter using enhanced context
    const chapterPrompt = generateChapterPrompt(generationContext);
    let generatedContent = await generateWithRetry(chapterPrompt, 3, true);
    let consistencyReport: GenerateChapterResponse['consistencyReport'] = {
      hasIssues: false,
      issueCount: 0,
      issues: [],
      suggestions: [],
      improvementAttempts: 0,
      improvementHistory: [],
      redFlagsFixed: 0,
    };

    const maxRetries = 3;
    let currentRetry = 0;
    const improvementHistory: string[] = [];
    const fixedIssues: Array<{ originalIssue: string; solution: string; }> = [];
    let redFlagsFixedCount = 0;

    // Loop for regeneration if consistency issues are found
    while (currentRetry <= maxRetries) {
      // Perform consistency checks
      const issues = await performContentConsistencyCheck(
        generatedContent,
        novel.characters.map((c: { name: string; personality: string; }) => ({ name: c.name, personality: c.personality })),
        novel.worldBuilding
      );

      const highSeverityIssues = issues.filter(issue => issue.severity === 'high');
      const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium');
      const allIssues = [...highSeverityIssues, ...mediumSeverityIssues];

      consistencyReport = {
        hasIssues: allIssues.length > 0,
        issueCount: allIssues.length,
        issues: allIssues,
        suggestions: allIssues.map(issue => issue.suggestion!).filter(Boolean),
        improvementAttempts: currentRetry,
        improvementHistory: improvementHistory,
        redFlagsFixed: redFlagsFixedCount,
      };

      if (!consistencyReport.hasIssues || highSeverityIssues.length === 0) {
        // No issues or no high severity issues, break the loop
        break;
      }

      // If issues are found, create improvement prompt and regenerate
      const improvementPrompt = createImprovementPrompt(
        generatedContent,
        allIssues,
        generationContext
      );
      
      const newGeneratedContent = await generateWithRetry(improvementPrompt, 3, true);

      // Track improvements and fixed issues
      const currentAttemptSummary = `Attempt ${currentRetry + 1}: Found ${allIssues.length} issues (${highSeverityIssues.length} high, ${mediumSeverityIssues.length} medium).`;
      improvementHistory.push(currentAttemptSummary);

      allIssues.forEach(issue => {
        const found = fixedIssues.find(fi => fi.originalIssue === issue.description);
        if (!found) { // Only add if not already noted as fixed in a previous attempt
          fixedIssues.push({
            originalIssue: issue.description,
            solution: issue.suggestion || 'AI attempted to resolve the issue.',
          });
        }
      });
      
      // Update red flags fixed count
      const previousHighSeverityIssues = issues.filter(issue => issue.severity === 'high');
      redFlagsFixedCount += previousHighSeverityIssues.length - highSeverityIssues.length;

      generatedContent = newGeneratedContent;
      currentRetry++;
    }

    // Parse JSON from the final generated content
    let parsedResponse;
    try {
      const jsonMatch = generatedContent.match(/```json\s*([\s\S]*?)\s*```/);

      if (!jsonMatch || !jsonMatch[1]) {
        console.error('AI response did not contain a valid JSON markdown block.');
        console.error('Raw response:', generatedContent);
        return NextResponse.json(
          { success: false, error: 'AI response did not contain expected JSON format' },
          { status: 500 }
        );
      }

      let jsonText = jsonMatch[1].trim();
      
      // Clean up malformed JSON first
      jsonText = cleanupMalformedJson(jsonText);
      
      // Attempt to fix unescaped double quotes within string values before parsing
      // This is a targeted heuristic fix for common AI generation issues.
      jsonText = fixUnescapedQuotesInJson(jsonText);

      parsedResponse = JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse JSON response after retries:', error);
      console.error('Raw response:', generatedContent);
      return NextResponse.json(
        { success: false, error: 'Failed to parse generated chapter content', details: error },
        { status: 500 }
      );
    }

    // Validate the parsed response structure and handle both formats
    let chapterContent: string;
    
    if (!parsedResponse || !parsedResponse.content) {
      console.error('AI response missing required structure:', parsedResponse);
      return NextResponse.json(
        { success: false, error: 'AI response missing required content structure' },
        { status: 500 }
      );
    }

    // Handle both content formats: { "content": { "chapter": "text" } } and { "content": "text" }
    if (typeof parsedResponse.content === 'string') {
      chapterContent = parsedResponse.content;
    } else if (parsedResponse.content.chapter) {
      chapterContent = parsedResponse.content.chapter;
    } else {
      console.error('AI response has content but no chapter field:', parsedResponse);
      return NextResponse.json(
        { success: false, error: 'AI response missing required chapter content' },
        { status: 500 }
      );
    }
    const wordCount = chapterContent.split(/\s+/).filter(Boolean).length;
    const metadata = parsedResponse.metadata;
    const additionalData: AdditionalData = parsedResponse.additionalData || {};

    // Save generated chapter to DB
    const newChapter = await prisma.chapter.create({
      data: {
        novelId: validatedData.novelId,
        number: validatedData.chapterNumber,
        title: metadata.title,
        content: chapterContent,
        wordCount: wordCount,
        summary: chapterContent.length > 500 ? chapterContent.substring(0, 500) + '...' : chapterContent, // First 500 characters as summary
        // Store additional data as JSON string
        additionalData: JSON.stringify(additionalData),
        cliffhanger: additionalData.cliffhanger || null,
      },
    });

    // Save character usage
    if (additionalData.charactersInvolved) {
      for (const charData of additionalData.charactersInvolved) {
        const character = novel.characters.find((c: { name: string; }) => c.name === charData.name);
        if (character) {
          await prisma.characterUsage.create({
            data: {
              chapterId: newChapter.id,
              characterId: character.id,
              role: charData.role as "protagonist" | "antagonist" | "supporting" | "minor",
              developmentNotes: charData.developmentNote || '',
            },
          });
        }
      }
    }

    // Save plotline development
    if (additionalData.plotlineDevelopment) {
      for (const plotData of additionalData.plotlineDevelopment) {
        const plotline = novel.plotlines.find((p: { name: string; }) => p.name === plotData.plotlineName);
        if (plotline) {
          await prisma.plotlineDevelopment.create({
            data: {
              chapterId: newChapter.id,
              plotlineId: plotline.id,
              developmentType: plotData.developmentType as "introduction" | "advancement" | "complication" | "resolution",
              description: plotData.description,
            },
          });
          
          // Automatically update plotline status based on this new development
          await updatePlotlineStatus(plotline.id);
        }
      }
    }

    // Save chapter events
    if (additionalData.chapterEvents) {
      for (const eventData of additionalData.chapterEvents) {
        let characterId: string | undefined = undefined;
        if (eventData.characterName) {
          const char = novel.characters.find((c: { name: string; }) => c.name === eventData.characterName);
          if (char) characterId = char.id;
        }

        let plotlineId: string | undefined = undefined;
        if (eventData.plotlineName) {
          const plot = novel.plotlines.find((p: { name: string; }) => p.name === eventData.plotlineName);
          if (plot) plotlineId = plot.id;
        }

        await prisma.chapterEvent.create({
          data: {
            chapterId: newChapter.id,
            eventType: eventData.eventType as EventType, // Cast to EventType
            description: eventData.description,
            characterId: characterId,
            plotlineId: plotlineId,
          },
        });
      }
    }

    // Perform auto-evolution after chapter generation
    const autoEvolutionService = new AutoEvolutionService();
    const evolutionResults = await autoEvolutionService.performPostChapterEvolution(newChapter.id);

    // Construct the response
    const response: GenerateChapterResponse = {
      success: true,
      chapter: {
        id: newChapter.id,
        title: newChapter.title,
        content: newChapter.content,
        wordCount: newChapter.wordCount,
        cliffhanger: newChapter.cliffhanger || undefined,
      },
      tracking: {
        charactersUsed: additionalData.charactersInvolved ? additionalData.charactersInvolved.map((char: { name: string; role: string; developmentNote?: string; }) => ({
          characterId: novel.characters.find((c: { name: string; }) => c.name === char.name)?.id || '',
          characterName: char.name,
          role: char.role as "protagonist" | "antagonist" | "supporting" | "minor",
          appearances: 1, // Placeholder, actual count would require more logic
          developmentNotes: char.developmentNote ? [char.developmentNote] : [],
        })) : [],
        plotlinesDeveloped: additionalData.plotlineDevelopment ? additionalData.plotlineDevelopment.map((plot: { plotlineName: string; developmentType: string; description: string; }) => ({
          plotlineId: novel.plotlines.find((p: { name: string; }) => p.name === plot.plotlineName)?.id || undefined,
          plotlineName: plot.plotlineName,
          developmentType: plot.developmentType as "introduction" | "advancement" | "complication" | "resolution",
          description: plot.description,
          significance: 'medium', // Placeholder, needs more sophisticated logic
        })) : [],
        worldBuildingElements: [], // Not directly handled in this flow
        newEvents: additionalData.chapterEvents ? additionalData.chapterEvents.map((event: { eventType: string; description: string; characterName?: string; plotlineName?: string; }) => ({
          eventType: event.eventType as EventType,
          description: event.description,
          characterIds: event.characterName ? [novel.characters.find((c: { name: string; }) => c.name === event.characterName)?.id || ''] : [],
          plotlineIds: event.plotlineName ? [novel.plotlines.find((p: { name: string; }) => p.name === event.plotlineName)?.id || ''] : [],
          importance: 1, // Placeholder
        })) : [],
      },
      consistencyReport: {
        hasIssues: consistencyReport.hasIssues,
        issueCount: consistencyReport.issueCount,
        issues: consistencyReport.issues,
        suggestions: consistencyReport.suggestions,
        improvementAttempts: consistencyReport.improvementAttempts,
        improvementHistory: consistencyReport.improvementHistory,
        redFlagsFixed: consistencyReport.redFlagsFixed,
      },
      metadata: {
        generatedMetadata: metadata,
        additionalData: additionalData,
        improvements: fixedIssues,
      },
      // Add evolution results to the response
      autoEvolution: evolutionResults,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Chapter generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Chapter generation failed' },
      { status: 500 }
    );
  }
}

// Simple consistency check function for content analysis
async function performContentConsistencyCheck(
  content: string,
  characters: Array<{ name: string; personality: string; }>,
  worldBuilding: { magicSystem?: string | null; } | null
): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];
  
  // Check character personality consistency
  for (const character of characters) {
    const personality = character.personality.toLowerCase();
    const characterMentions = content.toLowerCase().includes(character.name.toLowerCase());
    
    if (characterMentions) {
      // Check for contradictory behaviors
      if (personality.includes('shy') || personality.includes('introverted')) {
        if (content.includes('boldly declared') || content.includes('confidently announced')) {
          issues.push({
            type: 'character',
            severity: 'high',
            description: `${character.name} shows bold behavior despite being described as shy/introverted`,
            suggestion: `Adjust ${character.name}'s actions to match their shy personality or show character development`
          });
        }
      }
      
      if (personality.includes('formal') || personality.includes('polite')) {
        if (content.includes('"hey"') || content.includes('"dude"')) {
          issues.push({
            type: 'character',
            severity: 'medium',
            description: `${character.name} uses informal language despite being described as formal/polite`,
            suggestion: 'Use more formal dialogue for this character'
          });
        }
      }
    }
  }
  
  // Check world building consistency
  if (worldBuilding?.magicSystem) {
    try {
      const magicRules = JSON.parse(worldBuilding.magicSystem);
      if (magicRules.requiresChanting && content.includes('cast spell')) {
        const hasChanting = content.includes('chant') || content.includes('incant');
        if (!hasChanting) {
          issues.push({
            type: 'worldbuilding',
            severity: 'high',
            description: 'Magic is used without required chanting according to established magic system',
            suggestion: 'Add chanting/incantation before spell casting'
          });
        }
      }
    } catch {
      // If magic system can't be parsed, skip this check
    }
  }
  
  // Check for timeline inconsistencies
  const timeIndicators = ['yesterday', 'tomorrow', 'last week', 'next month'];
  const foundIndicators = timeIndicators.filter(indicator => 
    content.toLowerCase().includes(indicator)
  );
  
  if (foundIndicators.length > 2) {
    issues.push({
      type: 'timeline',
      severity: 'medium',
      description: 'Multiple conflicting time references in the chapter',
      suggestion: 'Clarify the timeline progression or use clearer temporal transitions'
    });
  }
  
  return issues;
}