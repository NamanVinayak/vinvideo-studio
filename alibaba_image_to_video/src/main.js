const alibabaClient = require('./alibabaClient');
const { TEST_CONFIG, TEST_IMAGES } = require('../config/testConfig');

/**
 * Submit a single image for video generation (job submission only)
 * Optimized for parallel processing - separates submission from result polling
 */
async function submitImageForVideo(image, config) {
  console.log(`🚀 Submitting job for Image ${image.id}: ${image.name}`);
  console.log(`   📝 Prompt: ${image.prompt.slice(0, 60)}...`);
  
  const submitStartTime = Date.now();
  
  try {
    // Submit task to Alibaba API (non-blocking)
    const taskId = await alibabaClient.submitImageToVideoTask(
      image.filePath, 
      image.prompt, 
      config
    );
    
    const submitTime = (Date.now() - submitStartTime) / 1000;
    
    if (!taskId) {
      console.error(`❌ Job submission failed for ${image.name}`);
      return {
        imageId: image.id,
        imageName: image.name,
        taskId: null,
        prompt: image.prompt,
        submitTime: submitTime,
        status: 'submission_failed',
        error: 'Failed to submit task to Alibaba API',
        model: config.model
      };
    }
    
    console.log(`✅ Job submitted for ${image.name} in ${submitTime.toFixed(2)}s - Task ID: ${taskId}`);
    
    return {
      imageId: image.id,
      imageName: image.name,
      taskId: taskId,
      prompt: image.prompt,
      submitTime: submitTime,
      status: 'submitted',
      model: config.model,
      config: config
    };
    
  } catch (error) {
    const submitTime = (Date.now() - submitStartTime) / 1000;
    console.error(`💥 Exception during job submission for ${image.name}:`, error.message);
    
    return {
      imageId: image.id,
      imageName: image.name,
      taskId: null,
      prompt: image.prompt,
      submitTime: submitTime,
      status: 'submission_failed',
      error: error.message,
      model: config.model
    };
  }
}

/**
 * Poll all submitted jobs until completion
 * Handles multiple concurrent video generation jobs
 */
async function pollAllJobsUntilComplete(submittedJobs, config) {
  const validJobs = submittedJobs.filter(job => job.taskId && job.status === 'submitted');
  
  if (validJobs.length === 0) {
    console.error('❌ No valid jobs to poll');
    return [];
  }

  console.log(`⏳ Polling ${validJobs.length} video generation jobs...`);
  
  // Create polling promises for all jobs
  const pollingPromises = validJobs.map(async (job) => {
    const startTime = Date.now();
    
    try {
      // Poll this specific job until completion
      const result = await alibabaClient.getTaskResult(job.taskId, {
        progressCallback: (progress) => {
          console.log(`   📊 ${job.imageName}: ${progress.status} (${progress.elapsedTime.toFixed(1)}s)`);
        }
      });
      
      const totalTime = (Date.now() - startTime) / 1000;
      
      if (result && result.success) {
        const expiresAt = new Date(Date.now() + 24*60*60*1000).toISOString();
        
        console.log(`🎉 ${job.imageName} completed successfully!`);
        
        return {
          imageId: job.imageId,
          imageName: job.imageName,
          videoUrl: result.videoUrl,
          prompt: job.prompt,
          processingTime: `${result.processingTime.toFixed(1)}s`,
          totalTime: `${totalTime.toFixed(1)}s`,
          expiresAt: expiresAt,
          status: 'success',
          model: job.model,
          config: job.config,
          taskId: job.taskId,
          attempts: result.attempts
        };
      } else {
        console.error(`💥 ${job.imageName} failed: ${result?.error || 'Unknown error'}`);
        
        return {
          imageId: job.imageId,
          imageName: job.imageName,
          videoUrl: null,
          prompt: job.prompt,
          processingTime: result ? `${result.processingTime.toFixed(1)}s` : `${totalTime.toFixed(1)}s`,
          totalTime: `${totalTime.toFixed(1)}s`,
          expiresAt: null,
          status: 'failed',
          error: result?.error || 'Polling failed',
          errorCode: result?.errorCode,  
          model: job.model,
          config: job.config,
          taskId: job.taskId,
          attempts: result?.attempts
        };
      }
      
    } catch (error) {
      const totalTime = (Date.now() - startTime) / 1000;
      console.error(`🚫 Polling exception for ${job.imageName}:`, error.message);
      
      return {
        imageId: job.imageId,
        imageName: job.imageName,
        videoUrl: null,
        prompt: job.prompt,
        processingTime: `${totalTime.toFixed(1)}s`,
        totalTime: `${totalTime.toFixed(1)}s`,
        expiresAt: null,
        status: 'failed',
        error: error.message,
        model: job.model,
        taskId: job.taskId
      };
    }
  });
  
  // Wait for all polling to complete
  console.log(`🔄 Waiting for all ${validJobs.length} videos to generate...`);
  const results = await Promise.allSettled(pollingPromises);
  
  // Process results 
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error('🚫 Polling promise rejected:', result.reason);
      return {
        status: 'failed',
        error: 'Polling promise rejected: ' + result.reason
      };
    }
  });
}

