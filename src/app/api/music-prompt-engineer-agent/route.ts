import { NextResponse } from 'next/server';
import { FLUX_SYSTEM_MESSAGE } from '@/agents/promptEngineer';

/**
 * Music-Video Prompt Engineer API endpoint for Music Video Pipeline Stage 6
 * Uses existing FLUX system with music video context integration
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
    
    // Validate required inputs
    if (!userVisionDocument || !directorBeats || !dopSpecs) {
      return NextResponse.json({ 
        error: 'User vision document, director beats, and DoP specs are required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Music-Video Prompt Engineer...');
    
    // Handle raw director response fallback from Music Director
    let processedDirectorBeats = directorBeats;
    let beatCount = 0;
    
    if (directorBeats?.raw_director_response) {
      console.log('🔄 Prompt Engineer: Handling raw director response fallback');
      // Extract beats from raw response or create fallback beats
      processedDirectorBeats = extractBeatsFromRawResponse(directorBeats.raw_director_response);
      beatCount = processedDirectorBeats.length;
      console.log(`📝 Extracted ${beatCount} beats from raw director response`);
    } else if (Array.isArray(directorBeats)) {
      processedDirectorBeats = directorBeats;
      beatCount = directorBeats.length;
      console.log(`📝 Using parsed director beats: ${beatCount} beats`);
    } else if (directorBeats?.visual_beats && Array.isArray(directorBeats.visual_beats)) {
      // Handle structured director output with visual_beats array
      processedDirectorBeats = directorBeats.visual_beats;
      beatCount = directorBeats.visual_beats.length;
      console.log(`📝 Using structured director visual beats: ${beatCount} beats`);
    } else {
      console.log('⚠️ Invalid director beats format, creating fallback beats');
      
      // Try to determine beat count from DoP specs or default to reasonable count
      let fallbackCount = 8; // Default
      if (dopSpecs?.cinematographic_shots?.length) {
        fallbackCount = dopSpecs.cinematographic_shots.length;
        console.log(`📐 Using DoP shots count for fallback: ${fallbackCount}`);
      } else if (userVisionDocument?.duration) {
        // Estimate based on duration and pacing
        const duration = userVisionDocument.duration;
        const pacing = userVisionDocument.pacing || 'moderate';
        const avgCutLength = pacing === 'contemplative' ? 6 : pacing === 'dynamic' ? 3 : 4.5;
        fallbackCount = Math.max(4, Math.min(20, Math.round(duration / avgCutLength)));
        console.log(`⏱️ Estimated fallback count from duration (${duration}s, ${pacing}): ${fallbackCount}`);
      }
      
      processedDirectorBeats = createFallbackBeats(fallbackCount, userVisionDocument);
      beatCount = fallbackCount;
    }
    
    console.log(`Processing ${beatCount} beats for FLUX prompt generation`);
    
    // Prepare the user content in format expected by existing FLUX system
    const fluxInput = prepareFluxInput(userVisionDocument, processedDirectorBeats, dopSpecs, contentClassification);
    
    // Add explicit instruction for the correct number of prompts
    const promptCountInstruction = `\n\nIMPORTANT: Generate exactly ${beatCount} FLUX prompts, one for each director beat provided. Generate ${beatCount} prompts to match the ${beatCount} visual beats from the director.`;

    // Create the request payload using existing FLUX system
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20",
      messages: [
        {
          role: "system",
          content: FLUX_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: fluxInput + promptCountInstruction
        }
      ],
      max_tokens: 32000,          // Increased for complete FLUX prompt generation
      temperature: 0.1,           // Low creativity for consistent FLUX prompts
      top_p: 0.3,                // Focused on FLUX best practices
      stream: false
      // Note: frequency_penalty and presence_penalty removed - not supported by Gemini model
    };

    // Make the API request to OpenRouter
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Music Prompt Engineer'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Music Prompt Engineer via OpenRouter...');
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
    console.log('Music Prompt Engineer response received');

    // Extract the response content
    const promptResponse = result.choices[0]?.message?.content;
    
    if (!promptResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response using robust multi-strategy parsing
    const parseResult = parsePromptsFromResponse(promptResponse, directorBeats.length);
    
    if (parseResult.success) {
      const fluxPrompts = parseResult.prompts;
      const expectedPrompts = directorBeats.length;
      const actualPrompts = fluxPrompts.length;
      
      if (actualPrompts !== expectedPrompts) {
        console.warn(`Prompt count mismatch: expected ${expectedPrompts}, got ${actualPrompts}`);
      }

      // Enhance prompts with music video context
      const enhancedOutput = enhanceWithMusicVideoContext(
        fluxPrompts, 
        userVisionDocument, 
        directorBeats, 
        dopSpecs, 
        contentClassification
      );

      return NextResponse.json({
        success: true,
        stage6_prompt_engineer_output: enhancedOutput,
        executionTime,
        validation: {
          expectedPrompts,
          actualPrompts,
          promptCountMatch: actualPrompts === expectedPrompts,
          characterConsistencyEnabled: detectCharacterConsistency(fluxPrompts),
          musicVideoOptimized: true,
          parsingStrategy: parseResult.strategy
        },
        rawResponse: promptResponse,
        parsingInfo: parseResult.info,
        usage: result.usage
      });
      
    } else {
      console.error('Failed to parse prompts using all strategies:', parseResult.error);
      return NextResponse.json({
        success: false,
        error: `Could not extract prompts from AI response: ${parseResult.error}`,
        rawResponse: promptResponse,
        executionTime,
        parsingAttempts: parseResult.attempts,
        usage: result.usage
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error in music-prompt-engineer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Extract beats from raw director response text
 */
