export interface NovelContext {
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
  previousEvents?: string[];
  worldBuilding?: {
    magicSystem?: string;
    locations?: string[];
    cultures?: string;
    rules?: string[];
  };
}

export interface ChapterContext extends NovelContext {
  chapterNumber: number;
  previousChapterSummary?: string;
  targetWordCount: number;
  focusCharacters?: string[];
  plotFocus?: string;
  storyContext?: {
    recentEvents: string[];
    ongoingPlotThreads: string[];
    characterDevelopments: string[];
    previousChapterCliffhanger: string | null;
  };
}

export const KOREAN_WEBNOVEL_SYSTEM_PROMPT = `
당신은 한국 웹소설 전문 작가로, 네이버 웹소설, 카카오페이지, 문피아, 조아라 등 주요 플랫폼의 독자 선호도와 최신 트렌드를 완벽하게 이해하고 있습니다.

**핵심 원칙:**
- 완전히 자연스러운 한국어로 사고하고 작성 (번역투 절대 금지)
- 한국 웹소설 독자들이 기대하는 문체와 클리셰 적극 활용
- 스마트폰 모바일 독서 환경에 최적화된 구성
- 매화 강력한 클리프행어로 다음 화 기대감 조성
- 한국 문화와 사회 맥락을 자연스럽게 반영

**한국 웹소설 필수 특징 (연구 기반):**
1. **모바일 우선 설계**: 1,500-3,000자 단편, 3-5분 내 독서 완료
2. **연재 구조**: 매화 긴밀한 연결성, 최소한의 요약으로도 이해 가능
3. **클리프행어 필수**: TV 드라마처럼 매화 마지막은 반드시 호기심 유발
4. **대화 중심**: 길고 설명적인 서술보다 생생한 대화와 내적 독백
5. **짧은 문단**: 모바일 화면에서 읽기 쉬운 2-3줄 구성

**인기 트렌드 및 트로프 (2024-2025):**

**회귀/환생 (Regression/Reincarnation)** - 절대적 인기:
- 과거 기억을 가진 채 재시작하는 "두 번째 인생"
- 배신당한 기억으로 복수하거나 운명 바꾸기
- 미래 지식 활용해 빠른 성장과 성공 달성
- "이번엔 달라질 거야" 다짐과 실행력

**시스템/게임 요소** - 레벨업의 쾌감:
- RPG 스타일 능력치, 퀘스트, 아이템 시스템
- "시스템이 말했다" 알림창과 상호작용
- 스탯 올리기와 스킬 습득의 성장 과정
- 숨겨진 조건이나 히든 퀘스트 발견

**약자→강자 성장** - 핵심 카타르시스:
- 처음엔 무시받거나 약했던 주인공
- 점진적이지만 확실한 실력 향상
- 과거 무시했던 이들의 놀라는 반응
- 성장 과정에서의 시행착오와 깨달음

**로맨스 역학** (특히 로맨스 판타지):
- 오해와 엇갈림으로 인한 감정적 긴장감
- 신분차이나 운명적 장애물
- "악역 영애" 구원받기 또는 운명 거스르기
- 서서히 마음 열어가는 츤데레 전개

**소프트 메타/장르 전복** - 최신 트렌드:
- 뻔한 클리셰를 의식적으로 비트는 전개
- "원래라면 이랬겠지만..." 하며 다른 선택
- 시스템이나 운명에 반발하는 주인공
- 독자 예상을 살짝 비껴가는 스마트한 전개

**문체 및 표현 가이드:**
- 감정 표현: "가슴이 철렁했다", "심장이 쿵쾅거렸다", "머리가 하얘졌다"
- 자연스러운 대화: "어? 잠깐만", "그런데 말이야", "아니 진짜로?"
- 내적 독백: "라고 생각했다"보다 "'이상하네?' 하는 생각이 들었다"
- 클리셰 적극 활용: "차가운 미소", "뜨거운 시선", "떨리는 목소리"
- 한국어 존댓말 체계: 관계에 따른 정확한 높임법

**장르별 특화 요소:**
- 로맨스: 달콤한 설렘과 아찔한 위기, 감정적 롤러코스터
- 판타지: 체계적인 세계관, 마법/무공 시스템, 모험 요소
- 무림: 문파 갈등, 사제 관계, 무공 수련과 성장
- 현대: 직장/학교 배경, 한국 사회 현실 반영

**독자 기대 충족:**
- 정기 연재: 일정한 업데이트로 독자 기대감 유지
- 댓글 반응: 독자들이 예측하고 토론할 만한 떡밥 제공
- 감정적 몰입: 캐릭터에 애착 가질 수 있는 매력적 설정
- 다음 화 궁금증: 절대 평이하게 끝내지 않기

**절대 금지사항:**
- 영어권에서 번역한 듯한 부자연스러운 표현
- 서양식 이름의 무분별한 사용
- 한국어 어순에 맞지 않는 문장 구조
- 설명 위주의 길고 지루한 서술
- 김빠지는 평이한 마무리
- 한국 문화와 동떨어진 설정이나 대화
`;

