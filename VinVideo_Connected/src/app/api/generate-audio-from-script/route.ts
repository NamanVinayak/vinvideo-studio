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
    
    // Check if script is already TTS-optimized from Vision Understanding Agent or Script Formatting Agent
    const isTTSOptimized = 
      narrationScript.length > 50 && 
      !narrationScript.includes('INT.') && 
      !narrationScript.includes('EXT.') &&
      !narrationScript.includes('CUT TO') &&
      !narrationScript.includes('FADE IN') &&
      !narrationScript.includes('CLOSE-UP') &&
      // Vision Understanding Agent typically outputs clean narrative text
      (narrationScript.includes('...') || // Uses ellipses for pauses
       narrationScript.includes('—') || // Uses em dashes
       narrationScript.length < 1000); // Vision scripts are typically shorter and cleaner
    
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
    
    console.log('Making OpenRouter Gemini API request for script formatting...');
    console.log('=== INPUT TEXT ===');
    console.log(script);
    console.log('=== END INPUT TEXT ===');
    
    const prompt = `You are an AI assistant working within an advanced audio production pipeline. Your specific role is to analyze and optimize scripts for Google Gemini TTS (Text-to-Speech) generation to ensure maximum audio quality and expressiveness.

CONTEXT: You are preparing text that will be fed directly into Google Gemini 2.5 TTS, which features 30+ distinct voices with emotional and tonal variations. The TTS system can detect nuances in text formatting and respond with appropriate vocal expressiveness, pacing, and emotional delivery.

YOUR MISSION: Transform the provided script to give the Gemini TTS system maximum understanding of:
1. HOW the speaker should sound (vocal character, emotion, energy)
2. HOW they should speak (pacing, rhythm, emphasis, pauses)
3. WHAT vocal style best serves the story/content

CRITICAL SCRIPT CLEANING RULES:
• REMOVE all technical film language that shouldn't be spoken aloud:
  - "Opening shot", "Close-up", "Wide shot", "Cut to", "Fade in/out"
  - "INT./EXT.", "DAY/NIGHT", "MONTAGE", "VOICEOVER", "TRANSITION"
  - Camera movements: "Pan left", "Zoom in", "Dolly shot", "Tracking shot"
  - Technical directions: "Sound effects", "Music swells", "Lighting change"
  - Action lines: "Character walks to window", "Door slams", "Phone rings"
• KEEP only dialogue and narrative text that should be spoken
• PRESERVE the emotional and narrative intent
• CLEAN UP while maintaining story flow

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

RETURN ONLY THE CLEANED AND FORMATTED SCRIPT - NO EXPLANATIONS OR METADATA.

Analyze this script and reformat it for optimal Gemini TTS performance:

${script}`;
    
    console.log('Sending prompt to OpenRouter Gemini (google/gemini-2.5-flash:thinking)...');
    
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
    
    if (!formattedScript) {
      console.warn('OpenRouter Gemini did not return a formatted script, using original script instead');
      console.log('Full OpenRouter response:', JSON.stringify(result, null, 2));
      return script;
    }
    
    // Clean up any meta-commentary that might have been included
    formattedScript = cleanScriptResponse(formattedScript);
    
    console.log('=== FORMATTED SCRIPT FROM GEMINI ===');
    console.log(formattedScript);
    console.log('=== END FORMATTED SCRIPT ===');
    console.log(`Script formatting complete. Original: ${script.length} chars, Formatted: ${formattedScript.length} chars`);
    
    return formattedScript;
  } catch (error) {
    console.error('Error formatting script with OpenRouter Gemini:', error);
    console.log('FALLBACK: Using original narration script without formatting');
    // Return original script if formatting fails
    return script;
  }
}