import { NextResponse } from 'next/server';
import { NO_MUSIC_VISION_UNDERSTANDING_SYSTEM_MESSAGE } from '@/agents/visionUnderstandingNoMusic';

/**
 * Enhanced Vision Understanding Agent for No-Music Pipeline
 * Combines concept analysis with timing blueprint generation + agent instruction framework
 * Modernized with sophistication patterns from Vision Enhanced pipeline
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userInput, stylePreferences, technicalRequirements, noMusicUserContext } = body;
    
    // Validate required inputs
    if (!userInput || !userInput.trim()) {
      return NextResponse.json({ 
        error: 'User input is required for vision analysis' 
      }, { status: 400 });
    }

    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Enhanced No-Music Vision Understanding Agent...');
    
    // Log user preferences  
    if (stylePreferences) {
      console.log(`User Preferences - Style: ${stylePreferences.visualStyle}, Pacing: ${stylePreferences.pacing}, Duration: ${stylePreferences.duration}s`);
    }
    
    // Prepare user content with context
    const userContent = `NO-MUSIC PIPELINE - STAGE 1: ENHANCED VISION UNDERSTANDING + TIMING BLUEPRINT + AGENT INSTRUCTION GENERATION
    
    USER CONCEPT INPUT:
    "${userInput}"
    
    STYLE PREFERENCES (User-Requirement-First):
    ${JSON.stringify(stylePreferences, null, 2)}
    
    TECHNICAL REQUIREMENTS:
    ${JSON.stringify(technicalRequirements, null, 2)}
    
    NO-MUSIC USER CONTEXT (User-Requirement-First):
    ${JSON.stringify(noMusicUserContext, null, 2)}
    
    TASK: Analyze the user's concept and create comprehensive vision document + timing blueprint + agent instruction framework for the no-music pipeline.
    
    **USER-REQUIREMENT-FIRST PROCESSING:**
    1. INTEGRATE USER PREFERENCES FIRST:
       - User Visual Style: ${stylePreferences?.visualStyle || 'cinematic'}
       - User Pacing Preference: ${stylePreferences?.pacing || 'medium'}
       - User Duration Request: ${stylePreferences?.duration || 30} seconds
       - NEVER ignore user preferences for arbitrary creative choices
       - CRITICAL: Use EXACT user pacing preference in vision_document.pacing field
    
    2. ARTISTIC STYLE DETECTION:
       - Analyze user input for specific artistic style mentions (Japanese water painting, van Gogh, etc.)
       - If detected, prioritize this style in all downstream agent instructions
       - If not mentioned, use "not_mentioned"
    
    3. VISION ANALYSIS (User-Preference-Aware):
       - Extract core concept while respecting user visual style preference
       - Create emotional arc that serves user's chosen style
       - Classify content type with user style integration
       - Generate creative direction serving user requirements
    
    4. TIMING BLUEPRINT GENERATION (User-Pacing-First):
       - Duration: EXACTLY ${stylePreferences?.duration || 30} seconds
       - Pacing: User preference "${stylePreferences?.pacing || 'medium'}" DRIVES cut timing (NOT generic optimization)
       - Calculate optimal cut count based on USER pacing preference
       - Generate cut points using narrative flow + user preference
       - Create cognitive pacing serving user choice
    
    5. AGENT INSTRUCTION GENERATION (NEW):
       - Director Instructions: Tailored to this specific concept + user preferences
       - DoP Instructions: Camera work serving user style + detected artistic style
       - Prompt Engineer Instructions: Visual generation serving user style + gaze intelligence
       - ALL instructions must integrate user preferences, not generic templates
    
    6. COGNITIVE SCIENCE APPLICATION:
       - Apply sliding-window diversity rules to prevent pattern recognition fatigue
       - Integrate gaze direction intelligence to prevent AI camera staring
       - Use content complexity analysis for duration adaptation
    
    Return complete sophisticated output with agent instructions as JSON only.`;

    // Model selection - support testing mode switching
    const testMode = request.headers.get('X-Test-Mode'); // 'thinking' | 'regular'
    let modelName;
    
    if (testMode === 'thinking') {
      modelName = 'google/gemini-2.5-flash-preview-05-20:thinking';
    } else if (testMode === 'regular') {
      modelName = 'google/gemini-2.5-flash-preview-05-20';
    } else {
      modelName = 'google/gemini-2.5-flash-preview-05-20'; // default
    }
    
    console.log(`🧠 Vision Understanding using model: ${modelName} (test mode: ${testMode || 'default'})`);

    // EXACT OpenRouter payload structure
    const payload = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: NO_MUSIC_VISION_UNDERSTANDING_SYSTEM_MESSAGE
        },
        {
          role: "user", 
          content: userContent
        }
      ],
      max_tokens: 11000,
      temperature: 0.2,           // Low for technical precision
      top_p: 0.4,                 // Focused responses
      frequency_penalty: 0.3,     // Encourage variety
      presence_penalty: 0.1,      // Slight diversity penalty
      stream: false
    };

    // EXACT OpenRouter request structure
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - No Music Vision Understanding'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to No-Music Vision Understanding Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || `API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const agentResponse = result.choices[0]?.message?.content;
    
    if (!agentResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    console.log('Raw agent response length:', agentResponse.length);
    console.log('First 500 chars of response:', agentResponse.substring(0, 500));
    console.log('Last 500 chars of response:', agentResponse.substring(Math.max(0, agentResponse.length - 500)));

    // CRITICAL: JSON cleaning and parsing logic
    try {
      let cleanedResponse = agentResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response with enhanced error recovery
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(cleanedResponse);
      } catch (initialParseError) {
        console.log('Initial JSON parse failed, attempting recovery...');
        
        // Try to fix common JSON issues
        let fixedResponse = cleanedResponse;
        
        // Fix trailing commas
        fixedResponse = fixedResponse.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unescaped quotes in strings
        fixedResponse = fixedResponse.replace(/([^\\])"([^"]*?[^\\])"(?=\s*[,}\]])/g, '$1"$2"');
        
        // Fix unquoted property names (e.g., {property: "value"} -> {"property": "value"})
        fixedResponse = fixedResponse.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        
        // Fix property names that might be missing colons
        fixedResponse = fixedResponse.replace(/"([^"]+)"\s*"([^"]+)"/g, (match: string, prop: string, value: string) => {
          // Check if this looks like a property-value pair without a colon
          if (!match.includes(':')) {
            return `"${prop}": "${value}"`;
          }
          return match;
        });
        
        // Fix unquoted string values more aggressively
        fixedResponse = fixedResponse.replace(/:(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])/g, (match: string, space: string, value: string, delimiter: string) => {
          // Check if value is a boolean, null, or number
          if (value === 'true' || value === 'false' || value === 'null' || !isNaN(Number(value))) {
            return match; // Keep as is
          }
          // Otherwise, add quotes
          return `:${space}"${value}"${delimiter}`;
        });
        
        // Fix array elements that might be missing quotes
        fixedResponse = fixedResponse.replace(/\[([^\]]+)\]/g, (match: string, content: string) => {
          // Split by comma and fix each element
          const elements = content.split(',').map(elem => {
            elem = elem.trim();
            // If it's not already quoted and not a number/boolean/null
            if (!elem.startsWith('"') && !elem.startsWith('{') && !elem.startsWith('[') && 
                elem !== 'true' && elem !== 'false' && elem !== 'null' && isNaN(Number(elem))) {
              return `"${elem}"`;
            }
            return elem;
          });
          return `[${elements.join(', ')}]`;
        });
        
        // Try to extract JSON if it's wrapped in text
        const jsonMatch = fixedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          fixedResponse = jsonMatch[0];
        }
        
        try {
          parsedOutput = JSON.parse(fixedResponse);
          console.log('JSON recovery successful');
        } catch (secondParseError) {
          console.error('JSON recovery failed:', secondParseError);
          
          // Extract the problematic section around the error position
          const errorPos = (secondParseError as any).position || 1561;
          const contextStart = Math.max(0, errorPos - 100);
          const contextEnd = Math.min(cleanedResponse.length, errorPos + 100);
          console.error('Problematic JSON section:', cleanedResponse.substring(contextStart, contextEnd));
          console.error('Error position context:', {
            before: cleanedResponse.substring(errorPos - 20, errorPos),
            at: cleanedResponse.substring(errorPos, errorPos + 1),
            after: cleanedResponse.substring(errorPos + 1, errorPos + 20)
          });
          
          // Try one more recovery attempt - fix unquoted values
          let lastAttemptFix = fixedResponse;
          
          // Fix common unquoted string values in JSON
          // Pattern: "key": value where value should be "value"
          lastAttemptFix = lastAttemptFix.replace(/"(\w+)":\s*([a-zA-Z_]\w*)\s*([,}])/g, (match: string, key: string, value: string, delimiter: string) => {
            // Check if value is a boolean or null
            if (value === 'true' || value === 'false' || value === 'null') {
              return match; // Keep as is
            }
            // Otherwise, add quotes
            return `"${key}": "${value}"${delimiter}`;
          });
          
          try {
            parsedOutput = JSON.parse(lastAttemptFix);
            console.log('Final JSON recovery successful with unquoted value fix');
          } catch (finalError) {
            console.error('Final JSON recovery failed:', finalError);
            // Return a structured error with the raw response
            const errorMessage = finalError instanceof Error ? finalError.message : 'Unknown error';
            throw new Error(`Could not parse agent response: ${errorMessage}`);
          }
        }
      }
      
      // Validate essential outputs and sophistication patterns
      const validation = {
        hasVisionDocument: !!parsedOutput.stage1_vision_analysis?.vision_document,
        hasTimingBlueprint: !!parsedOutput.stage1_vision_analysis?.timing_blueprint,
        hasCutPoints: !!parsedOutput.stage1_vision_analysis?.timing_blueprint?.cut_points,
        cutPointCount: parsedOutput.stage1_vision_analysis?.timing_blueprint?.cut_points?.length || 0,
        pipelineReady: parsedOutput.pipeline_ready === true,
        // Sophistication pattern validation
        hasAgentInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions,
        hasDirectorInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.director_instructions,
        hasDopInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.dop_instructions,
        hasPromptEngineerInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.prompt_engineer_instructions,
        artisticStyleDetected: parsedOutput.stage1_vision_analysis?.vision_document?.detected_artistic_style !== "not_mentioned",
        userContextIntegrated: !!noMusicUserContext
      };
      
      return NextResponse.json({
        success: true,
        stage1_vision_analysis: parsedOutput.stage1_vision_analysis,
        executionTime,
        validation,
        rawResponse: agentResponse,
        usage: result.usage,
        pipeline_ready: parsedOutput.pipeline_ready,
        needs_clarification: parsedOutput.needs_clarification || false
      });
      
    } catch (parseError) {
      console.error('Failed to parse agent response as JSON:', parseError);
      
      // Last resort: Try to create a valid structure from the raw response
      console.log('Attempting emergency fallback structure generation...');
      
      try {
        // Extract key information using regex patterns
        const durationMatch = agentResponse.match(/"duration"\s*:\s*(\d+)/);
        const pacingMatch = agentResponse.match(/"pacing"\s*:\s*"([^"]+)"/);
        const conceptMatch = agentResponse.match(/"core_concept"\s*:\s*"([^"]+)"/);
        
        const duration = durationMatch ? parseInt(durationMatch[1]) : 30;
        const pacing = pacingMatch ? pacingMatch[1] : 'moderate';
        const concept = conceptMatch ? conceptMatch[1] : 'Visual narrative';
        
        // Generate emergency fallback structure
        const fallbackStructure = {
          success: true,
          needs_clarification: false,
          stage1_vision_analysis: {
            vision_document: {
              core_concept: concept,
              emotion_arc: ["intrigue", "contemplation", "resolution"],
              pacing: pacing as "contemplative" | "moderate" | "dynamic",
              visual_style: "cinematic",
              duration: duration,
              content_classification: {
                type: "abstract_thematic" as const
              },
              music_mood_hints: ["atmospheric", "evolving"],
              visual_complexity: "moderate" as const,
              color_philosophy: "Evolving palette that mirrors emotional progression"
            },
            timing_blueprint: {
              estimated_duration_s: duration,
              cut_strategy: "narrative_flow" as const,
              optimal_cut_count: Math.floor(duration / (pacing === 'slow' ? 9 : pacing === 'fast' ? 3 : 6)),
              average_cut_length: duration / Math.floor(duration / (pacing === 'slow' ? 9 : pacing === 'fast' ? 3 : 6)),
              pacing_rationale: `Generated ${pacing} pacing based on content requirements`,
              cut_points: Array.from({ length: Math.floor(duration / (pacing === 'slow' ? 9 : pacing === 'fast' ? 3 : 6)) }, (_, i) => ({
                cut_number: i + 1,
                cut_time_s: (i + 1) * (duration / Math.floor(duration / (pacing === 'slow' ? 9 : pacing === 'fast' ? 3 : 6))),
                narrative_reason: `Natural progression point ${i + 1}`,
                content_transition: `Visual evolution segment ${i + 1}`,
                cognitive_weight: "medium" as const,
                emotional_intensity: "medium" as const
              }))
            },
            user_input_validation: {
              input_quality: "sufficient" as const,
              specificity_level: "medium" as const,
              concept_clarity: "developing" as const
            }
          },
          validation: {
            concept_specificity_score: 0.7,
            emotional_coherence_score: 0.8,
            technical_completeness_score: 0.9,
            timing_blueprint_score: 0.85,
            issues: []
          },
          pipeline_ready: true
        };
        
        console.log('Emergency fallback structure generated successfully');
        
        return NextResponse.json({
          success: true,
          stage1_vision_analysis: fallbackStructure.stage1_vision_analysis,
          executionTime,
          validation: fallbackStructure.validation,
          rawResponse: agentResponse,
          usage: result.usage,
          pipeline_ready: true,
          needs_clarification: false,
          fallback_used: true,
          parse_error_details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        });
        
      } catch (fallbackError) {
        console.error('Emergency fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          error: `Could not parse agent response: ${parseError}`,
          rawResponse: agentResponse,
          executionTime,
          usage: result.usage
        }, { status: 500 });
      }
    }

  } catch (error: unknown) {
    console.error('Error in no-music-vision-understanding endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}