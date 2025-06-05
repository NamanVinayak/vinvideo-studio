import { NextResponse } from 'next/server';
import { FLUX_SYSTEM_MESSAGE } from '@/agents/promptEngineer';

/**
 * Prompt Engineer Agent endpoint to generate image prompts for FLUX
 * MODIFIED: Uses OpenRouter with Google Gemini 2.5 Flash instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, director_output, dop_output, num_images } = body;
    
    if (!script || director_output === undefined || director_output === null || 
        dop_output === undefined || dop_output === null) {
      return NextResponse.json({ 
        error: 'script, director_output, and dop_output are all required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Prompt Engineer Agent...');
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    console.log(`Director output preview: ${JSON.stringify(director_output).substring(0, 100)}...`);
    console.log(`DoP output preview: ${JSON.stringify(dop_output).substring(0, 100)}...`);
    console.log(`Number of images to generate: ${num_images || 'auto-detect from cuts'}`);
    
    // Prepare the user content message
    const userContent = `Here are the inputs for FLUX image prompt generation:

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
      max_tokens: 20000,          // Increased to handle all 35 prompts with rich descriptions
      temperature: 0.45,          // High creativity for detailed visual descriptions
      top_p: 0.7,                // Wide creative vocabulary for visual elements
      frequency_penalty: 0.4,     // Encourage varied descriptive language
      presence_penalty: 0.2,      // Promote diverse visual concepts
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
        const jsonMatch = fixedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          fixedResponse = jsonMatch[0];
        }
        
        try {
          promptsOutput = JSON.parse(fixedResponse);
          console.log('JSON recovery successful');
        } catch (secondParseError) {
          console.error('JSON recovery failed:', secondParseError);
          console.error('Problematic JSON:', cleanedResponse.substring(0, 1000));
          
          // Return a structured error with the raw response
          throw new Error(`Could not parse prompt engineer response: ${secondParseError.message}`);
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
      
      return NextResponse.json({
        success: true,
        promptsOutput,
        numPrompts: Array.isArray(promptsOutput) ? promptsOutput.length : 0,
        executionTime,
        rawResponse: promptResponse,
        usage: result.usage // Token usage from OpenRouter
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.error('Failed to parse Prompt Engineer response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: promptResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
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
