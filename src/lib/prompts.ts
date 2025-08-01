import { ChapterContext } from '@/types';

export const KOREAN_WEBNOVEL_SYSTEM_PROMPT = `
당신은 한국 웹소설 전문 작가입니다. 네이버 웹소설, 카카오페이지 등 주요 플랫폼의 트렌드를 잘 알고 있습니다.

**핵심 원칙:**
- 완전히 자연스러운 한국어로 작성 (번역투 금지)
- 모바일 독서 환경에 최적화
- 매화 강력한 클리프행어로 마무리
- 한국 문화와 사회 맥락 반영

**JSON 응답 필수 규칙:**
1. 반드시 \`\`\`json 으로 시작하고 \`\`\` 으로 끝나야 함
2. 다른 설명 없이 순수 JSON만 작성
3. 모든 문자열 값은 반드시 큰따옴표(") 사용 (JSON 표준 준수)
4. 텍스트 내부에서 큰따옴표 사용 시 \\" 로 이스케이프
5. 줄바꿈은 \\n 사용
6. JSON 특수문자 { } [ ] : , 를 텍스트 내용에 직접 사용 금지
7. 응답이 길어질 경우 반드시 완전한 JSON 구조로 마무리
8. 중간에 응답이 끊어지지 않도록 주의 (완전한 문장으로 마무리)
9. 최대 응답 길이를 고려하여 적절한 분량으로 작성

**한국 웹소설 특징:**
- 모바일 최적화: 1,500-3,000자 분량
- 대화 중심 구성
- 짧은 문단 (2-3줄)
- 클리프행어 필수
- 감정 표현 풍부
- 캐릭터 간 긴장감 유지

**인기 트렌드:**
- 회귀/환생 (과거 기억으로 운명 바꾸기)
- 시스템/게임 요소 (레벨업, 스탯, 퀘스트)
- 약자→강자 성장 (무시받던 주인공의 역전)
- 로맨스 (오해와 엇갈림, 신분차이)
- 빌런/안티히어로 (복잡한 캐릭터 심리)

**응답 완성도 체크:**
- JSON 구조가 완전히 닫혔는지 확인
- 마지막 문장이 완결되었는지 확인
- 모든 필수 필드가 포함되었는지 확인
- 응답이 중간에 끊어지지 않았는지 확인

**금지사항:**
- 번역투 표현
- 서양식 이름 남용
- 긴 설명 위주 서술
- 평이한 마무리
- JSON 파싱 방해 문자 사용
- 불완전한 응답 (중간에 끊어짐)
- 너무 긴 응답 (토큰 제한 초과)
`;

export const CONSISTENCY_CHECK_PROMPT = `
당신은 한국 웹소설 전문 편집자입니다. 스토리 일관성을 검증해주세요.

**JSON 응답 필수 규칙:**
1. 반드시 \`\`\`json 으로 시작하고 \`\`\` 으로 끝나야 함
2. 다른 설명 없이 순수 JSON만 작성
3. 모든 문자열 값은 반드시 큰따옴표(") 사용 (JSON 표준 준수)
4. 텍스트 내부에서 큰따옴표 사용 시 \\" 로 이스케이프
5. 줄바꿈은 \\n 사용
6. 응답이 완전한 JSON 구조로 마무리되어야 함

**검증 항목:**
1. 캐릭터 일관성 (성격, 말투, 행동 패턴)
2. 플롯 연속성 (이전 챕터와의 연결)
3. 세계관 일관성 (기존 설정과의 모순)
4. 대화 스타일 (캐릭터별 고유 말투)
5. 관계 역학 (캐릭터 간 관계 발전)
6. 감정 흐름 (자연스러운 감정 변화)
7. 시간 흐름 (논리적 시간 경과)

**응답 형식:**
\`\`\`json
{
  "issues": [
    {
      "type": "CHARACTER_CONSISTENCY",
      "severity": "HIGH",
      "description": "문제 설명 (최대 300자)",
      "suggestion": "개선 방안 (최대 200자)",
      "location": "문제 위치 (최대 100자)"
    }
  ],
  "overallAssessment": "전체 평가 (최대 500자)",
  "consistencyScore": 85,
  "recommendations": [
    "구체적인 개선 제안 1",
    "구체적인 개선 제안 2"
  ]
}
\`\`\`

**글자 수 제한을 반드시 준수하고 JSON 구조를 완전히 닫아주세요.**
`;

