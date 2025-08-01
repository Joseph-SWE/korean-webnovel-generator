import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateWithRetry } from '@/lib/gemini';
import { generateChapterPrompt, KOREAN_WEBNOVEL_SYSTEM_PROMPT } from '@/lib/prompts';
import { GenerateChapterResponse, ConsistencyIssue, AdditionalData, ChapterContext, CharacterPlan, PlotStatus, EventType } from '@/types';
import { AutoEvolutionService } from '@/lib/auto-evolution';
import { updatePlotlineStatus, suggestPlotlineBalance, analyzePlotlineDistribution } from '@/lib/plotline-evolution';
import { z } from 'zod';
import { EventType as PrismaEventType } from '@prisma/client';
import { semanticAnalyzer } from '@/lib/semantic-analyzer'; // Import semanticAnalyzer
import { errorMonitor } from '@/lib/error-monitoring'; // Import errorMonitor
import { comprehensiveConsistencyManager } from '@/lib/comprehensive-consistency';
import { storyContextBuilder } from '@/lib/story-context-builder';

const createChapterSchema = z.object({
  novelId: z.string(),
  chapterNumber: z.number().min(1),
  targetWordCount: z.number().min(500).max(5000).default(2500),
  focusCharacters: z.array(z.string().max(50)).optional(),
  plotFocus: z.string().max(200).optional(),
});

