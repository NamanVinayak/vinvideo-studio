import { NextResponse } from 'next/server';
import { PIPELINE_ROUTER_SYSTEM_MESSAGE } from '@/agents/infrastructure/pipeline-router';

/**
 * Universal Pipeline Router API endpoint
 * Detects video type from user conversation and routes to appropriate pipeline
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userInput, conversationHistory, sessionContext } = body;
    
    // Validate required inputs
    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json({ 
        error: 'User input is required and must be a string' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Universal Pipeline Router...');
    console.log(`User input: "${userInput.substring(0, 100)}..."`);
    
    // Prepare the user content message with context
    const userContent = buildRouterUserContent(userInput, conversationHistory, sessionContext);

    // Create the request payload for OpenRouter
    const payload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system",
          content: PIPELINE_ROUTER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 3000,
      temperature: 0.1,           // Low creativity - focus on accurate detection
      top_p: 0.3,                // Focused analysis
      frequency_penalty: 0.1,     // Slight penalty for repetitive analysis
      presence_penalty: 0,        // No penalty for consistent terminology
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
        'X-Title': 'VinVideo Connected - Pipeline Router'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Pipeline Router via OpenRouter...');
    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || `DeepSeek API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('Pipeline Router response received');

    // Extract the response content
    const routerResponse = result.choices[0]?.message?.content;
    
    if (!routerResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = routerResponse.trim();
      
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response
      const routingAnalysis = JSON.parse(cleanedResponse);
      
      // Validate and enhance the routing decision
      const enhancedRouting = enhanceRoutingDecision(routingAnalysis, userInput);
      
      // Prepare next step instructions
      const nextSteps = prepareNextSteps(enhancedRouting);

      return NextResponse.json({
        success: true,
        routing_analysis: enhancedRouting,
        next_steps: nextSteps,
        executionTime,
        rawResponse: routerResponse,
        usage: result.usage
      });
      
    } catch (parseError) {
      console.error('Failed to parse pipeline router response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: routerResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in pipeline-router endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Build user content for pipeline router with conversation context
 */
function buildRouterUserContent(userInput: string, conversationHistory?: any[], sessionContext?: any): string {
  let content = `UNIVERSAL PIPELINE ROUTER - ANALYZE USER INTENT

USER INPUT TO ANALYZE:
"${userInput}"

TASK: Detect what type of video the user wants to create and route to appropriate pipeline.

AVAILABLE PIPELINES:
1. MUSIC VIDEO PIPELINE (Currently Implemented)
   - Music-driven content with audio-visual synchronization
   - Beat-aligned cuts and rhythm-based visuals
   - Music analysis drives all creative decisions

2. PURE VISUAL CONTENT PIPELINE (Future - Not Yet Implemented)
   - Visual storytelling without music focus
   - Silent or ambient-only content

3. ABSTRACT ART VIDEOS PIPELINE (Future - Not Yet Implemented) 
   - Experimental, artistic, avant-garde content

4. PRODUCT SHOWCASE PIPELINE (Future - Not Yet Implemented)
   - Commercial, marketing, product demonstrations

DETECTION PRIORITY:
- If user mentions music, audio, songs, beats, rhythm → MUSIC VIDEO PIPELINE
- If user wants audio-visual sync → MUSIC VIDEO PIPELINE  
- If no music mentioned but has visual story → PURE VISUAL (explain not implemented)
- If abstract/experimental → ABSTRACT ART (explain not implemented)
- If commercial/product → PRODUCT SHOWCASE (explain not implemented)

REQUIREMENT EXTRACTION:
For detected pipeline, extract all possible requirements from user input:
- Core concept/theme
- Content type (abstract vs narrative)
- Pacing preferences
- Style hints
- Duration preferences
- Music preferences (if music video)
- Quality expectations`;

  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory
      .slice(-3)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    content += `\n\nCONVERSATION HISTORY:\n${recentHistory}`;
  }

  if (sessionContext) {
    content += `\n\nSESSION CONTEXT:\n${JSON.stringify(sessionContext, null, 2)}`;
  }

  content += `\n\nGenerate the complete pipeline routing analysis as JSON only.`;

  return content;
}

/**
 * Enhance routing decision with validation and improvements
 */
function enhanceRoutingDecision(routingAnalysis: any, userInput: string): any {
  const enhanced = { ...routingAnalysis };
  
  // Validate confidence scores
  if (!enhanced.pipeline_detection) {
    enhanced.pipeline_detection = {
      music_video_score: 0,
      confidence_level: 'low',
      detected_pipeline: 'unclear'
    };
  }
  
  // Add input analysis
  enhanced.input_analysis = {
    input_length: userInput.length,
    specificity_score: calculateSpecificityScore(userInput),
    music_keywords_found: containsMusicKeywords(userInput),
    concept_clarity: assessConceptClarity(userInput)
  };
  
  // Ensure routing decision exists
  if (!enhanced.routing_decision) {
    enhanced.routing_decision = {
      action: 'request_clarification',
      confidence_score: 0,
      entry_stage: 'vision_understanding'
    };
  }
  
  return enhanced;
}

