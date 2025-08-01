import { GoogleGenerativeAI } from '@google/generative-ai';

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export function getGeminiModel() {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  });
}

// Specialized model for longer content generation
export function getGeminiModelLong() {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 35,
      topP: 0.9,
      maxOutputTokens: 32768,
    }
  });
}

// Helper function to generate content with retry logic and model fallback
export async function generateWithRetry(
  prompt: string, 
  maxRetries: number = 3,
  useModelLong: boolean = false
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generation attempt ${attempt}/${maxRetries}`);
      
      // Add prompt enhancements for better JSON completion
      const enhancedPrompt = `${prompt}

**CRITICAL: 응답이 완전히 완성되도록 주의하세요.**
- JSON 구조를 완전히 닫아주세요
- 마지막 문장을 완성해주세요
- 응답이 중간에 끊어지지 않도록 하세요
- 토큰 제한을 고려하여 적절한 길이로 작성하세요

**응답 검증 체크리스트:**
1. JSON이 올바르게 시작되고 끝나는가?
2. 모든 필수 필드가 포함되었는가?
3. 문자열 값이 올바르게 인용되었는가?
4. 마지막 문장이 완성되었는가?`;

      const model = useModelLong ? getGeminiModelLong() : getGeminiModel();
      const result = await model.generateContent(enhancedPrompt);
      const response = result.response.text();
      
      // Validate the response before returning
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from AI');
      }
      
      // Check for common truncation indicators
      const truncationIndicators = [
        '이도현의 눈빛',
        '그의 시선',
        '그때였다',
        '마치',
        '그리고',
        '하지만'
      ];
      
      const responseEnd = response.trim().slice(-50).toLowerCase();
      const hasTruncation = truncationIndicators.some(indicator => 
        responseEnd.includes(indicator.toLowerCase()) && 
        !response.trim().match(/[.!?]$/)
      );
      
      if (hasTruncation) {
        console.warn(`Response appears truncated (attempt ${attempt}): ${responseEnd}`);
        throw new Error('Response appears to be truncated');
      }
      
      // Check for JSON structure
      if (prompt.includes('json') && response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
          throw new Error('JSON response format is malformed');
        }
        
        // Try to parse the JSON to ensure it's valid
        try {
          const jsonContent = jsonMatch[1].trim();
          JSON.parse(jsonContent);
        } catch (jsonError) {
          console.warn(`JSON parsing failed (attempt ${attempt}):`, jsonError);
          throw new Error('JSON content is invalid');
        }
      }
      
      console.log(`Generation successful on attempt ${attempt}`);
      return response;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Generation attempt ${attempt} failed:`, error);
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, etc.
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`All ${maxRetries} generation attempts failed. Last error: ${lastError?.message}`);
}

// Enhanced function to handle AI responses with better error recovery
export async function generateContentWithValidation(
  prompt: string,
  expectedFormat: 'json' | 'text' = 'text',
  maxRetries: number = 3
): Promise<{
  success: boolean;
  content: string;
  parsedContent?: unknown;
  errors: string[];
}> {
  const errors: string[] = [];
  let lastAttemptContent = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await generateWithRetry(prompt, 1, false);
      lastAttemptContent = response;
      
      if (expectedFormat === 'json') {
        // Try to extract and parse JSON
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
          errors.push(`Attempt ${attempt}: No JSON code block found`);
          continue;
        }
        
        try {
          const parsedContent = JSON.parse(jsonMatch[1].trim());
          return {
            success: true,
            content: response,
            parsedContent,
            errors: []
          };
        } catch (parseError) {
          errors.push(`Attempt ${attempt}: JSON parsing failed - ${parseError}`);
          continue;
        }
      } else {
        // For text responses, just return the content
        return {
          success: true,
          content: response,
          errors: []
        };
      }
      
    } catch (error) {
      errors.push(`Attempt ${attempt}: ${error}`);
    }
  }
  
  return {
    success: false,
    content: lastAttemptContent,
    errors
  };
}

// Function to check response quality and suggest improvements
export function analyzeResponseQuality(response: string): {
  quality: 'high' | 'medium' | 'low';
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check response length
  if (response.length < 100) {
    issues.push('Response too short');
    suggestions.push('Generate longer, more detailed content');
  } else if (response.length > 5000) {
    issues.push('Response too long');
    suggestions.push('Reduce content length to avoid truncation');
  }
  
  // Check for truncation
  const truncationIndicators = [
    '이도현의 눈빛',
    '그의 시선이',
    '그때였다',
    '마치',
    '그리고',
    '하지만'
  ];
  
  const endsWithTruncation = truncationIndicators.some(indicator => 
    response.trim().toLowerCase().endsWith(indicator.toLowerCase())
  );
  
  if (endsWithTruncation) {
    issues.push('Response appears truncated');
    suggestions.push('Ensure complete sentences and proper ending');
  }
  
  // Check for JSON structure if expected
  if (response.includes('```json')) {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      issues.push('Malformed JSON structure');
      suggestions.push('Ensure proper JSON formatting with code blocks');
    } else {
      try {
        JSON.parse(jsonMatch[1].trim());
      } catch {
        issues.push('Invalid JSON content');
        suggestions.push('Fix JSON syntax errors');
      }
    }
  }
  
  // Check for Korean webnovel elements
  const koreanElements = [
    /님이?/g,
    /요\./g,
    /다\./g,
    /어요\./g,
    /습니다\./g
  ];
  
  const hasKoreanElements = koreanElements.some(pattern => 
    pattern.test(response)
  );
  
  if (!hasKoreanElements) {
    issues.push('Lacks Korean language characteristics');
    suggestions.push('Use more natural Korean expressions');
  }
  
  // Determine quality
  let quality: 'high' | 'medium' | 'low' = 'high';
  if (issues.length > 3) {
    quality = 'low';
  } else if (issues.length > 1) {
    quality = 'medium';
  }
  
  return {
    quality,
    issues,
    suggestions
  };
}

// Fallback model for when primary models are overloaded
export function getGeminiFallbackModel() {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({ 
    model: "gemini-1.0-pro", // Most stable model
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 2048, // Conservative limit for stability
    }
  });
} 