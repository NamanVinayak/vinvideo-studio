import { NextResponse } from 'next/server';
import { FLUX_SYSTEM_MESSAGE } from '@/agents/promptEngineer';
import { saveApiResponse, generateSessionId } from '@/utils/responseSaver';
import type { UserContext } from '@/types/userContext';

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

/**
 * Prompt Engineer Agent endpoint to generate image prompts for FLUX
 * MODIFIED: Uses OpenRouter with Google Gemini 2.5 Flash instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, director_output, dop_output, num_images, visionDocument, enhancedMode, prompt_engineer_instructions, userContext } = body as {
      script: string;
      director_output: any;
      dop_output: any;
      num_images?: number;
      visionDocument?: any;
      enhancedMode?: boolean;
      prompt_engineer_instructions?: any;
      userContext?: UserContext;
    };
    
    if (!script || director_output === undefined || director_output === null || 
        dop_output === undefined || dop_output === null) {
      return NextResponse.json({ 
        error: 'script, director_output, and dop_output are all required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Prompt Engineer Agent...');
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    console.log(`Vision Document available: ${!!visionDocument}`);
    console.log(`Prompt Engineer Instructions available: ${!!prompt_engineer_instructions}`);
    console.log(`UserContext available: ${!!userContext}`);
    if (userContext) {
      console.log(`User original prompt: ${userContext.originalPrompt?.substring(0, 50)}...`);
      console.log(`User visual style: ${userContext.settings.visualStyle}`);
    }
    console.log(`Enhanced Mode: ${!!enhancedMode}`);
    if (visionDocument) {
      console.log(`Vision core concept: ${visionDocument.core_concept}`);
      console.log(`Vision visual style: ${visionDocument.visual_style}`);
      console.log(`Detected artistic style: ${visionDocument.detected_artistic_style}`);
    }
    
    // ENHANCED: Log Prompt Engineer instructions content
    if (prompt_engineer_instructions) {
      console.log('📋 PROMPT ENGINEER INSTRUCTIONS CONTENT:');
      console.log(JSON.stringify(prompt_engineer_instructions, null, 2));
    }
    console.log(`Director output preview: ${JSON.stringify(director_output).substring(0, 100)}...`);
    console.log(`DoP output preview: ${JSON.stringify(dop_output).substring(0, 100)}...`);
    console.log(`Number of images to generate: ${num_images || 'auto-detect from cuts'}`);
    
    // Prepare enhanced vision context with artistic style
    const visionContext = visionDocument && enhancedMode ? `
🎨 CRITICAL VISION CONTEXT (MUST BE MAINTAINED):
Core Concept: "${visionDocument.core_concept}"
Visual Style: "${visionDocument.visual_style}" 
Emotion Arc: ${visionDocument.emotion_arc?.join(' → ')}
Pacing: ${visionDocument.pacing}
Duration: ${visionDocument.duration} seconds
Color Philosophy: "${visionDocument.color_philosophy}"
${visionDocument.detected_artistic_style !== 'not_mentioned' ? `Detected Artistic Style: "${visionDocument.detected_artistic_style}" - ALL IMAGES MUST FOLLOW THIS STYLE` : ''}

` : '';

    const enhancedPromptEngineerGuidance = prompt_engineer_instructions ? `
🚀 ENHANCED PROMPT ENGINEER GUIDANCE (Vision Agent Strategist):

MANDATORY STYLE REQUIREMENTS:
${prompt_engineer_instructions.mandatory_style?.map((req: string) => `- ${req}`).join('\n')}

VISUAL CONSISTENCY RULES:
${Array.isArray(prompt_engineer_instructions.visual_consistency_rules) 
  ? prompt_engineer_instructions.visual_consistency_rules.map((rule: string) => `- ${rule}`).join('\n')
  : prompt_engineer_instructions.visual_consistency_rules || 'None specified'}

CHARACTER REQUIREMENTS: ${prompt_engineer_instructions.character_requirements || 'None specified'}

SETTING DETAILS: ${prompt_engineer_instructions.setting_details}

FORBIDDEN ELEMENTS:
${prompt_engineer_instructions.forbidden_elements?.map((element: string) => `- ${element}`).join('\n')}

TECHNICAL SPECIFICATIONS: ${prompt_engineer_instructions.technical_specifications}

ARTISTIC STYLE ENFORCEMENT: ${prompt_engineer_instructions.artistic_style_enforcement}

CRITICAL: Use this guidance to ensure ALL generated images maintain perfect consistency and follow the detected artistic style requirements.

` : '';

    // Add user context information if available
    const userContextInfo = userContext ? `
🎨 USER'S ORIGINAL REQUEST:
- What They Asked For: "${userContext.originalPrompt}"
- Visual Style Selected: ${userContext.settings.visualStyle}

CRITICAL: Every image prompt MUST reflect the user's requested visual style and concept.

` : '';

    const userContent = `${visionContext}${enhancedPromptEngineerGuidance}${userContextInfo}Here are the inputs for FLUX image prompt generation:

ORIGINAL SCRIPT:
"${script}"

DIRECTOR NOTES (creative vision and story beats):
${JSON.stringify(director_output)}

DOP NOTES (cinematography directions):
${JSON.stringify(dop_output)}

${num_images ? `NUMBER OF IMAGES TO GENERATE: ${num_images}

IMPORTANT: You MUST generate exactly ${num_images} image prompts - no more, no less. Each prompt corresponds to one beat from the DoP output.` : 'Please auto-detect the number of images needed based on the director and DoP outputs.'}

Please analyze these inputs and output your FLUX image prompts as a JSON array exactly as specified in your system instructions. Each prompt should be indexed and ready for FLUX 1-dev generation.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20",
      messages: [
        {
          role: "system",
          content: FLUX_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 25000,          // Increased for enhanced prompt generation with gaze instructions
      temperature: 0.45,          // High creativity for detailed visual descriptions
      top_p: 0.7,                // Wide creative vocabulary for visual elements
      stream: false
    };

    // Make the API request to OpenRouter
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Prompt Engineer'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Prompt Engineer Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      // Handle rate limits
      if (response.status === 429) {
        return NextResponse.json({
          error: 'Rate limited. Please try again later.',
          retryAfter: response.headers.get('X-RateLimit-Reset')
        }, { status: 429 });
      }
      
      return NextResponse.json({
        error: errorData.error?.message || `OpenRouter API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('OpenRouter response received');

    // Extract the response content (DIRECT ACCESS - NO POLLING!)
    const promptResponse = result.choices[0]?.message?.content;
    
    if (!promptResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response (SAME LOGIC AS BEFORE)
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = promptResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response with enhanced error recovery
      let promptsOutput;
      try {
        promptsOutput = JSON.parse(cleanedResponse);
      } catch (initialParseError) {
        console.log('Initial JSON parse failed, attempting recovery...');
        
        // Try to fix common JSON issues
        let fixedResponse = cleanedResponse;
        
        // Fix trailing commas
        fixedResponse = fixedResponse.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unescaped quotes in strings
        fixedResponse = fixedResponse.replace(/([^\\])"([^"]*?[^\\])"(?=\s*[,}\]])/g, '$1"$2"');
        
        // Try to extract JSON if it's wrapped in text
        const jsonMatch = fixedResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          fixedResponse = jsonMatch[0];
        }
        
        // Handle truncated arrays - if it looks like an incomplete array, try to close it
        if (fixedResponse.startsWith('[') && !fixedResponse.endsWith(']')) {
          // Find the last complete string entry and close the array there
          const lastCompleteEntry = fixedResponse.lastIndexOf('"');
          if (lastCompleteEntry > 0) {
            // Check if we're in the middle of a string - if so, go back to previous complete entry
            const textAfterLastQuote = fixedResponse.substring(lastCompleteEntry + 1);
            if (textAfterLastQuote.includes(',') || textAfterLastQuote.trim() === '') {
              fixedResponse = fixedResponse.substring(0, lastCompleteEntry + 1) + ']';
            } else {
              // We're in middle of a string, find the previous complete entry
              const beforeLastQuote = fixedResponse.substring(0, lastCompleteEntry);
              const previousQuote = beforeLastQuote.lastIndexOf('"');
              if (previousQuote > 0) {
                fixedResponse = fixedResponse.substring(0, previousQuote + 1) + ']';
              }
            }
          }
        }
        
        try {
          promptsOutput = JSON.parse(fixedResponse);
          console.log('JSON recovery successful');
        } catch (secondParseError) {
          console.error('JSON recovery failed:', secondParseError);
          console.error('Problematic JSON:', cleanedResponse.substring(0, 1000));
          
          // Return a structured error with the raw response
          throw new Error(`Could not parse prompt engineer response: ${secondParseError instanceof Error ? secondParseError.message : String(secondParseError)}`);
        }
      }
      
      // Validate the number of prompts if num_images was specified
      if (num_images && Array.isArray(promptsOutput) && promptsOutput.length !== num_images) {
        console.warn(`Expected ${num_images} prompts but got ${promptsOutput.length}`);
        return NextResponse.json({
          success: true,
          promptsOutput,
          numPrompts: promptsOutput.length,
          executionTime,
          rawResponse: promptResponse,
          warning: `Expected ${num_images} prompts but received ${promptsOutput.length}`,
          usage: result.usage
        });
      }
      
      // Auto-save the response
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'prompt-engineer',
        promptsOutput,
        promptResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash-preview-05-20',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      return NextResponse.json({
        success: true,
        promptsOutput,
        numPrompts: Array.isArray(promptsOutput) ? promptsOutput.length : 0,
        executionTime,
        rawResponse: promptResponse,
        usage: result.usage, // Token usage from OpenRouter
        sessionId
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.error('Failed to parse Prompt Engineer response as JSON:', parseError);
      
      // Still save the raw response for debugging
      const sessionId = body.sessionId || await generateSessionId();
      await saveApiResponse(
        'prompt-engineer-error',
        { error: parseError instanceof Error ? parseError.message : 'Parse error' },
        promptResponse,
        {
          apiSource: 'openrouter',
          model: 'google/gemini-2.5-flash-preview-05-20',
          executionTime,
          tokenUsage: result.usage
        },
        sessionId
      );
      
      // CRITICAL: Extract prompts manually when JSON fails
      console.log('Attempting manual prompt extraction...');
      const manuallyExtractedPrompts = extractPromptsFromRawText(promptResponse, num_images);
      console.log(`Manual extraction found ${manuallyExtractedPrompts.length} prompts`);
      
      return NextResponse.json({
        success: true,
        promptsOutput: manuallyExtractedPrompts, // Always provide promptsOutput for FLUX
        numPrompts: manuallyExtractedPrompts.length,
        rawResponse: promptResponse,
        executionTime,
        warning: `Response could not be parsed as JSON. Extracted ${manuallyExtractedPrompts.length} prompts manually.`,
        usage: result.usage,
        sessionId
      });
    }

  } catch (error: unknown) {
    console.error('Error in prompt-engineer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
