/* eslint-disable @typescript-eslint/no-explicit-any */

interface SemanticEmbedding {
  text: string;
  embedding: number[];
  metadata: {
    type: 'personality' | 'dialogue' | 'action' | 'emotion' | 'description';
    character?: string;
    chapter?: number;
    timestamp: string;
  };
}

interface SemanticSimilarity {
  similarity: number;
  confidence: number;
  explanation: string;
}

interface CharacterSemanticProfile {
  characterId: string;
  characterName: string;
  personalityEmbeddings: SemanticEmbedding[];
  dialogueEmbeddings: SemanticEmbedding[];
  actionEmbeddings: SemanticEmbedding[];
  emotionEmbeddings: SemanticEmbedding[];
  baselineVector: number[];
  consistencyHistory: Array<{
    chapter: number;
    consistencyScore: number;
    deviations: string[];
  }>;
}

interface SemanticAnalysisResult {
  overallConsistency: number;
  characterConsistency: Map<string, number>;
  detectedDeviations: Array<{
    type: 'personality' | 'dialogue' | 'behavior' | 'emotion';
    character: string;
    chapter: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  semanticInsights: string[];
}

export class SemanticAnalyzer {
  private characterProfiles: Map<string, CharacterSemanticProfile> = new Map();
  private globalEmbeddings: Map<string, SemanticEmbedding> = new Map();
  private vocabularyIndex: Map<string, number> = new Map();
  private readonly EMBEDDING_SIZE = 300; // Configurable embedding dimension
  private readonly SIMILARITY_THRESHOLD = 0.7; // Threshold for semantic similarity

  constructor() {
    this.initializeVocabulary();
  }

  // Initialize basic vocabulary for semantic analysis
  private initializeVocabulary(): void {
    // Korean character archetypes and personality traits
    const koreanPersonalityTerms = [
      '차가운', '따뜻한', '냉정한', '감정적인', '강인한', '연약한', '자신감', '수줍은',
      '외향적', '내향적', '적극적', '소극적', '정직한', '교활한', '용감한', '겁많은',
      '친절한', '무뚝뚝한', '유머러스', '진지한', '충성스러운', '배신적인', '지적인', '순진한'
    ];

    const koreanEmotionTerms = [
      '화난', '기쁜', '슬픈', '놀란', '두려운', '불안한', '흥분한', '평온한',
      '실망한', '만족한', '질투하는', '부러워하는', '미안한', '고마운', '자랑스러운', '부끄러운'
    ];

    const koreanActionTerms = [
      '말하다', '속삭이다', '소리치다', '웃다', '울다', '달리다', '걷다', '서다',
      '앉다', '누워있다', '생각하다', '결정하다', '도망가다', '공격하다', '방어하다', '도와주다'
    ];

    // Build vocabulary index
    let index = 0;
    [...koreanPersonalityTerms, ...koreanEmotionTerms, ...koreanActionTerms].forEach(term => {
      if (!this.vocabularyIndex.has(term)) {
        this.vocabularyIndex.set(term, index++);
      }
    });
  }

