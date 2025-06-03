import { NextResponse } from 'next/server';
import { PRODUCER_SYSTEM_MESSAGE } from '@/agents/producer';

/**
 * Producer Agent endpoint to generate cut points for video editing
 * MODIFIED VERSION: Using OpenRouter instead of RunPod
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { transcript, script } = body;
    
    if (!transcript || !script) {
      return NextResponse.json({ 
        error: 'Both transcript and script are required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Producer Agent with transcript and script...');
    console.log(`Transcript preview: ${JSON.stringify(transcript).substring(0, 100)}...`);
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    
    // Prepare the user content message (SAME AS BEFORE)
    const userContent = `Here is the transcription from Whisper:
${JSON.stringify(transcript)}

Here is the video script:
"${script}"

Please output the full list of cuts as a JSON array exactly as specified above.`;

    // Create the request payload for OpenRouter (SIMPLIFIED)
    const payload = {
      model: "anthropic/claude-3.5-sonnet", // or use process.env.OPENROUTER_PRODUCER_MODEL
      messages: [
        {
          role: "system",
          content: PRODUCER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 15000,
      temperature: 0,
      stream: false
    };

    // Make the API request to OpenRouter (SIMPLIFIED)
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai', // Optional but recommended
        'X-Title': 'VinVideo Connected' // Optional but recommended
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Producer Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      // Handle rate limits specifically
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
    const producerResponse = result.choices[0]?.message?.content;
    
    if (!producerResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response (SAME LOGIC AS BEFORE)
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = producerResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response
      const cutPoints = JSON.parse(cleanedResponse);
      
      return NextResponse.json({
        success: true,
        cutPoints,
        executionTime,
        rawResponse: producerResponse,
        usage: result.usage // Token usage info from OpenRouter
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.error('Failed to parse producer response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: producerResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in producer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * KEY CHANGES FROM RUNPOD VERSION:
 * 
 * 1. URL: Changed from RunPod to OpenRouter endpoint
 * 2. API Key: Using OPENROUTER_API_KEY instead of ARSHH_RUNPOD_API_KEY
 * 3. Payload: Simplified structure (no 'input' wrapper, different param names)
 * 4. Headers: Added optional OpenRouter-specific headers
 * 5. Response: Direct access to choices[0].message.content (no polling!)
 * 6. Removed: ~90 lines of polling logic
 * 7. Added: Token usage tracking from response
 * 8. Execution time: Now measures actual API call time (not polling time)
 * 
 * WHAT STAYS THE SAME:
 * - System message import
 * - User content formatting
 * - JSON cleaning logic
 * - Error response structure
 * - Success response structure (minus delayTime)
 */