import { NextResponse } from 'next/server';
import { DIRECTOR_SYSTEM_MESSAGE } from '@/agents/director';
import { passThroughRawJson } from '@/utils/passThroughRawJson';
import { saveApiResponse, generateSessionId } from '@/utils/responseSaver';
import type { UserContext } from '@/types/userContext';

/**
 * Director Agent endpoint to generate creative vision and story beats
 * MODIFIED: Uses OpenRouter with Google Gemini 2.5 Flash instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { producer_output, script, visionDocument, enhancedMode, director_instructions, userContext } = body as {
      producer_output: any;
      script: string;
      visionDocument?: any;
      enhancedMode?: boolean;
      director_instructions?: any;
      userContext?: UserContext;
    };
    
    if (producer_output === undefined || producer_output === null || !script) {
      return NextResponse.json({
        error: 'Both producer_output and script are required'
      }, { status: 400 });
    }

    // Get API key from environment variables - Using DeepSeek R1 key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenRouter API key is not configured'
      }, { status: 500 });
    }
    
    console.log('Calling Director Agent with producer output and script...');
    console.log(`Producer output preview: ${JSON.stringify(producer_output).substring(0, 100)}...`);
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    console.log(`Vision Document available: ${!!visionDocument}`);
    console.log(`Director Instructions available: ${!!director_instructions}`);
    console.log(`Enhanced Mode: ${!!enhancedMode}`);
    console.log(`UserContext available: ${!!userContext}`);
    if (visionDocument) {
      console.log(`Vision core concept: ${visionDocument.core_concept}`);
      console.log(`Vision detected artistic style: ${visionDocument.detected_artistic_style}`);
    }
    if (userContext) {
      console.log(`User original prompt: ${userContext.originalPrompt?.substring(0, 50)}...`);
      console.log(`User requested duration: ${userContext.settings.duration}s`);
      console.log(`User pacing: ${userContext.settings.pacing}`);
    }
    
    // ENHANCED: Log director instructions content
    if (director_instructions) {
      console.log('📋 DIRECTOR INSTRUCTIONS CONTENT:');
      console.log(JSON.stringify(director_instructions, null, 2));
    }
    
    // Prepare enhanced vision context with director instructions
    const visionContext = visionDocument && enhancedMode ? `
🎨 CRITICAL VISION CONTEXT (MUST BE MAINTAINED):
Core Concept: "${visionDocument.core_concept}"
Visual Style: "${visionDocument.visual_style}" 
Emotion Arc: ${visionDocument.emotion_arc?.join(' → ')}
Color Philosophy: "${visionDocument.color_philosophy}"
${visionDocument.detected_artistic_style !== 'not_mentioned' ? `Detected Artistic Style: "${visionDocument.detected_artistic_style}"` : ''}

` : '';

    const enhancedDirectorGuidance = director_instructions ? `
🚀 ENHANCED DIRECTOR GUIDANCE (Vision Agent Strategist):

MANDATORY REQUIREMENTS:
${director_instructions.mandatory_requirements?.map((req: string) => `- ${req}`).join('\n')}

CREATIVE CONSTRAINTS:
${director_instructions.creative_constraints?.map((constraint: string) => `- ${constraint}`).join('\n')}

NARRATIVE BEATS GUIDANCE: ${director_instructions.narrative_beats_guidance}

CHARACTER ELEMENTS: ${director_instructions.character_elements || 'None specified'}

SETTING REQUIREMENTS: ${director_instructions.setting_requirements}

Use this strategic guidance to create beats that fulfill the creative vision while following these specific requirements.

` : '';

    // Add user context information if available
    const userContextInfo = userContext ? `
📝 USER REQUIREMENTS (ORIGINAL REQUEST):
- What User Asked For: "${userContext.originalPrompt}"
- Duration: ${userContext.settings.duration} seconds
- Pacing: ${userContext.settings.pacing}
- Visual Style: ${userContext.settings.visualStyle}

Remember to ensure your creative vision aligns with what the user actually requested.

` : '';

    const userContent = `${visionContext}${enhancedDirectorGuidance}${userContextInfo}Here is the Producer's cut points output:
${JSON.stringify(producer_output)}

Here is the original video script with timing context:
"${script}"

CRITICAL: Each cut point represents a different moment in the narrative. Even if the script phrase is similar across cuts, you MUST create unique creative visions for each beat. NEVER repeat identical creative_vision descriptions.

Please analyze this and output your creative vision as JSON exactly as specified in your system instructions.`;

    // Create the request payload for OpenRouter with DeepSeek R1
    const payload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system",
          content: DIRECTOR_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 25000,          // Increased for enhanced instructions and detailed beats
      temperature: 0.5,           // Balanced creativity for DeepSeek R1
      top_p: 0.8,                // More diverse creative options
      stream: false
    };

    // Make the API request to OpenRouter
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Director Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Director Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      // Handle rate limits
      if (response.status === 429) {
        return NextResponse.json({
          error: 'Rate limited. Please try again later.',
          retryAfter: response.headers.get('X-RateLimit-Reset')
        }, { status: 429 });
      }
      
      return NextResponse.json({
        error: errorData.error?.message || `OpenRouter API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('OpenRouter response received');

    // Extract the response content (DIRECT ACCESS - NO POLLING!)
    const directorResponse = result.choices[0]?.message?.content;
    
    if (!directorResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response using passThroughRawJson
    const processedResponse = passThroughRawJson(directorResponse, 'Director Agent');
    
    // Validate no identical creative visions if we have structured data
    if (processedResponse.structuredData && processedResponse.structuredData.narrative_beats) {
      const beats = processedResponse.structuredData.narrative_beats as any[];
      const visions = beats.map((beat: any) => beat.creative_vision);
      const uniqueVisions = new Set(visions);
      if (visions.length !== uniqueVisions.size) {
        console.warn('Director produced identical creative visions - this will cause repeated images');
      }
    }
    
    // Auto-save the response
    const sessionId = body.sessionId || await generateSessionId();
    await saveApiResponse(
      'director',
      processedResponse.structuredData,
      processedResponse.rawContent,
      {
        apiSource: 'openrouter',
        model: 'deepseek/deepseek-r1-distill-llama-70b',
        executionTime,
        tokenUsage: result.usage
      },
      sessionId
    );
    
    // Always return success with raw content preserved
    return NextResponse.json({
      success: true,
      directorOutput: processedResponse.structuredData,
      executionTime,
      rawResponse: processedResponse.rawContent,
      parsingStatus: processedResponse.parsingStatus,
      usage: result.usage,
      sessionId,
      ...(processedResponse.errorDetails && { parseWarning: processedResponse.errorDetails })
    });
  } catch (error: unknown) {
    console.error('Error in director-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}