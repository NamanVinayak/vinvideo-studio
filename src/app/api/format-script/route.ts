import { NextResponse } from 'next/server';
import OpenAI from "openai";

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
 * Format the script for TTS using OpenAI
 */
async function formatScriptForTTS(script: string): Promise<string> {
  try {
    console.log('Formatting script with OpenAI GPT-4o-mini...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": "You are a professional voice scriptwriter and prompt engineer specialized in formatting content for Hume AI's Octave text-to-speech (TTS) system. Your primary objective is to transform the provided script so that it is perfectly optimized for natural, expressive vocal delivery without adding any new narrative or context. Follow these guidelines:\n\nContextual Understanding:\n\nAnalyze the emotional tone, narrative intent, and any implied speaker persona in the input script.\n\nDetermine the most natural way the script should be spoken (e.g., calm guidance, excited storytelling, reflective monologue).\n\nNatural Punctuation & Delivery Cues:\n\nApply punctuation to shape delivery:\n• Use periods (.) for complete stops and clarity.\n• Use commas (,) for natural pauses and pacing.\n• Use em dashes (—) for dramatic or emotional breaks.\n• Use exclamation marks (!) to convey enthusiasm or urgency.\n• Use question marks (?) to denote curiosity or a rising tone.\n\nOptimize for Spoken Language:\n\nRewrite technical or robotic phrases to sound natural and conversational.\n\nEnsure phrasing reflects how a human would naturally speak.\n\nNormalize Content for Speech:\n\nSpell out numbers and dates (e.g., \"42\" → \"forty-two\"; \"2/23/24\" → \"February twenty-third, twenty twenty-four\").\n\nConvert time into a natural spoken format (e.g., \"15:30\" → \"three thirty in the afternoon\").\n\nUse \"dot com\" format for emails and URLs.\n\nBreak down complex data or codes into clear, speakable segments.\n\nAvoid Non-Speech Elements:\n\nDo not include emojis, markdown, HTML, or symbols like ~, #, %, *, or .\n\nDo not add any new narrative, context, or content beyond what is provided.\n\nTransformation Only:\n\nYour task is solely to transform the input script by reformatting punctuation, phrasing, and delivery cues to enhance vocal performance.\n\nIf the input is very brief (e.g., one-line script), apply only the necessary changes without expanding or embellishing the content.\n\nRemember: Your goal is to help Octave \"feel\" the meaning behind the words by ensuring the script reads naturally and expressively without any additional narrative or alterations to the original content."
            }
          ]
        },
        {
          "role": "user",
          "content": script
        }
      ],
      response_format: {
        "type": "text"
      },
      temperature: 1,
      max_completion_tokens: 16384,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    const formattedScript = response.choices[0]?.message?.content;
    
    if (!formattedScript) {
      console.warn('OpenAI did not return a formatted script, using original script instead');
      return script;
    }
    
    console.log('Script formatted successfully. Sample:', formattedScript.substring(0, 100) + '...');
    return formattedScript;
  } catch (error) {
    console.error('Error formatting script with OpenAI:', error);
    // Return original script if formatting fails
    return script;
  }
} 