interface LLMResponse {
  message: string;
  data?: any;
}

export function parseLLMResponse(response: LLMResponse): LLMResponse {
  try {
    const messageContent = response.message;
    const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        
        return {
          ...response,
          data,
          message: messageContent.replace(jsonMatch[0], '').trim()
        };
      } catch (parseError) {
        console.warn('Failed to parse JSON from LLM response:', parseError);
        return response;
      }
    }
    
    return response;
  } catch (error) {
    console.warn('Error processing LLM response:', error);
    return response;
  }
}

export function extractJSONFromText(text: string): any | null {
  try {
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch {
    return null;
  }
}