// Function to create improvement prompt when consistency issues are found
function createImprovementPrompt(
  originalContent: string,
  consistencyIssues: ConsistencyIssue[],
  context: ChapterContext
): string {
  const highSeverityIssues = consistencyIssues.filter(issue => issue.severity === 'high');
  const mediumSeverityIssues = consistencyIssues.filter(issue => issue.severity === 'medium');
  
  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}\n\n**🔥 중요: 연재 소설의 연속성을 유지하면서 일관성 문제를 해결해주세요! 🔥**\n\n**기존 장 내용에 일관성 문제가 발견되어 개선이 필요합니다.**\n\n**원본 장 내용:**\n${originalContent}\n\n**발견된 일관성 문제들:**\n\n${highSeverityIssues.length > 0 ? `**🚨 심각한 문제 (즉시 수정 필요):**\n${highSeverityIssues.map((issue, index) => `${index + 1}. **${issue.type}** - ${issue.description}\n   💡 개선 방안: ${issue.suggestion || '해당 문제를 해결하여 일관성을 유지하세요.'}`).join('\n')}\n` : ''}\n\n${mediumSeverityIssues.length > 0 ? `**⚠️ 보통 문제 (개선 권장):**\n${mediumSeverityIssues.map((issue, index) => `${index + 1}. **${issue.type}** - ${issue.description}\n   💡 개선 방안: ${issue.suggestion || '해당 문제를 해결하여 일관성을 유지하세요.'}`).join('\n')}\n` : ''}\n\n**작품 정보:**\n- 장르: ${context.genre}\n- 배경: ${context.setting}\n- 제목: ${context.title}\n- 목표 분량: ${context.targetWordCount}자\n\n        **등장인물:**\n        ${context.characters.map((c) => `- **${c.name}**: ${c.description} | 성격: ${c.personality}`).join('\n')}\n        \n        **진행 중인 스토리라인:**\n        ${context.plotlines.filter((p) => ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'].includes(p.status)).map((p) => `- **${p.name}**: ${p.description}`).join('\n')}\n\n${context.storyContext?.previousChapterCliffhanger ? `**🎯 이전 화의 클리프행어:**\n"${context.storyContext.previousChapterCliffhanger}"\n` : ''}\n\n${context.storyContext?.recentEvents && context.storyContext.recentEvents.length > 0 ? `**⚡ 최근 중요 사건들 (연속성 유지 필수):**\n${context.storyContext.recentEvents.map(e => `- ${e}`).join('\n')}\n` : ''}\n\n${context.storyContext?.ongoingPlotThreads && context.storyContext.ongoingPlotThreads.length > 0 ? `**🧵 진행 중인 플롯 스레드:**\n${context.storyContext.ongoingPlotThreads.map(t => `- ${t}`).join('\n')}\n` : ''}\n\n**개선 요구사항:**\n1. **원본 내용 유지**: 기본 스토리 흐름과 핵심 사건들은 그대로 유지\n2. **일관성 문제 해결**: 위에서 지적된 모든 문제점들을 자연스럽게 수정\n3. **자연스러운 개선**: 억지스럽지 않게 자연스럽게 문제점들을 해결\n4. **웹소설 문체**: 한국 웹소설 독자들이 선호하는 문체와 호흡 유지\n5. **분량 맞추기**: 목표 분량 ${context.targetWordCount}자에 맞춰 작성\n\n**JSON 형식으로 개선된 버전을 제공해주세요:**\n\n\`\`\`json\n{\n  "metadata": {\n    "chapterNumber": ${context.chapterNumber},\n    "title": "${context.title} ${context.chapterNumber}화\",\n    "improvements": "적용된 개선사항 요약\",\n    "version": "improved"\n  },\n  "content": {\n    "chapter": "개선된 장 내용이 여기에 들어갑니다."\n  },\n  "additionalData": {\n    "charactersInvolved": [\n      {\n        "name": "등장인물 이름\",\n        "role": "주인공" | "조연" | "악역\",\n        "developmentNote": "이 캐릭터의 이번 화에서의 변화/발전 요약\"\n      }\n    ],\n    "plotlineDevelopment": [\n      {\n        "plotlineName": "관련 플롯라인 이름\",\n        "developmentType": "introduction" | "advancement" | "complication" | "resolution\",\n        "description": "해당 플롯라인의 이번 화에서의 진행 상황 요약\"\n      }\n    ],\n    "chapterEvents": [\n      {\n        "eventType": "CHARACTER_INTRODUCTION" | "PLOT_ADVANCEMENT" | "ROMANCE_DEVELOPMENT" | "CONFLICT_ESCALATION" | "REVELATION" | "CLIFFHANGER" | "CLIFFHANGER_RESOLUTION" | "CHARACTER_DEVELOPMENT" | "WORLD_BUILDING" | "DIALOGUE_SCENE" | "ACTION_SCENE" | "FLASHBACK" | "FORESHADOWING" | "TWIST" | "RESOLUTION\",\n        "description": "사건 요약\",\n        "characterName": "관련 등장인물 이름 (선택사항)\",\n        "plotlineName": "관련 플롯라인 이름 (선택사항)\"\n      }\n    ],\n    "cliffhanger": "다음 화 예고 또는 강력한 클리프행어 문장\",\n    "fixedIssues": [\n      {\n        "originalIssue": "수정된 원본 문제\",\n        "solution": "적용된 해결책\"\n      }\n    ]\n  }\n}\n\`\`\`\n\n**반드시 JSON 형식으로만 응답하고, 일관성 문제들을 자연스럽게 해결한 개선된 장을 만들어주세요!**`;
}

// Helper function to fix unescaped double quotes in JSON string values
function fixUnescapedQuotesInJson(jsonString: string): string {
  // Replace already escaped quotes with a placeholder
  const placeholder = '___ESCAPED_QUOTE___';
  let fixed = jsonString.replace(/\\"/g, placeholder);
  
  // More robust quote fixing - handle nested quotes in string values
  fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
    // If p2 contains quotes, escape them
    const escapedP2 = p2.replace(/"/g, '\\"');
    return `"${p1}${escapedP2}${p3}"`;
  });
  
  // Handle multi-line strings with quotes
  fixed = fixed.replace(/"([^"]*\n[^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
    const escapedP2 = p2.replace(/"/g, '\\"');
    return `"${p1}${escapedP2}${p3}"`;
  });
  
  // Restore the originally escaped quotes
  fixed = fixed.replace(new RegExp(placeholder, 'g'), '\\"');
  
  return fixed;
}

// Enhanced function to clean up malformed JSON
function cleanupMalformedJson(jsonString: string): string {
  // Remove trailing commas and newlines that might break JSON parsing
  let cleaned = jsonString.trim();
  
  // Remove any leading/trailing backticks that might have slipped through
  cleaned = cleaned.replace(/^`+|`+$/g, '');
  
  // Remove any HTML tags that might be present
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove trailing comma followed by newlines or whitespace at the end
  cleaned = cleaned.replace(/,\s*[\n\r]*\s*$/, '');
  
  // Remove any trailing quote-comma-newline patterns that might occur
  cleaned = cleaned.replace(/",\s*[\n\r]*\s*"\s*$/, '"');
  
  // Fix common JSON formatting issues
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas before closing brackets
  cleaned = cleaned.replace(/([}\]]),(\s*[}\]])/g, '$1$2'); // Remove commas between closing brackets
  
  // Find the last proper closing brace and trim everything after it
  let lastBraceIndex = -1;
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBraceIndex = i;
        }
      }
    }
  }
  
  // If we found a proper closing brace, trim everything after it
  if (lastBraceIndex !== -1 && lastBraceIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBraceIndex + 1);
  }
  
  // If the JSON seems truncated, try to complete it
  if (braceCount > 0) {
    // Add missing closing braces
    cleaned += '}'.repeat(braceCount);
  }
  
  return cleaned;
}