export function generateNovelPlanPrompt(
  genre: string, 
  setting: string, 
  basicPremise: string,
  description?: string
): string {
  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**지금부터 ${genre} 장르의 한국 웹소설 기획안을 JSON 형식으로 작성해주세요.**

**기본 설정:**
- 장르: ${genre}
- 배경: ${setting}
- 기본 아이디어: ${basicPremise}
${description ? `- 소설 줄거리: ${description}\n` : ''}

**반드시 아래 JSON 형식으로 응답해주세요. 다른 설명이나 텍스트 없이 순수 JSON만 제공하세요:**

\`\`\`json
{
  "title": "매력적인 한국어 소설 제목",
  "synopsis": "3-4 문단으로 된 상세한 줄거리 (한국어)",
  "characters": [
    {
      "name": "자연스러운 한국 이름",
      "age": 나이(숫자),
      "appearance": "외모 묘사",
      "personality": "성격 특징 (구체적으로)",
      "background": "배경 스토리",
      "motivation": "동기와 목표",
      "role": "주인공/조연/악역 등"
    }
  ],
  "plotOutline": [
    {
      "name": "아크/에피소드 이름",
      "description": "해당 부분의 상세 내용",
      "order": 순서(숫자),
      "type": "beginning/development/climax/resolution"
    }
  ],
  "worldBuilding": {
    "locations": ["주요 장소1", "주요 장소2", "주요 장소3"],
    "magicSystem": "마법/능력 시스템 설명 (해당시)",
    "socialStructure": "사회 구조와 계급",
    "importantRules": ["중요한 세계관 규칙1", "중요한 세계관 규칙2"]
  }
}
\`\`\`

**요구사항:**
1. **캐릭터**: 최소 3-5명의 주요 인물 (주인공, 조연, 악역 포함)
2. **플롯**: 5-7개의 주요 스토리 아크 (beginning, development, climax, resolution 포함)
3. **세계관**: ${setting} 배경에 맞는 구체적인 설정
4. **장르 특화**: ${getGenreSpecificHook(genre)}

**한국 웹소설 독자들이 열광할 만한 매력적인 기획을 JSON으로만 제공해주세요!**`;
}

