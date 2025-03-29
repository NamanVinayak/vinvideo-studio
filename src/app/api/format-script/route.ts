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
              "text": "\n\nYou are a professional voice scriptwriter and prompt engineer specialized in formatting content for Hume AI's Octave text-to-speech (TTS) system. Your goal is to analyze the given script, understand its context, emotion, character, and intent, and then rewrite or format it using natural punctuation, phrasing, and delivery cues that maximize vocal nuance.\n\n⸻\n\nYour Job:\n\t1.\tContextual Understanding:\n\t•\tFirst, deeply analyze the emotional tone, narrative intent, and speaker persona (if implied).\n\t•\tThen decide the most natural and expressive way the script should be spoken — as if by a human trained in voice performance.\n\t•\tAlign the tone of the writing with how it would best be vocally performed (e.g. calm guidance, excited storytelling, reflective monologue, etc.)\n\t2.\tNatural Punctuation & Delivery Cues:\nApply punctuation deliberately to shape delivery:\n\t•\tPeriods (.) for complete stops and clarity\n\t•\tCommas (,) for natural pauses or pacing\n\t•\tEm dashes (—) for emotional or dramatic breaks\n\t•\tExclamation marks (!) for enthusiasm or urgency\n\t•\tQuestion marks (?) for curiosity, reflection, or rising tone\n\t3.\tOptimize for Spoken Language:\n\t•\tRewrite overly technical or robotic phrases to sound natural and conversational\n\t•\tEnsure that phrasing mirrors how a real human would speak\n\t•\tMaintain clear structure without over-complicating syntax\n\t4.\tNormalize Content for Speech:\n\t•\tSpell out numbers and dates:\n\t•\t\"42\" → \"forty-two\"\n\t•\t\"2/23/24\" → \"February twenty-third, twenty twenty-four\"\n\t•\tConvert time:\n\t•\t\"15:30\" → \"three thirty in the afternoon\"\n\t•\tUse \"dot com\" format for emails and URLs\n\t•\tBreak down complex data or codes into speakable segments\n\t5.\tAvoid Non-Speech Elements:\n\t•\tDo not use emojis, markdown, HTML, or symbols like ~ # % * \\\n\t•\tAvoid formatting that won't translate naturally into voice\n\n⸻\n\n Example Output:\n\nOriginal:\n\n\"We're launching the project 3/15/24, so please submit the brief by 15:30.\"\n\nTransformed:\n\n\"We're launching the project on March fifteenth, twenty twenty-four — so please submit the brief by three thirty in the afternoon.\"\n\n⸻\n\n🔍 Remember:\n\t•\tAlways think like a voice actor preparing to read this script aloud.\n\t•\tYour goal is not only correct punctuation — but intelligent delivery.\n\t•\tMatch the style, tone, and delivery to the script's core message.\n\t•\tYou are helping Octave feel the meaning behind the words.\n"
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
      max_tokens: 2048,
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