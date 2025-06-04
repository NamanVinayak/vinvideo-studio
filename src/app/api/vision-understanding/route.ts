import { NextResponse } from 'next/server';
import { VISION_UNDERSTANDING_SYSTEM_MESSAGE } from '@/agents/visionUnderstanding';

/**
 * Vision Understanding Agent API endpoint for Music Video Pipeline Stage 1
 * Extracts comprehensive creative vision from user conversations and concepts
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userInput, conversationHistory, additionalContext } = body;
    
    // Validate required inputs
    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json({ 
        error: 'User input is required and must be a string' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter DeepSeek API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Vision Understanding Agent...');
    console.log(`User input preview: ${userInput.substring(0, 100)}...`);
    
    // Prepare the user content message with all available context
    const contextualInput = buildContextualInput(userInput, conversationHistory, additionalContext);
    
    const userContent = `MUSIC VIDEO PIPELINE - STAGE 1: VISION UNDERSTANDING

USER INPUT TO ANALYZE:
"${userInput}"

${conversationHistory ? `CONVERSATION HISTORY:
${JSON.stringify(conversationHistory, null, 2)}` : ''}

${additionalContext ? `ADDITIONAL CONTEXT:
${JSON.stringify(additionalContext, null, 2)}` : ''}

TASK: Extract comprehensive creative vision from the user input. Your analysis must:

IMPORTANT: Use the duration specified in "technicalRequirements" as the authoritative duration, regardless of any timing references in the user concept text.

1. CONCEPT EXTRACTION:
   - Identify the core creative concept with specificity
   - Assess concept complexity and creative potential
   - Classify as abstract/thematic vs narrative/character content

2. EMOTIONAL & NARRATIVE MAPPING:
   - Map the emotional journey arc (3-5 emotions)
   - Determine narrative progression structure
   - Assess emotional intensity requirements

3. TECHNICAL ANALYSIS:
   - Infer or extract duration preferences
   - Determine pacing style (contemplative/moderate/dynamic)
   - Assess visual complexity needs

4. STYLE & MUSIC GUIDANCE:
   - Categorize visual style approach
   - Extract music mood hints from concept
   - Determine energy and sync requirements

5. INPUT VALIDATION:
   - Check if user input is sufficient for pipeline
   - If insufficient or vague, provide specific clarification question
   - Never proceed with unclear concepts

CRITICAL: If the user input is too vague (like "something cool", "make a video", etc.), you MUST request specific clarification rather than guessing or proceeding.

Generate the complete vision analysis as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system",
          content: VISION_UNDERSTANDING_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,           // Low creativity - focus on accurate analysis
      top_p: 0.4,                // Focused analysis approach
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
        'X-Title': 'VinVideo Connected - Vision Understanding Agent (DeepSeek R1)'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Vision Understanding Agent via OpenRouter...');
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
    console.log('Vision Understanding response received');

    // Extract the response content
    const visionResponse = result.choices[0]?.message?.content;
    
    if (!visionResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = visionResponse.trim();
      
      // Log the raw response for debugging
      console.log('Raw Vision Understanding response:', visionResponse.substring(0, 500) + '...');
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      console.log('Cleaned response:', cleanedResponse.substring(0, 500) + '...');
      
      // Try to parse the cleaned JSON response
      const visionAnalysis = JSON.parse(cleanedResponse);
      
      // Validate the vision analysis structure
      const validation = validateVisionAnalysis(visionAnalysis);
      console.log('Validation result:', validation);
      console.log('Vision analysis structure:', JSON.stringify(visionAnalysis, null, 2));
      
      // Check if clarification is needed
      const needsClarification = visionAnalysis.stage1_vision_analysis?.requires_user_clarification && 
                                visionAnalysis.stage1_vision_analysis.requires_user_clarification.trim().length > 0;

      return NextResponse.json({
        success: true,
        stage1_vision_analysis: visionAnalysis.stage1_vision_analysis || visionAnalysis,
        executionTime,
        validation,
        needs_clarification: needsClarification,
        pipeline_ready: !needsClarification && validation.isValid,
        rawResponse: visionResponse,
        usage: result.usage
      });
      
    } catch (parseError) {
      console.error('Failed to parse vision understanding response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: visionResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in vision-understanding endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Build contextual input from user input and conversation history
 */
