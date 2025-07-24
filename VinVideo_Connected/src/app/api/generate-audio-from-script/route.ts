import { NextResponse } from 'next/server';
import { textToSpeech } from '@/utils/audioProcessing';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate Audio from Script endpoint
 * Handles script formatting + TTS generation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { narrationScript, folderId, voiceName } = body;
    
    console.log('🎵 AUDIO GENERATION ENDPOINT CALLED');
    console.log(`📂 Folder: ${folderId}`);
    console.log(`🎤 Voice: ${voiceName || 'Enceladus (default)'}`);
    console.log(`📝 Script preview: ${narrationScript?.substring(0, 100)}...`);
    console.log('🔍 DEBUG - Received body:', JSON.stringify(body, null, 2));
    console.log('🔍 DEBUG - narrationScript type:', typeof narrationScript);
    console.log('🔍 DEBUG - narrationScript value:', narrationScript);
    
    if (!narrationScript || typeof narrationScript !== 'string') {
      return NextResponse.json({ error: 'Narration script is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }
    
    // Verify that the directory exists
    const publicDir = path.join(process.cwd(), 'public', folderId);
    try {
      await fs.access(publicDir);
      console.log(`Directory exists: ${publicDir}`);
    } catch {
      // Create directory if it doesn't exist
      console.log(`Directory does not exist, creating: ${publicDir}`);
      try {
        await fs.mkdir(publicDir, { recursive: true });
        console.log(`Created directory: ${publicDir}`);
      } catch (mkdirError) {
        console.error('Error creating directory:', mkdirError);
        return NextResponse.json({ error: 'Invalid or inaccessible folder ID' }, { status: 400 });
      }
    }
    
    const startTime = Date.now();
    let formattedScript = '';
    let processingSteps = [];
    
    // Step 1: Format the narration script for TTS (skip if already formatted by Vision Understanding Agent)
    console.log('Step 1: Checking if script needs TTS formatting...');
    const formatStartTime = Date.now();
    
    // Enhanced TTS optimization detection
    const isTTSOptimized = checkIfScriptIsTTSReady(narrationScript);
    
    if (isTTSOptimized) {
      console.log('🎯 Script is already TTS-optimized (from Vision Understanding or Script Formatting Agent) - skipping additional formatting');
      formattedScript = narrationScript;
    } else {
      console.log('🎯 Script needs TTS formatting - applying dramatic formatting');
      formattedScript = await formatScriptForTTS(narrationScript);
    }
    
    const formatTime = ((Date.now() - formatStartTime) / 1000).toFixed(2);
    console.log(`Narration script formatting completed in ${formatTime}s`);
    
    processingSteps.push({
      name: 'Script Formatting',
      duration: parseFloat(formatTime),
      success: true
    });
    
    // Step 2: Generate audio from formatted script
    console.log('Step 2: Converting to speech with Google Gemini TTS...');
    console.log('📝 Final script being sent to TTS:');
    console.log('📝 Length:', formattedScript.length);
    console.log('📝 First 200 chars:', formattedScript.substring(0, 200));
    console.log('📝 Last 100 chars:', formattedScript.substring(formattedScript.length - 100));
    
    const ttsStartTime = Date.now();
    
    const audioUrl = await textToSpeech(formattedScript, folderId, voiceName);
    
    const ttsTime = ((Date.now() - ttsStartTime) / 1000).toFixed(2);
    console.log(`Audio generation completed in ${ttsTime}s. URL: ${audioUrl}`);
    
    processingSteps.push({
      name: 'Audio Generation',
      duration: parseFloat(ttsTime),
      success: true
    });
    
    // Calculate total processing time
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Total audio processing time: ${totalTime}s`);
    
    return NextResponse.json({
      success: true,
      formattedScript,
      audioUrl,
      folderId,
      stats: {
        scriptLength: narrationScript.length,
        formattedLength: formattedScript.length,
        totalTime: parseFloat(totalTime),
        processingSteps
      },
      stage: 'audio_generation'
    });
    
  } catch (error) {
    console.error('Error in generate-audio-from-script endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Check if script is already TTS-ready and doesn't need formatting
 */
function checkIfScriptIsTTSReady(script: string): boolean {
  console.log('🔍 Checking if script is TTS-ready...');
  console.log('📝 Script length:', script.length);
  
  // Technical film language indicators (script needs formatting if present)
  const filmLanguage = [
    'INT.', 'EXT.', 'CUT TO', 'FADE IN', 'FADE OUT', 'CLOSE-UP', 'WIDE SHOT',
    'VOICEOVER', 'MONTAGE', 'TRANSITION', 'SOUND EFFECTS', 'MUSIC SWELLS',
    'Pan left', 'Zoom in', 'Dolly shot', 'Tracking shot'
  ];
  
  const hasFilmLanguage = filmLanguage.some(term => 
    script.toUpperCase().includes(term.toUpperCase())
  );
  
  if (hasFilmLanguage) {
    console.log('❌ Script contains film language - needs formatting');
    return false;
  }
  
  // Check for characteristics of already clean TTS scripts
  const cleanScriptIndicators = {
    // Reasonable length for TTS (not too short, not extremely long)
    reasonableLength: script.length > 100 && script.length < 10000,
    
    // Contains natural speech patterns
    hasNaturalFlow: script.includes('.') || script.includes('!') || script.includes('?'),
    
    // Doesn't have excessive technical formatting
    noExcessiveFormatting: !script.includes('##') && !script.includes('```'),
    
    // Has conversational or narrative tone (contains common words)
    conversationalTone: /\b(you|your|we|I|me|this|that|what|how|why|when)\b/i.test(script)
  };
  
  const indicatorsPassed = Object.entries(cleanScriptIndicators).filter(([key, value]) => {
    console.log(`📝 ${key}:`, value);
    return value;
  }).length;
  
  const isOptimized = indicatorsPassed >= 3; // Need at least 3 out of 4 indicators
  
  console.log(`🔍 TTS-ready check result: ${isOptimized} (${indicatorsPassed}/4 indicators passed)`);
  
  // Universal content analysis: Check if script appears to be narrative/conversational
  const commonWords = ['the', 'and', 'you', 'to', 'a', 'is', 'it', 'that', 'this', 'with', 'for', 'as', 'was', 'on', 'are', 'but'];
  const wordCount = script.toLowerCase().split(/\s+/).length;
  const commonWordCount = commonWords.filter(word => 
    script.toLowerCase().includes(word)
  ).length;
  
  // If script has good density of common words and reasonable length, likely TTS-ready
  const hasNaturalLanguage = commonWordCount >= 5 && wordCount > 50;
  
  if (hasNaturalLanguage && script.length > 200) {
    console.log('✅ Script appears to be natural language content - likely TTS-ready');
    console.log(`📊 Analysis: ${commonWordCount} common words, ${wordCount} total words`);
    return true;
  }
  
  return isOptimized;
}

/**
 * Validate that formatted script matches original content intent
 */
function validateScriptContent(original: string, formatted: string): { isValid: boolean; reason: string } {
  console.log('🔍 Validating script content integrity...');
  
  // Convert to lowercase for comparison
  const origLower = original.toLowerCase();
  const formattedLower = formatted.toLowerCase();
  
  // Statistical similarity analysis - content-agnostic
  const origWords = origLower.split(/\s+/).filter(word => word.length > 2);
  const formattedWords = formattedLower.split(/\s+/).filter(word => word.length > 2);
  
  // Calculate word overlap percentage
  const origWordSet = new Set(origWords);
  const formattedWordSet = new Set(formattedWords);
  const intersection = new Set([...origWordSet].filter(word => formattedWordSet.has(word)));
  const overlapPercentage = intersection.size / Math.max(origWordSet.size, 1);
  
  console.log(`📊 Word overlap analysis: ${intersection.size}/${origWordSet.size} words (${(overlapPercentage * 100).toFixed(1)}%)`);
  
  // Length similarity check
  const lengthRatio = formatted.length / Math.max(original.length, 1);
  const lengthReasonable = lengthRatio > 0.2 && lengthRatio < 5.0;
  
  console.log(`📊 Length ratio: ${lengthRatio.toFixed(2)} (${formatted.length}/${original.length} chars)`);
  
  // Key phrase preservation (universal approach)
  const origSentences = original.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const firstSentence = origSentences[0]?.trim().toLowerCase();
  const lastSentence = origSentences[origSentences.length - 1]?.trim().toLowerCase();
  
  const hasFirstSentenceWords = firstSentence ? 
    firstSentence.split(/\s+/).slice(0, 5).some(word => 
      word.length > 3 && formattedLower.includes(word)
    ) : true;
    
  const hasLastSentenceWords = lastSentence ?
    lastSentence.split(/\s+/).slice(-3).some(word => 
      word.length > 3 && formattedLower.includes(word)
    ) : true;
  
  // Universal validation criteria
  if (overlapPercentage < 0.3) {
    return { isValid: false, reason: `Insufficient word overlap: ${(overlapPercentage * 100).toFixed(1)}% (need >30%)` };
  }
  
  if (!lengthReasonable) {
    return { isValid: false, reason: `Length ratio too extreme: ${lengthRatio.toFixed(2)} (need 0.2-5.0)` };
  }
  
  if (!hasFirstSentenceWords && !hasLastSentenceWords) {
    return { isValid: false, reason: 'Key phrases from beginning/end not preserved' };
  }
  
  // Check for complete topic shift (generic detection)
  const topicShiftIndicators = [
    'in a world where', 'once upon a time', 'meanwhile', 'chapter', 'episode',
    'feline', 'titans', 'wrestling', 'arena', 'spectacle', 'legends'
  ];
  
  const hasTopicShift = topicShiftIndicators.some(indicator => 
    formattedLower.includes(indicator) && !origLower.includes(indicator)
  );
  
  if (hasTopicShift) {
    return { isValid: false, reason: 'Formatted script appears to introduce unrelated narrative elements' };
  }
  
  console.log('✅ Content validation passed - script integrity maintained');
  return { isValid: true, reason: 'Script content validation passed' };
}

/**
 * Clean script response from meta-commentary
 */
function cleanScriptResponse(response: string): string {
  // Remove common meta-commentary patterns
  let cleaned = response
    // Remove markdown headers and formatting
    .replace(/^\*\*.*?\*\*$/gm, '')
    .replace(/^#+\s.*$/gm, '')
    // Remove meta-commentary sections
    .replace(/^\*\*Final Review\*\*[\s\S]*?(?=\n\n|\n[A-Z]|$)/gm, '')
    .replace(/I'm now conducting.*?(?=\n\n|\n[A-Z]|$)/gm, '')
    .replace(/The goal is to.*?(?=\n\n|\n[A-Z]|$)/gm, '')
    .replace(/Final review.*?(?=\n\n|\n[A-Z]|$)/gm, '')
    .replace(/via gemini t t s/gi, '')
    // Remove empty lines and trim
    .replace(/^\s*$/gm, '')
    .trim();
  
  // Remove leading commas or periods that might be artifacts
  cleaned = cleaned.replace(/^[,.\s]+/, '');
  
  return cleaned;
}

/**
 * Format the script for TTS using OpenRouter with Gemini
 */
async function formatScriptForTTS(script: string): Promise<string> {
  try {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      console.error('OpenRouter API key is not configured');
      return script;
    }
    
    console.log('🔧 SCRIPT FORMATTING DEBUG - Starting formatScriptForTTS...');
    console.log('📝 Original script length:', script.length);
    console.log('📝 Original script first 200 chars:', script.substring(0, 200));
    console.log('📝 Original script last 200 chars:', script.substring(script.length - 200));
    
    console.log('Making OpenRouter Gemini API request for script formatting...');
    console.log('=== INPUT TEXT ===');
    console.log(script);
    console.log('=== END INPUT TEXT ===');
    
    const prompt = `UNIVERSAL CONTENT PRESERVATION DIRECTIVE: You are a script cleaner for TTS generation. Your ONLY purpose is to remove technical film language while preserving 100% of the original content.

**ABSOLUTE REQUIREMENT**: The original script contains the EXACT content that must be spoken. You MUST NOT alter, replace, or generate alternative content under any circumstances.

**UNIVERSAL PROCESSING RULES** (applies to ALL content types):
1. PRESERVE: All dialogue, narrative text, educational content, stories, technical explanations, conversations - everything that should be spoken aloud
2. REMOVE ONLY: Technical film/video production language that shouldn't be vocalized
3. MAINTAIN: Original meaning, context, tone, and message exactly as provided

**TECHNICAL ELEMENTS TO REMOVE** (and ONLY these):
• Film directions: "Opening shot", "Close-up", "Wide shot", "Cut to", "Fade in/out", "INT./EXT.", "DAY/NIGHT"
• Camera language: "Pan left", "Zoom in", "Dolly shot", "Tracking shot", "MONTAGE", "TRANSITION"
• Production notes: "Sound effects", "Music swells", "Lighting change", "VOICEOVER"
• Action descriptions: Stage directions that describe non-verbal actions

**FORBIDDEN OPERATIONS**:
- Creating new content, stories, or examples
- Changing the subject matter, theme, or message
- Adding unrelated content from any domain
- Substituting different narratives or scenarios
- Generating placeholder or sample text

**CONTENT-AGNOSTIC APPROACH**: Whether the script is educational, motivational, technical, narrative, conversational, or any other type - preserve its original essence completely.

ANALYSIS FRAMEWORK:
1. Story Genre & Mood Assessment:
   • Identify if this is: horror, comedy, drama, documentary, educational, thriller, etc.
   • Determine the emotional arc: suspenseful, exciting, contemplative, urgent, mysterious
   • Choose optimal vocal approach: whispered secrets, dramatic narration, conversational explanation, etc.

2. Speaker Persona Development:
   • Define the ideal narrator voice: authoritative documentarian, enthusiastic storyteller, mysterious guide, etc.
   • Consider what voice from Gemini's range would work best (Puck for upbeat, Enceladus for breathy/intimate, Kore for firm authority, Charon for informative clarity)

3. Vocal Direction Integration:
   • Use natural language cues that Gemini TTS recognizes for style control
   • Embed pacing instructions through punctuation and sentence structure
   • Signal emotional shifts through word choice and rhythm changes

FORMATTING RULES FOR GEMINI TTS:
• Use ellipses (...) for suspenseful pauses or trailing thoughts
• Use em dashes (—) for dramatic breaks or sudden shifts
• Use exclamation marks (!) sparingly but effectively for genuine excitement or shock
• Use question marks (?) to create curiosity and engagement
• Break long sentences into shorter, punchier phrases for better pacing
• Use repetition strategically for emphasis ("Very, very carefully...")
• Include breathing cues through natural sentence breaks
• Spell out numbers, dates, and times naturally ("nineteen forty-two" not "1942")

VOICE OPTIMIZATION:
• Front-load emotional context so TTS understands the mood immediately
• Use descriptive language that hints at desired vocal qualities
• Structure sentences to create natural rhythm and flow
• Avoid overly complex syntax that might confuse vocal delivery
• Ensure each sentence has clear emotional intent

Remember: You're not just formatting text—you're directing a voice performance. The Gemini TTS will interpret your formatting choices as vocal instructions. Make every punctuation mark, word choice, and sentence structure deliberate to create the most compelling audio experience possible.

**FINAL VERIFICATION STEP**: Before responding, confirm:
1. Does your output contain the same core message/content as the input?
2. Have you only removed technical film language, nothing else?
3. Are all substantive words, phrases, and ideas from the original preserved?

If you detect ANY content deviation, restart and preserve the original exactly.

**OUTPUT SPECIFICATION**: Return ONLY the cleaned script text ready for TTS. No explanations, analysis, or additional content.

Process this script for TTS while maintaining complete content fidelity:

${script}`;
    
    console.log('Sending prompt to OpenRouter Gemini (google/gemini-2.5-flash)...');
    console.log('🔧 OpenRouter request payload preview:');
    console.log('- Model:', "google/gemini-2.5-flash");
    console.log('- Max tokens:', 2000);
    console.log('- Temperature:', 0.3);
    console.log('- Prompt contains original script:', prompt.includes(script));
    
    // OpenRouter API call
    const payload = {
      model: "google/gemini-2.5-flash", // Remove :thinking to avoid meta-commentary
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Script Formatting'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    let formattedScript = result.choices?.[0]?.message?.content;
    
    console.log('🔧 OpenRouter raw response received');
    console.log('📝 Response has choices:', !!result.choices);
    console.log('📝 Response choices length:', result.choices?.length || 0);
    console.log('📝 First choice has content:', !!result.choices?.[0]?.message?.content);
    
    if (!formattedScript) {
      console.warn('❌ OpenRouter Gemini did not return a formatted script, using original script instead');
      console.log('Full OpenRouter response:', JSON.stringify(result, null, 2));
      return script;
    }
    
    console.log('📝 RAW OpenRouter response length:', formattedScript.length);
    console.log('📝 RAW OpenRouter response first 200 chars:', formattedScript.substring(0, 200));
    
    // Clean up any meta-commentary that might have been included
    formattedScript = cleanScriptResponse(formattedScript);
    
    console.log('=== FORMATTED SCRIPT FROM GEMINI ===');
    console.log(formattedScript);
    console.log('=== END FORMATTED SCRIPT ===');
    console.log('📝 Cleaned script length:', formattedScript.length);
    console.log('📝 Cleaned script first 200 chars:', formattedScript.substring(0, 200));
    console.log(`Script formatting complete. Original: ${script.length} chars, Formatted: ${formattedScript.length} chars`);
    
    // CRITICAL: Validate that the formatted script matches the original intent
    const validationResult = validateScriptContent(script, formattedScript);
    if (!validationResult.isValid) {
      console.error('❌ SCRIPT CORRUPTION DETECTED!');
      console.error('🚨 Validation failed:', validationResult.reason);
      console.error('🚨 Using original script instead of corrupted formatted version');
      console.error('🚨 Original script preview:', script.substring(0, 200));
      console.error('🚨 Corrupted script preview:', formattedScript.substring(0, 200));
      return script; // Return original script to prevent corruption
    }
    
    console.log('✅ Script validation passed - content integrity maintained');
    return formattedScript;
  } catch (error) {
    console.error('❌ Error formatting script with OpenRouter Gemini:', error);
    console.log('🔄 SAFE FALLBACK: Using original narration script without formatting');
    console.log('📝 Fallback script preview:', script.substring(0, 200));
    
    // Log the error for debugging but return original script safely
    console.log('🚨 Formatting error details:', {
      error: error instanceof Error ? error.message : String(error),
      originalScriptLength: script.length,
      timestamp: new Date().toISOString()
    });
    
    return script; // Always return original script to prevent corruption
  }
}