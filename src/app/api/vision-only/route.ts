import { NextResponse } from 'next/server';
import type { UserContext } from '@/types/userContext';

/**
 * Vision Understanding Only endpoint
 * Separate from audio generation for better user experience
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userContext } = body as { userContext: UserContext };
    
    // Extract values from userContext for backward compatibility
    const concept = userContext?.originalPrompt;
    const style = userContext?.settings?.visualStyle;
    const pacing = userContext?.settings?.pacing;
    const duration = userContext?.settings?.duration;
    const contentType = userContext?.settings?.contentType;
    
    console.log('🎭 VISION ONLY ENDPOINT CALLED');
    console.log(`📝 Concept: ${concept}`);
    console.log(`🎨 Style: ${style}, Pacing: ${pacing}, Duration: ${duration}`);
    console.log('📊 Full UserContext:', JSON.stringify(userContext, null, 2));
    
    if (!concept || !concept.trim()) {
      return NextResponse.json({ error: 'Concept is required for vision understanding' }, { status: 400 });
    }
    
    const startTime = Date.now();
    
    // Call the audio-aware vision understanding agent with userContext
    const visionResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/audio-vision-understanding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userContext, // Pass the complete userContext
        // Keep legacy format for backward compatibility
        userInput: concept,
        additionalContext: {
          stylePreferences: {
            pacing: pacing || 'moderate',
            visualStyle: style || 'cinematic',
            duration: duration || 30
          },
          technicalRequirements: {
            contentType: contentType || 'general'
          },
          audioContext: {
            willHaveNarration: true,
            narrativeStyle: 'emotional_storytelling',
            ttsOptimization: true
          }
        }
      })
    });
    
    if (!visionResponse.ok) {
      const errorData = await visionResponse.json();
      throw new Error(errorData.error || `Vision understanding failed: ${visionResponse.status}`);
    }
    
    const visionData = await visionResponse.json();
    
    if (!visionData.success || !visionData.stage1_vision_analysis?.vision_document) {
      throw new Error('Vision understanding did not return valid vision document');
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ Vision understanding completed in ${(executionTime / 1000).toFixed(2)}s`);
    console.log('📋 Core concept:', visionData.stage1_vision_analysis.vision_document.core_concept);
    console.log('📜 Narration script preview:', visionData.stage1_vision_analysis.narration_script?.substring(0, 100) + '...');
    
    return NextResponse.json({
      success: true,
      visionDocument: visionData.stage1_vision_analysis.vision_document,
      narrationScript: visionData.stage1_vision_analysis.narration_script,
      visionAgentData: visionData, // Full response for debugging
      executionTime,
      stage: 'vision_understanding'
    });
    
  } catch (error) {
    console.error('Error in vision-only endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}