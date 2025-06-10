/**
 * Passes raw LLM responses through the pipeline even when JSON parsing fails.
 * Preserves creative intent by allowing downstream LLMs to process malformed JSON.
 * 
 * @param rawResponse - The raw string response from an LLM agent
 * @param agentName - Name of the agent for logging purposes
 * @returns Object with both parsed data (if available) and raw content
 */
export function passThroughRawJson(rawResponse: string, agentName: string): {
  success: boolean;
  structuredData: Record<string, unknown> | null;
  rawContent: string;
  parsingStatus: 'valid' | 'malformed' | 'failed';
  contentPreservation: 'complete';
  errorDetails: string | null;
} {
  let structuredData = null;
  let parsingStatus: 'valid' | 'malformed' | 'failed' = 'failed';
  let errorDetails = null;

  try {
    structuredData = JSON.parse(rawResponse);
    parsingStatus = 'valid';
  } catch (error) {
    errorDetails = error instanceof Error ? error.message : 'Unknown parsing error';
    
    // Attempt to extract JSON from markdown code blocks
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
        parsingStatus = 'malformed';
        errorDetails = 'JSON found in markdown block';
      } catch {
        // Keep original error
      }
    }
  }

  console.log(`[${agentName}] JSON parsing status: ${parsingStatus}`);
  
  return {
    success: true, // Always true - we're passing content through
    structuredData,
    rawContent: rawResponse,
    parsingStatus,
    contentPreservation: 'complete',
    errorDetails
  };
}