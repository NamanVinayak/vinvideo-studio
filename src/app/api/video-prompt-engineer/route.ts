import { NextResponse } from 'next/server';
import { VIDEO_PROMPT_ENGINEER_SYSTEM_MESSAGE } from '@/agents/videoPromptEngineer';

/**
 * Video Prompt Engineer API endpoint for Music Video Pipeline Stage 8
 * Generates specialized video prompts for image-to-video conversion
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      approvedImages, 
      qwenVlAnalysis, 
      directorBeats, 
      dopSpecs, 
      originalImagePrompts 
    } = body;
    
    // Validate required inputs
    if (!approvedImages || !directorBeats || !dopSpecs) {
      return NextResponse.json({ 
        error: 'Approved images, director beats, and DoP specs are required' 
      }, { status: 400 });
    }

    if (approvedImages.length !== directorBeats.length || directorBeats.length !== dopSpecs.length) {
      return NextResponse.json({ 
        error: 'Mismatch in input array lengths - all arrays must have same length' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key is not configured' 
      }, { status: 500 });
    }
    
    console.log('Calling Video Prompt Engineer Agent...');
    console.log(`Processing ${approvedImages.length} images for video prompt generation`);
    
    // Prepare the user content message with all required context
    const userContent = `MUSIC VIDEO PIPELINE - STAGE 8: VIDEO PROMPT GENERATION

APPROVED IMAGES (from Stage 7):
${JSON.stringify(approvedImages, null, 2)}

QWEN VL ANALYSIS (image content understanding):
${JSON.stringify(qwenVlAnalysis || [], null, 2)}

DIRECTOR BEATS (creative vision for each image):
${JSON.stringify(directorBeats, null, 2)}

DOP SPECIFICATIONS (movement and cinematography):
${JSON.stringify(dopSpecs, null, 2)}

ORIGINAL IMAGE PROMPTS (creation context):
${JSON.stringify(originalImagePrompts || [], null, 2)}

TASK: Generate video prompts for image-to-video conversion. For each approved image:

1. ANALYZE IMAGE CONTEXT:
   - Extract moveable elements from QWEN VL analysis
   - Understand what's actually in each image
   - Identify movement constraints and opportunities

2. EXTRACT MOVEMENT INTENT:
   - Creative movement from Director's vision
   - Technical movement from DoP specifications  
   - Element-specific choreography possibilities

3. CONSTRUCT VIDEO PROMPTS:
   - Combine creative vision + technical specs + image reality
   - Create actionable movement descriptions
   - Preserve original image style and quality
   - Specify duration and technical requirements

4. VALIDATE AND OPTIMIZE:
   - Ensure prompts match Director's creative intent
   - Verify alignment with DoP's movement specs
   - Confirm compatibility with actual image content
   - Optimize for technical feasibility

Generate ${approvedImages.length} video prompts as JSON only.`;

    // Create the request payload for OpenRouter
    const payload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system",
          content: VIDEO_PROMPT_ENGINEER_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent
        }
      ],
      max_tokens: 6000,
      temperature: 0.1,           // Low creativity - focus on accurate technical translation
      top_p: 0.3,                // Focused on most relevant prompt construction approaches
      frequency_penalty: 0.1,     // Slight penalty to avoid repetitive movement descriptions
      presence_penalty: 0,        // No penalty for consistent technical terminology
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
        'X-Title': 'VinVideo Connected - Video Prompt Engineer'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Video Prompt Engineer via OpenRouter...');
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
        error: errorData.error?.message || `DeepSeek API error: ${response.status}`,
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('Video Prompt Engineer response received');

    // Extract the response content
    const engineerResponse = result.choices[0]?.message?.content;
    
    if (!engineerResponse) {
      return NextResponse.json({
        error: 'No content in response',
        details: result
      }, { status: 500 });
    }

    // Process the response
    try {
      // Clean the response by removing markdown code blocks
      let cleanedResponse = engineerResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(7, -3).trim();
      } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3, -3).trim();
      }
      
      // Try to parse the cleaned JSON response
      const videoPrompts = JSON.parse(cleanedResponse);
      
      // Validate prompt count matches input images
      const expectedPrompts = approvedImages.length;
      const actualPrompts = videoPrompts.video_prompts ? videoPrompts.video_prompts.length : 0;
      
      if (actualPrompts !== expectedPrompts) {
        console.warn(`Video prompt count mismatch: expected ${expectedPrompts}, got ${actualPrompts}`);
      }

      // Calculate overall validation scores
      const overallValidation = {
        expectedPrompts,
        actualPrompts,
        promptCountMatch: actualPrompts === expectedPrompts,
        avgDirectorAlignment: calculateAverageScore(videoPrompts.video_prompts, 'director_alignment'),
        avgDopAlignment: calculateAverageScore(videoPrompts.video_prompts, 'dop_alignment'),
        avgImageCompatibility: calculateAverageScore(videoPrompts.video_prompts, 'image_compatibility'),
        avgTechnicalFeasibility: calculateAverageScore(videoPrompts.video_prompts, 'technical_feasibility')
      };

      return NextResponse.json({
        success: true,
        stage8_video_prompts: videoPrompts,
        executionTime,
        validation: overallValidation,
        rawResponse: engineerResponse,
        usage: result.usage,
        ready_for_image_to_video: actualPrompts === expectedPrompts
      });
      
    } catch (parseError) {
      console.error('Failed to parse video prompt engineer response as JSON:', parseError);
      return NextResponse.json({
        success: true,
        rawResponse: engineerResponse,
        executionTime,
        warning: 'Response could not be parsed as JSON',
        usage: result.usage
      });
    }

  } catch (error: unknown) {
    console.error('Error in video-prompt-engineer endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Helper function to calculate average validation scores
 */
function calculateAverageScore(prompts: any[], scoreField: string): number {
  if (!prompts || prompts.length === 0) return 0;
  
  const scores = prompts
    .map(prompt => prompt.validation_scores?.[scoreField])
    .filter(score => typeof score === 'number');
  
  if (scores.length === 0) return 0;
  
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 100) / 100; // Round to 2 decimal places
}