// Advanced multi-perspective consistency check prompts
export const ADVANCED_CONSISTENCY_PROMPTS = {
  characterPsychology: `
당신은 캐릭터 심리 분석 전문가입니다. 캐릭터의 심리적 일관성을 분석해주세요.

**분석 초점:**
- 내적 동기 vs 외적 행동의 일치성
- 감정 반응의 적절성과 일관성
- 의사결정 패턴의 일관성
- 캐릭터 성장 궤적의 자연스러움
- 트라우마나 과거 경험의 영향

**챕터 내용:**
[CHAPTER_CONTENT]

**캐릭터 프로필:**
[CHARACTER_PROFILES]

**이전 행동 패턴:**
[PREVIOUS_BEHAVIOR_PATTERNS]

**응답 형식:**
\`\`\`json
{
  "psychologyIssues": [
    {
      "character": "캐릭터 이름",
      "issue": "심리적 불일치 문제",
      "severity": "HIGH/MEDIUM/LOW",
      "description": "상세 설명",
      "suggestion": "개선 방안"
    }
  ],
  "overallPsychologyScore": 85,
  "insights": ["심리적 일관성에 대한 통찰"]
}
\`\`\`
`,

  narrativeFlow: `
당신은 서사 구조 전문가입니다. 서사 흐름과 논리적 연결성을 분석해주세요.

**분석 초점:**
- 사건 간 인과관계 연결성
- 정보 공개 타이밍의 적절성
- 긴장감 조성 패턴
- 장면 전환의 매끄러움
- 복선과 회수의 일관성

**챕터 내용:**
[CHAPTER_CONTENT]

**이전 사건들:**
[PREVIOUS_EVENTS]

**플롯라인 상태:**
[PLOTLINE_STATUS]

**응답 형식:**
\`\`\`json
{
  "narrativeIssues": [
    {
      "type": "CAUSALITY/PACING/TRANSITION",
      "issue": "서사 흐름 문제",
      "severity": "HIGH/MEDIUM/LOW",
      "description": "상세 설명",
      "suggestion": "개선 방안"
    }
  ],
  "overallNarrativeScore": 85,
  "insights": ["서사 흐름에 대한 통찰"]
}
\`\`\`
`,

  worldBuilding: `
당신은 세계관 설정 전문가입니다. 세계관의 내적 논리와 일관성을 분석해주세요.

**분석 초점:**
- 기존 규칙 준수 여부
- 내적 논리의 일관성
- 결과의 일관성
- 시스템 간 상호작용의 논리성
- 설정 변경의 적절성

**챕터 내용:**
[CHAPTER_CONTENT]

**세계관 규칙:**
[WORLD_RULES]

**마법/능력 시스템:**
[MAGIC_SYSTEM]

**응답 형식:**
\`\`\`json
{
  "worldBuildingIssues": [
    {
      "type": "RULE_VIOLATION/LOGIC_ERROR/INCONSISTENCY",
      "issue": "세계관 문제",
      "severity": "HIGH/MEDIUM/LOW",
      "description": "상세 설명",
      "suggestion": "개선 방안"
    }
  ],
  "overallWorldBuildingScore": 85,
  "insights": ["세계관 일관성에 대한 통찰"]
}
\`\`\`
`,

  emotionalTone: `
당신은 감정 톤 분석 전문가입니다. 감정적 일관성과 톤의 적절성을 분석해주세요.

**분석 초점:**
- 감정 변화의 자연스러움
- 상황과 감정의 일치성
- 캐릭터별 감정 표현의 일관성
- 분위기 조성의 적절성
- 감정적 영향의 지속성

**챕터 내용:**
[CHAPTER_CONTENT]

**이전 감정 상태:**
[PREVIOUS_EMOTIONAL_STATE]

**캐릭터 감정 베이스라인:**
[CHARACTER_EMOTIONAL_BASELINE]

**응답 형식:**
\`\`\`json
{
  "emotionalIssues": [
    {
      "type": "EMOTIONAL_INCONSISTENCY/TONE_MISMATCH",
      "issue": "감정 톤 문제",
      "severity": "HIGH/MEDIUM/LOW",
      "description": "상세 설명",
      "suggestion": "개선 방안"
    }
  ],
  "overallEmotionalScore": 85,
  "insights": ["감정 일관성에 대한 통찰"]
}
\`\`\`
`
};

