/**
 * Agent Response Storage Utility
 * 
 * Handles saving agent responses to JSON files for each pipeline type.
 * Provides a consistent way to capture and store all agent interactions.
 */

import fs from 'fs/promises';
import path from 'path';
import { 
  StandardStageOutput,
  StandardVisionUnderstandingOutput,
  StandardProducerOutput,
  StandardDirectorOutput,
  StandardDoPOutput,
  StandardPromptEngineerOutput
} from '@/schemas/unified-agent-schemas';

// Pipeline types matching the enhanced router
export type PipelineType = 'SCRIPT_MODE' | 'VISION_ENHANCED' | 'MUSIC_VIDEO' | 'NO_MUSIC_VIDEO';

// Map pipeline types to folder names
const PIPELINE_FOLDERS: Record<PipelineType, string> = {
  'SCRIPT_MODE': 'script_mode_pipeline',
  'VISION_ENHANCED': 'vision_enhanced_pipeline', 
  'MUSIC_VIDEO': 'music_video_pipeline',
  'NO_MUSIC_VIDEO': 'no_music_video_pipeline'
};

// Agent response session data
export interface AgentResponseSession {
  session_id: string;
  pipeline_type: PipelineType;
  timestamp: string;
  user_input: {
    original_request: string;
    extracted_requirements: any;
    conversation_history?: any[];
  };
  pipeline_routing: {
    analysis: any;
    routing_decision: any;
    confidence: number;
  };
  agent_responses: {
    vision_understanding?: StandardVisionUnderstandingOutput;
    music_analysis?: any; // For music pipeline
    producer?: StandardProducerOutput;
    director?: StandardDirectorOutput;
    dop?: StandardDoPOutput;
    prompt_engineer?: StandardPromptEngineerOutput;
    image_generation?: any; // For final image generation results
  };
  pipeline_metadata: {
    total_duration_ms: number;
    stages_completed: string[];
    errors?: string[];
    warnings?: string[];
  };
  final_output: {
    success: boolean;
    video_config?: any;
    error_message?: string;
  };
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = new Date().getTime();
  const random = Math.random().toString(36).substring(2, 9);
  return `session_${timestamp}_${random}`;
}

/**
 * Get the base path for agent responses
 */
function getAgentResponsesBasePath(): string {
  return path.join(process.cwd(), 'agent_responses');
}

/**
 * Initialize a new agent response session
 */
export async function initializeSession(
  pipelineType: PipelineType,
  userInput: any,
  routingAnalysis: any
): Promise<AgentResponseSession> {
  const session: AgentResponseSession = {
    session_id: generateSessionId(),
    pipeline_type: pipelineType,
    timestamp: new Date().toISOString(),
    user_input: {
      original_request: userInput.message || userInput.concept || userInput.script || '',
      extracted_requirements: userInput,
      conversation_history: userInput.conversationHistory
    },
    pipeline_routing: {
      analysis: routingAnalysis.analysis,
      routing_decision: routingAnalysis.routing_decision,
      confidence: routingAnalysis.analysis?.confidence || 0
    },
    agent_responses: {},
    pipeline_metadata: {
      total_duration_ms: 0,
      stages_completed: [],
      errors: [],
      warnings: []
    },
    final_output: {
      success: false
    }
  };

  // Save initial session file
  await saveSession(session);
  
  return session;
}

/**
 * Update session with agent response
 */
export async function updateSessionWithAgentResponse(
  sessionId: string,
  pipelineType: PipelineType,
  agentName: string,
  response: any,
  duration_ms?: number
): Promise<void> {
  const session = await loadSession(sessionId, pipelineType);
  
  if (!session) {
    throw new Error(`Session ${sessionId} not found for pipeline ${pipelineType}`);
  }

  // Update agent responses
  session.agent_responses[agentName as keyof typeof session.agent_responses] = response;
  
  // Update metadata
  session.pipeline_metadata.stages_completed.push(agentName);
  if (duration_ms) {
    session.pipeline_metadata.total_duration_ms += duration_ms;
  }
  
  // Check for errors or warnings in response
  if (response.validation?.issues?.length > 0) {
    session.pipeline_metadata.warnings?.push(...response.validation.issues);
  }
  
  // Save updated session
  await saveSession(session);
}

