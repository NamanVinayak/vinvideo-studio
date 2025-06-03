# OpenRouter Migration Plan for VinVideo Connected

## Executive Summary
This document outlines the migration plan from RunPod (Qwen3-32B) to OpenRouter for all AI agents in the VinVideo Connected pipeline.

## Current Architecture Analysis

### Current Setup (RunPod)
- **Provider**: RunPod
- **Model**: Qwen3-32B-Instruct
- **Endpoint**: `roow74ms9yz4ri`
- **API Key**: `ARSHH_RUNPOD_API_KEY`
- **Base URL**: `https://api.runpod.ai/v2/{endpointId}/`
- **Request Format**: Custom RunPod format with polling mechanism

### Target Architecture (OpenRouter)
- **Provider**: OpenRouter
- **Models**: Multiple options (Claude 3.5, GPT-4, Qwen models, etc.)
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **API Key**: `sk-or-v1-YOUR_API_KEY`
- **Request Format**: OpenAI-compatible format

## Files to Modify

### 1. API Route Files
- `/src/app/api/producer-agent/route.ts`
- `/src/app/api/director-agent/route.ts`
- `/src/app/api/dop-agent/route.ts`
- `/src/app/api/prompt-engineer-agent/route.ts`

### 2. Environment Configuration
- `.env` or `.env.local` - Add OpenRouter API key
- Remove `ARSHH_RUNPOD_API_KEY` (after migration)

### 3. New Files to Create
- `/src/services/openrouter.ts` - Centralized OpenRouter service
- `/src/config/models.ts` - Model configuration and mapping

## Migration Strategy

### Phase 1: Setup Infrastructure
1. Create centralized OpenRouter service
2. Add environment variables
3. Implement error handling and retry logic

### Phase 2: Agent Migration
1. Update each agent to use OpenRouter service
2. Maintain backward compatibility during transition
3. Test each agent independently

### Phase 3: Optimization
1. Select optimal models for each agent
2. Implement model fallback strategies
3. Monitor performance and costs

## Implementation Details

### 1. Environment Variables
```env
# Add to .env
OPENROUTER_API_KEY=sk-or-v1-YOUR_API_KEY
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_FALLBACK_MODELS=openai/gpt-4,mistralai/mixtral-8x7b
```

### 2. Centralized Service Structure
```typescript
// /src/services/openrouter.ts
interface OpenRouterConfig {
  apiKey: string;
  defaultModel: string;
  fallbackModels?: string[];
  maxRetries?: number;
  timeout?: number;
}

interface ChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

class OpenRouterService {
  async chat(request: ChatRequest): Promise<ChatResponse>
  async streamChat(request: ChatRequest): AsyncIterator<ChatChunk>
}
```

### 3. Model Recommendations per Agent

#### Producer Agent
- **Primary**: `anthropic/claude-3.5-sonnet` (fast, accurate for structured output)
- **Fallback**: `openai/gpt-4o` (reliable alternative)
- **Settings**: temperature: 0, max_tokens: 15000

#### Director Agent
- **Primary**: `anthropic/claude-3.5-sonnet` (creative capabilities)
- **Fallback**: `openai/gpt-4` (strong creative reasoning)
- **Settings**: temperature: 0.1, max_tokens: 15000

#### DoP Agent
- **Primary**: `anthropic/claude-3.5-sonnet` (technical precision)
- **Fallback**: `mistralai/mixtral-8x7b` (cost-effective)
- **Settings**: temperature: 0, max_tokens: 15000

#### Prompt Engineer Agent
- **Primary**: `anthropic/claude-3.5-sonnet` (excellent for prompt generation)
- **Fallback**: `openai/gpt-4o` (strong language capabilities)
- **Settings**: temperature: 0.1, max_tokens: 15000

### 4. Key Changes per Agent

#### Request Format Change
```typescript
// OLD (RunPod)
const payload = {
  input: {
    messages: [...],
    sampling_params: {
      max_tokens: 15000,
      temperature: 0,
      top_p: 1,
      top_k: 1
    }
  }
};

// NEW (OpenRouter)
const payload = {
  model: "anthropic/claude-3.5-sonnet",
  messages: [...],
  max_tokens: 15000,
  temperature: 0,
  stream: false
};
```

#### Response Handling Change
```typescript
// OLD (RunPod with polling)
// Complex polling logic with job ID

// NEW (OpenRouter)
// Direct response or streaming
const response = await openRouter.chat(payload);
```

### 5. Error Handling Strategy
- Rate limit handling (429 errors)
- Model availability fallback (502/503 errors)
- Balance monitoring (402 errors)
- Automatic retry with exponential backoff

### 6. Cost Optimization
- Use model routing for cost efficiency
- Implement token usage tracking
- Consider BYOK for high-volume usage
- Monitor per-agent costs

## Testing Plan

### Unit Tests
1. Test OpenRouter service with mock responses
2. Verify error handling scenarios
3. Test model fallback logic

### Integration Tests
1. Test each agent with OpenRouter
2. Verify JSON response parsing
3. Test complete workflow end-to-end

### Performance Tests
1. Compare response times vs RunPod
2. Monitor token usage per agent
3. Test concurrent request handling

## Rollback Plan
1. Keep RunPod configuration as fallback
2. Implement feature flag for provider switching
3. Monitor errors and automatically fallback if needed

## Timeline
- Week 1: Create OpenRouter service and test
- Week 2: Migrate Producer and Director agents
- Week 3: Migrate DoP and Prompt Engineer agents
- Week 4: Performance optimization and monitoring

## Success Metrics
- All agents functioning with OpenRouter
- Response times within acceptable range
- Cost per request optimized
- Error rate < 1%
- No degradation in output quality