export function generateChapterPrompt(context: ChapterContext): string {
  const {
    genre,
    setting,
    title,
    characters,
    plotlines,
    chapterNumber,
    previousChapterSummary,
    targetWordCount,
    focusCharacters,
    plotFocus,
    previousEvents,
    worldBuilding,
    storyContext
  } = context;

  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**🔥 중요: 연재 소설의 연속성을 반드시 지켜주세요! 🔥**

**지금부터 "${title}" ${chapterNumber}화를 JSON 형식으로 작성해주세요.**

**작품 기본 정보:**
- 장르: ${genre}
- 배경: ${setting}
- 목표 분량: ${targetWordCount}자 (모바일 독서 최적화)
${context.description ? `- 소설 줄거리: ${context.description}\n` : ''}

**등장인물:**
${characters.map(c => `- **${c.name}**: ${c.description} | 성격: ${c.personality}`).join('\n')}

        **진행 중인 스토리라인:**
        ${plotlines.filter(p => ['INTRODUCED', 'DEVELOPING', 'COMPLICATED', 'CLIMAXING'].includes(p.status)).map(p => `- **${p.name}**: ${p.description}`).join('\n')}

${previousChapterSummary ? `**📖 바로 이전 화 상세 요약:**\n${previousChapterSummary}\n` : ''}

${storyContext?.previousChapterCliffhanger ? `**🎯 이전 화의 클리프행어:**\n"${storyContext.previousChapterCliffhanger}"\n👉 이 클리프행어에서 자연스럽게 이어지는 내용으로 시작하세요!\n` : ''}

${storyContext?.recentEvents && storyContext.recentEvents.length > 0 ? `**⚡ 최근 중요 사건들 (연속성 유지 필수):**\n${storyContext.recentEvents.map(e => `- ${e}`).join('\n')}\n` : ''}

${storyContext?.ongoingPlotThreads && storyContext.ongoingPlotThreads.length > 0 ? `**🧵 진행 중인 플롯 스레드 (계속 발전시켜야 함):**\n${storyContext.ongoingPlotThreads.map(t => `- ${t}`).join('\n')}\n` : ''}

${storyContext?.characterDevelopments && storyContext.characterDevelopments.length > 0 ? `**👥 최근 캐릭터 발전 상황:**\n${storyContext.characterDevelopments.map(d => `- ${d}`).join('\n')}\n` : ''}

${previousEvents && previousEvents.length > 0 ? `**🔄 이전 화에서 일어난 사건들:**\n${previousEvents.map(e => `- ${e}`).join('\n')}\n` : ''}

${worldBuilding ? `**🌍 세계관 설정:**\n${worldBuilding.magicSystem ? `- 마법 시스템: ${worldBuilding.magicSystem}\n` : ''}${worldBuilding.locations ? `- 주요 장소: ${worldBuilding.locations.join(', ')}\n` : ''}${worldBuilding.cultures ? `- 사회/문화: ${worldBuilding.cultures}\n` : ''}${worldBuilding.rules ? `- 중요 규칙: ${worldBuilding.rules.join(', ')}\n` : ''}` : ''}

${focusCharacters && focusCharacters.length > 0 ? `**🎭 이번 화의 주요 등장인물:** ${focusCharacters.join(', ')}\n` : ''}
${plotFocus ? `**📋 이번 화의 주요 플롯:** ${plotFocus}\n` : ''}

**🎯 연속성 유지를 위한 필수 요구사항:**
1. **자연스러운 연결**: 이전 화의 마지막 상황에서 자연스럽게 이어지도록 시작
2. **클리프행어 해결**: 이전 화 클리프행어가 있다면 반드시 그 상황부터 시작
3. **진행 중인 사건 계속**: 위에 언급된 진행 중인 플롯과 사건들을 계속 발전시키기
4. **캐릭터 일관성**: 최근 캐릭터 발전을 반영한 행동과 대사
5. **시간 흐름**: 이전 화와 시간적으로 연결되는 자연스럽게 이어지도록

**📝 작성 요구사항:**
1. **구성**: 한국 웹소설의 일반적인 호흡(2-3줄 문단, 대화 중심)에 맞춰 작성
2. **분량**: 목표 분량 ${targetWordCount}자에 최대한 맞춰주세요
3. **연속성**: 위의 모든 이전 화 정보를 바탕으로 자연스럽게 이어지는 내용
4. **클리프행어**: 반드시 다음 화를 기대하게 만드는 강력한 클리프행어로 마무리
5. **JSON 형식**: 다음 JSON 스키마를 따르세요

\`\`\`json
{
  "metadata": {
    "chapterNumber": ${chapterNumber},
    "title": "${title} ${chapterNumber}화 제목",
    "wordCountTarget": ${targetWordCount},
    "genre": "${genre}",
    "continuityNote": "이전 화와의 연결점 설명"
  },
  "content": {
    "chapter": "여기에 ${chapterNumber}화의 내용이 들어갑니다. 반드시 이전 화의 상황과 자연스럽게 연결되도록 작성해주세요. (목표 분량 ${targetWordCount}자)"
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
    "continuityElements": {
      "resolvedFromPrevious": "이전 화 클리프행어나 상황을 어떻게 해결했는지",
      "ongoingThreads": "이번 화에서 계속 진행된 플롯 스레드들",
      "newDevelopments": "이번 화에서 새롭게 등장한 요소들"
    }
  }
}
\`\`\`

**⚠️ 주의사항:**
- **연속성이 최우선**: 이전 화 정보를 무시하고 완전히 새로운 이야기를 시작하지 마세요
- **클리프행어 필수 해결**: 이전 화 클리프행어가 있다면 반드시 그 상황부터 시작
- **자연스러운 흐름**: 갑작스러운 장면 전환이나 시간 점프 없이 자연스럽게 이어지도록
- **캐릭터 일관성**: 최근 캐릭터 상태와 발전을 반영한 행동과 대사
- **JSON 형식만**: 다른 설명은 추가하지 마세요

**🔥 연재 소설답게 이전 화와 완벽하게 연결되는 ${chapterNumber}화를 만들어주세요!**`;
}

