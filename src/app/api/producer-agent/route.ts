import { NextResponse } from 'next/server';
import { PRODUCER_SYSTEM_MESSAGE } from '@/agents/producer';
import type { UserContext } from '@/types/userContext';

/**
 * Producer Agent endpoint to generate cut points for video editing
 * MODIFIED: Uses OpenRouter with Google Gemini 2.5 Flash instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { transcript, script, producer_instructions, userContext } = body as {
      transcript: any;
      script: string;
      producer_instructions?: any;
      userContext?: UserContext;
    };
    
    // Enhanced debugging for Producer Agent input
    console.log('🎬 PRODUCER AGENT - Debug Input:');
    console.log('- transcript type:', typeof transcript);
    console.log('- transcript value:', transcript);
    console.log('- transcript length/size:', Array.isArray(transcript) ? transcript.length : (transcript ? Object.keys(transcript).length : 'N/A'));
    console.log('- script type:', typeof script);
    console.log('- script value:', script);
    console.log('- script length:', script ? script.length : 'N/A');
    console.log('- producer_instructions:', producer_instructions ? 'PRESENT' : 'NOT_PRESENT');
    console.log('- enhanced_mode:', !!producer_instructions);
    console.log('- userContext:', userContext ? 'PRESENT' : 'NOT_PRESENT');
    if (userContext) {
      console.log('  - originalPrompt:', userContext.originalPrompt?.substring(0, 50) + '...');
      console.log('  - duration:', userContext.settings.duration);
      console.log('  - pacing:', userContext.settings.pacing);
    }
    
    // More specific validation
    const hasValidTranscript = transcript && (Array.isArray(transcript) ? transcript.length > 0 : Object.keys(transcript).length > 0);
    const hasValidScript = script && typeof script === 'string' && script.trim().length > 0;
    
    console.log('- hasValidTranscript:', hasValidTranscript);
    console.log('- hasValidScript:', hasValidScript);
    
    if (!hasValidTranscript || !hasValidScript) {
      return NextResponse.json({ 
        error: `Both transcript and script are required. Received: transcript=${!!transcript} (${typeof transcript}), script=${!!script} (${typeof script})` 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Producer Agent with transcript and script...');
    console.log(`Transcript preview: ${JSON.stringify(transcript).substring(0, 100)}...`);
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    
    // Prepare enhanced user content with producer instructions
    const enhancedInstructions = producer_instructions ? `
🚀 ENHANCED PRODUCER GUIDANCE (Vision Agent Strategist):

TARGET CUT TIMING: ${producer_instructions.target_cut_timing}

PACING RULES:
${producer_instructions.pacing_rules?.map(rule => `- ${rule}`).join('\n')}

AUDIO ANALYSIS ENHANCEMENT: ${producer_instructions.audio_analysis_enhancement}

INTELLIGENT CONSTRAINTS:
${producer_instructions.intelligent_constraints?.map(constraint => `- ${constraint}`).join('\n')}

Use this strategic guidance to make smarter cut decisions while respecting the natural speech flow.

` : '';

    // Add user context information if available
    const userContextInfo = userContext ? `
USER REQUIREMENTS:
- Original Request: "${userContext.originalPrompt}"
- Requested Duration: ${userContext.settings.duration} seconds (MUST be respected with ±5% tolerance)
- Pacing Preference: ${userContext.settings.pacing}
- Visual Style: ${userContext.settings.visualStyle}

` : '';

    const userContent = `${enhancedInstructions}${userContextInfo}Here is the transcription from Whisper:
${JSON.stringify(transcript)}

Here is the video script:
"${script}"

Please output the full list of cuts as a JSON array exactly as specified above.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20",
      messages: [
        {
          role: "system",
          content: PRODUCER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 12000,          // Increased for enhanced scene analysis and detailed timing
      temperature: 0.25,          // Light creative flexibility in editorial choices
      top_p: 0.4,                // Consider multiple valid cut options
      frequency_penalty: 0.1,     // Avoid repetitive cut reasoning
      presence_penalty: 0,        // No penalty for mentioning same concepts
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
        'X-Title': 'VinVideo Connected - Producer Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Producer Agent via OpenRouter...');
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
    const producerResponse = result.choices[0]?.message?.content;
    
    if (!producerResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response (SAME LOGIC AS BEFORE)
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = producerResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response
      const cutPoints = JSON.parse(cleanedResponse);
      
      return NextResponse.json({
        success: true,
        cutPoints,
        executionTime,
        rawResponse: producerResponse,
        usage: result.usage // Token usage from OpenRouter
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.error('Failed to parse producer response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: producerResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in producer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
