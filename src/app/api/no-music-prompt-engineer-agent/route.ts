import { NextResponse } from 'next/server';
import { NO_MUSIC_FLUX_SYSTEM_MESSAGE } from '@/agents/no-music-pipeline/no-music-prompt-engineer';

/**
 * No-Music Prompt Engineer Agent endpoint for Visual-Only Pipeline Stage 4
 * Creates narrative-driven FLUX prompts without musical synchronization
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userVisionDocument, 
      directorBeats, 
      dopSpecs, 
      contentClassification 
    } = body;
    
    console.log('🔍 NO-MUSIC-PROMPT-ENGINEER RECEIVED DATA:');
    console.log(`- Request body keys: ${Object.keys(body).join(', ')}`);
    console.log(`- userVisionDocument present: ${!!userVisionDocument}`);
    console.log(`- userVisionDocument type: ${typeof userVisionDocument}`);
    console.log(`- directorBeats present: ${!!directorBeats}`);
    console.log(`- directorBeats type: ${typeof directorBeats}`);
    console.log(`- directorBeats is array: ${Array.isArray(directorBeats)}`);
    console.log(`- dopSpecs present: ${!!dopSpecs}`);
    console.log(`- dopSpecs type: ${typeof dopSpecs}`);
    console.log(`- Full body:`, JSON.stringify(body, null, 2));
    
    // Validate required inputs
    if (!userVisionDocument || !directorBeats || !dopSpecs) {
      return NextResponse.json({ 
        error: 'User vision document, director beats, and DoP specs are required' 
      }, { status: 400 });
    }

    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling No-Music Prompt Engineer Agent...');
    console.log(`Vision concept: ${userVisionDocument.core_concept}`);
    console.log(`Director beats: ${directorBeats.length}`);
    console.log(`DoP specs: ${dopSpecs.length}`);
    console.log('🔍 DoP specs preview:', dopSpecs.slice(0, 2).map((spec: any) => ({ 
      beat_no: spec.beat_no, 
      shot_id: spec.shot_id,
      hasNarrativeSync: !!spec.narrative_sync,
      hasMusicalSync: !!spec.musical_sync 
    })));
    
    // Prepare the user content message with all required context
    const userContent = `NO-MUSIC PIPELINE - STAGE 4: NARRATIVE PROMPT ENGINEER
    
    USER VISION DOCUMENT:
    ${JSON.stringify(userVisionDocument, null, 2)}
    
    DIRECTOR VISUAL BEATS:
    ${JSON.stringify(directorBeats, null, 2)}
    
    DOP CINEMATOGRAPHIC SPECIFICATIONS:
    ${JSON.stringify(dopSpecs, null, 2)}
    
    CONTENT CLASSIFICATION:
    ${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}
    
    TASK: Create exactly ${directorBeats.length} FLUX prompts that synthesize all narrative elements. Each prompt must:
    
    1. VISUAL NARRATIVE SYNTHESIS:
       - Combine vision document concepts with director's story beats
       - Integrate DoP's cinematographic specifications
       - Create narrative flow through visual description sequencing
       - Ensure character consistency for narrative content
    
    2. NARRATIVE PROMPT OPTIMIZATION:
       - Character consistency across narrative progression
       - Visual metaphor evolution for abstract content
       - Cinematographic accuracy in AI generation prompts
       - Natural temporal flow without musical rhythm cues
    
    3. CONTENT-TYPE ADAPTATION:
       - Abstract/Thematic: Each prompt explores different conceptual angle
       - Narrative/Character: Character consistency with environmental variety
       - Contemplative pacing: Detailed descriptions for deep exploration
       - Dynamic pacing: Concise, energetic descriptions
    
    4. FLUX OPTIMIZATION:
       - Front-load most important narrative elements
       - Use FLUX-friendly descriptors for specificity
       - Leverage FLUX's strength with faces and environments
       - Keep under 40 words for optimal coherence
       - Structure for narrative flow rather than musical rhythm
    
    5. VISUAL FLOW DESIGN:
       - Cognitive pacing through visual complexity
       - Natural rhythm through content transitions
       - Emotional beats through lighting/composition changes
       - Story momentum through environmental progression
    
    Generate exactly ${directorBeats.length} complete FLUX prompts as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: NO_MUSIC_FLUX_SYSTEM_MESSAGE
        },
        {
          role: "user", 
          content: userContent
        }
      ],
      max_tokens: 25000,          // Increased for enhanced prompt generation with gaze instructions
      temperature: 0.2,           // Some creativity for prompt variety
      top_p: 0.6,                // Allow creative prompt variations
      frequency_penalty: 0.3,     // Encourage prompt diversity
      presence_penalty: 0.15,     // Some variety while maintaining consistency
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
        'X-Title': 'VinVideo Connected - No Music Prompt Engineer'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to No-Music Prompt Engineer Agent via OpenRouter...');
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
    console.log('No-Music Prompt Engineer response received');

    // Extract the response content
    const promptResponse = result.choices[0]?.message?.content;
    
    if (!promptResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = promptResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response with enhanced error recovery
      let promptSpecs;
      try {
        promptSpecs = JSON.parse(cleanedResponse);
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
          promptSpecs = JSON.parse(fixedResponse);
          console.log('JSON recovery successful');
        } catch (secondParseError) {
          console.error('JSON recovery failed:', secondParseError);
          console.error('Problematic JSON:', cleanedResponse.substring(0, 1000));
          
          // Return a structured error with the raw response
          throw new Error(`Could not parse no-music prompt engineer response: ${secondParseError instanceof Error ? secondParseError.message : String(secondParseError)}`);
        }
      }
      
      // Validate prompt count matches director beats
      const expectedPrompts = directorBeats.length;
      const actualPrompts = promptSpecs.stage4_prompt_engineer_output?.flux_prompts?.length || 0;
      
      if (actualPrompts !== expectedPrompts) {
        console.warn(`Prompt count mismatch: expected ${expectedPrompts}, got ${actualPrompts}`);
      }

      return NextResponse.json({
        success: true,
        stage4_prompt_engineer_output: promptSpecs.stage4_prompt_engineer_output,
        executionTime,
        validation: {
          expectedPrompts,
          actualPrompts,
          promptCountMatch: actualPrompts === expectedPrompts,
          characterConsistencyEnabled: promptSpecs.validation?.characterConsistencyEnabled || false,
          narrativeOptimized: promptSpecs.validation?.narrativeOptimized || true,
          visualFlowDesigned: promptSpecs.validation?.visualFlowDesigned || true
        },
        rawResponse: promptResponse,
        usage: result.usage
      });
      
    } catch (parseError) {
      console.error('Failed to parse no-music prompt engineer response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: promptResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in no-music-prompt-engineer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}