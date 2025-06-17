import { NextResponse } from 'next/server';
import { AUDIO_VISION_UNDERSTANDING_SYSTEM_MESSAGE } from '@/agents/visionUnderstandingWithAudio';
import type { UserContext } from '@/types/userContext';

/**
 * Audio-Enhanced Vision Understanding Agent API
 * Specifically designed for the test-tts pipeline where audio/narration will be generated
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userInput, additionalContext, userContext } = body as { 
      userInput?: string; 
      additionalContext?: any; 
      userContext?: UserContext;
    };
    
    // Use userContext if provided, otherwise fall back to legacy format
    const concept = userContext?.originalPrompt || userInput;
    
    // Validate required inputs
    if (!concept || !concept.trim()) {
      return NextResponse.json({ 
        error: 'User input is required for vision analysis' 
      }, { status: 400 });
    }

    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Audio-Enhanced Vision Understanding Agent...');
    console.log('UserContext provided:', !!userContext);
    
    // Merge contexts - userContext takes precedence
    const mergedContext = userContext ? {
      stylePreferences: {
        pacing: userContext.settings.pacing,
        visualStyle: userContext.settings.visualStyle,
        duration: userContext.settings.duration
      },
      technicalRequirements: {
        contentType: userContext.settings.contentType || 'general'
      },
      audioContext: {
        willHaveNarration: true,
        narrativeStyle: 'emotional_storytelling',
        ttsOptimization: true
      }
    } : additionalContext;
    
    // Prepare user content with audio context emphasis
    const userContent = `AUDIO-ENHANCED PIPELINE - STAGE 1: VISION UNDERSTANDING FOR NARRATED CONTENT
    
    USER CONCEPT INPUT:
    "${concept}"
    
    ADDITIONAL CONTEXT:
    ${JSON.stringify(mergedContext, null, 2)}
    
    ${userContext ? `USER REQUIREMENTS:
    - Requested Duration: ${userContext.settings.duration} seconds (MUST be respected)
    - Pacing Preference: ${userContext.settings.pacing}
    - Visual Style: ${userContext.settings.visualStyle}
    - Content Type: ${userContext.settings.contentType || 'general'}
    ` : ''}
    
    CRITICAL CONTEXT: This vision will be accompanied by NARRATED AUDIO generated from your core concept.
    
    TASK: Analyze the user's concept and create a vision document optimized for audio-visual experiences.
    
    Key considerations:
    1. The core concept will be spoken aloud by a TTS system
    2. The Producer Agent will handle timing based on actual speech analysis
    3. Emotional arc should build like a spoken story
    4. Concepts should sound as compelling as they look
    5. Consider how narration will enhance each visual moment
    
    AUDIO-SPECIFIC REQUIREMENTS:
    - Core concept must be "speakable" and sound powerful when narrated
    - Visual complexity should not compete with audio narration
    - Emotion arc should translate well to vocal performance
    - Focus on creating content that invites expressive narration
    
    IMPORTANT: Do NOT create timing or cut points. The Producer Agent will:
    - Analyze the actual audio transcript with word timestamps
    - Find natural pauses and breathing points in the speech
    - Create cut points based on real speech rhythm
    - Ensure cuts align with the flow of narration
    
    Return complete vision document with audio optimization as JSON only.`;

    // EXACT OpenRouter payload structure
    const payload = {
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      messages: [
        {
          role: "system",
          content: AUDIO_VISION_UNDERSTANDING_SYSTEM_MESSAGE
        },
        {
          role: "user", 
          content: userContent
        }
      ],
      max_tokens: 12000,          // Increased for enhanced agent instructions output
      temperature: 0.3,           // Slightly higher for creative audio concepts
      top_p: 0.5,                 // Balanced for audio-visual creativity
      stream: false
    };

    // EXACT OpenRouter request structure
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - Audio Vision Understanding'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Audio-Enhanced Vision Understanding Agent via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || `API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const agentResponse = result.choices[0]?.message?.content;
    
    if (!agentResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    console.log('Raw agent response length:', agentResponse.length);
    console.log('First 500 chars of response:', agentResponse.substring(0, 500));

    // Parse the JSON response
    try {
      let cleanedResponse = agentResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Parse the cleaned JSON
      const parsedOutput = JSON.parse(cleanedResponse);
      
      // Enhanced debugging for agent instructions
      console.log('🔍 VISION AGENT OUTPUT DEBUG:');
      console.log('- Full output keys:', Object.keys(parsedOutput));
      console.log('- stage1_vision_analysis keys:', Object.keys(parsedOutput.stage1_vision_analysis || {}));
      console.log('- agent_instructions present:', !!parsedOutput.stage1_vision_analysis?.agent_instructions);
      console.log('- detected_artistic_style:', parsedOutput.stage1_vision_analysis?.vision_document?.detected_artistic_style);
      
      // Log sample of each agent instruction
      if (parsedOutput.stage1_vision_analysis?.agent_instructions) {
        const instructions = parsedOutput.stage1_vision_analysis.agent_instructions;
        console.log('\n📋 AGENT INSTRUCTIONS SAMPLE:');
        if (instructions.producer_instructions) {
          console.log('- Producer target_cut_timing:', instructions.producer_instructions.target_cut_timing);
        }
        if (instructions.director_instructions) {
          console.log('- Director scene_philosophy:', instructions.director_instructions.scene_direction_philosophy?.substring(0, 100) + '...');
        }
        if (instructions.dop_instructions) {
          console.log('- DoP artistic_style_support:', instructions.dop_instructions.artistic_style_support);
        }
        if (instructions.prompt_engineer_instructions) {
          console.log('- Prompt Engineer artistic_enforcement:', instructions.prompt_engineer_instructions.artistic_style_enforcement);
        }
      }

      // Validate essential outputs for enhanced audio pipeline
      const validation = {
        hasVisionDocument: !!parsedOutput.stage1_vision_analysis?.vision_document,
        hasAudioOptimization: !!parsedOutput.stage1_vision_analysis?.audio_optimization,
        hasNarrationOptimization: !!parsedOutput.stage1_vision_analysis?.vision_document?.narration_optimization,
        hasAgentInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions,
        hasProducerInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.producer_instructions,
        hasDirectorInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.director_instructions,
        hasDopInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.dop_instructions,
        hasPromptEngineerInstructions: !!parsedOutput.stage1_vision_analysis?.agent_instructions?.prompt_engineer_instructions,
        hasDetectedArtisticStyle: !!parsedOutput.stage1_vision_analysis?.vision_document?.detected_artistic_style,
        pipelineReady: parsedOutput.pipeline_ready === true
      };
      
      console.log('📊 VISION AGENT VALIDATION:', validation);
      
      return NextResponse.json({
        success: true,
        stage1_vision_analysis: parsedOutput.stage1_vision_analysis,
        executionTime,
        validation,
        rawResponse: agentResponse,
        usage: result.usage,
        pipeline_ready: parsedOutput.pipeline_ready,
        needs_clarification: parsedOutput.needs_clarification || false,
        pipeline_type: 'audio_enhanced'
      });
      
    } catch (parseError) {
      console.error('Failed to parse agent response as JSON:', parseError);
      
      // Return error with raw response for debugging
      return NextResponse.json({
        success: false,
        error: `Could not parse agent response: ${parseError}`,
        rawResponse: agentResponse,
        executionTime,
        usage: result.usage
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error in audio-vision-understanding endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}