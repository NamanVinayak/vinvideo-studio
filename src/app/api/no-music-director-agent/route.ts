import { NextResponse } from 'next/server';
import { NO_MUSIC_DIRECTOR_SYSTEM_MESSAGE } from '@/agents/directorNoMusic';

/**
 * No-Music Director Agent endpoint for Visual-Only Pipeline Stage 2
 * Creates narrative-driven visual beats without musical synchronization
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userVisionDocument, 
      contentClassification 
    } = body;
    
    // Validate required inputs
    if (!userVisionDocument) {
      return NextResponse.json({ 
        error: 'User vision document is required' 
      }, { status: 400 });
    }

    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling No-Music Director Agent...');
    console.log(`Vision concept: ${userVisionDocument.core_concept}`);
    console.log(`Cut points from timing blueprint: ${userVisionDocument.timing_blueprint?.cut_points?.length || 0}`);
    
    // Extract timing blueprint from vision document
    const timingBlueprint = userVisionDocument.timing_blueprint || {};
    const cutPoints = timingBlueprint.cut_points || [];
    
    // Prepare the user content message with all required context
    const userContent = `NO-MUSIC PIPELINE - STAGE 2: NARRATIVE DIRECTOR
    
    USER VISION DOCUMENT:
    ${JSON.stringify(userVisionDocument, null, 2)}
    
    TIMING BLUEPRINT (From Enhanced Vision Agent):
    ${JSON.stringify(timingBlueprint, null, 2)}
    
    CONTENT CLASSIFICATION:
    ${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}
    
    TASK: Create exactly ${cutPoints.length} visual beats that follow the narrative-driven timing blueprint. Each beat must:
    
    1. NARRATIVE SYNCHRONIZATION:
       - Align creative vision with story flow and emotional progression
       - Match visual energy to cognitive pacing requirements
       - Sync visual metaphor changes with narrative progression
    
    2. ANTI-REPETITION COMPLIANCE:
       - For abstract concepts: NO repeated visual metaphors
       - For character narratives: Character continuity with environmental variety
       - Apply sliding window subject diversity (max 2 same subjects in 3 consecutive beats)
    
    3. USER INTENT PRESERVATION:
       - Maintain core concept: "${userVisionDocument.core_concept || 'user concept'}"
       - Respect pacing preference: "${userVisionDocument.pacing || 'moderate'}"
       - Honor visual style: "${userVisionDocument.visual_style || 'cinematic'}"
    
    4. TEMPORAL ARCHITECTURE:
       - Use timing blueprint cut points for natural story rhythm
       - Create cognitive engagement through narrative progression
       - Plan visual surprises that align with story beats
       - Ensure smooth narrative flow without musical cues
    
    5. COGNITIVE PACING:
       - Heavy content gets longer durations for processing
       - Light content uses shorter durations to maintain engagement
       - Natural transitions based on story logic, not musical beats
    
    Generate the complete visual beat sequence as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: NO_MUSIC_DIRECTOR_SYSTEM_MESSAGE
        },
        {
          role: "user", 
          content: userContent
        }
      ],
      max_tokens: 25000,          // Increased for enhanced instructions and detailed beats
      temperature: 0.15,          // Slight creativity while maintaining narrative coherence
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
        'X-Title': 'VinVideo Connected - No Music Director Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to No-Music Director Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || `OpenRouter API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('No-Music Director response received');

    // Extract the response content
    const directorResponse = result.choices[0]?.message?.content;
    
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
          throw new Error(`Could not parse no-music director response: ${secondParseError instanceof Error ? secondParseError.message : String(secondParseError)}`);
        }
      }
      
      // Validate beat count matches cut points
      const expectedBeats = cutPoints.length;
      const actualBeats = visualBeats.stage2_director_output?.visual_beats?.length || 0;
      
      if (actualBeats !== expectedBeats) {
        console.warn(`Beat count mismatch: expected ${expectedBeats}, got ${actualBeats}`);
      }

      return NextResponse.json({
        success: true,
        stage2_director_output: visualBeats.stage2_director_output,
        executionTime,
        validation: {
          expectedBeats,
          actualBeats,
          beatCountMatch: actualBeats === expectedBeats,
          narrativeSyncEnabled: true,
          pipelineType: 'no_music'
        },
        rawResponse: directorResponse,
        usage: result.usage
      });
      
    } catch (parseError) {
      console.error('Failed to parse no-music director response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: directorResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in no-music-director-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}