import { NextResponse } from 'next/server';

/**
 * Vision Understanding Only endpoint
 * Separate from audio generation for better user experience
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      concept, 
      style, 
      pacing, 
      duration, 
      contentType 
    } = body;
    
    console.log('🎭 VISION ONLY ENDPOINT CALLED');
    console.log(`📝 Concept: ${concept}`);
    console.log(`🎨 Style: ${style}, Pacing: ${pacing}, Duration: ${duration}`);
    
    if (!concept || !concept.trim()) {
      return NextResponse.json({ error: 'Concept is required for vision understanding' }, { status: 400 });
    }
    
    const startTime = Date.now();
    
    // Call the audio-aware vision understanding agent
    const visionResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/audio-vision-understanding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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