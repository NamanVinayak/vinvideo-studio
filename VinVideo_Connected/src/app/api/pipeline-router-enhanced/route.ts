import { NextRequest, NextResponse } from 'next/server';
import { ENHANCED_PIPELINE_ROUTER_SYSTEM_MESSAGE } from '@/agents/enhancedPipelineRouter';

export async function POST(request: NextRequest) {
  try {
    const { conversation, userRequirements, context } = await request.json();
    
    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json(
        { error: 'Conversation array is required' },
        { status: 400 }
      );
    }

    console.log('Enhanced Pipeline Router: Analyzing conversation with', conversation.length, 'messages');
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not found');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Format conversation for analysis
    const conversationText = conversation
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
    
    const userMessage = `Analyze this conversation and bridge the gap between casual chat and pipeline requirements:

CONVERSATION HISTORY:
${conversationText}

${userRequirements ? `\nUSER REQUIREMENTS DETECTED SO FAR:\n${JSON.stringify(userRequirements, null, 2)}` : ''}

${context ? `\nUSER'S PRE-SELECTED PIPELINE TYPE: "${context.videoType}"

ROUTING RULES BASED ON SELECTION:
${context.videoType === 'music_only' ? `
✅ ROUTE TO: MUSIC_VIDEO pipeline
- User wants music-synchronized visuals without narration
- Extract: concept, style, pacing, duration
- No TTS generation needed` : ''}${context.videoType === 'pure_visuals' ? `
✅ ROUTE TO: NO_MUSIC_VIDEO pipeline  
- User wants purely visual content without audio
- Extract: concept, style, pacing, duration
- No music or narration` : ''}${context.videoType === 'voiceover_music' ? `
✅ ROUTE TO: Test TTS pipeline (choose sub-mode):
- SCRIPT_MODE: If user provided complete script text
- VISION_ENHANCED: If user provided concept/idea (most common)
- Extract: concept/script, style, pacing, duration` : ''}` : ''}

Your task: Extract the requirements from the conversation and format them correctly for the selected pipeline.

Provide your analysis and routing decision in the specified JSON format.`;

    const requestBody = {
      model: 'google/gemini-2.5-pro:thinking',
      messages: [
        { 
          role: 'system', 
          content: ENHANCED_PIPELINE_ROUTER_SYSTEM_MESSAGE 
        },
        { 
          role: 'user', 
          content: userMessage
        }
      ],
      temperature: 0.3,
      max_tokens: 9000,
    };

    console.log('Sending request with body:', JSON.stringify(requestBody).substring(0, 500) + '...');
    
    // Call Gemini 2.5 Flash Thinking
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'VinVideo Connected - Enhanced Pipeline Router'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const routerResponse = data.choices[0]?.message?.content;
    
    if (!routerResponse) {
      throw new Error('No response from router');
    }

    console.log('Raw router response length:', routerResponse.length);

    // Parse the response - Gemini thinking model may include thinking process
    let analysis;
    try {
      // First try to extract JSON from markdown code blocks
      const jsonCodeBlockMatch = routerResponse.match(/```json\s*([\s\S]*?)```/);
      if (jsonCodeBlockMatch) {
        const jsonContent = jsonCodeBlockMatch[1].trim();
        console.log('Found JSON in code block, attempting to parse...');
        analysis = JSON.parse(jsonContent);
      } else {
        // Try to find raw JSON object
        const jsonMatch = routerResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Found raw JSON, attempting to parse...');
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse router response:', parseError);
      // Attempt to extract JSON from the response
      const jsonMatch = routerResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          return NextResponse.json({
            error: 'Failed to parse router analysis',
            rawResponse: routerResponse
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          error: 'Invalid router response format',
          rawResponse: routerResponse
        }, { status: 500 });
      }
    }

    // Validate and prepare routing
    const routing = prepareRouting(analysis);
    
    return NextResponse.json({
      success: true,
      ...routing,
      executionTime: data.usage?.total_time || 0
    });

  } catch (error) {
    console.error('Error in enhanced pipeline router:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to analyze conversation for routing',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

function prepareRouting(analysis: any) {
  // Ensure all required fields exist
  if (!analysis.routing_decision) {
    throw new Error('No routing decision in analysis');
  }

  const { routing_decision, analysis: routingAnalysis } = analysis;
  
  // Build parameters based on pipeline type
  let parameters = {};
  
  switch (routing_decision.pipeline) {
    case 'SCRIPT_MODE':
      parameters = {
        script: routingAnalysis.extracted_requirements.finalized_script || '',
        conversationMode: 'true'
      };
      break;
      
    case 'VISION_ENHANCED':
      parameters = {
        concept: routingAnalysis.extracted_requirements.concept || '',
        style: routingAnalysis.extracted_requirements.style || 'cinematic',
        pacing: routingAnalysis.extracted_requirements.pacing || 'moderate',
        duration: routingAnalysis.extracted_requirements.duration || 30,
        conversationMode: 'true',
        useVisionMode: 'true'
      };
      break;
      
    case 'MUSIC_VIDEO':
      parameters = {
        concept: routingAnalysis.extracted_requirements.concept || '',
        contentType: routingAnalysis.extracted_requirements.has_narration === false ? 'abstract_thematic' : 'narrative_character',
        pacing: routingAnalysis.extracted_requirements.pacing || 'dynamic',
        style: routingAnalysis.extracted_requirements.style || 'cinematic',
        duration: routingAnalysis.extracted_requirements.duration || 60,
        musicPreference: 'auto',
        conversationMode: 'true'
      };
      break;
      
    case 'NO_MUSIC_VIDEO':
      parameters = {
        concept: routingAnalysis.extracted_requirements.concept || '',
        style: routingAnalysis.extracted_requirements.style || 'artistic',
        pacing: routingAnalysis.extracted_requirements.pacing || 'contemplative',
        duration: routingAnalysis.extracted_requirements.duration || 30,
        contentType: 'abstract',
        conversationMode: 'true'
      };
      break;
      
    default:
      throw new Error(`Unknown pipeline: ${routing_decision.pipeline}`);
  }

  // Build the routing URL
  let targetUrl = '';
  switch (routing_decision.pipeline) {
    case 'SCRIPT_MODE':
    case 'VISION_ENHANCED':
      targetUrl = '/test-tts';
      break;
    case 'MUSIC_VIDEO':
      targetUrl = '/music-video-pipeline';
      break;
    case 'NO_MUSIC_VIDEO':
      targetUrl = '/no-music-video-pipeline';
      break;
  }

  return {
    analysis: routingAnalysis,
    routing_decision: {
      ...routing_decision,
      parameters
    },
    targetUrl,
    queryString: new URLSearchParams(parameters).toString()
  };
}