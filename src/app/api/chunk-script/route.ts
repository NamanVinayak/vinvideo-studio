import { NextResponse } from 'next/server';
import OpenAI from "openai";
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Extract the script and folderId from the request
    const { script, folderId } = await request.json();
    
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    console.log('Chunking script with OpenAI...');
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": "You are a prompt generator for artistic visual models. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nBreak the original script into the smallest logical segments to allow frequent visual changes. For each segment:\n\t1.\tPrompt: Generate a rich, cinematic visual description that accurately reflects the meaning and mood of the original line segment.\n\t2.\tDuration: Estimate the exact time (in whole seconds) it would take for a Text-to-Speech (TTS) engine to speak the original script line naturally and clearly.\n  - This should be based on the length, structure, and complexity of the original line.\n  - Consider how punctuation affects pauses.\n  - Take into account the typical rhythm and pacing of TTS delivery, not human speech alone.\n  - There is no fixed rule—some segments may be 1 second, others 10+ seconds.\n\n⚠️ Do not use the visual prompt to determine the duration. Always base it on the original script line.\n\nOnly output the final Markdown table, in this format:\n| Line Number | Prompt | Duration (in seconds) |\nNo commentary, no original script, and no explanations—only the table."
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
      max_tokens: 5000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const chunkedScript = response.choices[0]?.message?.content || '';
    console.log('Successfully chunked script');

    // If folderId is provided, save the chunked script to a file
    if (folderId) {
      try {
        const publicDir = path.join(process.cwd(), 'public', folderId);
        // Make sure the directory exists
        await fs.mkdir(publicDir, { recursive: true });
        
        // Save the chunked script to a markdown file
        const chunkedScriptPath = path.join(publicDir, 'chunked-script.md');
        await fs.writeFile(chunkedScriptPath, chunkedScript, 'utf8');
        console.log(`Saved chunked script to: ${chunkedScriptPath}`);
      } catch (saveError) {
        console.error('Error saving chunked script to file:', saveError);
        // Continue even if saving fails - we'll still return the content
      }
    }

    return NextResponse.json({
      success: true,
      chunkedScript
    });

  } catch (error: unknown) {
    console.error('Error in chunk-script endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 