  // Generate semantic embedding for text (simplified TF-IDF approach)
  async generateSemanticEmbedding(text: string, type: 'personality' | 'dialogue' | 'action' | 'emotion' | 'description'): Promise<number[]> {
    const embedding = new Array(this.EMBEDDING_SIZE).fill(0);
    
    // Tokenize Korean text (simplified)
    const tokens = this.tokenizeKoreanText(text);
    
    // Calculate term frequency
    const termFreq = new Map<string, number>();
    tokens.forEach(token => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // Build embedding vector
    for (const [term, freq] of termFreq) {
      const vocabIndex = this.vocabularyIndex.get(term);
      if (vocabIndex !== undefined) {
        // Use position-based weighting with type-specific bias
        const typeWeight = this.getTypeWeight(type);
        const position = vocabIndex % this.EMBEDDING_SIZE;
        embedding[position] += freq * typeWeight;
      }
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  // Tokenize Korean text (simplified approach)
  private tokenizeKoreanText(text: string): string[] {
    // Remove punctuation and split by spaces
    const cleaned = text.replace(/[^\w\s가-힣]/g, '').toLowerCase();
    return cleaned.split(/\s+/).filter(token => token.length > 0);
  }

  // Get type-specific weight for different semantic categories
  private getTypeWeight(type: 'personality' | 'dialogue' | 'action' | 'emotion' | 'description'): number {
    switch (type) {
      case 'personality': return 1.5;
      case 'emotion': return 1.3;
      case 'dialogue': return 1.2;
      case 'action': return 1.1;
      case 'description': return 1.0;
      default: return 1.0;
    }
  }

  // Calculate cosine similarity between two embeddings
  calculateSemanticSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensionality');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  // Build semantic profile for a character
  async buildCharacterSemanticProfile(
    characterId: string,
    characterName: string,
    characterData: {
      personality: string;
      dialogues: string[];
      actions: string[];
      emotions: string[];
      descriptions: string[];
    }
  ): Promise<CharacterSemanticProfile> {
    const profile: CharacterSemanticProfile = {
      characterId,
      characterName,
      personalityEmbeddings: [],
      dialogueEmbeddings: [],
      actionEmbeddings: [],
      emotionEmbeddings: [],
      baselineVector: [],
      consistencyHistory: []
    };

    // Generate personality embeddings
    const personalityEmbedding = await this.generateSemanticEmbedding(characterData.personality, 'personality');
    profile.personalityEmbeddings.push({
      text: characterData.personality,
      embedding: personalityEmbedding,
      metadata: {
        type: 'personality',
        character: characterName,
        timestamp: new Date().toISOString()
      }
    });

    // Generate dialogue embeddings
    for (const dialogue of characterData.dialogues) {
      const embedding = await this.generateSemanticEmbedding(dialogue, 'dialogue');
      profile.dialogueEmbeddings.push({
        text: dialogue,
        embedding,
        metadata: {
          type: 'dialogue',
          character: characterName,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate action embeddings
    for (const action of characterData.actions) {
      const embedding = await this.generateSemanticEmbedding(action, 'action');
      profile.actionEmbeddings.push({
        text: action,
        embedding,
        metadata: {
          type: 'action',
          character: characterName,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate emotion embeddings
    for (const emotion of characterData.emotions) {
      const embedding = await this.generateSemanticEmbedding(emotion, 'emotion');
      profile.emotionEmbeddings.push({
        text: emotion,
        embedding,
        metadata: {
          type: 'emotion',
          character: characterName,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate baseline vector (average of all embeddings)
    profile.baselineVector = this.calculateBaselineVector(profile);

    // Store profile
    this.characterProfiles.set(characterId, profile);

    return profile;
  }

  // Calculate baseline vector for a character profile
  private calculateBaselineVector(profile: CharacterSemanticProfile): number[] {
    const allEmbeddings = [
      ...profile.personalityEmbeddings,
      ...profile.dialogueEmbeddings,
      ...profile.actionEmbeddings,
      ...profile.emotionEmbeddings
    ];

    if (allEmbeddings.length === 0) {
      return new Array(this.EMBEDDING_SIZE).fill(0);
    }

    const baseline = new Array(this.EMBEDDING_SIZE).fill(0);
    
    // Calculate weighted average
    for (const embeddingObj of allEmbeddings) {
      const weight = this.getTypeWeight(embeddingObj.metadata.type);
      for (let i = 0; i < embeddingObj.embedding.length; i++) {
        baseline[i] += embeddingObj.embedding[i] * weight;
      }
    }

    // Normalize
    const totalWeight = allEmbeddings.reduce((sum, emb) => sum + this.getTypeWeight(emb.metadata.type), 0);
    for (let i = 0; i < baseline.length; i++) {
      baseline[i] /= totalWeight;
    }

    return baseline;
  }

  // Analyze semantic consistency for new character behavior
  async analyzeSemanticConsistency(
    characterId: string,
    newBehavior: {
      text: string;
      type: 'personality' | 'dialogue' | 'action' | 'emotion' | 'description';
      chapter: number;
    }
  ): Promise<SemanticSimilarity> {
    const profile = this.characterProfiles.get(characterId);
    if (!profile) {
      throw new Error(`Character profile not found for ID: ${characterId}`);
    }

    // Generate embedding for new behavior
    const newEmbedding = await this.generateSemanticEmbedding(newBehavior.text, newBehavior.type);

    // Compare with baseline
    const baselineSimilarity = this.calculateSemanticSimilarity(newEmbedding, profile.baselineVector);

    // Compare with similar type embeddings
    const relevantEmbeddings = this.getRelevantEmbeddings(profile, newBehavior.type);
    const typeSimilarities = relevantEmbeddings.map(emb => 
      this.calculateSemanticSimilarity(newEmbedding, emb.embedding)
    );

    const avgTypeSimilarity = typeSimilarities.length > 0 
      ? typeSimilarities.reduce((sum, sim) => sum + sim, 0) / typeSimilarities.length 
      : 0;

    // Calculate overall similarity
    const overallSimilarity = (baselineSimilarity * 0.4) + (avgTypeSimilarity * 0.6);

    // Determine confidence and explanation
    const confidence = Math.min(1.0, Math.max(0.0, overallSimilarity));
    const explanation = this.generateConsistencyExplanation(
      newBehavior.type,
      overallSimilarity,
      baselineSimilarity,
      avgTypeSimilarity
    );

    return {
      similarity: overallSimilarity,
      confidence,
      explanation
    };
  }

  // Get relevant embeddings for comparison
  private getRelevantEmbeddings(profile: CharacterSemanticProfile, type: string): SemanticEmbedding[] {
    switch (type) {
      case 'personality': return profile.personalityEmbeddings;
      case 'dialogue': return profile.dialogueEmbeddings;
      case 'action': return profile.actionEmbeddings;
      case 'emotion': return profile.emotionEmbeddings;
      default: return [];
    }
  }

  // Generate explanation for consistency analysis
  private generateConsistencyExplanation(
    type: string,
    overallSimilarity: number,
    baselineSimilarity: number,
    typeSimilarity: number
  ): string {
    if (overallSimilarity >= this.SIMILARITY_THRESHOLD) {
      return `${type} behavior is consistent with established character patterns (${Math.round(overallSimilarity * 100)}% similarity)`;
    } else if (baselineSimilarity < 0.5) {
      return `${type} behavior significantly deviates from character baseline (${Math.round(baselineSimilarity * 100)}% similarity)`;
    } else if (typeSimilarity < 0.5) {
      return `${type} behavior is inconsistent with previous ${type} patterns (${Math.round(typeSimilarity * 100)}% similarity)`;
    } else {
      return `${type} behavior shows moderate deviation from expected patterns (${Math.round(overallSimilarity * 100)}% similarity)`;
    }
  }

  // Perform comprehensive semantic analysis on a chapter
  async analyzeChapterSemantics(
    chapterContent: string,
    chapterNumber: number,
    characters: Array<{ id: string; name: string; }>
  ): Promise<SemanticAnalysisResult> {
    const result: SemanticAnalysisResult = {
      overallConsistency: 0,
      characterConsistency: new Map(),
      detectedDeviations: [],
      semanticInsights: []
    };

    let totalConsistency = 0;
    let analysisCount = 0;

    // Analyze each character's behavior in the chapter
    for (const character of characters) {
      const characterBehaviors = this.extractCharacterBehaviors(chapterContent, character.name);
      
      if (characterBehaviors.length === 0) {
        continue;
      }

      let characterConsistencySum = 0;
      let characterAnalysisCount = 0;

      for (const behavior of characterBehaviors) {
        try {
          const similarity = await this.analyzeSemanticConsistency(character.id, {
            text: behavior.text,
            type: behavior.type,
            chapter: chapterNumber
          });

          characterConsistencySum += similarity.similarity;
          characterAnalysisCount++;

          // Detect deviations
          if (similarity.similarity < this.SIMILARITY_THRESHOLD) {
            result.detectedDeviations.push({
              type: behavior.type,
              character: character.name,
              chapter: chapterNumber,
              description: similarity.explanation,
              severity: similarity.similarity < 0.3 ? 'high' : similarity.similarity < 0.5 ? 'medium' : 'low',
              suggestion: this.generateDeviationSuggestion(behavior.type, character.name, similarity.similarity)
            });
          }

          // Add insights
          if (similarity.explanation && !result.semanticInsights.includes(similarity.explanation)) {
            result.semanticInsights.push(similarity.explanation);
          }
        } catch (error) {
          console.error(`Error analyzing character ${character.name}:`, error);
        }
      }

      if (characterAnalysisCount > 0) {
        const characterConsistency = characterConsistencySum / characterAnalysisCount;
        result.characterConsistency.set(character.name, characterConsistency);
        totalConsistency += characterConsistency;
        analysisCount++;
      }
    }

    // Calculate overall consistency
    result.overallConsistency = analysisCount > 0 ? totalConsistency / analysisCount : 1.0;

    // Add general insights
    result.semanticInsights.push(
      `Semantic analysis completed for ${characters.length} characters in chapter ${chapterNumber}`,
      `Overall semantic consistency: ${Math.round(result.overallConsistency * 100)}%`,
      `Detected ${result.detectedDeviations.length} potential consistency issues`
    );

    return result;
  }

  // Extract character behaviors from chapter content
  private extractCharacterBehaviors(content: string, characterName: string): Array<{
    text: string;
    type: 'personality' | 'dialogue' | 'action' | 'emotion' | 'description';
  }> {
    const behaviors = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes(characterName)) {
        // Extract dialogue
        const dialogueMatch = line.match(/["']([^"']+)["']/);
        if (dialogueMatch) {
          behaviors.push({
            text: dialogueMatch[1],
            type: 'dialogue' as const
          });
        }

        // Extract actions (look for action verbs)
        const actionWords = ['말했다', '웃었다', '걸었다', '뛰었다', '생각했다', '결정했다', '느꼈다'];
        for (const actionWord of actionWords) {
          if (line.includes(actionWord)) {
            behaviors.push({
              text: line.trim(),
              type: 'action' as const
            });
            break;
          }
        }

        // Extract emotions
        const emotionWords = ['기뻤다', '슬펐다', '화났다', '놀랐다', '두려웠다', '안심했다'];
        for (const emotionWord of emotionWords) {
          if (line.includes(emotionWord)) {
            behaviors.push({
              text: line.trim(),
              type: 'emotion' as const
            });
            break;
          }
        }
      }
    }

    return behaviors;
  }

  // Generate suggestion for detected deviation
  private generateDeviationSuggestion(type: string, characterName: string, similarity: number): string {
    const severityLevel = similarity < 0.3 ? 'significant' : similarity < 0.5 ? 'moderate' : 'minor';
    
    switch (type) {
      case 'personality':
        return `Consider reviewing ${characterName}'s personality consistency. The ${severityLevel} deviation suggests their core traits may be inconsistent with established patterns.`;
      case 'dialogue':
        return `${characterName}'s speech pattern shows ${severityLevel} deviation. Review their dialogue style, formality level, and vocabulary choices.`;
      case 'action':
        return `${characterName}'s actions show ${severityLevel} deviation from their typical behavior patterns. Ensure actions align with their established personality.`;
      case 'emotion':
        return `${characterName}'s emotional response shows ${severityLevel} deviation. Consider whether the emotional reaction fits their established emotional baseline.`;
      default:
        return `Review ${characterName}'s ${type} for consistency with their established character patterns.`;
    }
  }

  // Get semantic insights for a character
  getCharacterSemanticInsights(characterId: string): string[] {
    const profile = this.characterProfiles.get(characterId);
    if (!profile) {
      return [];
    }

    const insights = [];
    
    // Personality insights
    if (profile.personalityEmbeddings.length > 0) {
      insights.push(`Character has ${profile.personalityEmbeddings.length} personality embedding(s) for semantic analysis`);
    }

    // Dialogue insights
    if (profile.dialogueEmbeddings.length > 0) {
      insights.push(`Character has ${profile.dialogueEmbeddings.length} dialogue pattern(s) analyzed`);
    }

    // Action insights
    if (profile.actionEmbeddings.length > 0) {
      insights.push(`Character has ${profile.actionEmbeddings.length} action pattern(s) tracked`);
    }

    // Consistency history
    if (profile.consistencyHistory.length > 0) {
      const avgConsistency = profile.consistencyHistory.reduce((sum, h) => sum + h.consistencyScore, 0) / profile.consistencyHistory.length;
      insights.push(`Character's average semantic consistency: ${Math.round(avgConsistency * 100)}%`);
    }

    return insights;
  }

  // Clear cached profiles (for testing or reset)
  clearProfiles(): void {
    this.characterProfiles.clear();
    this.globalEmbeddings.clear();
  }

  // Get profile statistics
  getProfileStats(): {
    totalProfiles: number;
    totalEmbeddings: number;
    vocabularySize: number;
  } {
    const totalEmbeddings = Array.from(this.characterProfiles.values()).reduce((sum, profile) => {
      return sum + profile.personalityEmbeddings.length + profile.dialogueEmbeddings.length + 
             profile.actionEmbeddings.length + profile.emotionEmbeddings.length;
    }, 0);

    return {
      totalProfiles: this.characterProfiles.size,
      totalEmbeddings,
      vocabularySize: this.vocabularyIndex.size
    };
  }
}

// Export singleton instance
export const semanticAnalyzer = new SemanticAnalyzer(); 