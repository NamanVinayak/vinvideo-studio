import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * API endpoint to save agent outputs to organized folders
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { runId, agentName, output, rawResponse } = body;
    
    if (!runId || !agentName || !output) {
      return NextResponse.json({
        error: 'runId, agentName, and output are required'
      }, { status: 400 });
    }

    // Create the run folder path
    const publicDir = path.join(process.cwd(), 'public');
    const runFolderPath = path.join(publicDir, `run-${runId}`);
    
    // Create the run folder if it doesn't exist
    try {
      await mkdir(runFolderPath, { recursive: true });
    } catch (error) {
      // Folder might already exist, that's fine
    }

    // Create agent-specific subfolder
    const agentFolderPath = path.join(runFolderPath, agentName);
    try {
      await mkdir(agentFolderPath, { recursive: true });
    } catch (error) {
      // Folder might already exist, that's fine
    }

    // Save the structured output
    const outputPath = path.join(agentFolderPath, 'output.json');
    await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

    // Save the raw response if provided
    if (rawResponse) {
      const rawPath = path.join(agentFolderPath, 'raw-response.txt');
      await writeFile(rawPath, rawResponse, 'utf8');
    }

    // Save metadata
    const metadata = {
      agentName,
      runId,
      timestamp: new Date().toISOString(),
      outputSize: JSON.stringify(output).length,
      hasRawResponse: !!rawResponse
    };
    const metadataPath = path.join(agentFolderPath, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      savedTo: `run-${runId}/${agentName}`,
      files: ['output.json', rawResponse ? 'raw-response.txt' : null, 'metadata.json'].filter(Boolean)
    });

  } catch (error: unknown) {
    console.error('Error saving agent output:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}