function buildContextualInput(userInput: string, conversationHistory?: any[], additionalContext?: any): string {
  let contextualInput = userInput;
  
  if (conversationHistory && conversationHistory.length > 0) {
    const recentContext = conversationHistory
      .slice(-3) // Last 3 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    contextualInput += `\n\nRECENT CONVERSATION:\n${recentContext}`;
  }
  
  if (additionalContext) {
    if (additionalContext.stylePreferences) {
      contextualInput += `\n\nSTYLE PREFERENCES: ${JSON.stringify(additionalContext.stylePreferences)}`;
    }
    if (additionalContext.technicalRequirements) {
      contextualInput += `\n\nTECHNICAL REQUIREMENTS: ${JSON.stringify(additionalContext.technicalRequirements)}`;
    }
  }
  
  return contextualInput;
}

/**
 * Validate the vision analysis structure and completeness
 */
function validateVisionAnalysis(analysis: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check required top-level fields according to system message structure
  if (!analysis.stage1_vision_analysis) {
    issues.push('Missing stage1_vision_analysis');
    return { isValid: false, issues };
  }
  
  if (!analysis.stage1_vision_analysis.vision_document) {
    issues.push('Missing vision_document');
  }
  
  if (!analysis.stage1_vision_analysis.user_input_validation) {
    issues.push('Missing user_input_validation');
  }
  
  // Check vision document required fields
  if (analysis.stage1_vision_analysis.vision_document) {
    const visionDoc = analysis.stage1_vision_analysis.vision_document;
    
    if (!visionDoc.core_concept || visionDoc.core_concept.trim().length < 5) {
      issues.push('Core concept is missing or too short');
    }
    
    if (!visionDoc.content_classification || !visionDoc.content_classification.type) {
      issues.push('Content classification is missing');
    }
    
    if (!visionDoc.emotion_arc || !Array.isArray(visionDoc.emotion_arc) || visionDoc.emotion_arc.length < 3) {
      issues.push('Emotion arc is missing or insufficient');
    }
    
    if (!visionDoc.pacing || !['contemplative', 'moderate', 'dynamic'].includes(visionDoc.pacing)) {
      issues.push('Invalid or missing pacing preference');
    }
    
    if (!visionDoc.music_mood_hints || !Array.isArray(visionDoc.music_mood_hints) || visionDoc.music_mood_hints.length === 0) {
      issues.push('Music mood hints are missing');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * GET endpoint to retrieve conversation templates and examples
 */
export async function GET() {
  try {
    const templates = {
      conversation_starters: [
        {
          category: 'Abstract/Thematic',
          examples: [
            'Urban isolation in a bustling city - the feeling of being alone among millions',
            'Technology anxiety - how our devices overwhelm us in modern life',
            'The psychology of social media addiction and digital validation',
            'Corporate power structures and their impact on individual identity'
          ]
        },
        {
          category: 'Narrative/Character',
          examples: [
            'A day following Maya, a young artist, through the streets of Vancouver',
            'Morning routine of a remote worker in their small apartment',
            'A person\'s journey from anxiety to confidence during a job interview',
            'Two friends reconnecting after years apart, walking through their old neighborhood'
          ]
        }
      ],
      clarification_prompts: {
        vague_concept: 'Can you be more specific about the theme or story? For example: "Urban loneliness" instead of "something about cities"',
        content_type: 'Is this about an abstract concept/theme, or does it involve specific characters in a story?',
        pacing: 'Do you prefer slow/contemplative pacing, moderate energy, or fast/dynamic cutting?',
        style: 'Any visual style in mind? (cinematic, documentary, artistic, experimental)',
        duration: 'How long should the video be? (30s, 60s, 90s, or custom duration)'
      },
      input_quality_tips: [
        'Be specific about emotions and themes',
        'Mention if characters are involved or if it\'s purely conceptual',
        'Include any style references or visual inspiration',
        'Specify pacing preferences (slow vs fast)',
        'Mention target duration if you have a preference'
      ]
    };

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error: unknown) {
    console.error('Error retrieving conversation templates:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}