export function generateNovelPlanPrompt(
  genre: string, 
  setting: string, 
  basicPremise: string,
  description?: string
): string {
  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**소설 기획 요청:**
- 장르: ${genre}
- 배경: ${setting}
- 기본 아이디어: ${basicPremise}
${description ? `- 줄거리: ${description}\n` : ''}

**요구사항:**
- 매력적인 한국 웹소설 기획안 작성
- 캐릭터 3-5명 (주인공, 조연, 악역 포함)
- 플롯 5-7개 (beginning, development, climax, resolution)
- ${genre} 장르 특성 반영

**응답 형식 (이 형식을 정확히 따라주세요):**
\`\`\`json
{
  "title": "소설 제목 (최대 100자)",
  "synopsis": "상세 줄거리 (최대 2000자)",
  "novelOutline": "핵심 줄거리 요약 (최대 1000자)",
  "characters": [
    {
      "name": "캐릭터 이름 (최대 50자)",
      "age": 25,
      "appearance": "외모 묘사 (최대 500자)",
      "personality": "성격 특징 (최대 800자)",
      "background": "배경 스토리 (최대 1000자)",
      "motivation": "동기와 목표 (최대 500자)",
      "role": "주인공/조연/악역 (최대 50자)"
    }
  ],
  "plotOutline": [
    {
      "name": "아크 이름 (최대 100자)",
      "description": "상세 내용 (최대 800자)",
      "order": 1,
      "type": "beginning"
    }
  ],
  "worldBuilding": {
    "locations": ["장소1", "장소2"],
    "magicSystem": "마법/능력 시스템 (최대 1000자)",
    "socialStructure": "사회 구조 (최대 800자)",
    "importantRules": ["규칙1", "규칙2"]
  }
}
\`\`\`

**중요: 글자 수 제한을 반드시 준수하고, 위 JSON 형식을 정확히 따라주세요.**`;
}

