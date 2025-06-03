import { NextResponse } from 'next/server';
import { DOP_SYSTEM_MESSAGE } from '@/agents/dop';

/**
 * DoP Agent endpoint to generate cinematography directions
 * MODIFIED: Uses OpenRouter with Google Gemini 2.5 Flash instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, producer_output, director_output } = body;
    
    if (!script || producer_output === undefined || producer_output === null || 
        director_output === undefined || director_output === null) {
      return NextResponse.json({ 
        error: 'script, producer_output, and director_output are all required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling DoP Agent with script, producer and director outputs...');
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    console.log(`Producer output preview: ${JSON.stringify(producer_output).substring(0, 100)}...`);
    console.log(`Director output preview: ${JSON.stringify(director_output).substring(0, 100)}...`);
    
    // Prepare the user content message
    const userContent = `Here are the inputs for cinematography planning:

ORIGINAL SCRIPT:
"${script}"

PRODUCER EDITOR NOTES (timing and cuts):
${JSON.stringify(producer_output)}

DIRECTOR NOTES (creative vision):
${JSON.stringify(director_output)}

Please analyze these inputs and output your cinematography directions as a JSON array exactly as specified in your system instructions.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20",
      messages: [
        {
          role: "system",
          content: DOP_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 20000,          // Increased to handle all 35 shots from Director
      temperature: 0.35,          // Higher creativity for cinematographic artistry
      top_p: 0.5,                // More diverse visual choices and creative options
      frequency_penalty: 0.3,     // Prevent repetitive shot patterns
      presence_penalty: 0.1,      // Allow technical terms to repeat naturally
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
        'X-Title': 'VinVideo Connected - DoP Agent'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to DoP Agent via OpenRouter...');
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
    const dopResponse = result.choices[0]?.message?.content;
    
    if (!dopResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response (SAME LOGIC AS BEFORE)
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = dopResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response
      const dopOutput = JSON.parse(cleanedResponse);
      
      return NextResponse.json({
        success: true,
        dopOutput,
        executionTime,
        rawResponse: dopResponse,
        usage: result.usage // Token usage from OpenRouter
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.error('Failed to parse DoP response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: dopResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in dop-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