/**
 * Process multiple images in batch using parallel processing
 * Optimized architecture: Submit all jobs → Poll all jobs → Return all results
 * Dramatically reduces total processing time for multiple images
 */
async function processBatchImagesForVideo(images, config) {
  console.log(`\n🚀 Starting Parallel Batch Video Generation`);
  console.log(`📊 Processing ${images.length} images with ${config.model}`);
  console.log(`⚙️  Config: ${config.resolution}, ${config.frames_per_second}fps, ${config.duration}s, ${config.inference_steps} steps`);
  console.log(`🎯 Architecture: Parallel job submission → Concurrent polling → ~${Math.ceil(config.duration || 4)} min total time`);
  
  const batchStartTime = Date.now();
  
  // Phase 1: Submit all jobs in parallel (fast - takes ~2-5 seconds total)
  console.log(`\n📤 Phase 1: Submitting ${images.length} video generation jobs in parallel...`);
  const submitStartTime = Date.now();
  
  const submissionPromises = images.map(image => submitImageForVideo(image, config));
  const submittedJobs = await Promise.all(submissionPromises);
  
  const submitTime = (Date.now() - submitStartTime) / 1000;
  const successfulSubmissions = submittedJobs.filter(job => job.status === 'submitted');
  const failedSubmissions = submittedJobs.filter(job => job.status === 'submission_failed');
  
  console.log(`✅ Job submission completed in ${submitTime.toFixed(1)}s:`);
  console.log(`   🎯 Successful: ${successfulSubmissions.length}/${images.length}`);
  if (failedSubmissions.length > 0) {
    console.log(`   ❌ Failed: ${failedSubmissions.length}/${images.length}`);
    failedSubmissions.forEach(job => {
      console.log(`      - ${job.imageName}: ${job.error}`);
    });
  }
  
  // Phase 2: Poll all jobs until completion (concurrent polling)
  if (successfulSubmissions.length > 0) {
    console.log(`\n⏳ Phase 2: Polling ${successfulSubmissions.length} jobs until completion...`);
    console.log(`🕐 Estimated completion time: ${Math.ceil((config.duration || 4))} minutes`);
    
    const pollingStartTime = Date.now();
    const completedResults = await pollAllJobsUntilComplete(successfulSubmissions, config);
    const pollingTime = (Date.now() - pollingStartTime) / 1000;
    
    console.log(`🏁 Polling completed in ${pollingTime.toFixed(1)}s`);
    
    // Combine results: successful polls + failed submissions
    const allResults = [
      ...completedResults,
      ...failedSubmissions.map(job => ({
        imageId: job.imageId,
        imageName: job.imageName,
        videoUrl: null,
        prompt: job.prompt,
        processingTime: `${job.submitTime}s`,
        totalTime: `${job.submitTime}s`,
        expiresAt: null,
        status: 'failed',
        error: job.error,
        model: job.model,
        config: config
      }))
    ];
    
    // Calculate final statistics
    const totalProcessingTime = (Date.now() - batchStartTime) / 1000;
    const successCount = allResults.filter(r => r.status === 'success').length;
    const errors = allResults.filter(r => r.status === 'failed').map(r => ({
      imageId: r.imageId,
      imageName: r.imageName,
      error: r.error
    }));
    
    // Response structure matching VinVideo_Connected patterns
    const response = {
      success: successCount > 0,
      totalRequested: images.length,
      totalGenerated: successCount,
      totalProcessingTime: `${totalProcessingTime.toFixed(1)}s`,
      submissionTime: `${submitTime.toFixed(1)}s`,
      pollingTime: `${pollingTime.toFixed(1)}s`,
      results: allResults,
      errors: errors,
      config: config,
      timestamp: new Date().toISOString(),
      batchMetrics: {
        submitPhaseTime: submitTime,
        pollingPhaseTime: pollingTime,
        totalBatchTime: totalProcessingTime,
        parallelEfficiency: `${((images.length * 4 * 60) / totalProcessingTime).toFixed(1)}x faster than sequential`
      }
    };
    
    // Enhanced summary logging
    console.log(`\n📈 Parallel Batch Processing Complete:`);
    console.log(`   ✅ Videos Generated: ${successCount}/${images.length}`);
    console.log(`   ⏱️  Total Batch Time: ${totalProcessingTime.toFixed(1)}s (${(totalProcessingTime/60).toFixed(1)} minutes)`);
    console.log(`   📤 Job Submission: ${submitTime.toFixed(1)}s`);
    console.log(`   ⏳ Video Generation: ${pollingTime.toFixed(1)}s`);
    console.log(`   🚀 Efficiency Gain: ~${((images.length * 4 * 60) / totalProcessingTime).toFixed(1)}x faster than sequential processing`);
    console.log(`   💰 Model Used: ${config.model}`);
    
    return response;
    
  } else {
    // All submissions failed
    const totalProcessingTime = (Date.now() - batchStartTime) / 1000;
    
    const response = {
      success: false,
      totalRequested: images.length,
      totalGenerated: 0,
      totalProcessingTime: `${totalProcessingTime.toFixed(1)}s`,
      results: failedSubmissions.map(job => ({
        imageId: job.imageId,
        imageName: job.imageName,
        videoUrl: null,
        prompt: job.prompt,
        processingTime: `${job.submitTime}s`,
        expiresAt: null,
        status: 'failed',
        error: job.error,
        model: job.model,
        config: config
      })),
      errors: failedSubmissions.map(job => ({
        imageId: job.imageId,
        imageName: job.imageName,
        error: job.error
      })),
      config: config,
      timestamp: new Date().toISOString()
    };
    
    console.log(`\n💥 All job submissions failed:`);
    console.log(`   ❌ Success: 0/${images.length}`);
    console.log(`   ⏱️  Total Time: ${totalProcessingTime.toFixed(1)}s`);
    
    return response;
  }
}

/**
 * Main test function
 * Replicates real app architecture patterns
 */
async function main() {
  console.log('🎯 === Alibaba Wan Image-to-Video Test Suite ===');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🔑 Using API Key: ${process.env.DASHSCOPE_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
  
  try {
    // Process batch of images with optimized configuration
    const batchResult = await processBatchImagesForVideo(TEST_IMAGES, TEST_CONFIG);
    
    // Display final results
    console.log('\n📋 === FINAL RESULTS ===');
    console.log(JSON.stringify(batchResult, null, 2));
    
    // Display video URLs for easy access
    if (batchResult.success) {
      console.log('\n🎥 === GENERATED VIDEO URLS ===');
      batchResult.results.forEach(result => {
        if (result.status === 'success') {
          console.log(`${result.imageName}: ${result.videoUrl}`);
          console.log(`   Expires: ${result.expiresAt}`);
        }
      });
    }
    
    console.log('\n✨ Test Suite Completed Successfully!');
    
  } catch (error) {
    console.error('💥 Fatal error in test suite:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
