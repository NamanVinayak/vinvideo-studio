import { NextResponse } from 'next/server';
import { VISION_ENHANCED_PRODUCER_SYSTEM_MESSAGE } from '@/agents/visionEnhancedProducer';
import { saveApiResponse, generateSessionId } from '@/utils/responseSaver';
import type { UserContext } from '@/types/userContext';

/**
 * Enhanced JSON extraction function for handling :thinking model outputs
 * Implements multiple parsing strategies to handle various response formats
 */
function extractJsonFromResponse(response: string): any {
  const originalResponse = response;
  console.log('🔍 JSON Extraction Debug - Response length:', response.length);
  console.log('🔍 JSON Extraction Debug - First 200 chars:', response.substring(0, 200));
  console.log('🔍 JSON Extraction Debug - Last 200 chars:', response.substring(Math.max(0, response.length - 200)));
  
  // Strategy 1: Standard Markdown Code Blocks (backward compatibility)
  try {
    let cleaned = response.trim();
    
    // Perfect markdown blocks
    if (cleaned.startsWith('```json') && cleaned.endsWith('```')) {
      cleaned = cleaned.slice(7, -3).trim();
      console.log('✅ Strategy 1A: Perfect ```json``` block extraction successful');
      return JSON.parse(cleaned);
    }
    
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
      cleaned = cleaned.slice(3, -3).trim();
      console.log('✅ Strategy 1B: Perfect ``` block extraction successful');
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.log('❌ Strategy 1: Standard markdown blocks failed');
  }
  
  // Strategy 2: Broken/Mixed Markdown Detection (for :thinking models)
  try {
    const jsonMarkerIndex = response.indexOf('```json');
    if (jsonMarkerIndex !== -1) {
      // Found ```json marker, extract from after it
      let jsonStart = jsonMarkerIndex + 7; // Skip "```json"
      let jsonContent = response.substring(jsonStart);
      
      // Look for closing ```
      const closingIndex = jsonContent.indexOf('```');
      if (closingIndex !== -1) {
        jsonContent = jsonContent.substring(0, closingIndex);
      }
      
      jsonContent = jsonContent.trim();
      console.log('✅ Strategy 2: Broken markdown extraction successful');
      console.log('🔍 Extracted JSON length:', jsonContent.length);
      return JSON.parse(jsonContent);
    }
  } catch (error) {
    console.log('❌ Strategy 2: Broken markdown detection failed');
  }
  
  // Strategy 3: Bracket Matching (most robust for mixed content)
  try {
    const firstBrace = response.indexOf('{');
    if (firstBrace !== -1) {
      let braceCount = 0;
      let jsonEnd = firstBrace;
      
      // Count brackets to find the complete JSON object
      for (let i = firstBrace; i < response.length; i++) {
        if (response[i] === '{') braceCount++;
        if (response[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
      
      if (braceCount === 0) {
        const extractedJson = response.substring(firstBrace, jsonEnd + 1);
        console.log('✅ Strategy 3: Bracket matching extraction successful');
        console.log('🔍 Extracted JSON length:', extractedJson.length);
        return JSON.parse(extractedJson);
      }
    }
  } catch (error) {
    console.log('❌ Strategy 3: Bracket matching failed');
  }
  
  // Strategy 4: Multiple JSON Object Detection
  try {
    const jsonObjects = [];
    let searchIndex = 0;
    
    while (searchIndex < response.length) {
      const braceIndex = response.indexOf('{', searchIndex);
      if (braceIndex === -1) break;
      
      let braceCount = 0;
      let objectEnd = braceIndex;
      
      for (let i = braceIndex; i < response.length; i++) {
        if (response[i] === '{') braceCount++;
        if (response[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          objectEnd = i;
          break;
        }
      }
      
      if (braceCount === 0) {
        try {
          const candidate = response.substring(braceIndex, objectEnd + 1);
          const parsed = JSON.parse(candidate);
          jsonObjects.push({ content: parsed, length: candidate.length, start: braceIndex });
        } catch (e) {
          // Invalid JSON, continue searching
        }
      }
      
      searchIndex = objectEnd + 1;
    }
    
    if (jsonObjects.length > 0) {
      // Return the largest valid JSON object
      const largest = jsonObjects.reduce((max, obj) => obj.length > max.length ? obj : max);
      console.log(`✅ Strategy 4: Multiple object detection successful (found ${jsonObjects.length} objects, using largest)`);
      return largest.content;
    }
  } catch (error) {
    console.log('❌ Strategy 4: Multiple object detection failed');
  }
  
  // All strategies failed - provide detailed error information
  console.error('🚨 All JSON extraction strategies failed!');
  console.error('📄 Response preview (first 500 chars):', originalResponse.substring(0, 500));
  console.error('📄 Response preview (last 300 chars):', originalResponse.substring(Math.max(0, originalResponse.length - 300)));
  
  // Try to provide helpful error context
  const hasOpenBrace = originalResponse.includes('{');
  const hasCloseBrace = originalResponse.includes('}');
  const hasJsonMarker = originalResponse.includes('json');
  const hasMarkdown = originalResponse.includes('```');
  
  console.error('🔍 Response analysis:', {
    hasOpenBrace,
    hasCloseBrace,
    hasJsonMarker,
    hasMarkdown,
    responseLength: originalResponse.length
  });
  
  throw new Error(`Failed to extract JSON from response. Analysis: hasOpenBrace=${hasOpenBrace}, hasCloseBrace=${hasCloseBrace}, hasJsonMarker=${hasJsonMarker}, hasMarkdown=${hasMarkdown}`);
}

/**
 * Vision Enhanced Producer Agent endpoint
 * User-requirement-first producer for Vision Mode Enhanced Pipeline
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { transcript, script, visionDocument, producer_instructions, userContext } = body as {
      transcript: any;
      script: string;
      visionDocument: any;
      producer_instructions?: any;
      userContext?: UserContext;
    };
    
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
    console.log('- userContext:', userContext ? 'PRESENT' : 'NOT_PRESENT');
    if (userContext) {
      console.log('  - originalPrompt:', userContext.originalPrompt?.substring(0, 50) + '...');
      console.log('  - duration:', userContext.settings.duration);
      console.log('  - pacing:', userContext.settings.pacing);
    }
    console.log('- Full visionDocument structure:', JSON.stringify(visionDocument, null, 2));
    
    // ENHANCED: Log producer instructions content
    if (producer_instructions) {
      console.log('📋 PRODUCER INSTRUCTIONS CONTENT:');
      console.log(JSON.stringify(producer_instructions, null, 2));
    }
    
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
      slow: 9,      // 1 cut per 9 seconds (8-10 sec range)
      medium: 6,    // 1 cut per 6 seconds (5-7 sec range)
      fast: 3       // 1 cut per 3 seconds (2-4 sec range)
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

${userContext ? `USER REQUIREMENTS (HIGHEST PRIORITY):
- Original Request: "${userContext.originalPrompt}"
- Requested Duration: ${userContext.settings.duration} seconds (ABSOLUTE REQUIREMENT)
- Pacing Preference: ${userContext.settings.pacing}
- Visual Style: ${userContext.settings.visualStyle}

` : ''}Generate cut points that EXACTLY match the user's duration requirement (${userContext?.settings.duration || visionDocument.duration_s}s ±5%) and respect their pacing preference (${userContext?.settings.pacing || visionDocument.pacing}).`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash",
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
      max_tokens: 17000,
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

    // Process the response with enhanced JSON extraction
    try {
      const producerOutput = extractJsonFromResponse(producerResponse);
      
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
          model: 'google/gemini-2.5-flash',
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
      // Enhanced error handling for JSON extraction failures
      console.error('🚨 Enhanced JSON extraction failed:', parseError);
      console.error('📊 Error details:', parseError instanceof Error ? parseError.message : 'Parse error');
      
      // Log response characteristics for debugging
      const responseAnalysis = {
        responseLength: producerResponse.length,
        hasOpenBrace: producerResponse.includes('{'),
        hasCloseBrace: producerResponse.includes('}'),
        hasJsonMarker: producerResponse.includes('json'),
        hasMarkdown: producerResponse.includes('```'),
        firstBracePosition: producerResponse.indexOf('{'),
        lastBracePosition: producerResponse.lastIndexOf('}'),
        responsePreview: producerResponse.substring(0, 300),
        responseSuffix: producerResponse.substring(Math.max(0, producerResponse.length - 200))
      };
      
      console.error('🔍 Response analysis for debugging:', responseAnalysis);
      
      // Still save the raw response for debugging
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'vision-enhanced-producer-error',
        { 
          error: parseError instanceof Error ? parseError.message : 'Parse error',
          extractionStrategiesAttempted: [
            'Standard markdown blocks',
            'Broken markdown detection', 
            'Bracket matching',
            'Multiple object detection'
          ],
          responseAnalysis
        },
        producerResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash:thinking',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      return NextResponse.json({
        success: false,
        rawResponse: producerResponse,
        executionTime,
        warning: 'Enhanced JSON extraction failed - all strategies attempted',
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        extractionStrategiesAttempted: [
          'Standard markdown blocks',
          'Broken markdown detection', 
          'Bracket matching',
          'Multiple object detection'
        ],
        responseAnalysis,
        usage: result.usage,
        sessionId,
        debugTip: 'Check the rawResponse and responseAnalysis for manual JSON extraction'
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
