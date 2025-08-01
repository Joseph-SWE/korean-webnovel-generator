import { prisma } from '@/lib/db';
import { generateWithRetry } from '@/lib/gemini';

interface CharacterEvolutionChange {
  field: 'description' | 'personality' | 'background';
  originalValue: string;
  newValue: string;
  reason: string;
}

interface CharacterEvolutionData {
  shouldUpdate: boolean;
  changes: CharacterEvolutionChange[];
  evolutionSummary: string;
}

interface CharacterUsage {
  developmentNotes: string | null;
  chapter: {
    number: number;
    title: string;
  };
}

interface PlotlineDevelopment {
  developmentType: string;
  chapter: {
    number: number;
    title: string;
  };
}

interface WorldBuildingElements {
  locations?: string[];
  rules?: string[];
  cultures?: string;
  magicSystem?: string;
}

interface CharacterUpdateData {
  description?: string;
  personality?: string;
  background?: string;
}

interface WorldBuildingUpdateData {
  locations?: string;
  rules?: string;
  cultures?: string;
  magicSystem?: string;
}

export class AutoEvolutionService {
  
  /**
   * Helper function for safe JSON parsing - returns string[] for arrays, string for text
   */
  private safeJsonParseArray(jsonString: string | null | undefined): string[] {
    if (!jsonString) {
      return [];
    }
    
    // Check if it's already a valid JSON string by looking for JSON-like structure
    const trimmed = jsonString.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        console.warn("Parsed value is not an array as expected, returning single item array:", jsonString);
        return [jsonString];
      } catch (error) {
        console.error("Failed to parse JSON string, returning single item array:", jsonString, error);
        return [jsonString];
      }
    } else {
      // It's plain text, convert to single-item array
      return [jsonString];
    }
  }

  /**
   * Automatically evolve character data based on their development notes from chapters
   */
  async evolveCharacterData(characterId: string): Promise<{ updated: boolean; changes: string[] }> {
    try {
      // Get character with recent development notes
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          usages: {
            where: {
              developmentNotes: {
                not: null
              }
            },
            include: {
              chapter: {
                select: {
                  number: true,
                  title: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10 // Last 10 development notes
          }
        }
      });

      if (!character || character.usages.length === 0) {
        return { updated: false, changes: [] };
      }

      // Analyze development notes for character evolution
      const developmentNotes = character.usages
        .filter((u: CharacterUsage) => u.developmentNotes)
        .map((u: CharacterUsage) => `Chapter ${u.chapter.number}: ${u.developmentNotes}`)
        .join('\n');

      const evolutionPrompt = `
당신은 한국 웹소설 캐릭터 분석 전문가입니다. 
다음 캐릭터의 발전 과정을 분석하고 업데이트된 캐릭터 프로필을 제안해주세요.

**현재 캐릭터:**
이름: ${character.name}
설명: ${character.description}
성격: ${character.personality}
배경: ${character.background}

**캐릭터 발전 기록:**
${developmentNotes}

**지시사항:**
1. 발전 기록을 바탕으로 캐릭터의 성격이나 설명이 어떻게 변화했는지 분석
2. 자연스러운 캐릭터 발전을 반영한 업데이트된 프로필 제안
3. 기존 핵심 특성은 유지하되, 성장과 변화를 적절히 반영

JSON 형식으로 응답해주세요:
{
  "shouldUpdate": true/false,
  "changes": [
    {
      "field": "description" | "personality" | "background",
      "originalValue": "기존 값",
      "newValue": "새로운 값",
      "reason": "변경 이유"
    }
  ],
  "evolutionSummary": "캐릭터 발전 요약"
}
`;

      const evolutionResponse = await generateWithRetry(evolutionPrompt, 2, true);
      
      // Parse response
      const jsonMatch = evolutionResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        console.error('Failed to parse character evolution response');
        return { updated: false, changes: [] };
      }

      const evolutionData: CharacterEvolutionData = JSON.parse(jsonMatch[1]);
      
      if (!evolutionData.shouldUpdate || evolutionData.changes.length === 0) {
        return { updated: false, changes: [] };
      }

      // Apply changes
      const updateData: CharacterUpdateData = {};
      const changeDescriptions: string[] = [];

      for (const change of evolutionData.changes) {
        if (['description', 'personality', 'background'].includes(change.field)) {
          updateData[change.field] = change.newValue;
          changeDescriptions.push(`${change.field}: ${change.reason}`);
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.character.update({
          where: { id: characterId },
          data: updateData
        });

        return { updated: true, changes: changeDescriptions };
      }

      return { updated: false, changes: [] };

    } catch (error) {
      console.error('Character evolution error:', error);
      return { updated: false, changes: [] };
    }
  }

  /**
   * Automatically advance plotline status based on developments
   */
  async advancePlotlineStatus(plotlineId: string): Promise<{ updated: boolean; oldStatus: string; newStatus: string }> {
    try {
      // Get plotline with recent developments
      const plotline = await prisma.plotline.findUnique({
        where: { id: plotlineId },
        include: {
          developments: {
            include: {
              chapter: {
                select: {
                  number: true,
                  title: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5 // Last 5 developments
          }
        }
      });

      if (!plotline || plotline.developments.length === 0) {
        return { updated: false, oldStatus: '', newStatus: '' };
      }

      // Analyze development patterns
      const recentDevelopments = plotline.developments;
      const developmentTypes = recentDevelopments.map((d: PlotlineDevelopment) => d.developmentType);
      const oldStatus = plotline.status;

      let newStatus = oldStatus;

      // Status advancement logic
      if (oldStatus === 'PLANNED') {
        // If we have any developments, move to DEVELOPING
        if (developmentTypes.length > 0) {
          newStatus = 'DEVELOPING';
        }
      } else if (oldStatus === 'DEVELOPING') {
        // If we have resolution developments, move to RESOLVED
        const resolutionCount = developmentTypes.filter((t: string) => t === 'resolution').length;
        const totalDevelopments = developmentTypes.length;
        
        if (resolutionCount > 0 && resolutionCount >= totalDevelopments * 0.5) {
          newStatus = 'RESOLVED';
        }
      }

      if (newStatus !== oldStatus) {
        await prisma.plotline.update({
          where: { id: plotlineId },
          data: { status: newStatus as 'PLANNED' | 'INTRODUCED' | 'DEVELOPING' | 'COMPLICATED' | 'CLIMAXING' | 'RESOLVED' | 'ABANDONED' }
        });

        return { updated: true, oldStatus, newStatus };
      }

      return { updated: false, oldStatus, newStatus: oldStatus };

    } catch (error) {
      console.error('Plotline advancement error:', error);
      return { updated: false, oldStatus: '', newStatus: '' };
    }
  }

  /**
   * Merge new world building elements from chapter generation
   */
  async mergeWorldBuildingElements(novelId: string, newElements: WorldBuildingElements): Promise<{ updated: boolean; elementsAdded: string[] }> {
    try {
      const existingWorldBuilding = await prisma.worldBuilding.findUnique({
        where: { novelId }
      });

      if (!newElements || Object.keys(newElements).length === 0) {
        return { updated: false, elementsAdded: [] };
      }

      const elementsAdded: string[] = [];
      const updateData: WorldBuildingUpdateData = {};

      // Merge locations
      if (newElements.locations && Array.isArray(newElements.locations)) {
        const existingLocations = existingWorldBuilding?.locations 
          ? this.safeJsonParseArray(existingWorldBuilding.locations) 
          : [];
        
        const newLocations = newElements.locations.filter(
          (loc: string) => !existingLocations.includes(loc)
        );

        if (newLocations.length > 0) {
          updateData.locations = JSON.stringify([...existingLocations, ...newLocations]);
          elementsAdded.push(`Locations: ${newLocations.join(', ')}`);
        }
      }

      // Merge rules
      if (newElements.rules && Array.isArray(newElements.rules)) {
        const existingRules = existingWorldBuilding?.rules 
          ? this.safeJsonParseArray(existingWorldBuilding.rules) 
          : [];
        
        const newRules = newElements.rules.filter(
          (rule: string) => !existingRules.includes(rule)
        );

        if (newRules.length > 0) {
          updateData.rules = JSON.stringify([...existingRules, ...newRules]);
          elementsAdded.push(`Rules: ${newRules.join(', ')}`);
        }
      }

      // Merge cultures
      if (newElements.cultures && typeof newElements.cultures === 'string') {
        const existingCultures = existingWorldBuilding?.cultures || '';
        if (!existingCultures.includes(newElements.cultures)) {
          updateData.cultures = existingCultures 
            ? `${existingCultures}\n\n${newElements.cultures}`
            : newElements.cultures;
          elementsAdded.push(`Cultures: ${newElements.cultures}`);
        }
      }

      // Merge magic system
      if (newElements.magicSystem && typeof newElements.magicSystem === 'string') {
        const existingMagicSystem = existingWorldBuilding?.magicSystem || '';
        if (!existingMagicSystem.includes(newElements.magicSystem)) {
          updateData.magicSystem = existingMagicSystem 
            ? `${existingMagicSystem}\n\n${newElements.magicSystem}`
            : newElements.magicSystem;
          elementsAdded.push(`Magic System: ${newElements.magicSystem}`);
        }
      }

      if (Object.keys(updateData).length > 0) {
        if (existingWorldBuilding) {
          await prisma.worldBuilding.update({
            where: { novelId },
            data: updateData
          });
        } else {
          await prisma.worldBuilding.create({
            data: {
              novelId,
              ...updateData
            }
          });
        }

        return { updated: true, elementsAdded };
      }

      return { updated: false, elementsAdded: [] };

    } catch (error) {
      console.error('World building merge error:', error);
      return { updated: false, elementsAdded: [] };
    }
  }

  /**
   * Perform comprehensive auto-evolution after chapter generation
   */
  async performPostChapterEvolution(chapterId: string): Promise<{
    charactersEvolved: Array<{ id: string; name: string; changes: string[] }>;
    plotlinesAdvanced: Array<{ id: string; name: string; oldStatus: string; newStatus: string }>;
    worldBuildingUpdated: { updated: boolean; elementsAdded: string[] };
  }> {
    try {
      // Get chapter with related data
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
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
          novel: true
        }
      });

      if (!chapter) {
        return {
          charactersEvolved: [],
          plotlinesAdvanced: [],
          worldBuildingUpdated: { updated: false, elementsAdded: [] }
        };
      }

      const results = {
        charactersEvolved: [] as Array<{ id: string; name: string; changes: string[] }>,
        plotlinesAdvanced: [] as Array<{ id: string; name: string; oldStatus: string; newStatus: string }>,
        worldBuildingUpdated: { updated: false, elementsAdded: [] as string[] }
      };

      // Evolve characters that had development notes
      const charactersToEvolve = chapter.characterUsages
        .filter((u: { developmentNotes: string | null }) => u.developmentNotes)
        .map((u: { character: { id: string; name: string } }) => u.character);

      for (const character of charactersToEvolve) {
        const evolution = await this.evolveCharacterData(character.id);
        if (evolution.updated) {
          results.charactersEvolved.push({
            id: character.id,
            name: character.name,
            changes: evolution.changes
          });
        }
      }

      // Advance plotlines that had developments
      const plotlinesToAdvance = chapter.plotlineDevelopments.map((d: { plotline: { id: string; name: string } }) => d.plotline);

      for (const plotline of plotlinesToAdvance) {
        const advancement = await this.advancePlotlineStatus(plotline.id);
        if (advancement.updated) {
          results.plotlinesAdvanced.push({
            id: plotline.id,
            name: plotline.name,
            oldStatus: advancement.oldStatus,
            newStatus: advancement.newStatus
          });
        }
      }

      // Extract and merge world building elements from chapter additional data
      try {
        const additionalData = chapter.additionalData ? JSON.parse(chapter.additionalData) : {};
        if (additionalData.worldBuildingElements) {
          const worldBuildingMerge = await this.mergeWorldBuildingElements(
            chapter.novelId,
            additionalData.worldBuildingElements
          );
          results.worldBuildingUpdated = worldBuildingMerge;
        }
      } catch (error) {
        console.error('Failed to parse chapter additional data:', error);
      }

      return results;

    } catch (error) {
      console.error('Post-chapter evolution error:', error);
      return {
        charactersEvolved: [],
        plotlinesAdvanced: [],
        worldBuildingUpdated: { updated: false, elementsAdded: [] }
      };
    }
  }
} 