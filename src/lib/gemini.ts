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
  // Try the preferred model first
  const primaryModel = useModelLong ? getGeminiModelLong() : getGeminiModel();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await primaryModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Attempt ${attempt} with primary model failed:`, error);
      
      // If model is overloaded (503) or rate limited, try fallback model
      if (error instanceof Error && (
        error.message.includes('503') || 
        error.message.includes('overloaded') ||
        error.message.includes('429') ||
        error.message.includes('rate limit')
      )) {
        console.log(`Trying fallback model due to: ${error.message}`);
        
        try {
          // Fallback to a more basic but stable model
          const fallbackModel = getGeminiFallbackModel();
          const result = await fallbackModel.generateContent(prompt);
          const response = await result.response;
          console.log('Successfully used fallback model');
          return response.text();
        } catch (fallbackError) {
          console.error(`Fallback model also failed on attempt ${attempt}:`, fallbackError);
        }
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Generation failed after ${maxRetries} attempts. Last error: ${error}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Cap at 10 seconds
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unexpected error in generateWithRetry');
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