export function generateChapterPrompt(context: ChapterContext): string {
  const {
    genre,
    setting,
    title,
    novelOutline,
    characters,
    chapterNumber,
    previousChapterSummary,
    targetWordCount,
    focusCharacters,
    plotFocus,
    worldBuilding,
    plotlineBalance,
    storyContext
  } = context;

  // Simplify plotline instructions
  let plotlineInstructions = '';
  if (plotlineBalance && plotlineBalance.length > 0) {
    const urgentPlotlines = plotlineBalance.filter(p => p.needsAttention);
    if (urgentPlotlines.length > 0) {
      plotlineInstructions = `\n**발전시켜야 할 플롯라인:**\n`;
      urgentPlotlines.forEach(p => {
        plotlineInstructions += `- ${p.name}: ${p.description}\n`;
      });
    }
  }

  // Simplify character context
  const characterList = characters.map(char => 
    `- ${char.name}: ${char.personality} (Role: ${char.role})`
  ).join('\n');

  // Enhance world building
  const worldBuildingContext = worldBuilding ? 
    `\n**세계관:**\n` +
    `  마법/능력 시스템: ${worldBuilding.magicSystem || '없음'}\n` +
    `  주요 장소: ${(worldBuilding.locations?.length || 0) > 0 ? worldBuilding.locations?.join(', ') : '없음'}\n` +
    `  문화/사회 구조: ${worldBuilding.cultures || '없음'}\n` +
    `  중요 규칙: ${(worldBuilding.rules?.length || 0) > 0 ? worldBuilding.rules?.join(', ') : '없음'}` : '';

  // Build comprehensive story context for narrative continuity
  let narrativeContinuityContext = '';
  if (storyContext) {
    // Check if this is the first chapter
    const isFirstChapter = chapterNumber === 1 || !storyContext.recentChapterContents || storyContext.recentChapterContents.length === 0;
    
    // Use comprehensive context if available
    if (storyContext.comprehensiveContext) {
      // Generate comprehensive context directly here to avoid circular imports
      narrativeContinuityContext = generateComprehensiveContextPrompt(storyContext.comprehensiveContext);
    }
    
    // Fallback to legacy context if comprehensive context is not available
    if (!narrativeContinuityContext) {
      // Fallback to legacy context
      if (isFirstChapter) {
        narrativeContinuityContext += '\n**📘 첫 번째 챕터 작성 가이드**\n';
        narrativeContinuityContext += '- 주인공과 세계관을 자연스럽게 소개하세요\n';
        narrativeContinuityContext += '- 흥미로운 상황으로 독자의 관심을 끌어주세요\n';
        narrativeContinuityContext += '- 앞으로 전개될 이야기에 대한 기대감을 조성하세요\n';
      } else {
        narrativeContinuityContext += '\n**🔥 중요: 스토리 연속성 유지 필수! 🔥**\n';
      }
      
      // Recent chapter contents for better context
      if (storyContext.recentChapterContents && storyContext.recentChapterContents.length > 0) {
        narrativeContinuityContext += `\n**📖 최근 챕터들 (연속성 참고):**\n`;
        storyContext.recentChapterContents.forEach((chapter) => {
          narrativeContinuityContext += `\n**${chapter.number}화: ${chapter.title}**\n`;
          if (chapter.content) {
            // Show key parts of the chapter content
            const contentPreview = chapter.content.substring(0, 800);
            narrativeContinuityContext += `내용: ${contentPreview}${chapter.content.length > 800 ? '...' : ''}\n`;
          }
          if (chapter.cliffhanger) {
            narrativeContinuityContext += `클리프행어: "${chapter.cliffhanger}"\n`;
          }
        });
        narrativeContinuityContext += `\n💡 위 챕터들의 흐름을 이어받아 자연스럽게 계속하세요.\n`;
      }
      
      // Previous chapter cliffhanger resolution
      if (storyContext.previousChapterCliffhanger) {
        narrativeContinuityContext += `\n**⚡ 이전 화 클리프행어 (반드시 해결하세요):**\n"${storyContext.previousChapterCliffhanger}"\n`;
        narrativeContinuityContext += `❗ 이 클리프행어를 자연스럽게 해결하면서 ${chapterNumber}화를 시작하세요.\n`;
      }

      // Recent story events for context
      if (storyContext.recentEvents && storyContext.recentEvents.length > 0) {
        narrativeContinuityContext += `\n**📚 최근 스토리 흐름 (연속성 유지):**\n`;
        storyContext.recentEvents.slice(-10).forEach((event, index) => {
          narrativeContinuityContext += `${index + 1}. ${event}\n`;
        });
        narrativeContinuityContext += `\n💡 위 사건들의 연속선상에서 이야기를 이어가세요.\n`;
      }

      // Ongoing plot threads
      if (storyContext.ongoingPlotThreads && storyContext.ongoingPlotThreads.length > 0) {
        narrativeContinuityContext += `\n**🧵 진행 중인 플롯 라인들:**\n`;
        storyContext.ongoingPlotThreads.slice(-8).forEach((thread, index) => {
          narrativeContinuityContext += `${index + 1}. ${thread}\n`;
        });
        narrativeContinuityContext += `\n💡 이러한 플롯 라인들을 고려하여 스토리를 발전시키세요.\n`;
      }

      // Character developments
      if (storyContext.characterDevelopments && storyContext.characterDevelopments.length > 0) {
        narrativeContinuityContext += `\n**👥 캐릭터 발전 상황:**\n`;
        storyContext.characterDevelopments.slice(-8).forEach((development, index) => {
          narrativeContinuityContext += `${index + 1}. ${development}\n`;
        });
        narrativeContinuityContext += `\n💡 캐릭터들의 이전 발전 상황을 유지하며 이야기하세요.\n`;
      }
    }
  }

  // Check if this is the first chapter for conditional prompt
  const isFirstChapter = chapterNumber === 1 || !storyContext?.recentChapterContents || storyContext.recentChapterContents.length === 0;
  
  const continuityHeader = isFirstChapter 
    ? '**📘 첫 번째 챕터를 매력적으로 시작하세요!**'
    : '**🚨 절대 필수사항: 이전 챕터에서 자연스럽게 이어지는 연속된 이야기를 작성하세요! 🚨**\n**새로운 이야기나 독립적인 에피소드를 만들지 마세요. 반드시 기존 스토리의 연속이어야 합니다.**';

  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

${continuityHeader}

**소설 정보:**
- 제목: ${title}
- 장르: ${genre}
- 배경: ${setting}
- 챕터: ${chapterNumber}화
${novelOutline ? `- 전체 줄거리: ${novelOutline}\n` : ''}

**등장인물:**
${characterList}

${plotlineInstructions}
${worldBuildingContext}
${narrativeContinuityContext}

**이전 챕터:** ${previousChapterSummary || '없음'}
**목표 글자 수:** ${targetWordCount || 2000}자
**중심 인물:** ${focusCharacters?.join(', ') || '없음'}
**플롯 초점:** ${plotFocus || '없음'}

**요구사항:**
${isFirstChapter ? 
  `1. 📘 **첫 챕터 작성**: 매력적인 시작으로 독자를 사로잡기
2. 🎭 **캐릭터 소개**: 주인공과 주요 인물들을 자연스럽게 소개
3. 🌍 **세계관 제시**: 배경과 설정을 독자가 이해하기 쉽게 설명
4. 🎯 **갈등 제시**: 앞으로 전개될 이야기의 중심 갈등이나 목표 암시` :
  `1. 🔥 **연속성 최우선**: ${chapterNumber}화는 이전 챕터의 직접적인 연속이어야 함
2. 🎯 **클리프행어 해결**: 위에 명시된 클리프행어나 진행 중인 사건들을 반드시 다루고 해결
3. 📖 **기존 컨텍스트 유지**: 위에 제공된 최근 챕터들의 상황을 그대로 이어받기
4. ❌ **금지사항**: 새로운 시작, 독립적 에피소드, 기존 상황 무시 절대 금지`}
5. 강력한 클리프행어로 마무리
6. 모바일 최적화 (짧은 문단, 대화 중심)
7. 문단 구분: \\n\\n 사용
8. 대화 구분: \\n 사용
9. 캐릭터 일관성 유지 - 이전 발전 상황과 성격 유지

**응답 형식 (이 형식을 정확히 따라주세요):**
\`\`\`json
{
  "chapterTitle": "챕터 제목 (최대 80자)",
  "content": "챕터 내용 (문단 구분 \\n\\n, 대화 구분 \\n)",
  "wordCount": 2000,
  "cliffhanger": "클리프행어 (최대 200자)",
  "additionalData": {
    "chapterEvents": [
      {
        "eventType": "PLOT_ADVANCEMENT",
        "description": "사건 설명 (최대 500자)",
        "characterName": "관련 인물 (최대 50자)",
        "plotlineName": "플롯라인 (최대 100자)"
      }
    ],
    "charactersInvolved": [
      {
        "name": "인물 이름 (최대 50자)",
        "role": "protagonist",
        "developmentNote": "인물 변화 메모 (최대 300자)"
      }
    ],
    "plotlineDevelopment": [
      {
        "plotlineName": "플롯라인 이름 (최대 100자)",
        "developmentType": "advancement",
        "description": "발전 내용 (최대 500자)",
        "significance": "medium"
      }
    ],
    "newCharacters": []
  }
}
\`\`\`

**유효한 eventType:** CHARACTER_INTRODUCTION, PLOT_ADVANCEMENT, ROMANCE_DEVELOPMENT, CONFLICT_ESCALATION, REVELATION, CLIFFHANGER, CHARACTER_DEVELOPMENT, WORLD_BUILDING, DIALOGUE_SCENE, ACTION_SCENE, TWIST, RESOLUTION

**중요: 글자 수 제한을 반드시 준수하고, 위 JSON 형식을 정확히 따라주세요.**`;
}

