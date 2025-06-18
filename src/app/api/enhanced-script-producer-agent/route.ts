import { NextResponse } from 'next/server';
import { ENHANCED_SCRIPT_PRODUCER_SYSTEM_MESSAGE } from '@/agents/enhancedScriptProducer';
import type { EnhancedScriptProducerInput } from '@/agents/enhancedScriptProducer';
import type { ScriptModeUserContext } from '@/types/scriptModeUserContext';

export async function POST(request: Request) {
  try {
    const body = await request.json() as EnhancedScriptProducerInput;
    const { transcript, formatted_script, scriptModeUserContext } = body;
    
    if (!transcript || !formatted_script || !scriptModeUserContext) {
      return NextResponse.json({
        error: 'transcript, formatted_script, and scriptModeUserContext are required'
      }, { status: 400 });
    }
    
    console.log('Enhanced Script Producer called with:', {
      script_length: formatted_script.length,
      calculated_duration: scriptModeUserContext.settings.calculatedDuration,
      user_pacing: scriptModeUserContext.settings.pacing,
      user_visual_style: scriptModeUserContext.settings.visualStyle,
      content_type: scriptModeUserContext.scriptContext?.script_analysis?.content_type
    });
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenRouter API key is not configured'
      }, { status: 500 });
    }
    
    const userContent = `Here is the formatted script content:
"${formatted_script}"

Here is the transcript with word-level timestamps:
${JSON.stringify(transcript)}

Here is the complete user context:
${JSON.stringify(scriptModeUserContext, null, 2)}

Please analyze this script and create intelligent cut points that respect the user's requirements while optimizing for the script content.

CRITICAL REMINDERS:
- TTS audio duration is ${scriptModeUserContext.settings.calculatedDuration} seconds (auto-calculated from script)
- User selected "${scriptModeUserContext.settings.pacing}" pacing
- Script type is "${scriptModeUserContext.scriptContext?.script_analysis?.content_type || 'general'}"
- Visual style preference is "${scriptModeUserContext.settings.visualStyle}"`;
    
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20",
      messages: [
        {
          role: "system",
          content: ENHANCED_SCRIPT_PRODUCER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0,
      max_tokens: 13000
    };
    
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Enhanced Script Producer'
      },
      body: JSON.stringify(payload)
    });
    
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Enhanced Script Producer API error:', errorData);
      return NextResponse.json({
        error: 'Enhanced script producer failed',
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
      
      const producerOutput = JSON.parse(jsonContent);
      console.log('Enhanced Script Producer successful:', {
        cut_count: producerOutput.cut_count,
        total_duration: producerOutput.total_duration_s,
        target_duration: producerOutput.target_duration_s,
        duration_variance: producerOutput.duration_variance,
        pacing_compliance: producerOutput.pacing_compliance,
        execution_time_ms: executionTime
      });
      
      return NextResponse.json({
        success: true,
        producer_output: producerOutput,
        execution_time_ms: executionTime
      });
      
    } catch (parseError) {
      console.error('Failed to parse producer response:', parseError);
      console.error('Raw response content (first 1000 chars):', content.substring(0, 1000));
      console.error('Raw response content (last 200 chars):', content.substring(Math.max(0, content.length - 200)));
      
      return NextResponse.json({
        error: 'Failed to parse producer response',
        raw_response: content,
        parse_error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Enhanced Script Producer error:', error);
    return NextResponse.json({
      error: 'Enhanced script producer failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}