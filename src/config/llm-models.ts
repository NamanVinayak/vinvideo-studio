/**
 * LLM Model Configuration for OpenRouter
 * Defines model settings and recommendations for each agent
 */

export interface ModelConfig {
  primary: string;
  fallback: string[];
  temperature: number;
  maxTokens: number;
  description: string;
}

export const AGENT_MODELS: Record<string, ModelConfig> = {
  producer: {
    primary: process.env.OPENROUTER_PRODUCER_MODEL || 'google/gemini-2.5-flash-preview-05-20',
    fallback: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-pro'],
    temperature: 0,
    maxTokens: 15000,
    description: 'Producer agent - generates precise cut points for video editing'
  },
  
  director: {
    primary: process.env.OPENROUTER_DIRECTOR_MODEL || 'google/gemini-2.5-flash-preview-05-20',
    fallback: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-pro'],
    temperature: 0.1,
    maxTokens: 15000,
    description: 'Director agent - creates creative vision and story beats'
  },
  
  dop: {
    primary: process.env.OPENROUTER_DOP_MODEL || 'google/gemini-2.5-flash-preview-05-20',
    fallback: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-pro'],
    temperature: 0,
    maxTokens: 15000,
    description: 'DoP agent - generates cinematography directions'
  },
  
  promptEngineer: {
    primary: process.env.OPENROUTER_PROMPT_ENGINEER_MODEL || 'google/gemini-2.5-flash-preview-05-20',
    fallback: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-pro'],
    temperature: 0.1,
    maxTokens: 15000,
    description: 'Prompt Engineer agent - creates FLUX image generation prompts'
  },
  
  visionUnderstanding: {
    primary: process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.5-flash-preview-05-20',
    fallback: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-pro'],
    temperature: 0.7,
    maxTokens: 15000,
    description: 'Vision Understanding agent - analyzes user concepts and creates vision documents'
  },
  
  mergedVisionDirector: {
    primary: process.env.OPENROUTER_MERGED_MODEL || 'google/gemini-2.5-flash-preview-05-20',
    fallback: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-pro'],
    temperature: 0.7,
    maxTokens: 25000,
    description: 'Merged Vision+Director agent - combines vision analysis and director beats'
  }
};

/**
 * Available models on OpenRouter with their specifications
 */
export const AVAILABLE_MODELS = {
  // Anthropic Models
  'anthropic/claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    inputPrice: 3.0,  // per million tokens
    outputPrice: 15.0,
    strengths: ['Structured output', 'Fast response', 'Code generation', 'Creative writing']
  },
  'anthropic/claude-3-opus': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    strengths: ['Complex reasoning', 'Creative tasks', 'Long context']
  },
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    contextWindow: 200000,
    inputPrice: 0.25,
    outputPrice: 1.25,
    strengths: ['Fast', 'Cost-effective', 'Good for simple tasks']
  },
  
  // OpenAI Models
  'openai/gpt-4': {
    name: 'GPT-4',
    contextWindow: 8192,
    inputPrice: 30.0,
    outputPrice: 60.0,
    strengths: ['General purpose', 'Reliable', 'Well-tested']
  },
  'openai/gpt-4o': {
    name: 'GPT-4 Optimized',
    contextWindow: 128000,
    inputPrice: 2.5,
    outputPrice: 10.0,
    strengths: ['Fast', 'Multimodal', 'Cost-effective GPT-4']
  },
  'openai/gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    inputPrice: 0.5,
    outputPrice: 1.5,
    strengths: ['Very fast', 'Very cheap', 'Good for simple tasks']
  },
  
  // Mistral Models
  'mistralai/mixtral-8x7b-instruct': {
    name: 'Mixtral 8x7B Instruct',
    contextWindow: 32768,
    inputPrice: 0.24,
    outputPrice: 0.24,
    strengths: ['Cost-effective', 'Good performance', 'Fast']
  },
  'mistralai/mistral-large': {
    name: 'Mistral Large',
    contextWindow: 128000,
    inputPrice: 2.0,
    outputPrice: 6.0,
    strengths: ['Powerful', 'Long context', 'Multilingual']
  },
  
  // Meta Llama Models
  'meta-llama/llama-3.2-90b-vision-instruct': {
    name: 'Llama 3.2 90B Vision',
    contextWindow: 128000,
    inputPrice: 0.9,
    outputPrice: 0.9,
    strengths: ['Multimodal', 'Open source', 'Good value']
  },
  
  // Google Models
  'google/gemini-pro': {
    name: 'Gemini Pro',
    contextWindow: 128000,
    inputPrice: 0.125,
    outputPrice: 0.375,
    strengths: ['Very cheap', 'Fast', 'Good for basic tasks']
  },
  
  // Qwen Models (similar to what you're currently using)
  'qwen/qwen-2.5-72b-instruct': {
    name: 'Qwen 2.5 72B',
    contextWindow: 128000,
    inputPrice: 0.35,
    outputPrice: 0.4,
    strengths: ['Similar to current model', 'Good performance', 'Multilingual']
  }
};

/**
 * Get the best model for a specific agent based on availability and cost
 */
export function getBestModelForAgent(agentType: keyof typeof AGENT_MODELS): string {
  const config = AGENT_MODELS[agentType];
  return config.primary;
}

/**
 * Get fallback models for an agent
 */
export function getFallbackModels(agentType: keyof typeof AGENT_MODELS): string[] {
  const config = AGENT_MODELS[agentType];
  return config.fallback;
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const modelInfo = AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS];
  
  if (!modelInfo) {
    console.warn(`Model ${model} not found in pricing info`);
    return { inputCost: 0, outputCost: 0, totalCost: 0 };
  }
  
  const inputCost = (inputTokens / 1_000_000) * modelInfo.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * modelInfo.outputPrice;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}