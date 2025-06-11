import { NextResponse } from 'next/server';
import { MUSIC_DIRECTOR_SYSTEM_MESSAGE } from '@/agents/musicDirector';

/**
 * Music-Aware Director Agent endpoint for Music Video Pipeline Stage 4
 * Creates music-synchronized visual beats with cognitive diversity
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userVisionDocument, 
      musicAnalysis, 
      producerCutPoints, 
      contentClassification 
    } = body;
    
    // Validate required inputs
    if (!userVisionDocument || !musicAnalysis || !producerCutPoints) {
      return NextResponse.json({ 
        error: 'User vision document, music analysis, and producer cut points are required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Music-Aware Director Agent...');
    console.log(`Vision concept: ${userVisionDocument.coreConcept}`);
    console.log(`Music BPM: ${musicAnalysis.bpm}, Cut points: ${producerCutPoints.length}`);
    
    // Prepare the user content message with all required context
    const userContent = `MUSIC VIDEO PIPELINE - STAGE 4: MUSIC-AWARE DIRECTOR

USER VISION DOCUMENT:
${JSON.stringify(userVisionDocument, null, 2)}

MUSIC ANALYSIS:
${JSON.stringify(musicAnalysis, null, 2)}

PRODUCER CUT POINTS (Music-Aligned):
${JSON.stringify(producerCutPoints, null, 2)}

CONTENT CLASSIFICATION:
${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}

TASK: Create exactly ${producerCutPoints.length} visual beats that sync with the provided music-aligned cut points. Each beat must:

1. MUSICAL SYNCHRONIZATION:
   - Align creative vision with musical intensity at cut time
   - Match visual energy to BPM and musical section
   - Sync visual metaphor changes with musical phrase boundaries

2. ANTI-REPETITION COMPLIANCE:
   - For abstract concepts: NO repeated visual metaphors
   - For character narratives: Character continuity with environmental variety
   - Apply sliding window subject diversity (max 2 same subjects in 3 consecutive beats)

3. USER INTENT PRESERVATION:
   - Maintain core concept: "${userVisionDocument.coreConcept || 'user concept'}"
   - Respect pacing preference: "${userVisionDocument.pacing || 'moderate'}"
   - Honor visual style: "${userVisionDocument.visualStyle || 'cinematic'}"

4. COGNITIVE ENGAGEMENT:
   - Each beat must reset viewer attention through music+visual combination
   - Create retention hooks that work with musical rhythm
   - Plan visual surprises that sync with musical surprises

Generate the complete visual beat sequence as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: MUSIC_DIRECTOR_SYSTEM_MESSAGE
        },
        {
          role: "user", 
          content: userContent
        }
      ],
      max_tokens: 32000,          // Increased for complete beat generation
      temperature: 0.15,          // Slight creativity while maintaining musical alignment
      top_p: 0.5,                // Consider multiple creative approaches
      frequency_penalty: 0.2,     // Prevent repetitive concepts
      presence_penalty: 0.1,      // Encourage concept variety
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
        'X-Title': 'VinVideo Connected - Music Director Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Music Director Agent via OpenRouter...');
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
    console.log('Music Director response received');

    // Extract the response content
    const directorResponse = result.choices[0]?.message?.content;
    
    console.log('Raw Director response length:', directorResponse?.length || 0);
    console.log('Raw Director response preview:', directorResponse?.substring(0, 300) || 'EMPTY RESPONSE');
    
    if (!directorResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = directorResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response with enhanced error recovery
      let visualBeats;
      try {
        visualBeats = JSON.parse(cleanedResponse);
      } catch (initialParseError) {
        console.log('Initial JSON parse failed, attempting recovery...');
        
        // Try to fix common JSON issues
        let fixedResponse = cleanedResponse;
        
        // Fix trailing commas
        fixedResponse = fixedResponse.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unescaped quotes in strings
        fixedResponse = fixedResponse.replace(/([^\\])"([^"]*?[^\\])"(?=\s*[,}\]])/g, '$1"$2"');
        
        // Try to extract JSON if it's wrapped in text
        const jsonMatch = fixedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          fixedResponse = jsonMatch[0];
        }
        
        try {
          visualBeats = JSON.parse(fixedResponse);
          console.log('JSON recovery successful');
        } catch (secondParseError) {
          console.error('JSON recovery failed:', secondParseError);
          console.error('Problematic JSON:', cleanedResponse.substring(0, 1000));
          
          // Return a structured error with the raw response
          throw new Error(`Could not parse music director response: ${secondParseError.message}`);
        }
      }
      
      // Validate beat count matches cut points
      const expectedBeats = producerCutPoints.length;
      const actualBeats = visualBeats.stage4_director_output?.visual_beats ? visualBeats.stage4_director_output.visual_beats.length : 0;
      
      if (actualBeats !== expectedBeats) {
        console.warn(`Beat count mismatch: expected ${expectedBeats}, got ${actualBeats}`);
      }

      return NextResponse.json({
        success: true,
        stage4_director_output: visualBeats.stage4_director_output || visualBeats,
        executionTime,
        validation: {
          expectedBeats,
          actualBeats,
          beatCountMatch: actualBeats === expectedBeats,
          musicalSyncEnabled: true
        },
        rawResponse: directorResponse,
        usage: result.usage
      });
      
    } catch (parseError) {
      console.error('Failed to parse music director response as JSON:', parseError);
      console.log('🔄 Using RAW RESPONSE FALLBACK strategy - passing raw text to next stage');
      
      // FALLBACK STRATEGY: Pass raw response with structured wrapper
      // The next LLM agent can understand the content even with syntax errors
      return NextResponse.json({
        success: true,
        stage4_director_output: {
          raw_director_response: directorResponse,
          parsing_note: "JSON parsing failed, but content is available for next LLM agent",
          visual_beats: [], // Empty array as fallback
          content_available: true
        },
        executionTime,
        validation: {
          expectedBeats: producerCutPoints.length,
          actualBeats: 0,
          beatCountMatch: false,
          musicalSyncEnabled: true,
          parsing_strategy: "Raw Response Fallback"
        },
        rawResponse: directorResponse,
        usage: result.usage,
        fallback_used: true
      });
    }

  } catch (error: unknown) {
    console.error('Error in music-director-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}