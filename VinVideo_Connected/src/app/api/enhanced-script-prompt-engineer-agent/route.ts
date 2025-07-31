import { NextResponse } from 'next/server';
import { ENHANCED_SCRIPT_PROMPT_ENGINEER_SYSTEM_MESSAGE } from '@/agents/enhancedScriptPromptEngineer';
import type { EnhancedScriptPromptEngineerInput } from '@/agents/enhancedScriptPromptEngineer';

// Manual prompt extraction when JSON parsing fails
function extractPromptsFromRawText(rawText: string, expectedCount?: number): string[] {
  const prompts: string[] = [];
  
  // Try to extract quoted strings (most common format)
  const quotedMatches = rawText.match(/"([^"]{50,})"/g);
  if (quotedMatches) {
    quotedMatches.forEach(match => {
      const prompt = match.slice(1, -1); // Remove quotes
      if (prompt.length > 50) { // Only meaningful prompts
        prompts.push(prompt);
      }
    });
  }
  
  // If no quoted strings, try line-by-line extraction
  if (prompts.length === 0) {
    const lines = rawText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      // Look for numbered prompts or descriptive lines
      if (trimmed.match(/^\d+:?\s+/) || trimmed.length > 100) {
        prompts.push(trimmed.replace(/^\d+:?\s*/, ''));
      }
    });
  }
  
  // If still no prompts, split by common delimiters
  if (prompts.length === 0) {
    const sections = rawText.split(/[,\n]{2,}|\]\s*,\s*\[/);
    sections.forEach(section => {
      const cleaned = section.trim().replace(/^[\[\]"'\s]+|[\[\]"'\s]+$/g, '');
      if (cleaned.length > 50) {
        prompts.push(cleaned);
      }
    });
  }
  
  // Ensure we have at least one prompt
  if (prompts.length === 0) {
    prompts.push("cinematic shot, high detail, professional lighting, 16:9 8K");
  }
  
  // Limit to expected count if provided
  if (expectedCount && prompts.length > expectedCount) {
    return prompts.slice(0, expectedCount);
  }
  
  return prompts;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as EnhancedScriptPromptEngineerInput;
    const { director_output, dop_output, script, scriptModeUserContext } = body;
    
    if (!director_output || !dop_output || !script || !scriptModeUserContext) {
      return NextResponse.json({
        error: 'director_output, dop_output, script, and scriptModeUserContext are required'
      }, { status: 400 });
    }
    
    console.log('Enhanced Script Prompt Engineer called with:', {
      user_visual_style: scriptModeUserContext.settings.visualStyle,
      content_type: scriptModeUserContext.scriptContext?.script_analysis?.content_type,
      beat_count: director_output.narrative_beats?.length
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

Here is the Director's visual beats:
${JSON.stringify(director_output)}

Here is the DoP's cinematography specifications:
${JSON.stringify(dop_output)}

Please create FLUX prompts that:
1. Visualize the EXACT script content (no creative additions)
2. Apply the user's "${scriptModeUserContext.settings.visualStyle}" visual style consistently
3. Follow the cinematographic specifications from DoP
4. Include mandatory gaze direction for every character
5. Optimize for "${scriptModeUserContext.scriptContext?.script_analysis?.content_type || 'general'}" content

Generate exactly ${director_output.narrative_beats?.length || 10} prompts, one for each beat.`;
    
    const payload = {
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: ENHANCED_SCRIPT_PROMPT_ENGINEER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.4,
      max_tokens: 20000
    };
    
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Enhanced Script Prompt Engineer'
      },
      body: JSON.stringify(payload)
    });
    
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Enhanced Script Prompt Engineer API error:', errorData);
      return NextResponse.json({
        error: 'Enhanced script prompt engineer failed',
        details: errorData.error?.message || 'Unknown error'
      }, { status: response.status });
    }
    
    const data = await response.json();
    const rawResponse = data.choices[0].message.content;
    
    let prompts: string[] = [];
    const expectedCount = director_output.narrative_beats?.length || 10;
    
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(rawResponse);
      if (Array.isArray(parsed)) {
        prompts = parsed.map(p => typeof p === 'string' ? p : String(p));
      } else {
        // If not array, extract from raw text
        prompts = extractPromptsFromRawText(rawResponse, expectedCount);
      }
    } catch (parseError) {
      // Fallback to text extraction
      console.log('JSON parsing failed, extracting prompts from text');
      prompts = extractPromptsFromRawText(rawResponse, expectedCount);
    }
    
    console.log('Enhanced Script Prompt Engineer successful:', {
      prompt_count: prompts.length,
      expected_count: expectedCount,
      style_applied: scriptModeUserContext.settings.visualStyle,
      execution_time_ms: executionTime
    });
    
    return NextResponse.json({
      success: true,
      prompts: prompts,
      prompt_count: prompts.length,
      execution_time_ms: executionTime
    });
    
  } catch (error) {
    console.error('Enhanced Script Prompt Engineer error:', error);
    return NextResponse.json({
      error: 'Enhanced script prompt engineer failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}