export function generateCharacterPrompt(
  genre: string,
  setting: string,
  characterRole: string,
  relationships?: string[]
): string {
  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**캐릭터 생성 요청:**
- 장르: ${genre}
- 배경: ${setting}
- 역할: ${characterRole}
${relationships ? `- 관계: ${relationships.join(', ')}\n` : ''}

**요구사항:**
- ${characterRole} 역할에 맞는 매력적인 캐릭터
- 한국 웹소설 독자가 좋아할 설정
- 구체적인 성격과 배경 스토리

**응답 형식 (이 형식을 정확히 따라주세요):**
\`\`\`json
{
  "name": "캐릭터 이름 (최대 50자)",
  "age": 25,
  "appearance": "외모 묘사 (최대 500자)",
  "personality": "성격 특징 (최대 800자)",
  "background": "배경 스토리 (최대 1000자)",
  "motivation": "동기와 목표 (최대 500자)",
  "role": "${characterRole} (최대 50자)"
}
\`\`\`

**중요: 글자 수 제한을 반드시 준수하고, 위 JSON 형식을 정확히 따라주세요.**`;
}

export function getGenreSpecificHook(genre: string): string {
  switch (genre) {
    case 'ROMANCE':
      return '독자들이 설렘을 느낄 로맨틱한 순간과 긴장감 있는 관계 변화';
    case 'FANTASY':
      return '독창적인 마법 시스템, 종족, 세계관 설정';
    case 'MARTIAL_ARTS':
      return '화려한 무공 액션, 강호의 의리와 배신';
    case 'MODERN_URBAN':
      return '현실에 기반한 공감 가는 인물과 사회적 메시지';
    case 'HISTORICAL':
      return '역사적 배경을 살린 고증과 흥미로운 재해석';
    case 'ISEKAI':
      return '이세계 전이/환생 후 현대 지식을 활용한 성장과 먼치킨 전개';
    case 'REGRESSION':
      return '회귀 후 과거의 후회를 바로잡고 미래를 개척하는 주인공의 노력';
    case 'VILLAINESS':
      return '악역 영애로 빙의/회귀 후 파멸을 피하고 운명을 개척하는 전개';
    case 'SYSTEM':
      return '레벨업, 스탯, 스킬 등 게임 시스템을 통한 주인공의 압도적인 성장과 성취';
    default:
      return '';
  }
}