export function generateCharacterPrompt(
  genre: string,
  setting: string,
  characterRole: string,
  relationships?: string[]
): string {
  return `${KOREAN_WEBNOVEL_SYSTEM_PROMPT}

**${genre} 장르의 한국 웹소설 등장인물을 창조해주세요.**

**기본 설정:**
- 장르: ${genre}
- 배경: ${setting}
- 역할: ${characterRole}
${relationships && relationships.length > 0 ? `- 관계성: ${relationships.join(', ')}와 연결됨` : ''}

**한국 웹소설 독자들이 사랑할 매력적인 캐릭터를 만들어주세요:**

## 1. 기본 정보
- **이름**: 자연스러운 한국 이름 (성+이름)
- **나이**: 구체적 나이와 느낌
- **외모**: 독자가 상상하기 쉬운 구체적 묘사
- **직업/신분**: 현재 상황과 사회적 위치

## 2. 성격 및 매력 포인트
- **핵심 성격**: 3-4가지 주요 특징
- **매력 포인트**: 독자가 좋아할 만한 요소들
- **말버릇/특징**: 기억에 남는 독특한 습관
- **약점/콤플렉스**: 인간적 매력을 주는 부분

## 3. 배경 스토리
- **가족 관계**: 중요한 가족 구성원들
- **과거 사건**: 성격 형성에 영향 준 경험
- **현재 상황**: 지금 처한 환경과 고민
- **숨겨진 비밀**: 나중에 드러날 반전 요소

## 4. 관계 역학
- **다른 인물들과 관계**: 주요 인물들과의 케미
- **갈등 요소**: 충돌할 수 있는 부분들
- **성장 파트너**: 함께 변화할 수 있는 관계
${relationships && relationships.length > 0 ? `- **지정된 관계**: ${relationships.join(', ')}와의 구체적 관계 설정` : ''}

## 5. 캐릭터 아크
- **시작점**: 처음 등장할 때 상태
- **변화 과정**: 어떤 경험들을 통해 성장할지
- **최종 목표**: 결국 어떤 모습이 될지
- **독자 임팩트**: 독자들에게 어떤 감정을 줄지

## 6. 장르별 특화 요소
${getGenreSpecificCharacterElements(genre)}

## 7. 대화/행동 패턴
- **말투**: 존댓말/반말, 특별한 어투
- **행동 패턴**: 특징적인 몸짓이나 습관
- **감정 표현**: 기쁨/분노/슬픔을 어떻게 드러내는지
- **스트레스 반응**: 위기 상황에서의 행동

**한국 웹소설 독자 취향에 맞는, 매력적이고 입체적인 캐릭터로 만들어주세요!**`;
}

export function getGenreSpecificHook(genre: string): string {
  const hooks: Record<string, string> = {
    ROMANCE: `
- 첫 만남의 강렬한 인상과 오해
- 신분 차이나 운명적 장애물 설정
- 츤데레 또는 차도남/차도녀 매력
- "이번 생에서는 다르게 살겠다" 다짐`,
    
    FANTASY: `
- 숨겨진 능력이나 특별한 혈통 각성
- 게임 시스템이나 레벨업 요소
- 마왕/용사 구도의 운명적 대립
- 현실에서 이세계로의 환생/전이`,
    
    MARTIAL_ARTS: `
- 폐기된 무공이나 금기시된 기술 습득
- 멸문당한 가문의 복수 서사
- 숨겨진 고수의 제자가 되는 기회
- 무림 최강자를 향한 성장 로드맵`,
    
    REGRESSION: `  
- 죽음 직전 갑작스런 시간 회귀
- 전생의 기억으로 미래 지식 활용
- 배신자들에게 복수할 기회
- "이번엔 모든 걸 바꿔보겠다" 결심`,
    
    ISEKAI: `
- 평범한 일상에서 갑작스런 소환
- 현대 지식으로 이세계에서 무쌍
- 게임 속 캐릭터가 되어버린 상황
- 원작 스토리를 바꿔나가는 변수 역할`,
    
    VILLAINESS: `
- 소설 속 악역으로 빙의된 충격
- 파멸 엔딩을 피하기 위한 필사적 노력  
- 원래 히로인과 다른 매력으로 어필
- 예정된 운명을 거스르는 선택들`,
    
    SYSTEM: `
- 혼자만 보이는 시스템 창 등장
- 퀘스트 완료로 얻는 특별한 보상
- 숨겨진 직업이나 희귀 스킬 획득
- 레벨업과 스탯 분배의 전략적 재미`
  };

  return hooks[genre] || '독특하고 매력적인 설정으로 독자 관심 집중';
}

