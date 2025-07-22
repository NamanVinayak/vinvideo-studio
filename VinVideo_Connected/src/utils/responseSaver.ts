import * as fs from 'fs/promises';
import * as path from 'path';

export interface SavedResponseMetadata {
  timestamp: string;
  agentName: string;
  apiSource: 'openrouter' | 'runpod' | 'google' | 'other';
  requestId?: string;
  model?: string;
  executionTime?: number;
  tokenUsage?: unknown;
}

export async function saveApiResponse(
  agentName: string,
  response: unknown,
  rawResponse?: string,
  metadata?: Partial<SavedResponseMetadata>,
  sessionId?: string
): Promise<string> {
  try {
    // Use Test_X format instead of timestamp-based sessions
    const sessionFolder = sessionId || await getNextTestFolder();
    const testResultsPath = path.join(process.cwd(), 'temp_files', 'test_results', sessionFolder);
    
    // Ensure directory exists
    await fs.mkdir(testResultsPath, { recursive: true });
    
    // Save structured response
    const responseFilePath = path.join(testResultsPath, `${agentName}_output.json`);
    await fs.writeFile(responseFilePath, JSON.stringify(response, null, 2));
    
    // Save raw response if provided
    if (rawResponse) {
      const rawFilePath = path.join(testResultsPath, `${agentName}_raw.txt`);
      await fs.writeFile(rawFilePath, rawResponse);
    }
    
    // Save metadata
    const fullMetadata: SavedResponseMetadata = {
      timestamp: new Date().toISOString(),
      agentName,
      apiSource: metadata?.apiSource || 'openrouter',
      requestId: metadata?.requestId,
      model: metadata?.model,
      executionTime: metadata?.executionTime,
      tokenUsage: metadata?.tokenUsage,
    };
    
    const metadataFilePath = path.join(testResultsPath, `${agentName}_metadata.json`);
    await fs.writeFile(metadataFilePath, JSON.stringify(fullMetadata, null, 2));
    
    console.log(`📁 Saved ${agentName} response to: ${testResultsPath}`);
    return testResultsPath;
    
  } catch (error) {
    console.error(`❌ Failed to save ${agentName} response:`, error);
    throw error;
  }
}

export async function saveSessionSummary(
  sessionId: string,
  responses: { agentName: string; success: boolean; error?: string }[]
): Promise<void> {
  try {
    const testResultsPath = path.join(process.cwd(), 'temp_files', 'test_results', sessionId);
    
    const summary = {
      sessionId,
      timestamp: new Date().toISOString(),
      totalAgents: responses.length,
      successfulAgents: responses.filter(r => r.success).length,
      failedAgents: responses.filter(r => !r.success).length,
      responses: responses.map(r => ({
        agentName: r.agentName,
        success: r.success,
        error: r.error || null
      }))
    };
    
    const summaryPath = path.join(testResultsPath, 'session_summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📊 Saved session summary to: ${summaryPath}`);
  } catch (error) {
    console.error('❌ Failed to save session summary:', error);
  }
}

async function getNextTestFolder(): Promise<string> {
  const testResultsDir = path.join(process.cwd(), 'temp_files', 'test_results');
  
  try {
    // Ensure the test_results directory exists
    await fs.mkdir(testResultsDir, { recursive: true });
    
    // Read existing test folders
    const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
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
    
    return `Test_${nextNumber}`;
  } catch (error) {
    console.error('Error determining next test folder:', error);
    // Fallback to timestamp if there's an error
    const timestamp = Date.now();
    return `Test_${timestamp}`;
  }
}

export async function generateSessionId(): Promise<string> {
  return await getNextTestFolder();
}