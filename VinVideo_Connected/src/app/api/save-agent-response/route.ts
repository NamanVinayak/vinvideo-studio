import { NextRequest, NextResponse } from 'next/server';
import { saveAgentResponse, PipelineType } from '@/utils/agent-response-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      agentName,
      response,
      pipelineType,
      sessionId,
      projectFolder,
      input,
      rawResponse,
      model,
      executionTime
    } = body;

    // Validate required fields
    if (!agentName || !response || !pipelineType || !sessionId || !projectFolder) {
      return NextResponse.json(
        { error: 'Missing required fields: agentName, response, pipelineType, sessionId, projectFolder' },
        { status: 400 }
      );
    }

    // Validate pipeline type
    const validPipelineTypes: PipelineType[] = ['SCRIPT_MODE', 'VISION_ENHANCED', 'MUSIC_VIDEO', 'NO_MUSIC_VIDEO'];
    if (!validPipelineTypes.includes(pipelineType)) {
      return NextResponse.json(
        { error: `Invalid pipeline type. Must be one of: ${validPipelineTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Save agent response
    await saveAgentResponse({
      agentName,
      response,
      pipelineType,
      sessionId,
      projectFolder,
      input,
      rawResponse,
      model,
      executionTime
    });

    return NextResponse.json({ success: true, message: 'Agent response saved successfully' });

  } catch (error) {
    console.error('Error saving agent response:', error);
    return NextResponse.json(
      { error: 'Failed to save agent response' },
      { status: 500 }
    );
  }
}