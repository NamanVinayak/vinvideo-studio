import { NextResponse } from 'next/server';
import { SCRIPT_FORMATTING_SYSTEM_MESSAGE } from '@/agents/scriptFormattingAgent';
import type { ScriptFormattingInput } from '@/agents/scriptFormattingAgent';

export async function POST(request: Request) {
  try {
    const body = await request.json() as ScriptFormattingInput;
    const { originalScript, userContext } = body;
    
    if (!originalScript) {
      return NextResponse.json({
        error: 'Original script is required'
      }, { status: 400 });
    }
    
    console.log('Script Formatting Agent called with script preview:', originalScript.substring(0, 100) + '...');
    if (userContext) {
      console.log('User context provided:', {
        duration: userContext.duration,
        contentType: userContext.contentType
      });
    }
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenRouter API key is not configured'
      }, { status: 500 });
    }
    
    const userContent = `Please format this script for TTS generation and analyze its structure:

${originalScript}

${userContext ? `Additional context: This is intended to be ${userContext.duration} seconds long${userContext.contentType ? ` and is ${userContext.contentType} content` : ''}.` : ''}

Extract only the spoken content and provide comprehensive analysis as specified in your instructions.`;
    
    const payload = {
      model: "qwen/qwen-2.5-7b-instruct",
      messages: [
        {
          role: "system",
          content: SCRIPT_FORMATTING_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    };
    
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Script Formatting'
      },
      body: JSON.stringify(payload)
    });
    
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Script Formatting API error:', errorData);
      return NextResponse.json({
        error: 'Script formatting failed',
        details: errorData.error?.message || 'Unknown error'
      }, { status: response.status });
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      // Extract JSON from response (handle cases where LLM adds extra content)
      let jsonContent = content;
      
      // Try to find JSON block if it's wrapped in markdown or has extra content
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        jsonContent = content.substring(jsonStart, jsonEnd);
      }
      
      const formattedResult = JSON.parse(jsonContent);
      console.log('Script formatting successful:', {
        formatted_length: formattedResult.formatted_script_for_tts?.length,
        content_type: formattedResult.script_analysis?.content_type,
        execution_time_ms: executionTime
      });
      
      return NextResponse.json({
        success: true,
        ...formattedResult,
        execution_time_ms: executionTime
      });
      
    } catch (parseError) {
      console.error('Failed to parse script formatting response:', parseError);
      console.error('Raw response content (first 1000 chars):', content.substring(0, 1000));
      console.error('Raw response content (last 200 chars):', content.substring(Math.max(0, content.length - 200)));
      
      return NextResponse.json({
        error: 'Failed to parse formatting response',
        raw_response: content,
        parse_error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Script formatting error:', error);
    return NextResponse.json({
      error: 'Script formatting failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}