import { NextResponse } from 'next/server';
import { ENHANCED_NO_MUSIC_DOP_SYSTEM_MESSAGE, EnhancedNoMusicDoPInput, EnhancedNoMusicDoPOutput } from '@/agents/dopNoMusic';

/**
 * Enhanced No-Music DoP Agent endpoint for Visual-Only Pipeline Stage 3
 * Creates narrative-driven cinematography with sophistication patterns and UserContext integration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      directorVisualBeats, 
      visionDocument, 
      contentClassification,
      noMusicUserContext,
      agent_instructions
    } = body;
    
    // Validate required inputs
    if (!directorVisualBeats || !visionDocument) {
      return NextResponse.json({ 
        error: 'Director visual beats and vision document are required' 
      }, { status: 400 });
    }
    
    // Log user context integration
    if (noMusicUserContext) {
      console.log(`User Context - Style: ${noMusicUserContext.settings?.visualStyle}, Pacing: ${noMusicUserContext.settings?.pacing}`);
    }

    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Enhanced No-Music DoP Agent...');
    console.log(`Vision concept: ${visionDocument.core_concept}`);
    console.log(`Director visual beats: ${directorVisualBeats.length}`);
    console.log(`Director beats preview:`, directorVisualBeats.map((beat: any) => ({ beat_no: beat.beat_no, duration: beat.estimated_duration_s })));
    
    // Prepare enhanced user content with sophistication patterns
    const userContent = `NO-MUSIC PIPELINE - STAGE 3: ENHANCED NARRATIVE CINEMATOGRAPHER + SOPHISTICATION PATTERNS
    
    USER VISION DOCUMENT:
    ${JSON.stringify(visionDocument, null, 2)}
    
    DIRECTOR VISUAL BEATS:
    ${JSON.stringify(directorVisualBeats, null, 2)}
    
    NO-MUSIC USER CONTEXT (User-Requirement-First):
    ${JSON.stringify(noMusicUserContext, null, 2)}
    
    AGENT INSTRUCTIONS (From Vision Understanding):
    ${JSON.stringify(agent_instructions, null, 2)}
    
    CONTENT CLASSIFICATION:
    ${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}
    
    TASK: Create cinematography for exactly ${directorVisualBeats.length} shots using ENHANCED SOPHISTICATION PATTERNS. Each shot must:
    
    1. **USER-REQUIREMENT-FIRST CINEMATOGRAPHY:**
       - User Visual Style: ${noMusicUserContext?.settings?.visualStyle || visionDocument.visual_style || 'cinematic'}
       - User Pacing Preference: ${noMusicUserContext?.settings?.pacing || visionDocument.pacing || 'medium'}
       - NEVER ignore user preferences for arbitrary creative choices
    
    2. **LOCATION TRACKING INTELLIGENCE (Pattern 3.1):**
       - Maintain location_id consistency for environmental continuity
       - Use location_description for character consistency support
       - Track environmental changes with continuity scores
    
    3. **USER STYLE-AWARE CINEMATOGRAPHY (Pattern 3.3):**
       - Cinematic: Dramatic angles, controlled lighting, emotional composition
       - Documentary: Handheld realism, natural lighting, functional framing
       - Artistic: Creative framing, experimental angles, stylized lighting
       - Minimal: Clean composition, simple movements, subtle lighting
    
    4. **AGENT INSTRUCTION PROCESSING (Pattern 5):**
       - Apply dop_instructions from Vision Understanding
       - Implement cinematography_philosophy and artistic_style_support
       - Follow user_style_cinematography guidance
    
    5. **ADVANCED VALIDATION & HANDOFF NOTES:**
       - Generate location_tracking and user_style_compliance data
       - Create agent_coordination with handoff_notes for downstream agents
       - Provide comprehensive validation scoring
    
    Generate complete enhanced cinematography with sophistication patterns as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: ENHANCED_NO_MUSIC_DOP_SYSTEM_MESSAGE
        },
        {
          role: "user", 
          content: userContent
        }
      ],
      max_tokens: 25000,          // Increased for enhanced cinematography instructions
      temperature: 0.2,           // Slightly higher for creativity in shot design
      top_p: 0.6,                // More diverse technical responses
      frequency_penalty: 0.1,     // Reduced to allow detailed descriptions
      presence_penalty: 0.05,     // Minimal penalty for technical consistency
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
        'X-Title': 'VinVideo Connected - No Music DoP Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to No-Music DoP Agent via OpenRouter...');
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
    console.log('No-Music DoP response received');

    // Extract the response content
    const dopResponse = result.choices[0]?.message?.content;
    
    if (!dopResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = dopResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response with enhanced error recovery
      let cinematographySpecs;
      try {
        cinematographySpecs = JSON.parse(cleanedResponse);
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
          cinematographySpecs = JSON.parse(fixedResponse);
          console.log('JSON recovery successful');
        } catch (secondParseError) {
          console.error('JSON recovery failed:', secondParseError);
          console.error('Problematic JSON:', cleanedResponse.substring(0, 1000));
          
          // Return a structured error with the raw response
          const errorMessage = secondParseError instanceof Error ? secondParseError.message : 'Unknown parse error';
          throw new Error(`Could not parse no-music DoP response: ${errorMessage}`);
        }
      }
      
      // Additional fallback: Check if response has the wrong structure entirely
      if (!cinematographySpecs.stage5_dop_output && cinematographySpecs.cinematographic_shots) {
        console.warn('🚨 AI returned flat structure, wrapping in stage5_dop_output');
        cinematographySpecs.stage5_dop_output = {
          cinematographic_shots: cinematographySpecs.cinematographic_shots,
          overall_cinematographic_approach: cinematographySpecs.overall_cinematographic_approach || "Narrative-driven cinematography",
          narrative_philosophy: "Camera serves pure visual narrative without musical cues",
          technical_requirements: cinematographySpecs.technical_requirements || {
            primary_camera: "alexa_35",
            support_gear: ["dolly", "crane", "steadicam"],
            lighting_package: "standard",
            special_equipment: []
          }
        };
        // Clean up flat structure
        delete cinematographySpecs.cinematographic_shots;
        delete cinematographySpecs.overall_cinematographic_approach;
        delete cinematographySpecs.technical_requirements;
        console.log('✅ Flat structure conversion completed');
      }
      
      // Ensure output structure exists
      if (!cinematographySpecs.stage5_dop_output) {
        console.warn('No stage5_dop_output found, creating complete fallback structure');
        cinematographySpecs.stage5_dop_output = {
          cinematographic_shots: [],
          overall_cinematographic_approach: "Narrative-driven cinematography with dynamic visual storytelling",
          narrative_philosophy: "Camera serves pure visual narrative without musical cues",
          technical_requirements: {
            primary_camera: "alexa_35",
            support_gear: ["dolly", "crane", "steadicam"],
            lighting_package: "standard",
            special_equipment: []
          }
        };
      }
      
      // Fix any "musical_sync" fields to "narrative_sync" (AI sometimes reverts to music mode)
      if (cinematographySpecs.stage5_dop_output?.cinematographic_shots) {
        cinematographySpecs.stage5_dop_output.cinematographic_shots.forEach((shot: any) => {
          if (shot.musical_sync && !shot.narrative_sync) {
            console.log(`Converting musical_sync to narrative_sync for shot ${shot.beat_no}`);
            shot.narrative_sync = {
              story_motivation: shot.musical_sync.rhythm_interpretation || "Narrative progression",
              emotional_emphasis_technique: shot.musical_sync.beat_emphasis_technique || "Visual storytelling",
              transition_design: shot.musical_sync.transition_design || "cut",
              cognitive_pacing: "moderate"
            };
            delete shot.musical_sync;
          }
        });
      }
      
      // Validate shot count matches director beats
      const expectedShots = directorVisualBeats.length;
      const actualShots = cinematographySpecs.stage5_dop_output?.cinematographic_shots?.length || 0;
      
      if (actualShots !== expectedShots) {
        console.warn(`Shot count mismatch: expected ${expectedShots}, got ${actualShots}`);
        
        // Generate missing shots as fallback
        const existingShots = cinematographySpecs.stage5_dop_output?.cinematographic_shots || [];
        const missingCount = expectedShots - actualShots;
        
        if (missingCount > 0) {
          console.log(`Generating ${missingCount} fallback shots...`);
          
          // Use existing shot as template, or create default template
          const templateShot = existingShots.length > 0 ? existingShots[0] : {
            cinematography: {
              shot_size: "medium",
              camera_angle: "eye_level",
              camera_movement: "dolly_in",
              movement_speed: "moderate",
              movement_motivation: "Natural narrative progression",
              lens: "normal_50mm",
              depth_of_field: "medium_focus",
              focus_technique: "locked"
            },
            lighting: {
              primary_mood: "high_key",
              key_light: "natural",
              color_temp: "daylight_5600k",
              contrast_ratio: "medium_4:1",
              special_effects: "none"
            },
            composition: {
              framing_principle: "rule_of_thirds",
              visual_weight: "balanced",
              depth_layers: "foreground|midground|background",
              leading_lines: "none"
            }
          };
          
          for (let i = actualShots; i < expectedShots; i++) {
            const directorBeat = directorVisualBeats[i];
            const fallbackShot = {
              beat_no: directorBeat.beat_no || i + 1,
              shot_id: `S${directorBeat.beat_no || i + 1}`,
              cinematography: {
                ...templateShot.cinematography,
                shot_size: i % 2 === 0 ? "medium" : "close_up",
                camera_movement: i % 3 === 0 ? "dolly_in" : i % 3 === 1 ? "pan" : "static",
                movement_motivation: `Narrative progression for ${directorBeat.narrative_sync?.story_purpose || 'beat ' + (i + 1)}`
              },
              lighting: {
                ...templateShot.lighting,
                primary_mood: i % 2 === 0 ? "high_key" : "neutral"
              },
              composition: {
                ...templateShot.composition,
                framing_principle: i % 2 === 0 ? "rule_of_thirds" : "center"
              },
              narrative_sync: {
                story_motivation: directorBeat.narrative_sync?.story_purpose || `Visual beat ${i + 1}`,
                emotional_emphasis_technique: `Natural progression matching ${directorBeat.narrative_sync?.emotional_role || 'narrative flow'}`,
                transition_design: i === expectedShots - 1 ? "fade" : "cut",
                cognitive_pacing: directorBeat.cognitive_weight === "heavy" ? "contemplative" : "moderate"
              }
            };
            
            existingShots.push(fallbackShot);
          }
          
          cinematographySpecs.stage5_dop_output.cinematographic_shots = existingShots;
          console.log(`Fallback shots generated. Total shots now: ${existingShots.length}`);
        }
      }

      // Final validation after potential fallback generation
      const finalShotCount = cinematographySpecs.stage5_dop_output?.cinematographic_shots?.length || 0;
      
      // Validate sophistication patterns
      const sophisticationValidation = {
        locationTracking: !!cinematographySpecs.stage5_dop_output?.location_continuity_summary,
        userStyleIntegration: !!cinematographySpecs.stage5_dop_output?.user_style_integration,
        agentInstructionCompliance: !!cinematographySpecs.stage5_dop_output?.agent_instruction_compliance,
        locationConsistencyMaintained: cinematographySpecs.stage5_dop_output?.location_continuity_summary?.environmental_consistency_score || 0,
        userStyleCompliant: cinematographySpecs.validation?.user_style_compliance_score || 0
      };

      return NextResponse.json({
        success: true,
        stage5_dop_output: cinematographySpecs.stage5_dop_output,
        executionTime,
        validation: {
          expectedShots,
          originalShots: actualShots,
          finalShots: finalShotCount,
          shotCountMatch: finalShotCount === expectedShots,
          fallbackUsed: finalShotCount > actualShots,
          narrativeCinematography: true,
          pipelineType: 'no_music',
          sophisticationPatterns: sophisticationValidation,
          userContextIntegrated: !!noMusicUserContext,
          agentInstructionsProcessed: !!agent_instructions
        },
        rawResponse: dopResponse,
        usage: result.usage
      });
      
    } catch (parseError) {
      console.error('Failed to parse no-music DoP response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: dopResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in no-music-dop-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}