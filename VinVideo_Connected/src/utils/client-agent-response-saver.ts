/**
 * Client-side utility for saving agent responses
 * Calls the server-side API endpoint to save agent responses
 */

export type PipelineType = 'SCRIPT_MODE' | 'VISION_ENHANCED' | 'MUSIC_VIDEO' | 'NO_MUSIC_VIDEO';

export interface SaveAgentResponseParams {
  agentName: string;
  response: any;
  pipelineType: PipelineType;
  sessionId: string;
  projectFolder: string;
  input?: any;
  rawResponse?: string;
  model?: string;
  executionTime?: number;
}

/**
 * Save agent response via API call (client-side safe)
 */
export async function saveAgentResponse(params: SaveAgentResponseParams): Promise<void> {
  // Check if saving is enabled via environment variable
  // Note: In Next.js, client-side environment variables must start with NEXT_PUBLIC_
  // Since we want this to be server-controlled, we'll always make the API call
  // and let the server-side check the environment variable
  
  try {
    const response = await fetch('/api/save-agent-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to save agent response:', errorData.error);
      // Don't throw - agent response saving should never break the pipeline
      return;
    }

    const result = await response.json();
    if (result.success) {
      console.log(`📁 Agent response saved: ${params.agentName}`);
    }

  } catch (error) {
    console.error(`❌ Failed to save agent response for ${params.agentName}:`, error);
    // Don't throw - agent response saving should never break the pipeline
  }
}