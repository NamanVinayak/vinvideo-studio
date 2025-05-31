import { NextResponse } from 'next/server';
import { textToSpeech } from '@/utils/audioProcessing';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test endpoint to format a script and generate TTS audio
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, folderId } = body;
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required. Initialize a project first.' }, { status: 400 });
    }
    
    const scriptPreview = script.length > 100 ? script.substring(0, 100) + '...' : script;
    console.log(`Processing script (${script.length} characters): ${scriptPreview}`);
    console.log(`Using folder ID: ${folderId}`);
    
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
    
    // Step 1: Format script for TTS using Google Gemini
    console.log('Step 1: Formatting script with Google Gemini...');
    const startFormatting = Date.now();
    const formattedScript = await formatScriptForTTS(script);
    const formattingTime = ((Date.now() - startFormatting) / 1000).toFixed(2);
    console.log(`Script formatted successfully in ${formattingTime}s. Length: ${formattedScript.length} characters`);
    
    // Step 2: Convert the formatted script to speech using Gemini TTS
    console.log('Step 2: Converting formatted script to speech with Google Gemini TTS...');
    const startTTS = Date.now();
    const audioUrl = await textToSpeech(formattedScript, folderId);
    const ttsTime = ((Date.now() - startTTS) / 1000).toFixed(2);
    console.log(`Audio generation completed in ${ttsTime}s. URL: ${audioUrl}`);
    
    // Calculate total processing time
    const totalTime = ((Date.now() - startFormatting) / 1000).toFixed(2);
    console.log(`Total processing time: ${totalTime}s`);
    
    // Return the processed data
    return NextResponse.json({
      success: true,
      formattedScript,
      audioUrl,
      folderId,
      stats: {
        scriptLength: script.length,
        formattedLength: formattedScript.length,
        formattingTime: parseFloat(formattingTime),
        ttsTime: parseFloat(ttsTime),
        totalTime: parseFloat(totalTime)
      }
    });
    
  } catch (error) {
    console.error('Error in test-tts endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Format the script for TTS using Google Gemini
 */
async function formatScriptForTTS(script: string): Promise<string> {
  try {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      console.error('Google AI API key is not configured');
      return script;
    }

    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    console.log('Making Google Gemini API request...');
    
    const prompt = `You are a professional voice scriptwriter and prompt engineer specialized in formatting content for text-to-speech (TTS) systems. Your goal is to analyze the given script, understand its context, emotion, character, and intent, and then rewrite or format it using natural punctuation, phrasing, and delivery cues that maximize vocal nuance.

Your Job:
1. Contextual Understanding:
   • First, deeply analyze the emotional tone, narrative intent, and speaker persona (if implied).
   • Then decide the most natural and expressive way the script should be spoken — as if by a human trained in voice performance.
   • Align the tone of the writing with how it would best be vocally performed (e.g. calm guidance, excited storytelling, reflective monologue, etc.)

2. Natural Punctuation & Delivery Cues:
   Apply punctuation deliberately to shape delivery:
   • Periods (.) for complete stops and clarity
   • Commas (,) for natural pauses or pacing
   • Em dashes (—) for emotional or dramatic breaks
   • Exclamation marks (!) for enthusiasm or urgency
   • Question marks (?) for curiosity, reflection, or rising tone

3. Optimize for Spoken Language:
   • Rewrite overly technical or robotic phrases to sound natural and conversational
   • Ensure that phrasing mirrors how a real human would speak
   • Maintain clear structure without over-complicating syntax

4. Normalize Content for Speech:
   • Spell out numbers and dates:
     • "42" → "forty-two"
     • "2/23/24" → "February twenty-third, twenty twenty-four"
   • Convert time:
     • "15:30" → "three thirty in the afternoon"
   • Use "dot com" format for emails and URLs
   • Break down complex data or codes into speakable segments

5. Avoid Non-Speech Elements:
   • Do not use emojis, markdown, HTML, or symbols like ~ # % * \\
   • Avoid formatting that won't translate naturally into voice

Remember:
• Always think like a voice actor preparing to read this script aloud.
• Your goal is not only correct punctuation — but intelligent delivery.
• Match the style, tone, and delivery to the script's core message.
• You are helping the TTS system feel the meaning behind the words.

Please format this script for TTS:

${script}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const formattedScript = response.text();
    
    if (!formattedScript) {
      console.warn('Gemini did not return a formatted script, using original script instead');
      return script;
    }
    
    return formattedScript;
  } catch (error) {
    console.error('Error formatting script with Gemini:', error);
    // Return original script if formatting fails
    return script;
  }
} 