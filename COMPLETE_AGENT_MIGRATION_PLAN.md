# Complete Agent Migration Plan: RunPod/Gemini → OpenRouter

## Overview
This document provides a comprehensive plan for migrating all agents in the VinVideo Connected pipeline to use OpenRouter.

## Agent Pipeline Flow
```
Script Input
    ↓
1. Format Script (Currently: Google Gemini)
    ↓
2. Generate Audio (TTS - not modified)
    ↓
3. Transcribe Audio (Nvidia - not modified)
    ↓
4. Producer Agent (Currently: RunPod Qwen3-32B)
    ↓
5. Director Agent (Currently: RunPod Qwen3-32B)
    ↓
6. DoP Agent (Currently: RunPod Qwen3-32B)
    ↓
7. Prompt Engineer Agent (Currently: RunPod Qwen3-32B)
    ↓
8. Image Generation (ComfyUI - not modified)
```

## Step 1: Environment Setup

Add to `.env.local`:
```bash
# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE

# Optional: Specific models per agent (defaults to claude-3.5-sonnet)
OPENROUTER_FORMAT_MODEL=openai/gpt-4o
OPENROUTER_PRODUCER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_DIRECTOR_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_DOP_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_PROMPT_ENGINEER_MODEL=anthropic/claude-3.5-sonnet
```

## Step 2: Agent-by-Agent Migration

### 1. Format Script Agent
**File:** `/src/app/api/format-script/route.ts`
**Current:** Google Gemini (gemini-2.5-flash)
**New:** OpenRouter (gpt-4o recommended for cost)

**Key Changes:**
- Remove Google Generative AI SDK import
- Change to HTTP fetch call
- Use GPT-4o for cost-effective formatting
- Temperature: 0.3 (consistent formatting)

**Why GPT-4o:** Formatting is simpler than agent reasoning, GPT-4o is cheaper and excellent at text transformation.

### 2. Producer Agent
**File:** `/src/app/api/producer-agent/route.ts`
**Current:** RunPod Qwen3-32B
**New:** OpenRouter Claude 3.5 Sonnet

**Key Changes:**
- Remove polling logic (lines ~92-182)
- Direct response handling
- Temperature: 0 (precise cut points)
- Must generate 20-30 cuts per 60-90s

**Output:** JSON array of cut points with timestamps

### 3. Director Agent
**File:** `/src/app/api/director-agent/route.ts`
**Current:** RunPod Qwen3-32B
**New:** OpenRouter Claude 3.5 Sonnet

**Key Changes:**
- Remove polling logic
- Temperature: 0.1 (creative vision)
- Creates narrative beats from Producer cuts
- Implements subject diversity rules

**Output:** JSON with project metadata and narrative beats

### 4. DoP Agent
**File:** `/src/app/api/dop-agent/route.ts`
**Current:** RunPod Qwen3-32B
**New:** OpenRouter Claude 3.5 Sonnet

**Key Changes:**
- Remove polling logic
- Temperature: 0 (technical precision)
- Generates cinematography for each beat
- Shot specifications: size, angle, movement, lens, lighting

**Output:** JSON array of cinematography directions

### 5. Prompt Engineer Agent
**File:** `/src/app/api/prompt-engineer-agent/route.ts`
**Current:** RunPod Qwen3-32B
**New:** OpenRouter Claude 3.5 Sonnet

**Key Changes:**
- Remove polling logic
- Temperature: 0.1 (creative descriptions)
- Generates FLUX image prompts
- 15-40 words per prompt, 8 segments

**Output:** JSON array of indexed image prompts

## Step 3: Common Changes Across All Agents

### Remove (Delete These Lines):
```typescript
// 1. RunPod endpoint configuration
const endpointId = 'roow74ms9yz4ri';

// 2. Polling logic (typically lines 92-182)
if (result.id) {
  // ALL polling code
  const statusUrl = `https://api.runpod.ai/v2/${endpointId}/status/${result.id}`;
  // ... 90+ lines of polling
}

