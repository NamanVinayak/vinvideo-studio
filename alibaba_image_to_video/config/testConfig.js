// Test configuration optimized for your real app architecture
const TEST_CONFIG = {
  // Wan 2.1 turbo - cheapest and fastest option
  model: 'wan2.1-i2v-turbo',
  
  // Video specifications
  resolution: '480P',          // Cost-effective and fast processing
  aspect_ratio: '16:9',        // Match your images' aspect ratio
  
  // Duration and timing
  duration: 5,                 // 5 seconds as requested
  frames_per_second: 16,       // Your specified FPS
  
  // Quality settings (optimized for speed/cost)
  inference_steps: 20,         // Fast processing
  guidance_scale: 5,           // Balanced quality/speed
  
  // Feature flags
  enable_safety_checker: true,    // Keep for safety
  enable_prompt_expansion: false, // Skip to save time/cost
  watermark: false,              // Clean output
  
  // Negative prompt for better quality
  negative_prompt: 'low quality, blurry, distorted, watermark, text, deformed'
};

// Test images data structure matching real app patterns
const TEST_IMAGES = [
  {
    id: 1,
    name: "cathedral",
    filePath: "./assets/cathedral.jpg",
    prompt: "Epic cathedral glowing with warm orange light; camera glides forward through arches, then tilts up dramatically to reveal towering spires against the night sky.",
    expectedDuration: 5,
    expectedFPS: 16
  },
  {
    id: 2,
    name: "woman_particles", 
    filePath: "./assets/woman_particles.jpg",
    prompt: "Close-up of a calm woman with glowing embers floating across her skin; camera slowly pushes in and tilts slightly as sparks swirl in slow motion.",
    expectedDuration: 5,
    expectedFPS: 16
  }
];

// Response format matching VinVideo_Connected patterns
const EXPECTED_RESPONSE_FORMAT = {
  success: Boolean,
  totalRequested: Number,
  totalGenerated: Number,
  totalProcessingTime: String,
  results: [
    {
      imageId: Number,
      imageName: String,
      videoUrl: String,
      prompt: String,
      processingTime: String,
      expiresAt: String,
      status: String, // 'success' | 'failed'
      model: String,
      config: Object
    }
  ],
  errors: Array,
  config: Object
};

module.exports = {
  TEST_CONFIG,
  TEST_IMAGES,
  EXPECTED_RESPONSE_FORMAT
};