// Enhanced JSON parsing with better error handling
function parseJsonWithRecovery(jsonString: string): any {
  const attempts = [
    // Original string
    () => JSON.parse(jsonString),
    // Clean up malformed JSON
    () => JSON.parse(cleanupMalformedJson(jsonString)),
    // Fix quotes and clean up
    () => JSON.parse(cleanupMalformedJson(fixUnescapedQuotesInJson(jsonString))),
    // Try to extract just the main content object
    () => {
      const contentMatch = jsonString.match(/"content":\s*"([^"]+)"/);
      if (contentMatch) {
        return { content: contentMatch[1] };
      }
      throw new Error('Could not extract content');
    },
    // Try to extract any valid JSON object
    () => {
      const matches = jsonString.match(/\{[^{}]*\}/g);
      if (matches && matches.length > 0) {
        return JSON.parse(matches[0]);
      }
      throw new Error('No valid JSON object found');
    }
  ];
  
  let lastError: Error | null = null;
  
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }
  
  throw new Error(`All JSON parsing attempts failed. Last error: ${lastError?.message}`);
}

// Enhanced function to extract and parse JSON from AI response
function extractAndParseJsonFromResponse(response: string): any {
  // Check if the response is HTML (common when API returns error pages)
  const trimmedResponse = response.trim();
  if (trimmedResponse.startsWith('<!DOCTYPE') || trimmedResponse.startsWith('<html') || trimmedResponse.startsWith('<HTML')) {
    console.error('Received HTML response instead of JSON:', trimmedResponse.substring(0, 500));
    throw new Error('AI API returned HTML error page instead of JSON response - likely rate limited or server error');
  }
  
     // Try to extract JSON from markdown code blocks
   const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
   if (jsonMatch && jsonMatch[1]) {
     const jsonText = jsonMatch[1].trim();
     return parseJsonWithRecovery(jsonText);
   }
  
  // Try to extract JSON without markdown blocks
  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    const jsonText = response.substring(firstBrace, lastBrace + 1);
    return parseJsonWithRecovery(jsonText);
  }
  
  // Try to find any JSON-like structure
  const jsonPattern = /\{[\s\S]*?\}/g;
  const matches = response.match(jsonPattern);
  
  if (matches && matches.length > 0) {
    // Try the largest match first
    const sortedMatches = matches.sort((a, b) => b.length - a.length);
    
         for (const match of sortedMatches) {
       try {
         return parseJsonWithRecovery(match);
       } catch {
         continue;
       }
     }
  }
  
  throw new Error('Could not extract valid JSON from AI response');
}

// Helper function for safe JSON parsing (backward compatibility)
function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }
  
  // Check if it's already a valid JSON string by looking for JSON-like structure
  const trimmed = jsonString.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(jsonString);
      // Ensure the parsed value is an array if the default value is an array
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
        console.warn("Parsed value is not an array as expected, returning default:", jsonString);
        return defaultValue;
      }
      return parsed;
    } catch (error) {
      console.error("Failed to parse JSON string, returning default:", jsonString, error);
      return defaultValue;
    }
  } else {
    // It's plain text, handle based on expected return type
    if (typeof defaultValue === 'string' || defaultValue === undefined) {
      return jsonString as T;
    }
    // If we expect an array but have plain text, convert to single-item array
    if (Array.isArray(defaultValue)) {
      return [jsonString] as T;
    }
    console.warn("Expected JSON but found plain text, returning default:", jsonString);
    return defaultValue;
  }
}