/**
 * Update session with final output
 */
export async function updateSessionWithFinalOutput(
  sessionId: string,
  pipelineType: PipelineType,
  finalOutput: any,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const session = await loadSession(sessionId, pipelineType);
  
  if (!session) {
    throw new Error(`Session ${sessionId} not found for pipeline ${pipelineType}`);
  }

  session.final_output = {
    success,
    video_config: finalOutput,
    error_message: errorMessage
  };
  
  // Save final session state
  await saveSession(session);
}

/**
 * Save session to JSON file
 */
async function saveSession(session: AgentResponseSession): Promise<void> {
  const folderName = PIPELINE_FOLDERS[session.pipeline_type];
  const folderPath = path.join(getAgentResponsesBasePath(), folderName);
  
  // Ensure folder exists
  await fs.mkdir(folderPath, { recursive: true });
  
  // Save session file
  const fileName = `${session.session_id}.json`;
  const filePath = path.join(folderPath, fileName);
  
  await fs.writeFile(
    filePath,
    JSON.stringify(session, null, 2),
    'utf-8'
  );
}

/**
 * Load session from JSON file
 */
async function loadSession(
  sessionId: string,
  pipelineType: PipelineType
): Promise<AgentResponseSession | null> {
  try {
    const folderName = PIPELINE_FOLDERS[pipelineType];
    const filePath = path.join(
      getAgentResponsesBasePath(),
      folderName,
      `${sessionId}.json`
    );
    
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as AgentResponseSession;
  } catch (error) {
    console.error(`Failed to load session ${sessionId}:`, error);
    return null;
  }
}

/**
 * List all sessions for a pipeline type
 */
export async function listSessions(pipelineType: PipelineType): Promise<string[]> {
  try {
    const folderName = PIPELINE_FOLDERS[pipelineType];
    const folderPath = path.join(getAgentResponsesBasePath(), folderName);
    
    const files = await fs.readdir(folderPath);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error(`Failed to list sessions for ${pipelineType}:`, error);
    return [];
  }
}

/**
 * Get latest session for a pipeline type
 */
export async function getLatestSession(
  pipelineType: PipelineType
): Promise<AgentResponseSession | null> {
  const sessions = await listSessions(pipelineType);
  
  if (sessions.length === 0) {
    return null;
  }
  
  // Sort by timestamp in session ID
  const sortedSessions = sessions.sort((a, b) => {
    const timestampA = parseInt(a.split('_')[1]);
    const timestampB = parseInt(b.split('_')[1]);
    return timestampB - timestampA;
  });
  
  return loadSession(sortedSessions[0], pipelineType);
}

/**
 * Clean up old sessions (keep only the last N sessions per pipeline)
 */
export async function cleanupOldSessions(
  pipelineType: PipelineType,
  keepCount: number = 10
): Promise<void> {
  const sessions = await listSessions(pipelineType);
  
  if (sessions.length <= keepCount) {
    return;
  }
  
  // Sort by timestamp
  const sortedSessions = sessions.sort((a, b) => {
    const timestampA = parseInt(a.split('_')[1]);
    const timestampB = parseInt(b.split('_')[1]);
    return timestampB - timestampA;
  });
  
  // Delete old sessions
  const sessionsToDelete = sortedSessions.slice(keepCount);
  const folderName = PIPELINE_FOLDERS[pipelineType];
  
  for (const sessionId of sessionsToDelete) {
    const filePath = path.join(
      getAgentResponsesBasePath(),
      folderName,
      `${sessionId}.json`
    );
    
    try {
      await fs.unlink(filePath);
      console.log(`Deleted old session: ${sessionId}`);
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
    }
  }
}

