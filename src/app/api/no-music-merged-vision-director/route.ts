import { NextRequest, NextResponse } from 'next/server';
import { MERGED_VISION_DIRECTOR_SYSTEM_MESSAGE } from '@/agents/no-music-pipeline/merged-vision-director';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, noMusicUserContext } = body;

    if (!userInput) {
      return NextResponse.json(
        { error: 'Missing userInput' },
        { status: 400 }
      );
    }

    // Get the model configuration - support testing mode switching
    const testMode = request.headers.get('X-Test-Mode'); // 'thinking' | 'regular'
    let modelName;
    
    if (testMode === 'thinking') {
      modelName = 'google/gemini-2.5-flash-preview-05-20:thinking';
    } else if (testMode === 'regular') {
      modelName = 'google/gemini-2.5-flash-preview-05-20';
    } else {
      modelName = process.env.NO_MUSIC_MODEL || 'google/gemini-2.5-flash-preview-05-20';
    }
    
    console.log(`🧠 Using model: ${modelName} (test mode: ${testMode || 'default'})`);
    
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Prepare the request for the LLM
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: MERGED_VISION_DIRECTOR_SYSTEM_MESSAGE
        },
        {
          role: 'user',
          content: JSON.stringify({
            userInput,
            noMusicUserContext
          })
        }
      ],
      temperature: 0.7,
      max_tokens: 20000
    };

    // Make request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo No-Music Merged Vision+Director Agent'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API Error:', response.status, errorText);
      throw new Error(`LLM API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    const content = data.choices[0].message.content;
    
    // Parse the JSON response with enhanced error recovery
    let parsedResponse;
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanedResponse = content.trim();
      
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON. Content length:', content.length);
      console.error('First 1000 chars:', content.substring(0, 1000));
      console.error('Last 1000 chars:', content.substring(Math.max(0, content.length - 1000)));
      console.error('Parse error:', parseError);
      
      // Try to extract JSON from the content if it's wrapped in text
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          parsedResponse = JSON.parse(extractedJson);
          console.log('Successfully recovered JSON from wrapped content');
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (recoveryError) {
        console.error('JSON recovery also failed:', recoveryError);
        throw new Error(`Invalid JSON response from merged vision+director agent: ${parseError}`);
      }
    }

    // Validate the response structure
    if (!parsedResponse.success || !parsedResponse.merged_vision_director_output) {
      throw new Error('Invalid response structure from merged vision+director agent');
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error in merged vision+director agent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process merged vision+director request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}