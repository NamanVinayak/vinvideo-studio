import { NextResponse } from 'next/server';
import { ENHANCED_SCRIPT_DOP_SYSTEM_MESSAGE } from '@/agents/enhancedScriptDop';
import type { EnhancedScriptDopInput } from '@/agents/enhancedScriptDop';
import { passThroughRawJson } from '@/utils/passThroughRawJson';

export async function POST(request: Request) {
  try {
    const body = await request.json() as EnhancedScriptDopInput;
    const { director_output, script, producer_output, scriptModeUserContext } = body;
    
    if (!director_output || !script || !producer_output || !scriptModeUserContext) {
      return NextResponse.json({
        error: 'director_output, script, producer_output, and scriptModeUserContext are required'
      }, { status: 400 });
    }
    
    // Dynamically extract beat count from director output
    const expectedBeatCount = director_output.narrative_beats?.length || 
                             (Array.isArray(director_output) ? director_output.length : 0) ||
                             (director_output.beats ? director_output.beats.length : 0);
    
    console.log('Enhanced Script DoP called with:', {
      user_visual_style: scriptModeUserContext.settings.visualStyle,
      user_pacing: scriptModeUserContext.settings.pacing,
      content_type: scriptModeUserContext.scriptContext?.script_analysis?.content_type,
      beat_count: expectedBeatCount
    });
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenRouter API key is not configured'
      }, { status: 500 });
    }
    
    const userContent = `Here is the complete user context:
${JSON.stringify(scriptModeUserContext, null, 2)}

Here is the script content:
"${script}"

Here is the Producer output:
${JSON.stringify(producer_output)}

Here is the Director's visual beats:
${JSON.stringify(director_output)}

CRITICAL REQUIREMENT: The Director provided ${expectedBeatCount} visual beats. You MUST create exactly ${expectedBeatCount} cinematographic shots in your JSON array response.

Please create cinematography that:
1. Serves the exact script content
2. Implements the user's "${scriptModeUserContext.settings.visualStyle}" visual style
3. Matches the "${scriptModeUserContext.settings.pacing}" pacing with appropriate camera work
4. Enhances "${scriptModeUserContext.scriptContext?.script_analysis?.content_type || 'general'}" content appropriately
5. GENERATES EXACTLY ${expectedBeatCount} SHOTS (one for each Director beat)

CRITICAL: Every shot must specify gaze direction for any characters.`;
    
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: ENHANCED_SCRIPT_DOP_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.3,
      max_tokens: 20000
    };
    
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Enhanced Script DoP'
      },
      body: JSON.stringify(payload)
    });
    
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Enhanced Script DoP API error:', errorData);
      return NextResponse.json({
        error: 'Enhanced script DoP failed',
        details: errorData.error?.message || 'Unknown error'
      }, { status: response.status });
    }
    
    const data = await response.json();
    const rawResponse = data.choices[0].message.content;
    
    // Use passThroughRawJson utility to handle potential JSON issues
    const processedResponse = passThroughRawJson(rawResponse, 'Enhanced Script DoP');
    
    // Try to get shot count from parsed data or raw content
    let shotCount = 0;
    let styleConsistency = 'Missing';
    
    if (Array.isArray(processedResponse.structuredData)) {
      shotCount = processedResponse.structuredData.length;
      styleConsistency = processedResponse.structuredData.length > 0 ? 'Present' : 'Missing';
    } else if (processedResponse.rawContent) {
      // Count beats in raw content if parsing failed
      const beatMatches = processedResponse.rawContent.match(/"beat_no":\s*\d+/g);
      shotCount = beatMatches ? beatMatches.length : 0;
      styleConsistency = shotCount > 0 ? 'Present' : 'Missing';
    }
    
    console.log('Enhanced Script DoP successful:', {
      shot_count: shotCount,
      style_consistency: styleConsistency,
      execution_time_ms: executionTime
    });
    
    return NextResponse.json({
      success: true,
      dop_output: processedResponse.structuredData || processedResponse.rawContent,
      rawResponse: processedResponse.rawContent,
      parsingStatus: processedResponse.parsingStatus,
      execution_time_ms: executionTime
    });
    
  } catch (error) {
    console.error('Enhanced Script DoP error:', error);
    return NextResponse.json({
      error: 'Enhanced script DoP failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}