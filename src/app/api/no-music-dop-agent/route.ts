import { NextResponse } from 'next/server';
import { NO_MUSIC_DOP_SYSTEM_MESSAGE } from '@/agents/dopNoMusic';

/**
 * No-Music DoP Agent endpoint for Visual-Only Pipeline Stage 3
 * Creates narrative-driven cinematography without musical synchronization
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      directorVisualBeats, 
      visionDocument, 
      contentClassification 
    } = body;
    
    // Validate required inputs
    if (!directorVisualBeats || !visionDocument) {
      return NextResponse.json({ 
        error: 'Director visual beats and vision document are required' 
      }, { status: 400 });
    }

    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling No-Music DoP Agent...');
    console.log(`Vision concept: ${visionDocument.core_concept}`);
    console.log(`Director visual beats: ${directorVisualBeats.length}`);
    console.log(`Director beats preview:`, directorVisualBeats.map((beat: any) => ({ beat_no: beat.beat_no, duration: beat.estimated_duration_s })));
    
    // Prepare the user content message with all required context
    const userContent = `NO-MUSIC PIPELINE - STAGE 3: NARRATIVE CINEMATOGRAPHER
    
    USER VISION DOCUMENT:
    ${JSON.stringify(visionDocument, null, 2)}
    
    DIRECTOR VISUAL BEATS:
    ${JSON.stringify(directorVisualBeats, null, 2)}
    
    CONTENT CLASSIFICATION:
    ${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}
    
    TASK: Create cinematography specifications for exactly ${directorVisualBeats.length} shots based on narrative-driven visual beats. Each shot must:
    
    1. NARRATIVE CINEMATOGRAPHY:
       - Camera work serves story logic, not musical rhythm
       - Lighting choices reflect emotional progression
       - Movement motivated by narrative flow and content weight
       - Composition choices enhance storytelling
    
    2. VISUAL STORYTELLING FRAMEWORK:
       - Narrative tension → Camera movement intensity
       - Emotional weight → Composition and framing choices  
       - Story pace → Movement speed and transition style
       - Character arc → Lighting evolution and angle progression
       - Content complexity → Technical sophistication level
    
    3. COGNITIVE PACING ADAPTATION:
       - Heavy cognitive content: Stable, contemplative framing
       - Light visual content: Dynamic movement to maintain engagement
       - Emotional peaks: Strategic camera positioning for impact
       - Narrative transitions: Smooth or dramatic as story demands
    
    4. CONTENT-TYPE CINEMATOGRAPHY:
       - Abstract/Thematic: Creative camera work exploring visual metaphors
       - Narrative/Character: Character-focused framing with environmental context
       - Contemplative pacing: Longer, more deliberate movements
       - Dynamic pacing: Quick, energetic camera work with variety
    
    5. TECHNICAL REQUIREMENTS:
       - Production-ready specifications
       - Achievable yet aspirational shot designs
       - Consistent cinematographic language
       - Natural progression without musical cues
    
    Generate complete cinematography specifications as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: NO_MUSIC_DOP_SYSTEM_MESSAGE
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
      
      // Fix wrong pipeline structure - AI sometimes returns music pipeline format
      if (cinematographySpecs.stage5_dop_output && !cinematographySpecs.stage3_dop_output) {
        console.warn('🚨 AI returned wrong structure (stage5_dop_output), converting to stage3_dop_output');
        cinematographySpecs.stage3_dop_output = cinematographySpecs.stage5_dop_output;
        delete cinematographySpecs.stage5_dop_output;
        console.log('✅ Structure conversion completed');
      }
      
      // Additional fallback: Check if response has the wrong structure entirely
      if (!cinematographySpecs.stage3_dop_output && cinematographySpecs.cinematographic_shots) {
        console.warn('🚨 AI returned flat structure, wrapping in stage3_dop_output');
        cinematographySpecs.stage3_dop_output = {
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
      if (!cinematographySpecs.stage3_dop_output) {
        console.warn('No stage3_dop_output found, creating complete fallback structure');
        cinematographySpecs.stage3_dop_output = {
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
      if (cinematographySpecs.stage3_dop_output?.cinematographic_shots) {
        cinematographySpecs.stage3_dop_output.cinematographic_shots.forEach((shot: any) => {
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
      const actualShots = cinematographySpecs.stage3_dop_output?.cinematographic_shots?.length || 0;
      
      if (actualShots !== expectedShots) {
        console.warn(`Shot count mismatch: expected ${expectedShots}, got ${actualShots}`);
        
        // Generate missing shots as fallback
        const existingShots = cinematographySpecs.stage3_dop_output?.cinematographic_shots || [];
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
          
          cinematographySpecs.stage3_dop_output.cinematographic_shots = existingShots;
          console.log(`Fallback shots generated. Total shots now: ${existingShots.length}`);
        }
      }

      // Final validation after potential fallback generation
      const finalShotCount = cinematographySpecs.stage3_dop_output?.cinematographic_shots?.length || 0;

      return NextResponse.json({
        success: true,
        stage3_dop_output: cinematographySpecs.stage3_dop_output,
        executionTime,
        validation: {
          expectedShots,
          originalShots: actualShots,
          finalShots: finalShotCount,
          shotCountMatch: finalShotCount === expectedShots,
          fallbackUsed: finalShotCount > actualShots,
          narrativeCinematography: true,
          pipelineType: 'no_music'
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