/**
 * Get the next available test folder number for a pipeline
 */
async function getNextTestFolderNumber(pipelineType: PipelineType): Promise<number> {
  try {
    const folderName = PIPELINE_FOLDERS[pipelineType];
    const pipelinePath = path.join(getAgentResponsesBasePath(), folderName);
    
    // Ensure pipeline folder exists
    await fs.mkdir(pipelinePath, { recursive: true });
    
    // Read existing test folders
    const entries = await fs.readdir(pipelinePath, { withFileTypes: true });
    const testFolders = entries
      .filter(entry => entry.isDirectory() && entry.name.match(/^Test_\d+$/))
      .map(entry => entry.name)
      .sort((a, b) => {
        const numA = parseInt(a.replace('Test_', ''));
        const numB = parseInt(b.replace('Test_', ''));
        return numA - numB;
      });
    
    // Find the next available test number
    let nextNumber = 1;
    for (const folder of testFolders) {
      const currentNumber = parseInt(folder.replace('Test_', ''));
      if (currentNumber === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }
    
    return nextNumber;
  } catch (error) {
    console.error('Error determining next test folder:', error);
    // Fallback to timestamp-based number
    return Date.now() % 10000; // Last 4 digits of timestamp
  }
}

// Global session tracking to ensure all agents from one session go to the same test folder
const sessionTestFolders = new Map<string, number>();

/**
 * Simple utility function to save individual agent responses for debugging
 * Can be toggled via environment variable SAVE_AGENT_RESPONSES
 * Organizes responses into numbered test folders (Test_1, Test_2, etc.)
 */
export async function saveAgentResponse({
  agentName,
  response,
  pipelineType,
  sessionId,
  projectFolder,
  input,
  rawResponse,
  model,
  executionTime
}: {
  agentName: string;
  response: any;
  pipelineType: PipelineType;
  sessionId: string;
  projectFolder: string;
  input?: any;
  rawResponse?: string;
  model?: string;
  executionTime?: number;
}): Promise<void> {
  // Check if saving is enabled
  if (process.env.SAVE_AGENT_RESPONSES !== 'true') {
    return;
  }

  try {
    const folderName = PIPELINE_FOLDERS[pipelineType];
    const pipelinePath = path.join(getAgentResponsesBasePath(), folderName);
    
    // Get or assign test folder number for this session
    let testFolderNumber = sessionTestFolders.get(sessionId);
    if (!testFolderNumber) {
      testFolderNumber = await getNextTestFolderNumber(pipelineType);
      sessionTestFolders.set(sessionId, testFolderNumber);
      console.log(`📁 New test session: ${sessionId} → Test_${testFolderNumber}`);
    }
    
    // Create test folder path
    const testFolderName = `Test_${testFolderNumber}`;
    const testFolderPath = path.join(pipelinePath, testFolderName);
    
    // Ensure test folder exists
    await fs.mkdir(testFolderPath, { recursive: true });
    
    // Create filename with timestamp for uniqueness within test folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${agentName}_${timestamp}_${sessionId.substring(0, 8)}.json`;
    const filePath = path.join(testFolderPath, fileName);
    
    // Create structured data
    const agentResponseData = {
      metadata: {
        agentName,
        pipelineType,
        sessionId,
        projectFolder,
        testFolder: testFolderName,
        timestamp: new Date().toISOString(),
        executionTime: executionTime || 0,
        model: model || 'unknown'
      },
      input: input || null,
      response,
      rawResponse: rawResponse || null
    };
    
    // Save to file
    await fs.writeFile(
      filePath,
      JSON.stringify(agentResponseData, null, 2),
      'utf-8'
    );
    
    console.log(`📁 Agent response saved: ${testFolderName}/${fileName}`);
    
  } catch (error) {
    console.error(`❌ Failed to save agent response for ${agentName}:`, error);
    // Don't throw - agent response saving should never break the pipeline
  }
}