export function getGenreSpecificCharacterElements(genre: string): string {
  switch (genre) {
    case 'ROMANCE':
      return '독자들이 사랑에 빠질 매력적인 외모와 성격, 그리고 흥미로운 서브 남주/여주';
    case 'FANTASY':
      return '다양한 종족 (엘프, 드워프, 마족 등)과 능력을 가진 인물';
    case 'MARTIAL_ARTS':
      return '강력한 무공과 독특한 문파 배경을 가진 무림 고수';
    case 'MODERN_URBAN':
      return '현실에 있을 법한 직업과 고민을 가진 인물, 그리고 숨겨진 초능력자나 재벌 2세';
    case 'HISTORICAL':
      return '역사적 인물을 재해석하거나 그 시대상에 맞는 독특한 캐릭터';
    case 'ISEKAI':
      return '이세계에서 특별한 능력이나 치트키를 가진 먼치킨 또는 성장형 인물';
    case 'REGRESSION':
      return '회귀 전의 기억을 활용하여 상황을 타개하고 성장하는 인물';
    case 'VILLAINESS':
      return '원작의 악역 영애로서의 운명을 거스르고 자신만의 길을 개척하는 입체적인 인물';
    case 'SYSTEM':
      return '시스템의 선택을 받거나 시스템을 역이용하는 비범한 인물';
    default:
      return '매력적인 새로운 인물';
  }
}

