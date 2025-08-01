import { NextRequest, NextResponse } from 'next/server';
import { generateWithRetry } from '@/lib/gemini';
import { generateNovelPlanPrompt } from '@/lib/prompts';
import { NovelPlan } from '@/types';
import { z } from 'zod';

interface SyntaxErrorWithPosition extends SyntaxError {
  position: number;
}

// User-defined type guard for SyntaxError with a position property
function isSyntaxErrorWithPosition(error: unknown): error is SyntaxErrorWithPosition {
  return typeof error === 'object' && error !== null && 'position' in error && typeof (error as SyntaxErrorWithPosition).position === 'number';
}

const generatePlanSchema = z.object({
  genre: z.string(),
  setting: z.string(),
  basicPremise: z.string().min(10).max(500),
  description: z.string().max(1000).optional(),
});

interface ParsedCharacter {
  name?: string;
  age?: number;
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  role?: string;
}

interface ParsedPlotPoint {
  name?: string;
  description?: string;
  order?: number;
  type?: string;
}

interface ParsedWorldBuilding {
  locations?: string[];
  magicSystem?: string;
  socialStructure?: string;
  importantRules?: string[];
}

interface ParsedPlan {
  title?: string;
  synopsis?: string;
  characters?: ParsedCharacter[];
  plotOutline?: ParsedPlotPoint[];
  worldBuilding?: ParsedWorldBuilding;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { genre, setting, basicPremise, description } = generatePlanSchema.parse(body);

    // Generate novel plan using Gemini
    const planPrompt = generateNovelPlanPrompt(genre, setting, basicPremise, description);
    const generatedPlan = await generateWithRetry(planPrompt, 1, true);

    // Parse the generated plan (this would need more sophisticated parsing in production)
    const novelPlan = parseGeneratedPlan(generatedPlan);

    return NextResponse.json({
      success: true,
      plan: novelPlan,
      rawResponse: generatedPlan
    });

  } catch (error) {
    console.error('Novel plan generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    // Check for quota exceeded errors
    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        { success: false, error: 'API quota exceeded. Please try again later or upgrade your Gemini API plan.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Novel plan generation failed' },
      { status: 500 }
    );
  }
}

