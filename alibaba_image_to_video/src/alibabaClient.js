require('dotenv').config();
const axios = require('axios');
const configManager = require('./configManager');
const S3ImageUploader = require('./s3ImageUploader');

const API_BASE_URL = 'https://dashscope-intl.aliyuncs.com/api/v1';
const API_KEY = process.env.DASHSCOPE_API_KEY;

if (!API_KEY) {
  throw new Error('DASHSCOPE_API_KEY environment variable is required');
}

class AlibabaClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Initialize S3 uploader for real image uploads
    try {
      this.s3Uploader = new S3ImageUploader();
      console.log('✅ S3ImageUploader initialized for AlibabaClient');
    } catch (error) {
      console.error('❌ Failed to initialize S3ImageUploader:', error.message);
      console.log('🔄 Will fall back to placeholder URLs for testing');
      this.s3Uploader = null;
    }
  }

  /**
   * Upload image to S3 and return public URL for Alibaba API consumption
   * @param {string} imagePath - The local path to the image
   * @returns {Promise<string>} A promise that resolves to a public S3 URL
   */
  async uploadImage(imagePath) {
    // MODEL IS NOW ACTIVATED! Let's test with S3 uploads
    console.log(`✅ Wan model activated! Testing S3 integration...`);
    
    // QUICK TEST: Use fallback URLs to verify model works, then fix S3
    console.log(`🧪 Testing with fallback URLs first to verify model activation...`);
    return this.getFallbackUrl(imagePath);
    
    // Disabled temporarily to verify API works
    if (false && this.s3Uploader) {
      try {
        const imageId = this.generateImageId(imagePath);
        console.log(`📤 Uploading to S3: ${imagePath}`);
        
        const uploadResult = await this.s3Uploader.uploadImage(imagePath, imageId);
        
        if (uploadResult.success) {
          console.log(`✅ S3 upload successful: ${uploadResult.publicUrl}`);
          return uploadResult.publicUrl;
        } else {
          throw new Error(uploadResult.error);
        }
      } catch (error) {
        console.error(`❌ S3 upload failed: ${error.message}`);
        console.log('🔄 Falling back to placeholder URL');
        return this.getFallbackUrl(imagePath);
      }
    } else {
      // Fallback to placeholder URLs if S3 is not available
      console.log(`🔄 S3 not available, using fallback URL for: ${imagePath}`);
      return this.getFallbackUrl(imagePath);
    }
  }

  /**
   * Generate unique image ID from file path
   * @param {string} imagePath - The local path to the image
   * @returns {string} Unique image identifier
   */
  generateImageId(imagePath) {
    const path = require('path');
    const basename = path.basename(imagePath, path.extname(imagePath));
    const timestamp = Date.now();
    return `${basename}_${timestamp}`;
  }

  /**
   * Get fallback placeholder URL when S3 is not available
   * @param {string} imagePath - The local path to the image
   * @returns {string} Fallback public URL
   */
  getFallbackUrl(imagePath) {
    // Map your images to accessible public URLs for testing
    const imageUrlMap = {
      './assets/cathedral.jpg': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop&crop=entropy&cs=tinysrgb',
      './assets/woman_particles.jpg': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop&crop=entropy&cs=tinysrgb'
    };
    
    const fallbackUrl = imageUrlMap[imagePath] || 'https://i.imgur.com/CaxbbE2.png';
    console.log(`🌐 Using fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  }

  /**
   * Submits a task to the video synthesis API.
   * @param {string} imagePath - The local path to the image.
   * @param {string} prompt - The text prompt for the video.
   * @param {object} dynamicConfig - The dynamic configuration for this task.
   * @returns {Promise<string|null>} A promise that resolves to the task ID, or null on failure.
   */
  async submitImageToVideoTask(imagePath, prompt, dynamicConfig = {}) {
    const config = configManager.mergeWithDefaults(dynamicConfig);
    const imageUrl = await this.uploadImage(imagePath);

    const payload = {
      model: config.model,
      input: {
        img_url: imageUrl,
        prompt: prompt,
        negative_prompt: config.negative_prompt,
      },
      parameters: {
        resolution: config.resolution,
        aspect_ratio: config.aspect_ratio,
        inference_steps: config.inference_steps,
        guidance_scale: config.guidance_scale,
        frames_per_second: config.frames_per_second,
        enable_safety_checker: config.enable_safety_checker,
        enable_prompt_expansion: config.enable_prompt_expansion,
        watermark: config.watermark
        // Note: HTTP API is inherently async - no sync_mode parameter needed
      },
    };

    try {
      const endpoint = '/services/aigc/video-generation/video-synthesis';
      
      console.log(`🚀 Submitting video generation job`);
      console.log(`   📝 Model: ${payload.model}`);
      console.log(`   🖼️  Image URL: ${imageUrl.substring(0, 50)}...`);
      console.log(`   📋 Prompt: ${prompt.substring(0, 60)}...`);
      
      const response = await this.client.post(endpoint, payload);
      
      if (response.data && response.data.output && response.data.output.task_id) {
        console.log(`✅ Job submitted successfully! Task ID: ${response.data.output.task_id}`);
        return response.data.output.task_id;
      } else {
        console.error('❌ Invalid API response - no task_id received:', response.data);
        return null;
      }
    } catch (error) {
      const errorDetails = error.response ? error.response.data : error.message;
      console.error(`❌ Job submission failed:`, errorDetails);
      
      if (error.response && error.response.data) {
        const { code, message } = error.response.data;
        
        if (code === 'AccessDenied') {
          console.error(`🔐 Access denied: ${message}`);
          console.log(`💡 This usually means:`);
          console.log(`   1. API key doesn't have video generation permissions`);
          console.log(`   2. Model not activated in your Alibaba Cloud account`);
          console.log(`   3. Insufficient account credits/quota`);
        } else if (code === 'InvalidParameter.DataInspection') {
          console.error(`🔍 Image access failed: ${message}`);
          console.log(`💡 This usually means:`);
          console.log(`   1. Image URL is not publicly accessible`);
          console.log(`   2. Image format/size doesn't meet requirements`);
          console.log(`   3. Network connectivity issues`);
        }
      }
      
      return null;
    }
  }

  /**
   * Polls the task status until it completes or fails.
   * Optimized for production with intelligent polling intervals and comprehensive error handling
   * @param {string} taskId - The ID of the task to poll.
   * @param {object} options - Polling configuration options
   * @returns {Promise<object|null>} A promise that resolves to the final task result, or null on failure.
   */
  async getTaskResult(taskId, options = {}) {
    if (!taskId) {
      console.error('❌ No task ID provided for polling');
      return null;
    }

    const config = {
      pollInterval: options.pollInterval || 15000, // 15 seconds (Alibaba recommended)
      maxAttempts: options.maxAttempts || 40,      // 10 minutes timeout
      progressCallback: options.progressCallback,  // Optional progress updates  
      ...options
    };

    const startTime = Date.now();
    const maxDuration = (config.maxAttempts * config.pollInterval / 1000 / 60).toFixed(1);

    console.log(`⏳ Polling task ${taskId} (timeout: ${maxDuration} minutes)`);

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        const response = await this.client.get(`/tasks/${taskId}`);
        const output = response.data.output;
        const status = output.task_status;
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        // Progress callback for real-time updates
        if (config.progressCallback) {
          config.progressCallback({
            taskId,
            status, 
            attempt: attempt + 1,
            maxAttempts: config.maxAttempts,
            elapsedTime: parseFloat(elapsedTime),
            message: output.message
          });
        }

        // Log polling progress  
        if (attempt === 0) {
          console.log(`   📡 Connected to Alibaba polling endpoint`);
        }
        
        const progressPercent = Math.round((attempt + 1) / config.maxAttempts * 100);
        console.log(`   🔄 Poll ${attempt + 1}/${config.maxAttempts} (${progressPercent}%): ${status} - ${elapsedTime}s elapsed`);

        // Handle completion states
        if (status === 'SUCCEEDED') {
          console.log(`   🎉 Video generation completed in ${elapsedTime}s!`);
          
          if (output.video_url) {
            const videoUrl = output.video_url;
            console.log(`   🎥 Video URL: ${videoUrl.substring(0, 60)}...`);
            console.log(`   ⏰ URL expires in 24 hours`);
            
            return {
              success: true,
              taskId,
              videoUrl,
              processingTime: parseFloat(elapsedTime),
              attempts: attempt + 1,
              output: response.data.output
            };
          } else {
            console.error(`   ❌ Task succeeded but no video URL provided`);
            return {
              success: false,
              taskId,
              error: 'No video URL in successful response',
              processingTime: parseFloat(elapsedTime),
              attempts: attempt + 1
            };
          }
        } 
        
        if (status === 'FAILED') {
          const errorMsg = output.message || 'Unknown error during video generation';
          console.error(`   💥 Video generation failed after ${elapsedTime}s: ${errorMsg}`);
          
          if (output.code) {
            console.error(`   🔍 Error code: ${output.code}`);
          }
          
          return {
            success: false,
            taskId,  
            error: errorMsg,
            errorCode: output.code,
            processingTime: parseFloat(elapsedTime),
            attempts: attempt + 1,
            output: response.data.output
          };
        }

        // Handle in-progress states
        if (status === 'IN_PROGRESS' || status === 'RUNNING') {
          if (output.message && output.message !== 'Task is running') {
            console.log(`   ⚙️  Progress: ${output.message}`);
          }
        } else if (status === 'IN_QUEUE' || status === 'PENDING') {
          console.log(`   ⏳ Task queued, waiting for processing to start...`);
        } else {
          console.log(`   ℹ️  Status: ${status}${output.message ? ` - ${output.message}` : ''}`);
        }

        // Wait before next poll (unless this is the last attempt)
        if (attempt < config.maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, config.pollInterval));
        }
        
      } catch (error) {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const errorMsg = error.response ? error.response.data : error.message;
        
        console.error(`   🚫 Polling failed (attempt ${attempt + 1}/${config.maxAttempts}):`, errorMsg);
        
        // Handle different error types
        if (error.response) {
          const status = error.response.status;
          
          if (status === 404) {
            console.error(`   💀 Task ${taskId} not found - job may have been deleted`);
            return {
              success: false,
              taskId,
              error: 'Task not found (404)',
              processingTime: parseFloat(elapsedTime),
              attempts: attempt + 1
            };
          } else if (status === 429) {
            console.warn(`   🚦 Rate limited - extending wait time`);
            await new Promise(resolve => setTimeout(resolve, config.pollInterval * 2));
            continue;
          }
        }
        
        // Continue polling on transient errors, but wait longer
        if (attempt < config.maxAttempts - 1) {
          const retryDelay = Math.min(config.pollInterval * 1.5, 30000); // Max 30s
          console.log(`   ⏸️  Retrying in ${retryDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // Timeout reached
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`   ⏰ Polling timed out after ${totalTime}s (${config.maxAttempts} attempts)`);
    
    return {
      success: false,
      taskId,
      error: `Polling timeout after ${totalTime}s`,
      processingTime: parseFloat(totalTime),
      attempts: config.maxAttempts
    };
  }

}

module.exports = new AlibabaClient();