// Generate context prompt from comprehensive context data
function generateComprehensiveContextPrompt(context: {
  mainCharacters?: Array<{
    name: string;
    corePersonality: string;
    currentGoals?: string[];
    recentDevelopment?: string;
    relationships?: Record<string, string>;
  }>;
  activePlotThreads?: Array<{
    name: string;
    currentStatus: string;
    lastDevelopment: string;
    urgency: 'high' | 'medium' | 'low';
    nextExpectedDevelopment: string;
  }>;
  worldRules?: Array<{
    rule: string;
    limitations?: string[];
  }>;
  recentFlow?: Array<{
    chapterNumber: number;
    contentSummary: string;
    keyEvents?: string[];
    characterDevelopments?: string[];
    plotAdvances?: string[];
    cliffhanger?: string;
  }>;
  unresolved?: {
    mysteries?: string[];
    promises?: string[];
    conflicts?: string[];
  };
}): string {
  let prompt = '\n**🎯 COMPREHENSIVE STORY CONTEXT (MAINTAIN ALL CONSISTENCY) 🎯**\n\n';
  
  // Main Characters
  if (context.mainCharacters && context.mainCharacters.length > 0) {
    prompt += '**👥 MAIN CHARACTERS (personality must remain consistent):**\n';
    context.mainCharacters.forEach((char) => {
      prompt += `• **${char.name}**: ${char.corePersonality}\n`;
      if (char.currentGoals && char.currentGoals.length > 0) {
        prompt += `  Goals: ${char.currentGoals.join(', ')}\n`;
      }
      if (char.recentDevelopment) {
        prompt += `  Recent: ${char.recentDevelopment}\n`;
      }
      if (char.relationships && Object.keys(char.relationships).length > 0) {
        prompt += `  Relationships: ${Object.entries(char.relationships).map(([name, rel]) => `${name} (${rel})`).join(', ')}\n`;
      }
    });
    prompt += '\n';
  }
  
  // Active Plot Threads
  if (context.activePlotThreads && context.activePlotThreads.length > 0) {
    prompt += '**🧵 ACTIVE PLOT THREADS (must be addressed):**\n';
    context.activePlotThreads.forEach((thread) => {
      const urgencyIcon = thread.urgency === 'high' ? '🚨' : thread.urgency === 'medium' ? '⚠️' : '📌';
      prompt += `${urgencyIcon} **${thread.name}** (${thread.currentStatus})\n`;
      prompt += `  Last: ${thread.lastDevelopment}\n`;
      prompt += `  Next: ${thread.nextExpectedDevelopment}\n`;
    });
    prompt += '\n';
  }
  
  // World Rules
  if (context.worldRules && context.worldRules.length > 0) {
    prompt += '**🌍 WORLD RULES (never violate these):**\n';
    context.worldRules.forEach((rule) => {
      prompt += `• ${rule.rule}\n`;
      if (rule.limitations && rule.limitations.length > 0) {
        prompt += `  Limitations: ${rule.limitations.join(', ')}\n`;
      }
    });
    prompt += '\n';
  }
  
  // Recent Flow
  if (context.recentFlow && context.recentFlow.length > 0) {
    prompt += '**📖 RECENT STORY FLOW (continue this flow):**\n';
    context.recentFlow.forEach((flow) => {
      prompt += `\n**Chapter ${flow.chapterNumber}:**\n`;
      prompt += `Summary: ${flow.contentSummary}\n`;
      if (flow.keyEvents && flow.keyEvents.length > 0) {
        prompt += `Key Events: ${flow.keyEvents.join(', ')}\n`;
      }
      if (flow.characterDevelopments && flow.characterDevelopments.length > 0) {
        prompt += `Character Growth: ${flow.characterDevelopments.join(', ')}\n`;
      }
      if (flow.plotAdvances && flow.plotAdvances.length > 0) {
        prompt += `Plot Advances: ${flow.plotAdvances.join(', ')}\n`;
      }
      if (flow.cliffhanger) {
        prompt += `Cliffhanger: "${flow.cliffhanger}"\n`;
      }
    });
    prompt += '\n';
  }
  
  // Unresolved Elements
  const hasUnresolved = (context.unresolved?.mysteries?.length || 0) > 0 || 
                       (context.unresolved?.promises?.length || 0) > 0 || 
                       (context.unresolved?.conflicts?.length || 0) > 0;
  
  if (hasUnresolved && context.unresolved) {
    prompt += '**❗ UNRESOLVED ELEMENTS (address these eventually):**\n';
    if (context.unresolved.mysteries && context.unresolved.mysteries.length > 0) {
      prompt += `Mysteries: ${context.unresolved.mysteries.join(', ')}\n`;
    }
    if (context.unresolved.promises && context.unresolved.promises.length > 0) {
      prompt += `Promises: ${context.unresolved.promises.join(', ')}\n`;
    }
    if (context.unresolved.conflicts && context.unresolved.conflicts.length > 0) {
      prompt += `Conflicts: ${context.unresolved.conflicts.join(', ')}\n`;
    }
    prompt += '\n';
  }
  
  // Consistency Requirements
  prompt += '**🎯 CRITICAL CONSISTENCY REQUIREMENTS:**\n';
  prompt += '• Characters MUST behave according to their established personalities\n';
  prompt += '• World rules MUST be followed without exception\n';
  prompt += '• Plot threads MUST be addressed and not abandoned\n';
  prompt += '• Timeline MUST be logical and consistent\n';
  prompt += '• Previous events MUST have logical consequences\n';
  prompt += '• Character relationships MUST evolve naturally\n\n';
  
  return prompt;
} 