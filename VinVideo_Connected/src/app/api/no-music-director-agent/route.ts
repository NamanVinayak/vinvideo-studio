import { NextResponse } from 'next/server';
import { ENHANCED_NO_MUSIC_DIRECTOR_SYSTEM_MESSAGE, EnhancedNoMusicDirectorInput, EnhancedNoMusicDirectorOutput } from '@/agents/directorNoMusic';

/**
 * Enhanced No-Music Director Agent endpoint for Visual-Only Pipeline Stage 2
 * Creates narrative-driven visual beats with sophistication patterns and UserContext integration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userVisionDocument, 
      visionAnalysis,
      contentClassification,
      noMusicUserContext,
      agent_instructions
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
    
    console.log('Calling Enhanced No-Music Director Agent...');
    console.log(`Vision concept: ${userVisionDocument.core_concept}`);
    console.log(`Vision cuts: ${visionAnalysis?.timing_blueprint?.cut_points?.length || 0}`);
    
    // Log user context integration
    if (noMusicUserContext) {
      console.log(`User Context - Style: ${noMusicUserContext.settings?.visualStyle}, Pacing: ${noMusicUserContext.settings?.pacing}`);
    }
    
    const cuts = visionAnalysis?.timing_blueprint?.cut_points || [];
    
    // Prepare enhanced user content with sophistication patterns
    const userContent = `NO-MUSIC PIPELINE - STAGE 2: ENHANCED NARRATIVE DIRECTOR + SOPHISTICATION PATTERNS
    
    USER VISION DOCUMENT:
    ${JSON.stringify(userVisionDocument, null, 2)}
    
    VISION ANALYSIS WITH CUTS (From Enhanced Vision Agent):
    ${JSON.stringify(visionAnalysis, null, 2)}
    
    NO-MUSIC USER CONTEXT (User-Requirement-First):
    ${JSON.stringify(noMusicUserContext, null, 2)}
    
    AGENT INSTRUCTIONS (From Vision Understanding):
    ${JSON.stringify(agent_instructions, null, 2)}
    
    CONTENT CLASSIFICATION:
    ${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}
    
    TASK: Create exactly ${cuts.length} visual beats using ENHANCED SOPHISTICATION PATTERNS. Each beat must:
    
    1. **USER-REQUIREMENT-FIRST PROCESSING:**
       - User Visual Style: ${noMusicUserContext?.settings?.visualStyle || userVisionDocument.visual_style || 'cinematic'}
       - User Pacing Preference: ${noMusicUserContext?.settings?.pacing || userVisionDocument.pacing || 'medium'}
       - NEVER ignore user preferences for arbitrary creative choices
    
    2. **SLIDING WINDOW COGNITIVE DIVERSITY (Pattern 2.1):**
       - Analyze previous 3 beats for diversity before creating next beat
       - Ensure no subject repetition within 3-beat window
       - Apply cognitive science to prevent viewer brain fatigue
    
    3. **MULTI-DIMENSIONAL DIVERSITY SCORING (Pattern 2.3):**
       - Subject Diversity: Different main visual focuses (target >0.8)
       - Perspective Diversity: Varied viewpoints and scales (target >0.8)
       - Visual Approach Diversity: Different presentation styles (target >0.8)
       - Composition Diversity: Varied framing and arrangements (target >0.8)
    
    4. **AGENT INSTRUCTION INTEGRATION (Pattern 5):**
       - Apply director_instructions from Vision Understanding
       - Implement scene_direction_philosophy and anti_repetition_strategy
       - Follow user_style_integration guidance
    
    5. **USER STYLE INTEGRATION (Pattern 2):**
       - Cinematic: Dramatic visual progression, emotional composition
       - Documentary: Realistic approaches, functional framing
       - Artistic: Creative metaphors, experimental approaches
       - Minimal: Clean concepts, simple approaches
    
    Generate complete enhanced output with sophistication pattern integrations as JSON only.`;

    // Model selection - support testing mode switching
    const testMode = request.headers.get('X-Test-Mode'); // 'thinking' | 'regular'
    let modelName;
    
    if (testMode === 'thinking') {
      modelName = 'google/gemini-2.5-pro:thinking';
    } else if (testMode === 'regular') {
      modelName = 'google/gemini-2.5-pro';
    } else {
      modelName = 'google/gemini-2.5-pro'; // default
    }
    
    console.log(`🧠 Director using model: ${modelName} (test mode: ${testMode || 'default'})`);

    // Create the request payload for OpenRouter
    const payload = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: ENHANCED_NO_MUSIC_DIRECTOR_SYSTEM_MESSAGE
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
      
      // Validate beat count matches cuts
      const expectedBeats = cuts.length;
      const actualBeats = visualBeats.stage2_director_output?.visual_beats?.length || 0;
      
      if (actualBeats !== expectedBeats) {
        console.warn(`Beat count mismatch: expected ${expectedBeats}, got ${actualBeats}`);
      }

      // Validate sophistication patterns
      const sophisticationValidation = {
        slidingWindowAnalysis: !!visualBeats.stage2_director_output?.sliding_window_analysis,
        userStyleIntegration: !!visualBeats.stage2_director_output?.user_style_integration,
        agentInstructionCompliance: !!visualBeats.stage2_director_output?.agent_instruction_compliance,
        multiDimensionalDiversity: !!visualBeats.stage2_director_output?.sliding_window_analysis?.subject_diversity_score,
        cognitiveScience: !!visualBeats.stage2_director_output?.temporal_architecture?.cognitive_science_application
      };

      return NextResponse.json({
        success: true,
        stage2_director_output: visualBeats.stage2_director_output,
        executionTime,
        validation: {
          expectedBeats,
          actualBeats,
          beatCountMatch: actualBeats === expectedBeats,
          narrativeSyncEnabled: true,
          pipelineType: 'no_music',
          sophisticationPatterns: sophisticationValidation,
          userContextIntegrated: !!noMusicUserContext,
          agentInstructionsProcessed: !!agent_instructions
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