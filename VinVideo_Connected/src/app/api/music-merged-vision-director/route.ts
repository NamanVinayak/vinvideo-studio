import { NextRequest, NextResponse } from 'next/server';
import { MERGED_MUSIC_VISION_DIRECTOR_SYSTEM_MESSAGE } from '@/agents/music-pipeline/merged-music-vision-director';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userInput, 
      musicAnalysis, 
      producerCutPoints, 
      musicUserContext,
      originalFormData 
    } = body;

    if (!userInput) {
      return NextResponse.json(
        { error: 'Missing userInput' },
        { status: 400 }
      );
    }

    if (!musicAnalysis) {
      return NextResponse.json(
        { error: 'Missing musicAnalysis' },
        { status: 400 }
      );
    }

    if (!producerCutPoints) {
      return NextResponse.json(
        { error: 'Missing producerCutPoints' },
        { status: 400 }
      );
    }

    // Get the model configuration
    const modelName = process.env.MUSIC_MERGED_MODEL || 'google/gemini-2.5-pro';
    
    console.log(`🎵 Music Merged Vision+Director using model: ${modelName}`);
    console.log(`📊 Input summary:`, {
      userInputLength: userInput.length,
      hasMusicAnalysis: !!musicAnalysis,
      cutPointsCount: producerCutPoints?.length || 0,
      hasMusicUserContext: !!musicUserContext
    });
    
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Prepare the comprehensive input for the merged agent
    const mergedInput = {
      userInput,
      musicAnalysis,
      producerCutPoints,
      musicUserContext: musicUserContext || null,
      additionalContext: {
        stylePreferences: originalFormData || {},
        cutPointCount: producerCutPoints?.length || 0,
        musicDuration: musicAnalysis?.duration || 60
      }
    };

    // Prepare the request for the LLM
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: MERGED_MUSIC_VISION_DIRECTOR_SYSTEM_MESSAGE
        },
        {
          role: 'user',
          content: JSON.stringify(mergedInput)
        }
      ],
      temperature: 0.7,
      max_tokens: 25000, // Increased for comprehensive output
      top_p: 0.9
      // Note: frequency_penalty and presence_penalty removed - not supported by Gemini model
    };

    // Make request to OpenRouter
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Music Merged Vision+Director Agent'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API Error:', response.status, errorText);
      throw new Error(`LLM API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;
    
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
      
      // Attempt recovery by extracting JSON-like content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log('Successfully recovered JSON from response');
        } catch (recoveryError) {
          console.error('JSON recovery failed:', recoveryError);
          
          // Return a structured error response
          return NextResponse.json({
            success: false,
            error: 'Failed to parse agent response',
            rawResponse: content,
            executionTime,
            fallback_used: true,
            merged_music_vision_director_output: {
              vision_document: {
                core_concept: userInput,
                emotion_arc: ["anticipation", "energy", "climax", "resolution"],
                pacing: "medium",
                visual_style: "cinematic",
                detected_artistic_style: "not_mentioned",
                duration_s: 60,
                content_classification: { type: "abstract_thematic" },
                music_mood_hints: ["rhythmic", "dynamic"],
                visual_complexity: "moderate",
                color_philosophy: "Dynamic colors that pulse with the music"
              },
              director_output: {
                visual_beats: producerCutPoints.map((cut: any, index: number) => ({
                  beat_no: index + 1,
                  timecode_start: cut.cut_time_s ? `00:00:${String(Math.floor(cut.cut_time_s)).padStart(2, '0')}.000` : "00:00:00.000",
                  estimated_duration_s: cut.duration || 3,
                  content_type_treatment: "Musical visual exploration",
                  primary_subject: "Abstract visuals",
                  repetition_check: "unique",
                  musical_sync: {
                    beat_alignment: "Synchronized with beat",
                    tone_alignment: "Matching musical energy",
                    user_pacing_adaptation: "Following user preference"
                  }
                }))
              }
            }
          });
        }
      } else {
        throw new Error('Could not extract valid JSON from response');
      }
    }

    // Validate the parsed response has expected structure
    if (!parsedResponse.merged_music_vision_director_output) {
      console.error('Response missing merged_music_vision_director_output');
      parsedResponse.merged_music_vision_director_output = {
        vision_document: parsedResponse.vision_document || {},
        director_output: parsedResponse.director_output || {}
      };
    }

    // Add metadata to the response
    const finalResponse = {
      success: true,
      ...parsedResponse,
      executionTime,
      rawResponse: content,
      metadata: {
        modelUsed: modelName,
        inputCutPoints: producerCutPoints?.length || 0,
        outputBeats: parsedResponse.merged_music_vision_director_output?.director_output?.visual_beats?.length || 0
      }
    };

    console.log(`✅ Music Merged Vision+Director completed in ${executionTime}ms`);
    console.log(`📊 Output summary:`, {
      hasVisionDocument: !!finalResponse.merged_music_vision_director_output?.vision_document,
      hasDirectorOutput: !!finalResponse.merged_music_vision_director_output?.director_output,
      visualBeatsCount: finalResponse.merged_music_vision_director_output?.director_output?.visual_beats?.length || 0,
      hasAgentInstructions: !!finalResponse.merged_music_vision_director_output?.agent_instructions
    });

    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('Music Merged Vision+Director Agent Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }, { 
      status: 500 
    });
  }
}