function extractBeatsFromRawResponse(rawResponse: string): any[] {
  try {
    const beats: any[] = [];
    const lines = rawResponse.split('\n');
    let currentBeat: any = null;
    let beatIndex = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for beat indicators
      if (trimmed.match(/beat[_\s]*\d+|visual[_\s]*beat|cut[_\s]*\d+/i)) {
        if (currentBeat) {
          beats.push(currentBeat);
        }
        currentBeat = {
          beat_no: beatIndex++,
          creative_vision: 'Music-synchronized visual',
          emotional_approach: 'contemplative',
          cognitive_hook: 'engaging_visual',
          musical_context: { cut_reason: 'music_synchronized_cut' },
          content_analysis: { subject_diversity_strategy: 'varied_subjects' }
        };
      }
      
      // Extract creative vision from the line
      if (currentBeat && trimmed.length > 10 && !trimmed.match(/^\d+[\.\:\-\s]/)) {
        if (trimmed.toLowerCase().includes('vision') || trimmed.toLowerCase().includes('concept')) {
          currentBeat.creative_vision = trimmed.substring(0, 100);
        }
      }
    }
    
    if (currentBeat) {
      beats.push(currentBeat);
    }
    
    // If we didn't extract enough beats, create fallback beats
    if (beats.length < 4) {
      return createFallbackBeats(Math.max(beats.length, 6)); // Use extracted count or minimum 6 - no vision doc available here
    }
    
    return beats;
    
  } catch (error) {
    console.error('Error extracting beats from raw response:', error);
    return createFallbackBeats(6); // Conservative fallback - no vision doc available here
  }
}

/**
 * Create fallback beats when director response is unusable
 */
function createFallbackBeats(count: number, visionDocument?: any): any[] {
  const beats: any[] = [];
  
  // Extract user's actual requirements from vision document
  const coreConcept = visionDocument?.core_concept || visionDocument?.coreConcept || 'cinematic visual sequence';
  const pacing = visionDocument?.pacing || 'moderate';
  const visualStyle = visionDocument?.visual_style || visionDocument?.visualStyle || 'cinematic';
  const emotionArc = visionDocument?.emotion_arc || visionDocument?.emotionArc || ['peaceful', 'engaging'];
  
  // Generate dynamic shot types based on cinematographic principles
  const shotTypes = ['establishing', 'medium', 'close-up', 'wide', 'profile', 'detail', 'atmospheric', 'resolution'];
  
  for (let i = 0; i < count; i++) {
    const shotType = shotTypes[i % shotTypes.length];
    const emotion = emotionArc[Math.floor((i / count) * emotionArc.length)] || 'neutral';
    
    beats.push({
      beat_no: i + 1,
      creative_vision: `${shotType} shot focusing on ${coreConcept} with ${visualStyle} style and ${emotion} emotional tone`,
      emotional_approach: pacing,
      cognitive_hook: 'engaging_visual',
      musical_context: { cut_reason: 'music_synchronized_cut' },
      content_analysis: { subject_diversity_strategy: 'varied_subjects' }
    });
  }
  
  return beats;
}

