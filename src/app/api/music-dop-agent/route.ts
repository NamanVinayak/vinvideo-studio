import { NextResponse } from 'next/server';
import { MUSIC_DOP_SYSTEM_MESSAGE } from '@/agents/music-pipeline/music-dop';

/**
 * Music-Aware DoP Agent API endpoint for Music Video Pipeline Stage 5
 * Creates music-synchronized cinematography specifications
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      directorVisualBeats, 
      musicAnalysis, 
      visionDocument, 
      contentClassification 
    } = body;
    
    // Validate required inputs - allow raw director response fallback
    if (!visionDocument || !musicAnalysis) {
      return NextResponse.json({ 
        error: 'Music analysis and vision document are required' 
      }, { status: 400 });
    }
    
    if (!directorVisualBeats) {
      return NextResponse.json({ 
        error: 'Director visual beats are required' 
      }, { status: 400 });
    }
    
    // Handle raw director response fallback
    const isRawDirectorResponse = directorVisualBeats?.raw_director_response;
    if (isRawDirectorResponse) {
      console.log('🔄 DoP Agent: Handling raw director response fallback');
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Music-Aware DoP Agent...');
    
    // Extract visual beats count properly
    let visualBeatsCount: number | string = 0;
    if (directorVisualBeats?.visual_beats?.length) {
      visualBeatsCount = directorVisualBeats.visual_beats.length;
    } else if (Array.isArray(directorVisualBeats)) {
      visualBeatsCount = directorVisualBeats.length;
    } else if (directorVisualBeats?.raw_director_response) {
      // For raw responses, we'll let the LLM figure out the count
      visualBeatsCount = 'unknown';
    }
    
    console.log(`Processing ${visualBeatsCount} visual beats for cinematography`);
    
    // Prepare the user content message with all required context
    const userContent = `MUSIC VIDEO PIPELINE - STAGE 5: MUSIC-AWARE CINEMATOGRAPHY

${isRawDirectorResponse ? `
DIRECTOR VISUAL BEATS (Raw Response - Parse and Extract):
${directorVisualBeats.raw_director_response}

IMPORTANT: The director's response above contains visual beats but may have JSON syntax errors. 
Parse the content to extract the visual beat information and create proper cinematography specs.` : `
DIRECTOR VISUAL BEATS (Music-Synchronized):
${JSON.stringify(directorVisualBeats, null, 2)}`}

MUSIC ANALYSIS (For Rhythm Synchronization):
${JSON.stringify(musicAnalysis, null, 2)}

VISION DOCUMENT (User Style Preferences):
${JSON.stringify(visionDocument, null, 2)}

CONTENT CLASSIFICATION (Cinematographic Approach):
${JSON.stringify(contentClassification || { type: 'auto_detect' }, null, 2)}

TASK: Create music-synchronized cinematography for each visual beat. ${isRawDirectorResponse ? 'First extract the visual beats from the raw director response, then create cinematography specs for each beat.' : 'For each beat you must:'}

1. MUSICAL RHYTHM INTEGRATION:
   - Sync camera movement timing with beat structure (downbeats, phrase boundaries)
   - Translate musical intensity (${musicAnalysis.intensityCurve ? 'available' : 'calculate from BPM'}) into cinematographic energy
   - Align movement speed with BPM (${musicAnalysis.bpm || 'unknown'}) and user pacing (${visionDocument.pacing || 'moderate'})

2. DIRECTOR VISION AMPLIFICATION:
   - Enhance subject diversity through cinematographic contrast
   - Support creative vision with appropriate shot sizes and angles
   - Amplify cognitive engagement through camera variety

3. CINEMATOGRAPHIC SPECIFICATIONS:
   - Precise shot size, composition, camera angle for each beat
   - Specific camera movement with musical timing rationale
   - Technical specs (lens, focus, lighting) aligned with vision style
   - Movement justification explaining musical and creative integration

4. SEQUENCE OPTIMIZATION:
   - Ensure cinematographic variety prevents pattern recognition fatigue
   - Maintain visual continuity while maximizing shot diversity
   - Create smooth transitions between beats aligned with musical structure

Generate cinematography specifications for all ${directorVisualBeats.length} beats as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: MUSIC_DOP_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 32000,          // Increased for complete cinematography specs
      temperature: 0.2,           // Low creativity - focus on technical precision
      top_p: 0.4,                // Focused on cinematographic best practices
      frequency_penalty: 0.3,     // Encourage shot variety and prevent repetitive specs
      presence_penalty: 0.1,      // Slight penalty to encourage cinematographic diversity
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
        'X-Title': 'VinVideo Connected - Music DoP Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Music DoP Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || `DeepSeek API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('Music DoP response received');

    // Extract the response content
    const dopResponse = result.choices[0]?.message?.content;
    
    if (!dopResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response using robust multi-strategy parsing
    const parseResult = parseCinematographyFromResponse(dopResponse, typeof visualBeatsCount === 'number' ? visualBeatsCount : 0);
    
    if (parseResult.success) {
      const cinematographySpecs = parseResult.cinematography;
      const expectedShots = typeof visualBeatsCount === 'number' ? visualBeatsCount : 0;
      const actualShots = cinematographySpecs.cinematographic_shots ? cinematographySpecs.cinematographic_shots.length : 0;
      
      if (actualShots !== expectedShots) {
        console.warn(`Shot count mismatch: expected ${expectedShots}, got ${actualShots}`);
      }

      // Calculate cinematographic metrics
      const cinematographyMetrics = calculateCinematographyMetrics(cinematographySpecs, musicAnalysis);

      return NextResponse.json({
        success: true,
        stage5_dop_output: cinematographySpecs,
        executionTime,
        validation: {
          expectedShots,
          actualShots,
          shotCountMatch: actualShots === expectedShots,
          musicalSyncEnabled: true,
          cinematographyMetrics,
          parsingStrategy: parseResult.strategy
        },
        rawResponse: dopResponse,
        parsingInfo: parseResult.info,
        usage: result.usage
      });
      
    } else {
      console.error('Failed to parse cinematography using all strategies:', parseResult.error);
      return NextResponse.json({
        success: false,
        error: `Could not extract cinematography from AI response: ${parseResult.error}`,
        rawResponse: dopResponse,
        executionTime,
        parsingAttempts: parseResult.attempts,
        usage: result.usage
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error in music-dop-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Robust multi-strategy cinematography parser that can handle various AI response formats
 */