/**
 * Prepare next steps based on routing decision
 */
function prepareNextSteps(routingAnalysis: any): any {
  const { routing_decision, pipeline_detection } = routingAnalysis;
  
  if (routing_decision.action === 'route_to_pipeline') {
    if (pipeline_detection.detected_pipeline === 'music_video') {
      return {
        immediate_action: 'proceed_to_music_video_pipeline',
        api_endpoint: '/api/vision-understanding',
        required_data: routingAnalysis.extracted_requirements,
        expected_flow: 'Stage 1 → Music Analysis → Producer → Director → Images'
      };
    } else {
      return {
        immediate_action: 'explain_pipeline_not_implemented',
        detected_type: pipeline_detection.detected_pipeline,
        available_alternative: 'music_video',
        suggestion: 'Consider how your concept could work with music'
      };
    }
  } else if (routing_decision.action === 'clarify_then_route') {
    return {
      immediate_action: 'ask_clarification',
      clarification_needed: routingAnalysis.user_response_needed.clarification_question,
      likely_destination: routing_decision.target_pipeline,
      next_attempt: 'retry_routing_after_clarification'
    };
  } else {
    return {
      immediate_action: 'request_more_information',
      guidance: routingAnalysis.user_response_needed.clarification_question,
      examples: routingAnalysis.user_response_needed.clarification_examples || [],
      help_text: 'Please provide more details about your video concept'
    };
  }
}

/**
 * Helper functions for input analysis
 */
function calculateSpecificityScore(input: string): number {
  const specificWords = ['specific', 'particular', 'exactly', 'precisely'];
  const generalWords = ['something', 'anything', 'maybe', 'cool', 'nice'];
  
  const specificCount = specificWords.filter(word => 
    input.toLowerCase().includes(word)
  ).length;
  
  const generalCount = generalWords.filter(word => 
    input.toLowerCase().includes(word)
  ).length;
  
  return Math.max(0, Math.min(1, (specificCount - generalCount + input.length / 100) / 5));
}

function containsMusicKeywords(input: string): boolean {
  const musicKeywords = [
    'music', 'song', 'audio', 'beat', 'rhythm', 'sync', 'sound', 
    'track', 'melody', 'tempo', 'bpm', 'musical', 'soundtrack'
  ];
  
  return musicKeywords.some(keyword => 
    input.toLowerCase().includes(keyword)
  );
}

function assessConceptClarity(input: string): 'high' | 'medium' | 'low' {
  if (input.length < 20) return 'low';
  if (input.includes('something') || input.includes('anything')) return 'low';
  if (input.length > 50 && !input.includes('maybe')) return 'high';
  return 'medium';
}

/**
 * GET endpoint to retrieve available pipelines and examples
 */
export async function GET() {
  try {
    const pipelineInfo = {
      available_pipelines: {
        music_video: {
          name: 'Music Video Pipeline',
          status: 'implemented',
          description: 'Music-driven content with audio-visual synchronization',
          triggers: ['music', 'song', 'audio', 'beat', 'rhythm', 'sync'],
          examples: [
            'Create a music video about urban isolation',
            'Sync visuals with this ambient track',
            'Music-driven video about technology anxiety'
          ]
        },
        pure_visual: {
          name: 'Pure Visual Content Pipeline',
          status: 'planned',
          description: 'Visual storytelling without music focus',
          triggers: ['visual story', 'silent', 'no music', 'visual narrative'],
          examples: [
            'Visual story about morning routine',
            'Silent film about urban life',
            'Visual narrative without audio'
          ]
        },
        abstract_art: {
          name: 'Abstract Art Videos Pipeline',
          status: 'planned',
          description: 'Experimental, artistic, avant-garde content',
          triggers: ['abstract', 'artistic', 'experimental', 'avant-garde'],
          examples: [
            'Abstract exploration of emotions',
            'Experimental art piece',
            'Avant-garde visual expression'
          ]
        },
        product_showcase: {
          name: 'Product Showcase Pipeline',
          status: 'planned',
          description: 'Commercial, marketing, product demonstrations',
          triggers: ['product', 'commercial', 'marketing', 'showcase', 'demo'],
          examples: [
            'Product demonstration video',
            'Commercial for new app',
            'Marketing showcase content'
          ]
        }
      },
      routing_examples: {
        music_video_routing: [
          'Input: "Music video about loneliness" → Music Video Pipeline',
          'Input: "Sync visuals to this song" → Music Video Pipeline',
          'Input: "Beat-driven urban content" → Music Video Pipeline'
        ],
        clarification_needed: [
          'Input: "Make something cool" → Request clarification',
          'Input: "Video about life" → Ask for specifics',
          'Input: "Creative content" → Request video type'
        ]
      }
    };

    return NextResponse.json({
      success: true,
      pipeline_info: pipelineInfo
    });

  } catch (error: unknown) {
    console.error('Error retrieving pipeline info:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}