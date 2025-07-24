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

    // The project folder path is now directly the runId  
    const publicDir = path.join(process.cwd(), 'public');
    const projectFolderPath = path.join(publicDir, runId);

    // Create the project folder if it doesn't exist
    await mkdir(projectFolderPath, { recursive: true });

    // Save the structured output directly in the project folder
    const fileName = `${agentName}_output.json`;
    const filePath = path.join(projectFolderPath, fileName);
    await writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');

    // Save the raw response if provided, in the same folder
    let rawFileName = null;
    if (rawResponse) {
      rawFileName = `${agentName}_raw-response.txt`;
      const rawPath = path.join(projectFolderPath, rawFileName);
      await writeFile(rawPath, rawResponse, 'utf8');
    }

    return NextResponse.json({
      success: true,
      savedTo: runId,
      files: [fileName, rawFileName].filter(Boolean)
    });

  } catch (error: unknown) {
    console.error('Error saving agent output:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}