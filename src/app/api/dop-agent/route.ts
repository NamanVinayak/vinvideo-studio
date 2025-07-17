import { NextResponse } from 'next/server';
import { DOP_SYSTEM_MESSAGE } from '@/agents/dop';
import { saveApiResponse, generateSessionId } from '@/utils/responseSaver';
import type { UserContext } from '@/types/userContext';

/**
 * DoP Agent endpoint to generate cinematography directions
 * MODIFIED: Uses OpenRouter with Google Gemini 2.5 Flash instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, producer_output, director_output, visionDocument, enhancedMode, dop_instructions, userContext } = body as {
      script: string;
      producer_output: any;
      director_output: any;
      visionDocument?: any;
      enhancedMode?: boolean;
      dop_instructions?: any;
      userContext?: UserContext;
    };
    
    if (!script || producer_output === undefined || producer_output === null || 
        director_output === undefined || director_output === null) {
      return NextResponse.json({ 
        error: 'script, producer_output, and director_output are all required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling DoP Agent with script, producer and director outputs...');
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    console.log(`Producer output preview: ${JSON.stringify(producer_output).substring(0, 100)}...`);
    console.log(`Director output preview: ${JSON.stringify(director_output).substring(0, 100)}...`);
    console.log(`Vision Document available: ${!!visionDocument}`);
    console.log(`DoP Instructions available: ${!!dop_instructions}`);
    console.log(`Enhanced Mode: ${!!enhancedMode}`);
    console.log(`UserContext available: ${!!userContext}`);
    if (visionDocument) {
      console.log(`Vision core concept: ${visionDocument.core_concept}`);
      console.log(`Detected artistic style: ${visionDocument.detected_artistic_style}`);
    }
    if (userContext) {
      console.log(`User original prompt: ${userContext.originalPrompt?.substring(0, 50)}...`);
      console.log(`User visual style: ${userContext.settings.visualStyle}`);
    }
    
    // ENHANCED: Log DoP instructions content
    if (dop_instructions) {
      console.log('📋 DOP INSTRUCTIONS CONTENT:');
      console.log(JSON.stringify(dop_instructions, null, 2));
    }
    
    // Prepare enhanced vision context with artistic style
    const visionContext = visionDocument && enhancedMode ? `
🎨 CRITICAL VISION CONTEXT (MUST BE MAINTAINED):
Core Concept: "${visionDocument.core_concept}"
Visual Style: "${visionDocument.visual_style}" 
Emotion Arc: ${visionDocument.emotion_arc?.join(' → ')}
Color Philosophy: "${visionDocument.color_philosophy}"
${visionDocument.detected_artistic_style !== 'not_mentioned' ? `Detected Artistic Style: "${visionDocument.detected_artistic_style}"` : ''}

` : '';

    const enhancedDoPGuidance = dop_instructions ? `
🚀 ENHANCED DoP GUIDANCE (Vision Agent Strategist):

MANDATORY CINEMATOGRAPHY:
${dop_instructions.mandatory_cinematography?.map((req: string) => `- ${req}`).join('\n')}

TECHNICAL CONSTRAINTS:
${dop_instructions.technical_constraints?.map((constraint: string) => `- ${constraint}`).join('\n')}

LIGHTING PHILOSOPHY: ${dop_instructions.lighting_philosophy}

MOVEMENT STYLE: ${dop_instructions.movement_style}

COMPOSITION RULES:
${dop_instructions.composition_rules?.map((rule: string) => `- ${rule}`).join('\n')}

ARTISTIC STYLE SUPPORT: ${dop_instructions.artistic_style_support}

Use this strategic guidance to create cinematography that supports both the narrative and artistic vision.

` : '';

    // Add user context information if available
    const userContextInfo = userContext ? `
🎯 USER'S ORIGINAL VISION:
- Request: "${userContext.originalPrompt}"
- Visual Style: ${userContext.settings.visualStyle}
- Pacing: ${userContext.settings.pacing}

Ensure your cinematography supports the user's intended visual style.

` : '';

    const userContent = `${visionContext}${enhancedDoPGuidance}${userContextInfo}Here are the inputs for cinematography planning:

ORIGINAL SCRIPT:
"${script}"

PRODUCER EDITOR NOTES (timing and cuts):
${JSON.stringify(producer_output)}

DIRECTOR NOTES (creative vision):
${JSON.stringify(director_output)}

Please analyze these inputs and output your cinematography directions as a JSON array exactly as specified in your system instructions.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: DOP_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 25000,          // Increased for enhanced cinematography instructions
      temperature: 0.35,          // Higher creativity for cinematographic artistry
      top_p: 0.5,                // More diverse visual choices and creative options
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
        'X-Title': 'VinVideo Connected - DoP Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to DoP Agent via OpenRouter...');
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
    const dopResponse = result.choices[0]?.message?.content;
    
    if (!dopResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response with enhanced validation
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = dopResponse.trim();
      
      // Enhanced markdown cleanup
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\s*/, '').replace(/\s*```$/, '').trim();
      }
      
      // Remove any leading/trailing whitespace and control characters
      cleanedResponse = cleanedResponse.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
      
      // Validate JSON structure before parsing
      if (!cleanedResponse) {
        throw new Error('Empty response after cleaning');
      }
      
      if (!cleanedResponse.startsWith('{') && !cleanedResponse.startsWith('[')) {
        throw new Error(`Response does not start with valid JSON character. Starts with: "${cleanedResponse.substring(0, 20)}"`);  
      }
      
      if (!cleanedResponse.endsWith('}') && !cleanedResponse.endsWith(']')) {
        throw new Error(`Response does not end with valid JSON character. Ends with: "${cleanedResponse.slice(-20)}"`);  
      }
      
      // Check for balanced braces/brackets
      const openBraces = (cleanedResponse.match(/\{/g) || []).length;
      const closeBraces = (cleanedResponse.match(/\}/g) || []).length;
      const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
      const closeBrackets = (cleanedResponse.match(/\]/g) || []).length;
      
      if (openBraces !== closeBraces) {
        throw new Error(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
      }
      
      if (openBrackets !== closeBrackets) {
        throw new Error(`Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`);
      }
      
      // Try to parse the cleaned JSON response
      const dopOutput = JSON.parse(cleanedResponse);
      
      // Validate that the parsed output is an object or array
      if (typeof dopOutput !== 'object' || dopOutput === null) {
        throw new Error(`Parsed output is not an object or array, got: ${typeof dopOutput}`);
      }
      
      // Auto-save the response
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'dop',
        dopOutput,
        dopResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      return NextResponse.json({
        success: true,
        dopOutput,
        executionTime,
        rawResponse: dopResponse,
        usage: result.usage, // Token usage from OpenRouter
        sessionId
      });
    } catch (parseError) {
      // Enhanced error logging for better debugging
      console.error('Failed to parse DoP response as JSON:', parseError);
      console.error('Parse error type:', parseError instanceof Error ? parseError.constructor.name : typeof parseError);
      console.log('DoP raw response (first 500 chars):', dopResponse.substring(0, 500));
      console.log('DoP raw response (last 100 chars):', dopResponse.slice(-100));
      console.log('DoP response length:', dopResponse.length);
      
      // Try to extract any JSON-like content for partial recovery
      let partialData = null;
      try {
        // Look for JSON objects within the response
        const jsonMatch = dopResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Attempting to parse partial JSON...');
          partialData = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed partial JSON:', Object.keys(partialData));
        }
      } catch (partialError) {
        console.log('Partial JSON extraction also failed:', partialError);
      }
      
      // Still save the raw response for debugging
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'dop-parse-error',
        { error: parseError instanceof Error ? parseError.message : 'Parse error', rawLength: dopResponse.length },
        dopResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      // CRITICAL: Pass structured fallback or partial data as dopOutput
      const fallbackOutput = partialData || {
        cinematography: dopResponse.substring(0, 1000), // Truncate to prevent issues
        error: 'JSON parsing failed',
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        fallback: true
      };
      
      return NextResponse.json({
        success: true,
        dopOutput: fallbackOutput,
        rawResponse: dopResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON, using fallback structure',
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        usage: result.usage,
        sessionId
      });
    }

  } catch (error: unknown) {
    console.error('Error in dop-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
