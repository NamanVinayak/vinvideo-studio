import { NextResponse } from 'next/server';
import { VISION_ENHANCED_PRODUCER_SYSTEM_MESSAGE } from '@/agents/visionEnhancedProducer';
import { saveApiResponse, generateSessionId } from '@/utils/responseSaver';

/**
 * Vision Enhanced Producer Agent endpoint
 * User-requirement-first producer for Vision Mode Enhanced Pipeline
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { transcript, script, visionDocument, producer_instructions } = body;
    
    // Enhanced debugging for Vision Enhanced Producer Agent input
    console.log('🎬 VISION ENHANCED PRODUCER AGENT - Debug Input:');
    console.log('- transcript type:', typeof transcript);
    console.log('- transcript length:', Array.isArray(transcript) ? transcript.length : 'N/A');
    console.log('- script type:', typeof script);
    console.log('- script length:', script ? script.length : 'N/A');
    console.log('- visionDocument present:', !!visionDocument);
    console.log('- visionDocument type:', typeof visionDocument);
    console.log('- visionDocument keys:', visionDocument ? Object.keys(visionDocument) : 'N/A');
    console.log('- visionDocument.duration_s:', visionDocument?.duration_s);
    console.log('- visionDocument.pacing:', visionDocument?.pacing);
    console.log('- producer_instructions:', producer_instructions ? 'PRESENT' : 'NOT_PRESENT');
    console.log('- Full visionDocument structure:', JSON.stringify(visionDocument, null, 2));
    
    // Validation
    const hasValidTranscript = transcript && Array.isArray(transcript) && transcript.length > 0;
    const hasValidScript = script && typeof script === 'string' && script.trim().length > 0;
    const hasValidVisionDocument = visionDocument && visionDocument.duration_s && visionDocument.pacing;
    
    if (!hasValidTranscript || !hasValidScript || !hasValidVisionDocument) {
      return NextResponse.json({ 
        error: `Required inputs missing. transcript=${hasValidTranscript}, script=${hasValidScript}, visionDocument=${hasValidVisionDocument}` 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Vision Enhanced Producer Agent...');
    console.log(`Target duration: ${visionDocument.duration_s}s, Pacing: ${visionDocument.pacing}`);
    
    // Calculate expected cut count based on pacing
    const pacingToCutRatio: { [key: string]: number } = {
      contemplative: 8,  // 1 cut per 8 seconds
      moderate: 4,       // 1 cut per 4 seconds
      dynamic: 2.5,      // 1 cut per 2.5 seconds
      fast: 1.5          // 1 cut per 1.5 seconds
    };

    if (!pacingToCutRatio[visionDocument.pacing]) {
      return NextResponse.json({ 
        error: `Invalid pacing value provided: "${visionDocument.pacing}". Valid options are: ${Object.keys(pacingToCutRatio).join(', ')}.` 
      }, { status: 400 });
    }
    
    const expectedCutCount = Math.round(visionDocument.duration_s / pacingToCutRatio[visionDocument.pacing]);
    
    // Prepare user content
    const userContent = `
VISION DOCUMENT:
${JSON.stringify(visionDocument, null, 2)}

TARGET REQUIREMENTS:
- Duration: ${visionDocument.duration_s} seconds (MANDATORY ±5%)
- Pacing: ${visionDocument.pacing} (expecting ~${expectedCutCount} cuts)
- Content Type: ${visionDocument.content_classification?.type || 'general'}

${producer_instructions ? `
VISION AGENT INSTRUCTIONS:
${producer_instructions}
` : ''}

TRANSCRIPT (with timestamps):
${JSON.stringify(transcript)}

SCRIPT:
"${script}"

Generate cut points that EXACTLY match the user's duration requirement (${visionDocument.duration_s}s ±5%) and respect their pacing preference (${visionDocument.pacing}).`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20",
      messages: [
        {
          role: "system",
          content: VISION_ENHANCED_PRODUCER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 12000,
      temperature: 0.15,  // Lower temperature for precise requirement following
      top_p: 0.3,         // Focused on best solutions
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
        'X-Title': 'VinVideo Connected - Vision Enhanced Producer Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Vision Enhanced Producer Agent via OpenRouter...');
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

    // Extract the response content
    const producerResponse = result.choices[0]?.message?.content;
    
    if (!producerResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = producerResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Parse the cleaned JSON response
      const producerOutput = JSON.parse(cleanedResponse);
      
      // Validate output against requirements
      const durationVariance = Math.abs(producerOutput.duration_variance || 0);
      const meetsRequirements = durationVariance <= 5 && producerOutput.pacing_compliance;
      
      console.log(`✅ Vision Enhanced Producer Results:
        - Target Duration: ${visionDocument.duration_s}s
        - Actual Duration: ${producerOutput.estimated_duration_s}s
        - Variance: ${producerOutput.duration_variance}%
        - Pacing Compliance: ${producerOutput.pacing_compliance}
        - Requirements Met: ${meetsRequirements}`);
      
      // Auto-save the response
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'vision-enhanced-producer',
        producerOutput,
        producerResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash-preview-05-20',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      return NextResponse.json({
        success: true,
        cutPoints: producerOutput.cut_points,
        producerOutput,
        executionTime,
        rawResponse: producerResponse,
        usage: result.usage,
        sessionId,
        compliance: {
          meetsRequirements,
          durationVariance,
          pacingCompliance: producerOutput.pacing_compliance
        }
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.error('Failed to parse producer response as JSON:', parseError);
      
      // Still save the raw response for debugging
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'vision-enhanced-producer-error',
        { error: parseError instanceof Error ? parseError.message : 'Parse error' },
        producerResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash-preview-05-20',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      return NextResponse.json({
        success: false,
        rawResponse: producerResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        usage: result.usage,
        sessionId
      });
    }

  } catch (error: unknown) {
    console.error('Error in vision-enhanced-producer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
