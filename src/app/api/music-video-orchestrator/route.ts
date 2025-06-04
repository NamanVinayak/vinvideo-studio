import { NextResponse } from 'next/server';

/**
 * Music Video Orchestrator API endpoint for Stage 7
 * Coordinates image generation using existing ComfyUI infrastructure
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      fluxPrompts, 
      characterRegistry, 
      visionDocument, 
      batchStrategy 
    } = body;
    
    // Validate required inputs
    if (!fluxPrompts || !Array.isArray(fluxPrompts)) {
      return NextResponse.json({ 
        error: 'FLUX prompts array is required' 
      }, { status: 400 });
    }

    console.log('Music Video Orchestrator: Starting image generation...');
    console.log(`Processing ${fluxPrompts.length} FLUX prompts`);
    
    // Determine batch strategy based on character registry
    const orchestrationStrategy = determineBatchStrategy(fluxPrompts, characterRegistry, batchStrategy);
    
    // Generate images using existing ComfyUI infrastructure
    const imageGenerationResults = await orchestrateImageGeneration(
      fluxPrompts,
      orchestrationStrategy,
      visionDocument
    );
    
    // Validate generated images (placeholder - would integrate with QWEN VL)
    const validationResults = await validateGeneratedImages(
      imageGenerationResults,
      fluxPrompts,
      visionDocument
    );
    
    // Prepare final output
    const orchestratorOutput = {
      generation_summary: {
        total_images_requested: fluxPrompts.length,
        total_images_generated: imageGenerationResults.successful_generations.length,
        failed_generations: imageGenerationResults.failed_generations.length,
        parallel_efficiency_gain: calculateEfficiencyGain(orchestrationStrategy),
        character_consistency_maintained: validateCharacterConsistency(validationResults)
      },
      quality_analytics: {
        average_generation_time: imageGenerationResults.average_generation_time,
        success_rate: imageGenerationResults.successful_generations.length / fluxPrompts.length,
        quality_score_average: calculateAverageQualityScore(validationResults)
      },
      generated_images: imageGenerationResults.successful_generations.map((result: any, index: number) => ({
        image_index: index + 1,
        image_url: result.image_url,
        prompt_used: fluxPrompts[index],
        generation_time: result.generation_time,
        validation_score: validationResults[index]?.score || 0.8,
        approval_method: 'auto_approved' // Would be enhanced with real validation
      })),
      orchestration_details: {
        batch_strategy: orchestrationStrategy,
        character_distribution: analyzeCharacterDistribution(fluxPrompts, characterRegistry),
        parallel_processing_used: orchestrationStrategy.batches.length > 1
      },
      ready_for_video_generation: imageGenerationResults.successful_generations.length === fluxPrompts.length
    };

    return NextResponse.json({
      success: true,
      stage7_orchestrator_output: orchestratorOutput,
      execution_details: imageGenerationResults.execution_details
    });

  } catch (error: unknown) {
    console.error('Error in music-video-orchestrator endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Determine optimal batch strategy for image generation
 */
function determineBatchStrategy(fluxPrompts: string[], characterRegistry: any, userStrategy?: string): any {
  const hasCharacters = characterRegistry && Object.keys(characterRegistry).length > 0;
  const promptCount = fluxPrompts.length;
  
  let batchSize = 4; // Default batch size
  let strategy = 'standard_batching';
  
  if (hasCharacters) {
    // Character-aware batching: distribute character prompts across batches
    strategy = 'character_distributed_batching';
    batchSize = Math.max(2, Math.ceil(promptCount / 4)); // Ensure character distribution
  }
  
  if (promptCount <= 4) {
    strategy = 'single_batch';
    batchSize = promptCount;
  }
  
  // Create batch groups
  const batches = [];
  for (let i = 0; i < promptCount; i += batchSize) {
    const batch = {
      batch_id: Math.floor(i / batchSize),
      prompt_indices: Array.from({ length: Math.min(batchSize, promptCount - i) }, (_, j) => i + j),
      character_context: extractCharacterContextForBatch(fluxPrompts, characterRegistry, i, batchSize)
    };
    batches.push(batch);
  }
  
  return {
    strategy_type: strategy,
    batch_size: batchSize,
    total_batches: batches.length,
    batches: batches,
    estimated_parallel_time: Math.ceil(promptCount / batchSize) * 60, // Assume 60s per batch
    estimated_sequential_time: promptCount * 60
  };
}

/**
 * Orchestrate image generation using existing ComfyUI infrastructure
 */
