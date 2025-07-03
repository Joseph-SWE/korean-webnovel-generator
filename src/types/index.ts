export type Genre = 'ROMANCE' | 'FANTASY' | 'MARTIAL_ARTS' | 'MODERN_URBAN' | 'HISTORICAL' | 'ISEKAI' | 'REGRESSION' | 'VILLAINESS' | 'SYSTEM';
export type Setting = 'MODERN_KOREA' | 'HISTORICAL_KOREA' | 'FANTASY_WORLD' | 'MURIM_WORLD' | 'ISEKAI_WORLD' | 'ROYAL_COURT' | 'SCHOOL_OFFICE' | 'POST_APOCALYPTIC';
export type PlotStatus = 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED';
export type EventType = 'CHARACTER_INTRODUCTION' | 'PLOT_ADVANCEMENT' | 'ROMANCE_DEVELOPMENT' | 'CONFLICT_ESCALATION' | 'REVELATION' | 'CLIFFHANGER' | 'CLIFFHANGER_RESOLUTION' | 'CHARACTER_DEVELOPMENT' | 'WORLD_BUILDING' | 'DIALOGUE_SCENE' | 'ACTION_SCENE' | 'FLASHBACK' | 'FORESHADOWING' | 'TWIST' | 'RESOLUTION';

export interface CreateNovelRequest {
  title: string;
  description?: string;
  genre: Genre;
  setting: Setting;
  authorId: string;
  createFromPlan?: boolean;
  novelPlan?: NovelPlan;
}

export interface CreateNovelResponse {
  success: boolean;
  novel?: {
    id: string;
    title: string;
    description?: string;
    genre: Genre;
    setting: Setting;
  };
  tracking?: {
    charactersCreated: CreatedCharacter[];
    plotlinesCreated: CreatedPlotline[];
    worldBuildingCreated: CreatedWorldBuilding[];
    totalElements: number;
  };
  error?: string;
  details?: unknown;
}

export interface CreatedCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  background: string;
}

export interface CreatedPlotline {
  id: string;
  name: string;
  description: string;
  status: PlotStatus;
  priority: number;
  type: 'beginning' | 'development' | 'climax' | 'resolution';
}

export interface CreatedWorldBuilding {
  id: string;
  elementsCreated: string[];
  magicSystemCreated: boolean;
  locationsCreated: boolean;
  culturesCreated: boolean;
  timelineCreated: boolean;
  rulesCreated: boolean;
}

export interface CreateChapterRequest {
  novelId: string;
  chapterNumber: number;
  title: string;
  targetWordCount?: number;
  focusCharacters?: string[];
  plotFocus?: string;
}

export interface GeneratedMetadata {
  genre: string;
  chapterTitle: string;
  author: string;
  date: string;
  wordCount: string;
}

export interface AdditionalData {
  nextEpisodePreview?: string;
  cliffhanger?: string;
  chapterEvents?: Array<{
    eventType: string;
    description: string;
    characterName?: string;
    plotlineName?: string;
  }>;
  charactersInvolved?: Array<{
    name: string;
    role: string;
    developmentNote?: string;
  }>;
  plotlineDevelopment?: Array<{
    plotlineName: string;
    developmentType: string;
    description: string;
  }>;
  fixedIssues?: Array<{
    originalIssue: string;
    solution: string;
  }>;
}

export interface GenerateChapterResponse {
  success: boolean;
  chapter?: {
    id: string;
    title: string;
    content: string;
    wordCount: number;
    cliffhanger?: string;
  };
  tracking?: {
    charactersUsed: CharacterUsage[];
    plotlinesDeveloped: PlotlineDevelopment[];
    worldBuildingElements: WorldBuildingUsage[];
    newEvents: ChapterEventData[];
  };
  consistencyReport?: {
    hasIssues: boolean;
    issueCount: number;
    issues: ConsistencyIssue[];
    suggestions: string[];
    improvementAttempts?: number;
    improvementHistory?: string[];
    redFlagsFixed?: number;
  };
  metadata?: {
    generatedMetadata?: GeneratedMetadata;
    additionalData?: AdditionalData;
    improvements?: Array<{
      originalIssue: string;
      solution: string;
    }>;
  };
  autoEvolution?: {
    charactersEvolved: Array<{ id: string; name: string; changes: string[] }>;
    plotlinesAdvanced: Array<{ id: string; name: string; oldStatus: string; newStatus: string }>;
    worldBuildingUpdated: { updated: boolean; elementsAdded: string[] };
  };
  error?: string;
  details?: unknown;
}

export interface CharacterUsage {
  characterId: string;
  characterName: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  appearances: number;
  developmentNotes: string[];
  relationshipChanges?: string[];
}

export interface PlotlineDevelopment {
  plotlineId?: string;
  plotlineName: string;
  developmentType: 'introduction' | 'advancement' | 'complication' | 'resolution';
  description: string;
  significance: 'low' | 'medium' | 'high';
}

export interface WorldBuildingUsage {
  element: 'location' | 'magic_system' | 'culture' | 'rule' | 'timeline';
  name: string;
  description: string;
  consistency: boolean;
  newInformation?: string;
}

export interface ChapterEventData {
  eventType: EventType;
  description: string;
  characterIds?: string[];
  plotlineIds?: string[];
  importance: number;
}

export interface NovelPlan {
  title: string;
  synopsis: string;
  characters: CharacterPlan[];
  plotOutline: PlotPoint[];
  worldBuilding?: WorldBuildingPlan;
}

export interface CharacterPlan {
  name: string;
  age?: number;
  appearance?: string;
  personality: string;
  background: string;
  motivation?: string;
  role: string;
}

export interface PlotPoint {
  name: string;
  description: string;
  order: number;
  type: 'beginning' | 'development' | 'climax' | 'resolution';
}

export interface WorldBuildingPlan {
  locations?: string[];
  magicSystem?: string;
  socialStructure?: string;
  importantRules?: string[];
}

export interface ConsistencyCheck {
  hasIssues: boolean;
  issues: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  type: 'character' | 'plot' | 'worldbuilding' | 'timeline';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

export interface GenerationSettings {
  targetWordCount: number;
  writingStyle: 'casual' | 'formal' | 'dramatic';
  tropeIntensity: 'low' | 'medium' | 'high';
  focusAreas: string[];
} 