import { NextResponse } from 'next/server';
import { ENHANCED_SCRIPT_DIRECTOR_SYSTEM_MESSAGE } from '@/agents/enhanced-script-pipeline/enhanced-script-director';
import type { EnhancedScriptDirectorInput } from '@/agents/enhanced-script-pipeline/enhanced-script-director';
import { passThroughRawJson } from '@/utils/passThroughRawJson';

export async function POST(request: Request) {
  try {
    const body = await request.json() as EnhancedScriptDirectorInput;
    const { producer_output, script, scriptModeUserContext } = body;
    
    if (!producer_output || !script || !scriptModeUserContext) {
      return NextResponse.json({
        error: 'producer_output, script, and scriptModeUserContext are required'
      }, { status: 400 });
    }
    
    // Dynamically extract cut count from producer output
    const expectedCutCount = producer_output.cut_count || 
                            producer_output.cut_points?.length || 
                            (Array.isArray(producer_output) ? producer_output.length : 0);
    
    console.log('Enhanced Script Director called with:', {
      script_preview: script.substring(0, 100) + '...',
      user_visual_style: scriptModeUserContext.settings.visualStyle,
      user_pacing: scriptModeUserContext.settings.pacing,
      content_type: scriptModeUserContext.scriptContext?.script_analysis?.content_type,
      cut_count: expectedCutCount
    });
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenRouter API key is not configured'
      }, { status: 500 });
    }
    
    const userContent = `Here is the complete user context with their exact script and preferences:
${JSON.stringify(scriptModeUserContext, null, 2)}

Here is the Enhanced Script Producer's cut points:
${JSON.stringify(producer_output)}

Here is the formatted script for reference:
"${script}"

CRITICAL REQUIREMENT: The Producer generated ${expectedCutCount} cut points. You MUST create exactly ${expectedCutCount} visual beats in your response.

Please create visual beats that:
1. Serve the EXACT script content (no creative reinterpretation)
2. Apply the user's "${scriptModeUserContext.settings.visualStyle}" visual style throughout
3. Respect the "${scriptModeUserContext.settings.pacing}" pacing with appropriate visual complexity
4. Consider this is "${scriptModeUserContext.scriptContext?.script_analysis?.content_type || 'general'}" content
5. GENERATE EXACTLY ${expectedCutCount} BEATS (one for each Producer cut)

Remember: You're visualizing their exact words with their preferred aesthetic.`;
    
    const payload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system",
          content: ENHANCED_SCRIPT_DIRECTOR_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.5,
      max_tokens: 50000,
      top_p: 0.8
    };
    
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Enhanced Script Director'
      },
      body: JSON.stringify(payload)
    });
    
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Enhanced Script Director API error:', errorData);
      return NextResponse.json({
        error: 'Enhanced script director failed',
        details: errorData.error?.message || 'Unknown error'
      }, { status: response.status });
    }
    
    const data = await response.json();
    const rawResponse = data.choices[0].message.content;
    
    // Use passThroughRawJson utility to handle potential JSON issues
    const processedResponse = passThroughRawJson(rawResponse, 'Enhanced Script Director');
    
    console.log('Enhanced Script Director successful:', {
      beat_count: (processedResponse.structuredData as any)?.narrative_beats?.length,
      user_style_applied: (processedResponse.structuredData as any)?.project_metadata?.user_visual_style,
      execution_time_ms: executionTime
    });
    
    return NextResponse.json({
      success: true,
      director_output: processedResponse.structuredData || processedResponse.rawContent,
      rawResponse: processedResponse.rawContent,
      parsingStatus: processedResponse.parsingStatus,
      execution_time_ms: executionTime
    });
    
  } catch (error) {
    console.error('Enhanced Script Director error:', error);
    return NextResponse.json({
      error: 'Enhanced script director failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}