async function orchestrateImageGeneration(
  fluxPrompts: string[], 
  orchestrationStrategy: any, 
  visionDocument: any
): Promise<any> {
  console.log(`Starting ${orchestrationStrategy.total_batches} batch(es) for image generation`);
  
  const startTime = Date.now();
  const successfulGenerations: any[] = [];
  const failedGenerations: any[] = [];
  
  // Process batches (for now, sequential - would be parallel in production)
  for (const batch of orchestrationStrategy.batches) {
    console.log(`Processing batch ${batch.batch_id + 1}/${orchestrationStrategy.total_batches}`);
    
    for (const promptIndex of batch.prompt_indices) {
      try {
        // Simulate image generation using existing ComfyUI infrastructure
        const generationResult = await generateImageWithComfyUI(
          fluxPrompts[promptIndex], 
          promptIndex, 
          visionDocument
        );
        
        successfulGenerations.push({
          prompt_index: promptIndex,
          image_url: generationResult.image_url,
          generation_time: generationResult.generation_time,
          batch_id: batch.batch_id
        });
        
      } catch (error) {
        console.error(`Failed to generate image for prompt ${promptIndex}:`, error);
        failedGenerations.push({
          prompt_index: promptIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
          batch_id: batch.batch_id
        });
      }
    }
  }
  
  const executionTime = Date.now() - startTime;
  const averageGenerationTime = successfulGenerations.length > 0 
    ? successfulGenerations.reduce((sum, gen) => sum + gen.generation_time, 0) / successfulGenerations.length
    : 0;
  
  return {
    successful_generations: successfulGenerations,
    failed_generations: failedGenerations,
    average_generation_time: Math.round(averageGenerationTime),
    total_execution_time: executionTime,
    execution_details: {
      batches_processed: orchestrationStrategy.total_batches,
      parallel_strategy_used: orchestrationStrategy.strategy_type,
      success_rate: successfulGenerations.length / fluxPrompts.length
    }
  };
}

/**
 * Generate single image using existing ComfyUI infrastructure (placeholder)
 */
async function generateImageWithComfyUI(
  fluxPrompt: string, 
  promptIndex: number, 
  visionDocument: any
): Promise<any> {
  // This would integrate with your existing ComfyUI endpoints
  // For now, return mock data that matches your system structure
  
  const startTime = Date.now();
  
  // Simulate generation time (would be actual ComfyUI call)
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  const generationTime = Date.now() - startTime;
  
  return {
    image_url: `/generated/music-video-beat-${String(promptIndex + 1).padStart(3, '0')}.png`,
    generation_time: generationTime,
    model_used: 'FLUX-dev',
    prompt_used: fluxPrompt,
    technical_details: {
      resolution: '1024x1024',
      format: 'PNG',
      quality_score: 0.85 + Math.random() * 0.15
    }
  };
}

/**
 * Validate generated images (placeholder for QWEN VL integration)
 */
async function validateGeneratedImages(
  imageResults: any, 
  fluxPrompts: string[], 
  visionDocument: any
): Promise<any[]> {
  // This would integrate with your existing QWEN VL validation system
  
  return imageResults.successful_generations.map((result: any, index: number) => ({
    image_index: index,
    validation_score: 0.8 + Math.random() * 0.2, // Mock validation score
    character_consistency: result.prompt_used.includes('Maya') ? 'perfect_match' : 'n/a',
    creative_vision_match: 0.85 + Math.random() * 0.15,
    technical_quality: 0.9,
    approval_recommendation: 'auto_approve'
  }));
}

/**
 * Extract character context for specific batch
 */
function extractCharacterContextForBatch(
  fluxPrompts: string[], 
  characterRegistry: any, 
  startIndex: number, 
  batchSize: number
): any {
  if (!characterRegistry) return {};
  
  const batchPrompts = fluxPrompts.slice(startIndex, startIndex + batchSize);
  const batchCharacters: any = {};
  
  Object.entries(characterRegistry).forEach(([charId, charData]: [string, any]) => {
    const appearsInBatch = charData.appearances_in_beats?.some((beatNo: number) => 
      beatNo >= startIndex + 1 && beatNo <= startIndex + batchSize
    );
    
    if (appearsInBatch) {
      batchCharacters[charId] = charData;
    }
  });
  
  return batchCharacters;
}

/**
 * Calculate efficiency gain from parallel processing
 */
function calculateEfficiencyGain(orchestrationStrategy: any): string {
  const parallelTime = orchestrationStrategy.estimated_parallel_time;
  const sequentialTime = orchestrationStrategy.estimated_sequential_time;
  
  if (sequentialTime <= parallelTime) return '0% (single batch)';
  
  const efficiencyGain = Math.round((1 - parallelTime / sequentialTime) * 100);
  return `${efficiencyGain}% faster than sequential`;
}

/**
 * Validate character consistency across generated images
 */
function validateCharacterConsistency(validationResults: any[]): boolean {
  const characterResults = validationResults.filter(result => 
    result.character_consistency && result.character_consistency !== 'n/a'
  );
  
  if (characterResults.length === 0) return true; // No characters = perfect consistency
  
  const perfectMatches = characterResults.filter(result => 
    result.character_consistency === 'perfect_match'
  );
  
  return perfectMatches.length / characterResults.length > 0.8;
}

/**
 * Calculate average quality score
 */
function calculateAverageQualityScore(validationResults: any[]): number {
  if (validationResults.length === 0) return 0;
  
  const totalScore = validationResults.reduce((sum, result) => sum + result.validation_score, 0);
  return Math.round((totalScore / validationResults.length) * 100) / 100;
}

/**
 * Analyze character distribution across batches
 */
function analyzeCharacterDistribution(fluxPrompts: string[], characterRegistry: any): any {
  if (!characterRegistry || Object.keys(characterRegistry).length === 0) {
    return {
      characters_detected: 0,
      distribution_strategy: 'no_characters'
    };
  }
  
  const characterCount = Object.keys(characterRegistry).length;
  const characterAppearances = Object.values(characterRegistry).reduce((total: number, char: any) => 
    total + (char.appearances_in_beats?.length || 0), 0
  );
  
  return {
    characters_detected: characterCount,
    total_character_appearances: characterAppearances,
    distribution_strategy: characterCount > 1 ? 'multi_character_distributed' : 'single_character_consistent',
    character_consistency_priority: characterCount > 0
  };
}