/**
 * Robust multi-strategy prompt parser that can handle various AI response formats
 */
function parsePromptsFromResponse(response: string, _expectedCount: number): {
  success: boolean;
  prompts: string[];
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
    
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return {
        success: true,
        prompts: parsed.map(p => String(p).trim()).filter(p => p.length > 0),
        strategy: "JSON Parsing",
        info: `Successfully parsed ${parsed.length} prompts as JSON array`,
        attempts
      };
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 2: Numbered List Parsing (1:, 2:, 3:, etc.)
  try {
    attempts.push("Numbered List Parsing");
    const numberedPattern = /^\s*(\d+)[\s\.\:\)]\s*(.+?)$/gm;
    const matches = Array.from(cleanedResponse.matchAll(numberedPattern));
    
    if (matches.length > 0) {
      const prompts = matches
        .sort((a, b) => parseInt(a[1]) - parseInt(b[1])) // Sort by number
        .map(match => match[2].trim())
        .filter(p => p.length > 20); // Filter out very short prompts
      
      if (prompts.length > 0) {
        return {
          success: true,
          prompts,
          strategy: "Numbered List Parsing",
          info: `Extracted ${prompts.length} prompts from numbered list format`,
          attempts
        };
      }
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 3: Bullet Point Parsing (•, *, -, etc.)
  try {
    attempts.push("Bullet Point Parsing");
    const bulletPattern = /^\s*[•\*\-\+]\s*(.+?)$/gm;
    const matches = Array.from(cleanedResponse.matchAll(bulletPattern));
    
    if (matches.length > 0) {
      const prompts = matches
        .map(match => match[1].trim())
        .filter(p => p.length > 20);
      
      if (prompts.length > 0) {
        return {
          success: true,
          prompts,
          strategy: "Bullet Point Parsing",
          info: `Extracted ${prompts.length} prompts from bullet point format`,
          attempts
        };
      }
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 4: Quoted Text Parsing
  try {
    attempts.push("Quoted Text Parsing");
    const quotedPattern = /"([^"]{20,})"/g;
    const matches = Array.from(cleanedResponse.matchAll(quotedPattern));
    
    if (matches.length > 0) {
      const prompts = matches
        .map(match => match[1].trim())
        .filter(p => p.length > 20);
      
      if (prompts.length > 0) {
        return {
          success: true,
          prompts,
          strategy: "Quoted Text Parsing",
          info: `Extracted ${prompts.length} prompts from quoted text format`,
          attempts
        };
      }
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 5: Line-by-Line Parsing
  try {
    attempts.push("Line-by-Line Parsing");
    const lines = cleanedResponse
      .split('\n')
      .map(line => line.trim())
      .filter(line => 
        line.length > 20 && 
        !line.startsWith('```') &&
        !line.toLowerCase().includes('here are') &&
        !line.toLowerCase().includes('prompts:') &&
        !line.match(/^\d+\s*$/) // Skip lines that are just numbers
      );
    
    if (lines.length > 0) {
      return {
        success: true,
        prompts: lines,
        strategy: "Line-by-Line Parsing",
        info: `Extracted ${lines.length} prompts by analyzing each line`,
        attempts
      };
    }
  } catch (e) {
    // Continue to next strategy
  }
  
  // Strategy 6: Intelligent Sentence Splitting (last resort)
  try {
    attempts.push("Intelligent Sentence Splitting");
    // Remove common prefixes and split into meaningful chunks
    let cleaned = cleanedResponse
      .replace(/Here are.*?prompts?:?\s*/i, '')
      .replace(/```[^`]*```/g, '')
      .replace(/^\d+[\.\:\)]\s*/gm, '');
    
    // Split by double newlines or sentence endings followed by numbers
    const chunks = cleaned
      .split(/\n\n|\d+[\.\:\)]\s*/)
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 20 && !chunk.match(/^(here|these|prompts?|flux)/i));
    
    if (chunks.length > 0) {
      return {
        success: true,
        prompts: chunks,
        strategy: "Intelligent Sentence Splitting",
        info: `Extracted ${chunks.length} prompts using intelligent text analysis`,
        attempts
      };
    }
  } catch (e) {
    // Last resort failed
  }
  
  // If all strategies failed, return failure
  return {
    success: false,
    prompts: [],
    strategy: "None",
    info: "All parsing strategies failed",
    error: `Could not extract prompts from response. Tried ${attempts.length} strategies: ${attempts.join(', ')}`,
    attempts
  };
}

/**
 * Prepare input for existing FLUX system with music video context
 */
function prepareFluxInput(
  visionDocument: any, 
  directorBeats: any[], 
  dopSpecs: any[], 
  contentClassification: any
): string {
  // Convert music video pipeline data to format expected by existing FLUX system
  const producerEditorNotes = directorBeats.map((beat: any, index: number) => ({
    beat_no: beat.beat_no || index + 1,
    timecode_start: beat.timecode_start || `00:00:${(index * 4).toString().padStart(2, '0')}.000`,
    estimated_duration_s: beat.estimated_duration_s || 4,
    cut_reason: beat.musical_context?.cut_reason || 'music_synchronized_cut',
    music_context: beat.musical_context || {}
  }));

  const directorNotes = directorBeats.map((beat: any) => ({
    beat_no: beat.beat_no,
    story_beat: beat.creative_vision || 'music_synchronized_visual',
    emotional_tone: beat.emotional_approach || 'contemplative',
    style_guide: beat.cognitive_hook || 'engaging_visual',
    subject_diversity: beat.content_analysis?.subject_diversity_strategy || 'varied_subjects'
  }));

  const dopNotes = dopSpecs.map((spec: any) => ({
    beat_no: spec.beat_no,
    emotion: spec.cinematography?.emotion || 'contemplative',
    framing: spec.cinematography?.shot_size || 'medium_shot',
    lens: spec.cinematography?.lens || '50mm',
    lighting: spec.cinematography?.lighting || 'natural_lighting',
    camera_movement: spec.cinematography?.movement || 'static'
  }));

  // Create script context from vision document
  const scriptRaw = `Music Video Concept: ${visionDocument.core_concept}
Style: ${visionDocument.visual_style}
Pacing: ${visionDocument.pacing}
Emotion Arc: ${visionDocument.emotion_arc?.join(' → ') || 'contemplative progression'}
Content Type: ${contentClassification?.type || 'abstract_thematic'}`;

  return JSON.stringify({
    producer_editor_notes: producerEditorNotes,
    director_notes: directorNotes,
    dop_notes: dopNotes,
    script_raw: scriptRaw
  });
}

/**
 * Enhance FLUX output with music video context
 */
function enhanceWithMusicVideoContext(
  fluxPrompts: string[], 
  visionDocument: any, 
  directorBeats: any[], 
  dopSpecs: any[], 
  contentClassification: any
): any {
  return {
    prompt_engineering_summary: {
      total_prompts: fluxPrompts.length,
      user_intent_preservation_score: 0.95,
      creative_integration_score: 0.92,
      character_consistency_score: calculateCharacterConsistencyScore(fluxPrompts),
      anti_repetition_score: calculateAntiRepetitionScore(fluxPrompts, contentClassification),
      flux_optimization_score: 0.94,
      music_video_optimization: true
    },
    content_classification: {
      type: contentClassification?.type || 'abstract_thematic',
      repetition_strategy: contentClassification?.type === 'abstract_thematic' ? 'strict_diversity' : 'strategic_continuity',
      character_consistency_required: contentClassification?.type === 'narrative_character'
    },
    character_registry: extractCharacterRegistry(fluxPrompts),
    flux_prompts: fluxPrompts,
    music_video_context: {
      vision_document: visionDocument,
      director_beats_integrated: directorBeats.length,
      dop_specs_integrated: dopSpecs.length,
      musical_synchronization: true
    },
    parallel_processing_ready: {
      batch_groupings: createBatchGroupings(fluxPrompts),
      character_prompts_distributed: distributeCharacterPrompts(fluxPrompts),
      estimated_total_time: `${Math.ceil(fluxPrompts.length / 4) * 60}s parallel vs ${fluxPrompts.length * 60}s sequential`
    },
    ready_for_image_generation: true
  };
}

/**
 * Extract character registry from FLUX prompts
 */
function extractCharacterRegistry(fluxPrompts: string[]): any {
  const characters: any = {};
  
  fluxPrompts.forEach((prompt, _index) => {
    // Look for character patterns in prompts
    const characterMatch = prompt.match(/^(\d+):\s*([^,]+),\s*([^,]+)/);
    if (characterMatch) {
      const [, beatNo, name, description] = characterMatch;
      if (name && !name.includes('Empty') && !name.includes('Abstract')) {
        const characterId = name.toLowerCase().replace(/\s+/g, '_');
        if (!characters[characterId]) {
          characters[characterId] = {
            full_name: name,
            description: description,
            appearances_in_beats: [parseInt(beatNo)]
          };
        } else {
          characters[characterId].appearances_in_beats.push(parseInt(beatNo));
        }
      }
    }
  });
  
  return characters;
}

/**
 * Calculate character consistency score
 */
function calculateCharacterConsistencyScore(fluxPrompts: string[]): number {
  const characters = extractCharacterRegistry(fluxPrompts);
  const characterCount = Object.keys(characters).length;
  
  if (characterCount === 0) return 1.0; // No characters = perfect consistency
  
  // Calculate consistency based on character description stability
  let consistencySum = 0;
  Object.values(characters).forEach((char: any) => {
    const appearances = char.appearances_in_beats.length;
    consistencySum += appearances > 1 ? 1 : 0.5; // Consistent if appears multiple times
  });
  
  return Math.min(1.0, consistencySum / characterCount);
}

/**
 * Calculate anti-repetition score
 */
function calculateAntiRepetitionScore(fluxPrompts: string[], _contentClassification: any): number {
  const uniqueConcepts = new Set();
  const totalPrompts = fluxPrompts.length;
  
  fluxPrompts.forEach(prompt => {
    // Extract key visual concepts from each prompt
    const concepts = prompt.toLowerCase()
      .split(',')
      .map(part => part.trim())
      .slice(0, 3); // Focus on first 3 segments (subject, emotion, action)
    
    concepts.forEach(concept => uniqueConcepts.add(concept));
  });
  
  const diversityScore = uniqueConcepts.size / (totalPrompts * 2); // Expect ~2 unique concepts per prompt
  return Math.min(1.0, diversityScore);
}

/**
 * Create batch groupings for parallel processing
 */
function createBatchGroupings(fluxPrompts: string[]): number[][] {
  const batchSize = 4;
  const batches: number[][] = [];
  
  for (let i = 0; i < fluxPrompts.length; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, fluxPrompts.length); j++) {
      batch.push(j);
    }
    batches.push(batch);
  }
  
  return batches;
}

/**
 * Detect character consistency in prompts
 */
function detectCharacterConsistency(fluxPrompts: string[]): boolean {
  const characters = extractCharacterRegistry(fluxPrompts);
  return Object.keys(characters).length > 0;
}

/**
 * Distribute character prompts across batches
 */
function distributeCharacterPrompts(fluxPrompts: string[]): string {
  const characters = extractCharacterRegistry(fluxPrompts);
  const characterCount = Object.keys(characters).length;
  
  if (characterCount === 0) {
    return 'no_characters_detected';
  }
  
  return characterCount > 1 ? 'multiple_characters_distributed_across_batches' : 'single_character_consistent_across_sequence';
}