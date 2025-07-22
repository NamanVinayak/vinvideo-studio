import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, folderId } = body;
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    console.log(`Formatting script: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
    
    // Format script for TTS
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
 * Format the script for TTS using Google Gemini
 */
async function formatScriptForTTS(script: string): Promise<string> {
  try {
    console.log('Formatting script with OpenRouter...');
    
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      console.error('OpenRouter API key is not configured');
      return script;
    }
    
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'VinVideo Connected'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const formattedScript = data.choices[0].message.content;
    
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