export function getGenreSpecificCharacterElements(genre: string): string {
  const elements: Record<string, string> = {
    ROMANCE: `
- **로맨틱 어필**: 독자가 설레할 만한 매력 포인트
- **연애 스타일**: 적극적/소극적, 직진/우회 등
- **과거 연애사**: 트라우마나 이상형에 영향 준 경험
- **애정 표현**: 어떤 방식으로 사랑을 표현하는가`,
    
    FANTASY: `
- **마법/능력**: 고유한 특수 능력이나 마법 특성
- **성장 잠재력**: 어디까지 강해질 수 있는가
- **장비/아이템**: 중요한 무기나 마법 도구
- **종족/혈통**: 특별한 출신이나 숨겨진 혈통`,
    
    MARTIAL_ARTS: `
- **무공 계열**: 검법/도법/권법 등 주특기
- **수련 배경**: 어떤 스승이나 문파 출신
- **무림 지위**: 정파/마교/중립 등 소속
- **무도 철학**: 무술에 대한 개인적 신념`,
    
    REGRESSION: `
- **전생 기억**: 어떤 것들을 기억하고 있는가
- **후회 요소**: 바꾸고 싶어하는 과거 선택들
- **복수 리스트**: 응징하고 싶은 대상들
- **성장 계획**: 전생 경험 바탕으로 한 발전 방향`,
    
    ISEKAI: `
- **원래 세계**: 어떤 배경에서 왔는가
- **적응력**: 새 환경에 얼마나 빨리 적응하는가
- **특기 활용**: 현대 지식 중 유용한 부분들
- **귀환 의지**: 원래 세계로 돌아가고 싶어하는가`,
    
    VILLAINESS: `
- **원작 설정**: 원래는 어떤 악역이었는가
- **각성 계기**: 언제부터 변화하기 시작했는가
- **파멸 회피**: 어떤 엔딩을 피하려고 하는가
- **새로운 매력**: 원작과 다른 어필 포인트`,
    
    SYSTEM: `
- **시스템 타입**: 어떤 종류의 시스템을 가졌는가
- **특화 분야**: 전투/생산/서포트 등 주력 분야
- **히든 요소**: 남들은 모르는 시스템 기능
- **성장 목표**: 시스템으로 이루고 싶은 최종 목표`
  };

  return elements[genre] || '장르에 맞는 독특한 설정과 성장 가능성';
}

export const CONSISTENCY_CHECK_PROMPT = `
다음 장(chapter) 내용에서 일관성 문제가 있는지 한국 웹소설 전문가 관점에서 분석해 주세요:

**검토 항목:**
1. **캐릭터 일관성**: 기존 성격/말투/행동 패턴과 일치하는가?
2. **플롯 연속성**: 이전 사건들과 논리적으로 연결되는가?
3. **세계관 준수**: 설정된 규칙/시스템과 모순되지 않는가?
4. **시간선 정확성**: 시간 흐름이나 순서에 오류가 없는가?
5. **관계성 일관성**: 인물 간 관계 설정이 유지되고 있는가?
6. **한국 웹소설 문법**: 장르 관습과 독자 기대에 부합하는가?

**제공된 컨텍스트:**
- 인물 프로필
- 이전 사건들
- 세계관 규칙
- 진행 중인 스토리라인

**장 내용:**
[CHAPTER_CONTENT]

**인물 프로필:**
[CHARACTER_PROFILES]

**세계관 규칙:**
[WORLD_RULES]

**이전 사건들:**
[PREVIOUS_EVENTS]

**일관성 문제를 발견하면 구체적으로 지적하고 수정 방안을 제시해 주세요.**
**특히 한국 웹소설 독자들이 위화감을 느낄 만한 부분들을 중점적으로 체크해 주세요.**
`; 