function parseGeneratedPlan(generatedText: string): NovelPlan {
  let jsonText = generatedText;

  try {
    // Attempt to extract JSON from markdown code blocks first
    const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
    } else {
      // If no markdown code block, try to find the main JSON object directly
      // This is a fallback for cases where the AI doesn't wrap in ```json
      const jsonObjectMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch && jsonObjectMatch[0]) {
        jsonText = jsonObjectMatch[0];
      }
    }

    // Aggressive cleanup: Find the first '{' and the last '}' (or '[' and ']') to ensure
    // we only attempt to parse what's inside a potential JSON object or array.
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    const firstBracket = jsonText.indexOf('[');
    const lastBracket = jsonText.lastIndexOf(']');

    let startIndex = -1;
    let endIndex = -1;

    // Prioritize object or array based on which appears first and closes last
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      startIndex = firstBrace;
      endIndex = lastBrace;
    }

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      if (startIndex === -1 || (firstBracket < startIndex && lastBracket > endIndex)) {
        startIndex = firstBracket;
        endIndex = lastBracket;
      }
    }

    if (startIndex !== -1 && endIndex !== -1) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    }
    
    // Additional cleanup for invisible characters and BOM
    jsonText = jsonText.trim();
    jsonText = jsonText.replace(/^\uFEFF/, ''); // Remove BOM
    // Remove any invisible characters and control characters except common whitespace
    jsonText = jsonText.replace(/[\u200B-\u200D\uFEFF\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    let parsedPlan: ParsedPlan;
    try {
      parsedPlan = JSON.parse(jsonText) as ParsedPlan;
    } catch (parseError: unknown) {
      console.warn('Initial JSON parsing failed after aggressive cleanup, attempting final string repair:', parseError);
      
      // If still failing after aggressive extraction, re-throw to trigger fallback in POST
      throw parseError;
    }
    
    // Validate and transform the parsed data to match NovelPlan interface
    const novelPlan: NovelPlan = {
      title: parsedPlan.title || 'Generated Korean Web Novel',
      synopsis: parsedPlan.synopsis || 'An engaging Korean web novel story.',
      characters: [],
      plotOutline: [],
      worldBuilding: undefined
    };
    
    // Process characters
    if (parsedPlan.characters && Array.isArray(parsedPlan.characters)) {
      novelPlan.characters = parsedPlan.characters.map((char: ParsedCharacter) => ({
        name: char.name || 'Unknown Character',
        age: typeof char.age === 'number' ? char.age : undefined,
        appearance: char.appearance || undefined,
        personality: char.personality || 'Complex personality',
        background: char.background || 'Mysterious background',
        motivation: char.motivation || undefined,
        role: char.role || 'Supporting Character'
      }));
    }
    
    // Process plot outline
    if (parsedPlan.plotOutline && Array.isArray(parsedPlan.plotOutline)) {
      novelPlan.plotOutline = parsedPlan.plotOutline.map((plot: ParsedPlotPoint, index: number) => ({
        name: plot.name || `Plot Arc ${index + 1}`,
        description: plot.description || 'Story development',
        order: typeof plot.order === 'number' ? plot.order : index + 1,
        type: plot.type && ['beginning', 'development', 'climax', 'resolution'].includes(plot.type) 
          ? plot.type as 'beginning' | 'development' | 'climax' | 'resolution'
          : 'development'
      }));
    }
    
    // Process world building
    if (parsedPlan.worldBuilding) {
      novelPlan.worldBuilding = {
        locations: Array.isArray(parsedPlan.worldBuilding.locations) 
          ? parsedPlan.worldBuilding.locations 
          : undefined,
        magicSystem: parsedPlan.worldBuilding.magicSystem || undefined,
        socialStructure: parsedPlan.worldBuilding.socialStructure || undefined,
        importantRules: Array.isArray(parsedPlan.worldBuilding.importantRules) 
          ? parsedPlan.worldBuilding.importantRules 
          : undefined
      };
    }
    
    return novelPlan;
    
  } catch (error: unknown) {
    console.error('Error parsing generated plan:', error);
    console.log('JSON text attempted to parse:', jsonText);
    // Check if the error has a 'position' property (common for JSON.parse errors)
    if (isSyntaxErrorWithPosition(error)) {
      console.log('Character at error position:', jsonText.charAt(error.position));
      console.log('Surrounding text:', jsonText.substring(Math.max(0, error.position - 20), error.position + 20));
    }
    
    // Fallback: Return a basic plan with better defaults
    return {
      title: 'Generated Korean Web Novel',
      synopsis: '흥미진진한 한국 웹소설 이야기가 펼쳐집니다. 주인공의 성장과 모험, 그리고 예상치 못한 반전이 독자들을 사로잡을 것입니다.',
      characters: [
        {
          name: '이민호',
          age: 22,
          personality: '정의감이 강하고 끈기 있는 성격',
          background: '평범한 대학생이었지만 특별한 능력을 각성하게 된다',
          motivation: '소중한 사람들을 지키고 진실을 찾아가는 것',
          role: '주인공'
        },
        {
          name: '박서연',
          age: 20,
          personality: '똑똑하고 용감하지만 때로는 고집이 센',
          background: '명문가 출신으로 뛰어난 능력을 가지고 있다',
          motivation: '가문의 명예를 지키면서도 자신만의 길을 찾는것',
          role: '여주인공'
        },
        {
          name: '김재욱',
          age: 25,
          personality: '냉정하고 계산적이지만 나름의 신념이 있는',
          background: '어둠의 조직에 속해있지만 복잡한 사정이 있다',
          motivation: '과거의 잘못을 만회하고 진정한 구원을 찾는것',
          role: '라이벌/악역'
        }
      ],
      plotOutline: [
        {
          name: '각성의 시작',
          description: '평범했던 주인공이 특별한 능력을 각성하며 새로운 세계에 발을 들이게 된다',
          order: 1,
          type: 'beginning' as const
        },
        {
          name: '시련과 성장',
          description: '능력을 제대로 다루지 못해 겪는 시행착오와 점차 강해져가는 과정',
          order: 2,
          type: 'development' as const
        },
        {
          name: '진실의 발견',
          description: '숨겨진 진실들이 하나씩 드러나며 더 큰 음모의 존재를 깨닫게 된다',
          order: 3,
          type: 'development' as const
        },
        {
          name: '최종 대결',
          description: '모든 것을 건 최후의 싸움과 진정한 선택의 순간',
          order: 4,
          type: 'climax' as const
        },
        {
          name: '새로운 시작',
          description: '갈등이 해결되고 주인공이 한 단계 성장하여 새로운 여정을 시작한다',
          order: 5,
          type: 'resolution' as const
        }
      ],
      worldBuilding: {
        locations: ['현대 도시', '숨겨진 수련장', '고대 유적지'],
        magicSystem: '내면의 기운을 각성시켜 다양한 능력을 발현시키는 시스템',
        socialStructure: '일반인들은 모르는 능력자들의 숨겨진 사회와 조직들',
        importantRules: ['능력 사용시 정신력 소모', '일반인들에게는 비밀유지', '강한 감정이 능력에 영향을 미침']
      }
    };
  }
} 