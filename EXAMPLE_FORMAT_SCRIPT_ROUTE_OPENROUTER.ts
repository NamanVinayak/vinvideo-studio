import { NextResponse } from 'next/server';

/**
 * Format Script endpoint - formats script for TTS
 * MODIFIED VERSION: Using OpenRouter instead of Google Gemini
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, folderId } = body;
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    console.log(`Formatting script: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
    
    // Format script for TTS using OpenRouter
    const formattedScript = await formatScriptForTTS(script);
    console.log('Script formatted for TTS');
    
    // Return the formatted script
    return NextResponse.json({
      success: true,
      formattedScript,
      folderId
    });
    
  } catch (error) {
    console.error('Error formatting script:', error);
    return NextResponse.json({
      error: 'An error occurred while formatting the script'
    }, { status: 500 });
  }
}

/**
 * Format the script for TTS using OpenRouter
 */
async function formatScriptForTTS(script: string): Promise<string> {
  try {
    console.log('Formatting script with OpenRouter...');
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OpenRouter API key is not configured');
      return script;
    }
    
    // Same prompt as before
    const prompt = `You are a professional voice scriptwriter and prompt engineer specialized in formatting content for text-to-speech (TTS) systems. Your primary objective is to transform the provided script so that it is perfectly optimized for natural, expressive vocal delivery without adding any new narrative or context.

Contextual Understanding:
• Analyze the emotional tone, narrative intent, and any implied speaker persona in the input script.
• Determine the most natural way the script should be spoken (e.g., calm guidance, excited storytelling, reflective monologue).

Natural Punctuation & Delivery Cues:
Apply punctuation to shape delivery:
• Use periods (.) for complete stops and clarity.
• Use commas (,) for natural pauses and pacing.
• Use em dashes (—) for dramatic or emotional breaks.
• Use exclamation marks (!) to convey enthusiasm or urgency.
• Use question marks (?) to denote curiosity or a rising tone.

Optimize for Spoken Language:
• Rewrite technical or robotic phrases to sound natural and conversational.
• Ensure phrasing reflects how a human would naturally speak.

Normalize Content for Speech:
• Spell out numbers and dates (e.g., "42" → "forty-two"; "2/23/24" → "February twenty-third, twenty twenty-four").
• Convert time into a natural spoken format (e.g., "15:30" → "three thirty in the afternoon").
• Use "dot com" format for emails and URLs.
• Break down complex data or codes into clear, speakable segments.

Avoid Non-Speech Elements:
• Do not include emojis, markdown, HTML, or symbols like ~, #, %, *, or \.
• Do not add any new narrative, context, or content beyond what is provided.

Transformation Only:
• Your task is solely to transform the input script by reformatting punctuation, phrasing, and delivery cues to enhance vocal performance.
• If the input is very brief (e.g., one-line script), apply only the necessary changes without expanding or embellishing the content.

Please format this script for TTS:

${script}`;
    
    // Make request to OpenRouter
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const payload = {
      model: "openai/gpt-4o", // Good for formatting tasks, cheaper than Claude
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for consistent formatting
      max_tokens: 2000, // Script formatting doesn't need many tokens
      stream: false
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected'
      },
      body: JSON.stringify(payload)
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      // Return original script if API fails
      return script;
    }
    
    const result = await response.json();
    const formattedScript = result.choices[0]?.message?.content;
    
    if (!formattedScript) {
      console.warn('OpenRouter did not return a formatted script, using original script instead');
      return script;
    }
    
    console.log('Script formatted successfully. Sample:', formattedScript.substring(0, 100) + '...');
    return formattedScript;
  } catch (error) {
    console.error('Error formatting script with OpenRouter:', error);
    // Return original script if formatting fails
    return script;
  }
}

/**
 * KEY CHANGES FROM GEMINI VERSION:
 * 
 * 1. Provider: Google Gemini → OpenRouter
 * 2. API Key: GOOGLE_AI_API_KEY → OPENROUTER_API_KEY
 * 3. Model: gemini-2.5-flash → openai/gpt-4o (or claude-3.5-sonnet)
 * 4. SDK: @google/generative-ai → Direct HTTP call
 * 5. Temperature: Added explicit temperature (0.3)
 * 6. Error handling: Gracefully returns original script on failure
 * 
 * WHY GPT-4o FOR THIS TASK:
 * - Formatting is a simpler task than agent reasoning
 * - GPT-4o is cheaper ($2.50/$10 vs Claude's $3/$15)
 * - Still excellent at text transformation tasks
 */