function parseCinematographyFromResponse(response: string, expectedCount: number): {
  success: boolean;
  cinematography: any;
  strategy: string;
  info: string;
  error?: string;
  attempts: string[];
} {
  const attempts: string[] = [];
  const cleanedResponse = response.trim();
  
  // Strategy 1: JSON Parsing (original approach)
  try {
    attempts.push("JSON Parsing");
    let jsonText = cleanedResponse;
    
    // Clean markdown code blocks
    if (jsonText.startsWith('```json') && jsonText.endsWith('```')) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
      jsonText = jsonText.slice(3, -3).trim();
    }
    
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (initialParseError) {
      console.log('Initial JSON parse failed, attempting recovery...');
      
      // Try to fix common JSON issues
      let fixedResponse = jsonText;
      
      // Fix trailing commas
      fixedResponse = fixedResponse.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix unescaped quotes in strings
      fixedResponse = fixedResponse.replace(/([^\\])"([^"]*?[^\\])"(?=\s*[,}\]])/g, '$1"$2"');
      
      // Try to extract JSON if it's wrapped in text
      const jsonMatch = fixedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fixedResponse = jsonMatch[0];
      }
      
      parsed = JSON.parse(fixedResponse);
      console.log('JSON recovery successful');
    }
    if (parsed && (parsed.cinematographic_shots || parsed.stage5_dop_output)) {
      const shots = parsed.cinematographic_shots || parsed.stage5_dop_output?.cinematographic_shots || [];
      if (shots.length > 0) {
        return {
          success: true,
          cinematography: parsed.cinematographic_shots ? parsed : { cinematographic_shots: shots },
          strategy: "JSON Parsing",
          info: `Successfully parsed ${shots.length} shots as complete JSON`,
          attempts
        };
      }
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 2: Incomplete JSON Repair
  try {
    attempts.push("JSON Repair");
    let jsonText = cleanedResponse;
    
    // Clean markdown
    if (jsonText.startsWith('```json') || jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?/g, '').replace(/```/g, '');
    }
    
    // Try to repair incomplete JSON by adding missing closing brackets
    if (jsonText.includes('cinematographic_shots') && !jsonText.trim().endsWith('}')) {
      // Find the last complete shot object
      const shotPattern = /"beat_no":\s*\d+[^}]*}/g;
      const shots = [];
      let match;
      
      while ((match = shotPattern.exec(jsonText)) !== null) {
        try {
          const shotJson = `{${match[0]}`;
          const shot = JSON.parse(shotJson);
          shots.push(shot);
        } catch (e) {
          // Skip malformed shots
        }
      }
      
      if (shots.length > 0) {
        return {
          success: true,
          cinematography: { cinematographic_shots: shots },
          strategy: "JSON Repair",
          info: `Repaired incomplete JSON and extracted ${shots.length} shots`,
          attempts
        };
      }
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 3: Object Extraction from Text
  try {
    attempts.push("Object Extraction");
    const shots = [];
    
    // Look for shot objects in the text
    const shotObjectPattern = /\{[^{}]*"beat_no"[^{}]*\}/g;
    const matches = cleanedResponse.match(shotObjectPattern);
    
    if (matches) {
      for (const match of matches) {
        try {
          const shot = JSON.parse(match);
          if (shot.beat_no !== undefined) {
            shots.push(shot);
          }
        } catch (e) {
          // Skip malformed objects
        }
      }
    }
    
    if (shots.length > 0) {
      return {
        success: true,
        cinematography: { cinematographic_shots: shots },
        strategy: "Object Extraction",
        info: `Extracted ${shots.length} shot objects from text`,
        attempts
      };
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 4: Text-Based Shot Analysis
  try {
    attempts.push("Text Analysis");
    const shots = [];
    
    // Look for shot descriptions in various formats
    const lines = cleanedResponse.split('\n').filter(line => line.trim().length > 0);
    let currentShot: any = null;
    let beatNumber = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for beat numbers or shot indicators
      if (trimmed.match(/beat_no|shot|Beat \d+/i)) {
        if (currentShot) {
          shots.push(currentShot);
        }
        currentShot = {
          beat_no: beatNumber++,
          shot_id: `S${beatNumber}`,
          cinematography: {},
          lighting: {},
          composition: {},
          musical_sync: {}
        };
      }
      
      // Extract cinematographic information
      if (currentShot && trimmed.length > 10) {
        // Look for shot size indicators
        if (trimmed.match(/wide|close|medium|extreme/i)) {
          currentShot.cinematography.shot_size = trimmed.match(/extreme_wide|wide|medium|close_up|extreme_close/i)?.[0] || 'medium';
        }
        
        // Look for camera movement
        if (trimmed.match(/dolly|pan|tilt|track|zoom/i)) {
          currentShot.cinematography.camera_movement = trimmed.match(/dolly_\w+|pan_\w+|tilt_\w+|track_\w+|zoom_\w+|static/i)?.[0] || 'static';
        }
        
        // Look for angles
        if (trimmed.match(/angle|level|high|low/i)) {
          currentShot.cinematography.camera_angle = trimmed.match(/eye_level|high_angle|low_angle|bird_eye|worm_eye/i)?.[0] || 'eye_level';
        }
      }
    }
    
    if (currentShot) {
      shots.push(currentShot);
    }
    
    if (shots.length > 0) {
      return {
        success: true,
        cinematography: { cinematographic_shots: shots },
        strategy: "Text Analysis",
        info: `Generated ${shots.length} shots from text analysis`,
        attempts
      };
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 5: Fallback Generation
  try {
    attempts.push("Fallback Generation");
    const shots = [];
    
    // Generate basic shots based on expected count
    for (let i = 0; i < expectedCount; i++) {
      shots.push({
        beat_no: i,
        shot_id: `S${i}`,
        cinematography: {
          shot_size: ['wide', 'medium', 'close_up'][i % 3],
          camera_angle: 'eye_level',
          camera_movement: 'static',
          lens: '50mm',
          depth_of_field: 'normal'
        },
        lighting: {
          primary_mood: 'neutral',
          key_light: 'soft',
          color_temp: 'daylight_5600k'
        },
        composition: {
          framing_principle: 'rule_of_thirds',
          visual_weight: 'balanced'
        },
        musical_sync: {
          rhythm_interpretation: 'Synchronized with musical beat',
          transition_design: 'cut'
        }
      });
    }
    
    if (shots.length > 0) {
      return {
        success: true,
        cinematography: { cinematographic_shots: shots },
        strategy: "Fallback Generation",
        info: `Generated ${shots.length} fallback shots to maintain pipeline flow`,
        attempts
      };
    }
  } catch (e) {
    // Last resort failed
  }
  
  // If all strategies failed, return failure
  return {
    success: false,
    cinematography: { cinematographic_shots: [] },
    strategy: "None",
    info: "All parsing strategies failed",
    error: `Could not extract cinematography from response. Tried ${attempts.length} strategies: ${attempts.join(', ')}`,
    attempts
  };
}

/**
 * Calculate cinematography quality metrics
 */
function calculateCinematographyMetrics(cinematographySpecs: any, _musicAnalysis: any): any {
  const shots = cinematographySpecs.cinematographic_shots || [];
  
  if (shots.length === 0) {
    return {
      shotVarietyScore: 0,
      musicalAlignmentScore: 0,
      technicalQualityScore: 0
    };
  }

  // Calculate shot variety (different shot sizes, angles, movements)
  const shotSizes = new Set(shots.map((shot: any) => shot.cinematography?.shot_size));
  const cameraAngles = new Set(shots.map((shot: any) => shot.cinematography?.camera_angle));
  const movements = new Set(shots.map((shot: any) => shot.cinematography?.movement));
  
  const shotVarietyScore = Math.min(1, (shotSizes.size + cameraAngles.size + movements.size) / (shots.length * 0.6));

  // Calculate musical alignment (how well shots sync with music)
  const musicalAlignmentCount = shots.filter((shot: any) => 
    shot.musical_alignment?.beat_sync && shot.musical_alignment?.intensity_match
  ).length;
  
  const musicalAlignmentScore = musicalAlignmentCount / shots.length;

  // Calculate technical quality (completeness of cinematographic specs)
  const technicalQualityCount = shots.filter((shot: any) => 
    shot.cinematography?.shot_size &&
    shot.cinematography?.camera_angle &&
    shot.cinematography?.movement &&
    shot.cinematography?.lens &&
    shot.cinematography?.lighting
  ).length;
  
  const technicalQualityScore = technicalQualityCount / shots.length;

  return {
    shotVarietyScore: Math.round(shotVarietyScore * 100) / 100,
    musicalAlignmentScore: Math.round(musicalAlignmentScore * 100) / 100,
    technicalQualityScore: Math.round(technicalQualityScore * 100) / 100,
    shotSizeVariety: shotSizes.size,
    angleVariety: cameraAngles.size,
    movementVariety: movements.size
  };
}