// 3. RunPod-specific error handling
if (result.status === 'IN_PROGRESS' || result.status === 'IN_QUEUE') {
  // ...
}
```

### Add (New Code):
```typescript
// 1. OpenRouter URL
const url = 'https://openrouter.ai/api/v1/chat/completions';

// 2. Simplified payload
const payload = {
  model: "anthropic/claude-3.5-sonnet",
  messages: [...],
  max_tokens: 15000,
  temperature: 0, // Varies by agent
  stream: false
};

// 3. Direct response handling
const content = result.choices[0].message.content;

// 4. Usage tracking
usage: result.usage // Add to response
```

## Step 4: Error Handling Pattern

Use this consistent error handling across all agents:
```typescript
if (!response.ok) {
  const errorData = await response.json();
  
  // Special handling for rate limits
  if (response.status === 429) {
    return NextResponse.json({
      error: 'Rate limited. Please try again later.',
      retryAfter: response.headers.get('X-RateLimit-Reset')
    }, { status: 429 });
  }
  
  return NextResponse.json({
    error: errorData.error?.message || `OpenRouter API error: ${response.status}`,
    details: errorData
  }, { status: response.status });
}
```

## Step 5: Testing Plan

### Unit Testing Each Agent:
1. **Format Script**: Test with various script lengths
2. **Producer**: Verify 20-30 cuts generated
3. **Director**: Check narrative beat structure
4. **DoP**: Validate cinematography JSON
5. **Prompt Engineer**: Confirm prompt count matches beats

### Integration Testing:
1. Run complete pipeline with sample script
2. Verify data flow between agents
3. Check JSON parsing at each step
4. Monitor response times
5. Track token usage

### Performance Metrics:
- Response time: Should be faster (no polling)
- Cost per request: Monitor via usage field
- Error rate: Should be < 1%
- Output quality: Should match or exceed current

## Step 6: Model Selection Guide

### Recommended Models by Task:
1. **Format Script**: `openai/gpt-4o` ($2.50/$10)
   - Simple transformation task
   - Cost-effective

2. **Producer Agent**: `anthropic/claude-3.5-sonnet` ($3/$15)
   - Structured output
   - Precise timing

3. **Director Agent**: `anthropic/claude-3.5-sonnet` ($3/$15)
   - Creative vision
   - Complex reasoning

4. **DoP Agent**: `anthropic/claude-3.5-sonnet` ($3/$15)
   - Technical precision
   - Structured output

5. **Prompt Engineer**: `anthropic/claude-3.5-sonnet` ($3/$15)
   - Creative descriptions
   - Consistent format

### Alternative Models (Cost Savings):
- `mistralai/mixtral-8x7b-instruct` ($0.24/$0.24)
- `openai/gpt-3.5-turbo` ($0.50/$1.50)
- `anthropic/claude-3-haiku` ($0.25/$1.25)

## Step 7: Rollback Strategy

Keep both implementations during transition:
```typescript
const useOpenRouter = process.env.USE_OPENROUTER === 'true';

if (useOpenRouter) {
  // New OpenRouter code
} else {
  // Existing RunPod code
}
```

## Migration Timeline

### Week 1:
- [ ] Add OpenRouter API key
- [ ] Migrate Format Script agent
- [ ] Test Format Script thoroughly

### Week 2:
- [ ] Migrate Producer Agent
- [ ] Migrate Director Agent
- [ ] Test Producer → Director flow

### Week 3:
- [ ] Migrate DoP Agent
- [ ] Migrate Prompt Engineer Agent
- [ ] Test complete pipeline

### Week 4:
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Remove old RunPod code

## Benefits After Migration

1. **Simpler Code**: ~360 lines removed (90 per agent)
2. **Faster Response**: No 5-second polling delays
3. **Better Reliability**: Automatic failover
4. **Cost Transparency**: Pay per token, not infrastructure
5. **Model Flexibility**: Easy to switch models
6. **Future Proof**: Access to new models automatically

## Common Pitfalls to Avoid

1. **Don't forget** to update API key name in each file
2. **Don't skip** JSON cleaning logic - it's still needed
3. **Don't change** system messages - they're optimized
4. **Don't modify** temperature without testing
5. **Don't remove** error handling for original script fallback