// Enhanced validation function for parsed response
function validateParsedResponse(parsedResponse: any): {
  isValid: boolean;
  content: string;
  errors: string[];
} {
  const errors: string[] = [];
  let content = '';
  
  if (!parsedResponse) {
    errors.push('Response is null or undefined');
    return { isValid: false, content, errors };
  }
  
  // Check for content in various possible structures
  if (parsedResponse.content) {
    content = parsedResponse.content;
  } else if (parsedResponse.chapter) {
    content = parsedResponse.chapter;
  } else if (parsedResponse.chapterContent) {
    content = parsedResponse.chapterContent;
  } else if (typeof parsedResponse === 'string') {
    content = parsedResponse;
  } else {
    errors.push('No content found in response');
  }
  
  // Validate content length
  if (content.length < 100) {
    errors.push(`Content too short: ${content.length} characters`);
  }
  
  // Check for truncation indicators
  if (content.includes('이도현의 눈빛') && content.trim().endsWith('이도현의 눈빛')) {
    errors.push('Content appears to be truncated');
  }
  
  // Check for incomplete sentences
  const lastSentence = content.trim().split(/[.!?]/).pop();
  if (lastSentence && lastSentence.length > 50 && !content.trim().match(/[.!?]$/)) {
    errors.push('Content appears to end mid-sentence');
  }
  
  return {
    isValid: errors.length === 0,
    content,
    errors
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateChapterResponse>> {
  try {
    const body = await request.json();
    const { novelId, chapterNumber, targetWordCount, focusCharacters, plotFocus } = createChapterSchema.parse(body);

    // Get novel and related data
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        characters: true,
        plotlines: true,
        chapters: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            content: true, // Fetch content for semantic analysis
            summary: true,
            cliffhanger: true,
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
            events: true,
          },
          take: 20, // Fetch last 20 chapters for richer context
        },
        worldBuilding: true,
      },
    });

    if (!novel) {
      return NextResponse.json({ success: false, error: 'Novel not found' }, { status: 404 });
    }

    const chaptersGeneratedCount = novel.chapters.length;

    // Check if chapter number already exists
    const existingChapter = await prisma.chapter.findUnique({
      where: {
        novelId_number: {
          novelId: novelId,
          number: chapterNumber
        }
      }
    });

    if (existingChapter) {
      return NextResponse.json(
        { success: false, error: `Chapter ${chapterNumber} already exists for this novel` },
        { status: 400 }
      );
    }

    const lastChapter = novel.chapters[novel.chapters.length - 1];
    const lastTwoChapters = novel.chapters.slice(-2); // Get last 2 chapters for better context

    // Validate chapter continuity
    if (chapterNumber > 1 && !lastChapter) {
      return NextResponse.json(
        { success: false, error: `Cannot generate chapter ${chapterNumber} without previous chapters. Please generate previous chapters first.` },
        { status: 400 }
      );
    }

    // Build comprehensive story context for better consistency
    const comprehensiveContext = await storyContextBuilder.buildComprehensiveContext(novelId, chapterNumber - 1);
    
    // Legacy story context for backwards compatibility
    const storyContext = {
      recentEvents: novel.chapters.flatMap(c => (c.events || []).map(e => e.description)).filter((desc): desc is string => typeof desc === 'string' && desc !== null).slice(-50), // Last 50 relevant events
      ongoingPlotThreads: novel.chapters.flatMap(c => (c.plotlineDevelopments || []).filter(pd => pd.developmentType !== 'resolution').map(pd => pd.description)).slice(-20) || [], // Last 20 ongoing plot threads
      characterDevelopments: novel.chapters.flatMap(c => (c.characterUsages || []).map(cu => cu.developmentNotes)).flat().filter((note): note is string => typeof note === 'string' && note !== null).slice(-50) || [], // Last 50 character developments
      previousChapterCliffhanger: lastChapter?.cliffhanger || null,
      // Add actual content from recent chapters for better context
      recentChapterContents: lastTwoChapters.map(c => ({
        number: c.number,
        title: c.title,
        content: c.content ? c.content.substring(0, 1500) + (c.content.length > 1500 ? '...' : '') : '', // Truncate to avoid token limits
        cliffhanger: c.cliffhanger
      })),
      // Add comprehensive context
      comprehensiveContext: comprehensiveContext
    };

    // Get plotline balance recommendations
    const plotlineBalances = await suggestPlotlineBalance(novelId, chapterNumber);
    const plotlineDistributionAnalysis = await analyzePlotlineDistribution(novelId);
    
    // Auto-evolution service
    const autoEvolutionService = new AutoEvolutionService();

    // Build character semantic profiles for proactive consistency checks
    for (const character of novel.characters) {
      try {
        const characterDialogues = novel.chapters.flatMap(c => semanticAnalyzer.extractCharacterBehaviors(c.content || '', character.name).filter(b => b.type === 'dialogue').map(b => b.text));
        const characterActions = novel.chapters.flatMap(c => semanticAnalyzer.extractCharacterBehaviors(c.content || '', character.name).filter(b => b.type === 'action').map(b => b.text));
        const characterEmotions = novel.chapters.flatMap(c => semanticAnalyzer.extractCharacterBehaviors(c.content || '', character.name).filter(b => b.type === 'emotion').map(b => b.text));
        const characterDescriptions = [character.description];

        await semanticAnalyzer.buildCharacterSemanticProfile(
          character.id,
          character.name,
          {
            personality: character.personality,
            dialogues: characterDialogues,
            actions: characterActions,
            emotions: characterEmotions,
            descriptions: characterDescriptions,
          }
        );
      } catch (error) {
        errorMonitor.logError('consistency', `Failed to build semantic profile for character ${character.name}`, error as Error, { novelId, characterId: character.id });
      }
    }

    const generationContext: ChapterContext = {
      genre: novel.genre,
      setting: novel.setting,
      title: novel.title,
      description: novel.description || undefined,
      novelOutline: novel.novelOutline || undefined,
      characters: novel.characters.map(c => ({
        name: c.name,
        description: c.description,
        personality: c.personality,
        background: c.background,
        role: 'supporting' // Default role, refine if needed
      })),
      plotlines: novel.plotlines.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status as PlotStatus // Cast to PlotStatus
      })),
      chapterNumber: chapterNumber,
      chaptersGeneratedCount: chaptersGeneratedCount,
      previousChapterSummary: lastChapter?.summary || undefined,
      targetWordCount: targetWordCount,
      focusCharacters: focusCharacters,
      plotFocus: plotFocus,
      storyContext: {
        recentEvents: storyContext.recentEvents,
        ongoingPlotThreads: storyContext.ongoingPlotThreads,
        characterDevelopments: storyContext.characterDevelopments,
        previousChapterCliffhanger: lastChapter?.cliffhanger || null,
        recentChapterContents: storyContext.recentChapterContents,
        comprehensiveContext: storyContext.comprehensiveContext,
      },
      worldBuilding: novel.worldBuilding ? {
        magicSystem: safeJsonParse(novel.worldBuilding.magicSystem, undefined),
        locations: safeJsonParse(novel.worldBuilding.locations, []),
        cultures: safeJsonParse(novel.worldBuilding.cultures, []),
        rules: safeJsonParse(novel.worldBuilding.rules, []),
      } : undefined,
      plotlineBalance: plotlineBalances,
      plotlineDistribution: plotlineDistributionAnalysis,
    };

    // Generate chapter content with retry logic and consistency checks
    const maxRetries = 3;
    let currentRetry = 0;
    let generatedChapterJson = '';
    let consistencyCheckResult: ConsistencyIssue[] = [];
    let fixedIssues: Array<{ originalIssue: string; solution: string; }> = [];
    let chapterContent: string = ''; // Declare chapterContent at proper scope

    while (currentRetry <= maxRetries) {
      try {
        generatedChapterJson = await generateWithRetry(
          generateChapterPrompt(generationContext),
          3, // maxRetries for this internal call
          true // useModelLong - Use the model with a larger context window
        );

        // Parse JSON from the generated content
        let parsedResponse;
        try {
          parsedResponse = extractAndParseJsonFromResponse(generatedChapterJson);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          console.error('Raw response (first 1000 chars):', generatedChapterJson.substring(0, 1000));
          
          // Check if it's a JSON parsing error on HTML content
          if (parseError instanceof SyntaxError && parseError.message.includes('Unexpected token')) {
            const responseStart = generatedChapterJson.substring(0, 100);
            if (responseStart.includes('<') && responseStart.includes('>')) {
              throw new Error('AI API returned HTML content instead of JSON - likely experiencing rate limiting or server errors');
            }
          }
          
          throw new Error('Failed to parse generated chapter content');
        }

        const validationResult = validateParsedResponse(parsedResponse);
        if (!validationResult.isValid) {
          console.warn(`Generated content failed validation (attempt ${currentRetry + 1}):`, validationResult.errors);
          
          // Check if it's a minor validation issue vs major failure
          const hasMinorIssues = validationResult.errors.every(error => 
            error.includes('too short') || error.includes('truncated')
          );
          
          if (hasMinorIssues && validationResult.content.length > 500) {
            // Use the content even if it has minor issues
            console.warn('Using content despite minor validation issues');
            chapterContent = validationResult.content;
          } else {
            // Create improvement prompt for next attempt
            const improvementPrompt = createImprovementPrompt(
              validationResult.content || 'Previous generation failed', 
              [], // No consistency issues found, but content is invalid
              generationContext
            );
            
            try {
              generatedChapterJson = await generateWithRetry(improvementPrompt, 3, true); // Use model long for improvement prompt as well
              currentRetry++;
              if (currentRetry <= maxRetries) {
                console.log(`Retrying chapter generation due to validation failure... Attempt ${currentRetry}`);
                continue;
              }
            } catch (retryError) {
              console.error('Retry attempt failed:', retryError);
              throw new Error(`Content validation failed and retry unsuccessful: ${validationResult.errors.join(', ')}`);
            }
          }
        } else {
          // Content is valid, proceed with consistency check
          chapterContent = validationResult.content;
        }

        // Perform consistency check only if we have valid content
        if (chapterContent) {
          // Use comprehensive consistency checking
          let automatedConsistencyIssues: ConsistencyIssue[] = [];
          try {
            const storyMemory = await comprehensiveConsistencyManager.buildStoryMemory(novelId);
            
            // Create a temporary chapter object for consistency checking
            const tempChapter = {
              id: 'temp-chapter-' + Date.now(),
              number: chapterNumber,
              content: chapterContent,
              novel: { id: novelId }
            };
            
            automatedConsistencyIssues = await comprehensiveConsistencyManager.checkComprehensiveConsistency(
              tempChapter.id,
              chapterContent,
              storyMemory
            );
          } catch (comprehensiveError) {
            console.warn('Comprehensive consistency check failed, falling back to basic check:', comprehensiveError);
            // Fallback to basic consistency check
            automatedConsistencyIssues = await performContentConsistencyCheck(
              chapterContent,
              novel.characters,
              novel.worldBuilding,
              lastChapter ? { content: lastChapter.content || '', cliffhanger: lastChapter.cliffhanger } : undefined
            );
          }

          let semanticConsistencyIssues: ConsistencyIssue[] = [];
          try {
            const semanticAnalysisResult = await semanticAnalyzer.analyzeChapterSemantics(
              chapterContent,
              chapterNumber,
              novel.characters.map(c => ({ id: c.id, name: c.name })) // Pass only required character info
            );
            semanticConsistencyIssues = semanticAnalysisResult.detectedDeviations.map(deviation => ({
              type: deviation.type.toUpperCase() as 'CHARACTER' | 'PLOT' | 'WORLD_BUILDING' | 'TIMELINE',
              description: deviation.description,
              severity: deviation.severity as 'low' | 'medium' | 'high',
              suggestion: deviation.suggestion,
            }));
            
            // Log semantic insights if any
            if (semanticAnalysisResult.semanticInsights.length > 0) {
              errorMonitor.logInfo('consistency', 'Semantic analysis insights', { novelId, chapterNumber, insights: semanticAnalysisResult.semanticInsights });
            }

          } catch (error) {
            errorMonitor.logError('consistency', 'Semantic analysis failed', error as Error, { novelId, chapterNumber });
          }

          // Combine all consistency issues
          const allConsistencyIssues = [...automatedConsistencyIssues, ...semanticConsistencyIssues];
          consistencyCheckResult = allConsistencyIssues;

          const highSeverityIssues = allConsistencyIssues.filter(issue => issue.severity === 'high');
          const mediumSeverityIssues = allConsistencyIssues.filter(issue => issue.severity === 'medium');

          if (highSeverityIssues.length === 0 && mediumSeverityIssues.length === 0) {
            // No high or medium severity issues, break the retry loop
            console.log(`Chapter generation successful after ${currentRetry + 1} attempts`);
            break;
          } else {
            // If high or medium severity issues exist, prepare for retry
            console.warn(`Consistency issues found (attempt ${currentRetry + 1}):`, allConsistencyIssues.map(i => i.description));
            
            // Create improvement prompt for next attempt
            const improvementPrompt = createImprovementPrompt(
              chapterContent,
              allConsistencyIssues, // Pass all issues for comprehensive improvement
              generationContext
            );
            
            try {
              generatedChapterJson = await generateWithRetry(improvementPrompt, 3, true); // Use model long for improvement prompt as well
              currentRetry++;
              if (currentRetry <= maxRetries) {
                console.log(`Retrying chapter generation due to consistency issues... Attempt ${currentRetry}`);
                fixedIssues = allConsistencyIssues.map(issue => ({
                  originalIssue: issue.description,
                  solution: issue.suggestion || 'AI attempted to resolve the issue.',
                }));
                continue;
              }
            } catch (retryError) {
              console.error('Consistency retry failed:', retryError);
              // Break the loop if retry fails
              break;
            }
          }
        }

      } catch (error) {
        console.error(`Chapter generation attempt ${currentRetry + 1} failed:`, error);
        
        // Enhanced error logging for debugging
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          attempt: currentRetry + 1,
                     context: {
             chapterNumber: generationContext.chapterNumber,
             novelId: novelId,
             targetWordCount: generationContext.targetWordCount
           }
        });
        
        currentRetry++;
        if (currentRetry > maxRetries) {
          throw error; // Re-throw if all retries failed
        }
        
        // Add a progressive delay before retrying
        const delayMs = Math.min(1000 * Math.pow(2, currentRetry - 1), 10000); // Cap at 10 seconds
        console.log(`Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // If we reached here, either no high severity issues were found or max retries reached
    if (currentRetry > maxRetries) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate a consistent chapter after multiple retries' },
        { status: 500 }
      );
    }

    // Parse the final successful response
    const finalParsedResponse = JSON.parse(JSON.stringify(chapterContent ? { content: chapterContent } : {}));
    const finalChapterContent = chapterContent || finalParsedResponse.content;
    const additionalData: AdditionalData = finalParsedResponse.additionalData || {};

    // Generate a better summary if not provided
    let chapterSummary = additionalData.nextEpisodePreview;
    if (!chapterSummary && finalChapterContent) {
      // Create a more informative summary from the chapter content
      const contentLines = finalChapterContent.split('\n').filter(line => line.trim().length > 20);
      const keyLines = contentLines.slice(0, 3).concat(contentLines.slice(-2)); // First 3 and last 2 meaningful lines
      chapterSummary = keyLines.join(' ').substring(0, 500) + '...';
    }

    // Save chapter to database
    const newChapter = await prisma.chapter.create({
      data: {
        novelId: novelId,
        number: chapterNumber,
        title: finalParsedResponse.chapterTitle || `Chapter ${chapterNumber}`,
        content: finalChapterContent,
        wordCount: finalParsedResponse.wordCount || finalChapterContent.length, // Fallback to content length
        summary: chapterSummary,
        cliffhanger: additionalData.cliffhanger || undefined,
      },
    });

    // Save new characters
    const newCharactersCreated: CharacterPlan[] = [];
    if (additionalData.newCharacters && additionalData.newCharacters.length > 0) {
      for (const newChar of additionalData.newCharacters) {
        try {
          const createdChar = await prisma.character.create({
            data: {
              novelId: novel.id,
              name: newChar.name,
              description: newChar.appearance || newChar.description || `A ${newChar.role.toLowerCase()} character`,
              personality: newChar.personality,
              background: newChar.background,
              relationships: JSON.stringify({}), // Initialize empty relationships
            }
          });
          newCharactersCreated.push({
            name: createdChar.name,
            description: createdChar.description,
            personality: createdChar.personality,
            background: createdChar.background,
            role: newChar.role, // Use role from CharacterPlan
            age: newChar.age,
            appearance: newChar.appearance,
            motivation: newChar.motivation,
          });

          // If this new character is also involved in the current chapter, create a CharacterUsage entry
          const charInvolvedInChapter = additionalData.charactersInvolved?.find(ci => ci.name === newChar.name);
          if (charInvolvedInChapter) {
            await prisma.characterUsage.create({
              data: {
                chapterId: newChapter.id,
                characterId: createdChar.id,
                role: charInvolvedInChapter.role as "protagonist" | "antagonist" | "supporting" | "minor",
                developmentNotes: charInvolvedInChapter.developmentNote || '',
              },
            });
          }

          // Create a ChapterEvent for character introduction
          await prisma.chapterEvent.create({
            data: {
              chapterId: newChapter.id,
              characterId: createdChar.id,
              eventType: PrismaEventType.CHARACTER_INTRODUCTION, // Correctly using Prisma's enum member
              description: `New character '${newChar.name}' introduced.`,
              importance: 3,
            },
          });

        } catch (charError) {
          console.error('Error creating new character:', newChar.name, charError);
        }
      }
    }

    // Save chapter events from additionalData
    if (additionalData.chapterEvents && additionalData.chapterEvents.length > 0) {
      for (const eventData of additionalData.chapterEvents) {
        // Find character and plotline IDs if names are provided
        const characterId = eventData.characterName ? novel.characters.find(c => c.name === eventData.characterName)?.id : null;
        const plotlineId = eventData.plotlineName ? novel.plotlines.find(p => p.name === eventData.plotlineName)?.id : null;

        await prisma.chapterEvent.create({
          data: {
            chapterId: newChapter.id,
            characterId: characterId,
            plotlineId: plotlineId,
            eventType: mapToPrismaEventType(eventData.eventType) as PrismaEventType,
            description: eventData.description,
            importance: 1, // Default importance
          },
        });
      }
    }

    // Save character usage
    if (additionalData.charactersInvolved) {
      for (const charData of additionalData.charactersInvolved) {
        const character = novel.characters.find((c) => c.name === charData.name);
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
        const plotline = novel.plotlines.find((p) => p.name === plotData.plotlineName);
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

    // Perform auto-evolution after chapter generation
    const autoEvolutionResult = await autoEvolutionService.performPostChapterEvolution(newChapter.id);

    // Return response
    return NextResponse.json({
      success: true,
      chapter: {
        id: newChapter.id,
        title: newChapter.title,
        content: newChapter.content,
        wordCount: newChapter.wordCount,
        cliffhanger: newChapter.cliffhanger || undefined,
      },
      tracking: {
        charactersUsed: additionalData.charactersInvolved?.map(ci => ({
          characterId: novel.characters.find(c => c.name === ci.name)?.id || '',
          characterName: ci.name,
          role: ci.role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
          appearances: 1, // Assuming first appearance in this context
          developmentNotes: [ci.developmentNote || ''],
          relationshipChanges: [],
        })) || [],
        plotlinesDeveloped: additionalData.plotlineDevelopment?.map(pd => ({
          plotlineName: pd.plotlineName,
          developmentType: pd.developmentType as 'introduction' | 'advancement' | 'complication' | 'resolution',
          description: pd.description,
          significance: pd.significance || 'medium',
        })) || [],
        worldBuildingElements: [], // Not tracking in this example
        newEvents: additionalData.chapterEvents?.map(ce => ({
          eventType: ce.eventType as EventType,
          description: ce.description,
          characterIds: ce.characterName ? [novel.characters.find(c => c.name === ce.characterName)?.id || ''] : [],
          plotlineIds: ce.plotlineName ? [novel.plotlines.find(p => p.name === ce.plotlineName)?.id || ''] : [],
          importance: 1, // Default importance
        })) || [],
      },
      consistencyReport: {
        hasIssues: consistencyCheckResult.length > 0,
        issueCount: consistencyCheckResult.length,
        issues: consistencyCheckResult,
        suggestions: consistencyCheckResult.map(issue => issue.suggestion || '').filter(s => s !== ''),
      },
      metadata: {
        generatedMetadata: undefined, // Not currently used
        additionalData: additionalData,
        improvements: fixedIssues, // Use fixedIssues from the retry loop
      },
      autoEvolution: {
        charactersEvolved: autoEvolutionResult.charactersEvolved.map(c => ({ id: c.id, name: c.name, changes: c.changes })),
        plotlinesAdvanced: autoEvolutionResult.plotlinesAdvanced.map(p => ({ id: p.id, name: p.name, oldStatus: p.oldStatus, newStatus: p.newStatus })),
        worldBuildingUpdated: autoEvolutionResult.worldBuildingUpdated,
      },
    });

  } catch (error) {
    console.error('Chapter generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate chapter' },
      { status: 500 }
    );
  }
}

async function performContentConsistencyCheck(
  content: string,
  characters: Array<{ name: string; personality: string; }>,
  worldBuilding: { magicSystem?: string | null; } | null,
  previousChapter?: { content: string; cliffhanger?: string | null; }
): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];
  
  // Check narrative continuity if previous chapter exists
  if (previousChapter) {
    // Check if cliffhanger is addressed
    if (previousChapter.cliffhanger) {
      const cliffhangerKeywords = previousChapter.cliffhanger.toLowerCase().split(' ').filter(w => w.length > 3);
      const contentLower = content.toLowerCase();
      const cliffhangerAddressed = cliffhangerKeywords.some(keyword => contentLower.includes(keyword));
      
      if (!cliffhangerAddressed) {
        issues.push({
          type: 'PLOT',
          description: `이전 화의 클리프행어가 해결되지 않음: "${previousChapter.cliffhanger}"`,
          severity: 'high',
          suggestion: '이전 화의 클리프행어를 자연스럽게 해결하는 내용을 포함하세요.'
        });
      }
    }
    
    // Check for basic narrative flow
    if (content.length > 100 && !content.toLowerCase().includes('계속') && 
        !content.toLowerCase().includes('이어') && !content.toLowerCase().includes('그런데') &&
        !content.toLowerCase().includes('그때') && !content.toLowerCase().includes('그리고')) {
      issues.push({
        type: 'PLOT',
        description: '이전 챕터와의 연결이 명확하지 않음',
        severity: 'medium',
        suggestion: '이전 챕터의 흐름을 이어받는 연결어나 상황을 포함하세요.'
      });
    }
  }
  
  // Check character consistency
  characters.forEach(character => {
    if (content.includes(character.name)) {
      // Basic check - could be enhanced with semantic analysis
      console.log(`Character ${character.name} appears in chapter`);
    }
  });
  
  if (worldBuilding?.magicSystem) {
    console.log('Magic system exists.');
  }
  
  return issues;
}

// Helper function to map string eventType to Prisma EventType enum
function mapToPrismaEventType(eventTypeString: string): PrismaEventType | undefined {
  switch (eventTypeString) {
    case 'CHARACTER_INTRODUCTION': return PrismaEventType.CHARACTER_INTRODUCTION;
    case 'PLOT_ADVANCEMENT': return PrismaEventType.PLOT_ADVANCEMENT;
    case 'ROMANCE_DEVELOPMENT': return PrismaEventType.ROMANCE_DEVELOPMENT;
    case 'CONFLICT_ESCALATION': return PrismaEventType.CONFLICT_ESCALATION;
    case 'REVELATION': return PrismaEventType.REVELATION;
    case 'CLIFFHANGER': return PrismaEventType.CLIFFHANGER;
    case 'CLIFFHANGER_RESOLUTION': return PrismaEventType.CLIFFHANGER_RESOLUTION;
    case 'CHARACTER_DEVELOPMENT': return PrismaEventType.CHARACTER_DEVELOPMENT;
    case 'WORLD_BUILDING': return PrismaEventType.WORLD_BUILDING;
    case 'DIALOGUE_SCENE': return PrismaEventType.DIALOGUE_SCENE;
    case 'ACTION_SCENE': return PrismaEventType.ACTION_SCENE;
    case 'FLASHBACK': return PrismaEventType.FLASHBACK;
    case 'FORESHADOWING': return PrismaEventType.FORESHADOWING;
    case 'TWIST': return PrismaEventType.TWIST;
    case 'COMPLICATION': return PrismaEventType.COMPLICATION;
    case 'RESOLUTION': return PrismaEventType.RESOLUTION;
    case 'ABILITY_ACQUISITION': return PrismaEventType.ABILITY_ACQUISITION;
    default:
      console.warn(`Unknown event type string: ${eventTypeString}`);
      return undefined;
  }
}