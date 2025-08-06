const DEFAULT_PARAMETERS = {
  model: 'wan2.2-i2v-plus',
  resolution: '720P',
  aspect_ratio: '16:9',
  inference_steps: 30,
  guidance_scale: 7,
  frames_per_second: 16,
  enable_safety_checker: true,
  enable_prompt_expansion: false,
  watermark: true,
  negative_prompt: 'low quality, blurry, distorted, watermark, text',
};

const PRESETS = {
  FAST: {
    model: 'wan2.1-i2v-turbo',
    resolution: '480P',
    inference_steps: 20,
    guidance_scale: 5,
  },
  BALANCED: {
    model: 'wan2.2-i2v-plus',
    ...DEFAULT_PARAMETERS,
  },
  HIGH_QUALITY: {
    model: 'wan2.2-i2v-plus',
    resolution: '1080P',
    inference_steps: 40,
    guidance_scale: 8,
  },
};

module.exports = {
  DEFAULT_PARAMETERS,
  PRESETS,
};
