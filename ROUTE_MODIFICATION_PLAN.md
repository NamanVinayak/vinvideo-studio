# Route Modification Plan: RunPod → OpenRouter

## Overview
Simple, focused plan to change the API calls in your 4 agent routes from RunPod to OpenRouter.

## Step 1: Add OpenRouter API Key

Add to `.env.local`:
```bash
# OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
```

## Step 2: Key Changes for Each Route

### What Changes in Every Route:

1. **URL Change**
   ```typescript
   // OLD: RunPod
   const url = `https://api.runpod.ai/v2/${endpointId}/run`;
   
   // NEW: OpenRouter  
   const url = 'https://openrouter.ai/api/v1/chat/completions';
   ```

2. **Headers Change**
   ```typescript
   // OLD: RunPod
   headers: {
     'Authorization': `Bearer ${apiKey}`,
     'Content-Type': 'application/json'
   }
   
   // NEW: OpenRouter
   headers: {
     'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
     'Content-Type': 'application/json',
     'HTTP-Referer': 'https://vinvideo.ai', // Optional but recommended
     'X-Title': 'VinVideo Connected' // Optional but recommended
   }
   ```

3. **Request Body Change**
   ```typescript
   // OLD: RunPod
   const payload = {
     input: {
       messages: [
         { role: "system", content: SYSTEM_MESSAGE },
         { role: "user", content: userContent }
       ],
       sampling_params: {
         max_tokens: 15000,
         temperature: 0,
         top_p: 1,
         top_k: 1
       }
     }
   };
   
   // NEW: OpenRouter
   const payload = {
     model: "anthropic/claude-3.5-sonnet", // or any model you prefer
     messages: [
       { role: "system", content: SYSTEM_MESSAGE },
       { role: "user", content: userContent }
     ],
     max_tokens: 15000,
     temperature: 0,
     stream: false
   };
   ```

4. **Remove All Polling Logic**
   ```typescript
   // DELETE all this polling code (lines ~92-182 in each file):
   if (result.id) {
     // All the polling logic...
   }
   ```

5. **Simplify Response Handling**
   ```typescript
   // OLD: Complex polling and status checking
   
   // NEW: Direct response
   const response = await fetch(url, options);
   const result = await response.json();
   
   if (!response.ok) {
     throw new Error(result.error?.message || 'OpenRouter API error');
   }
   
   // Extract content directly
   const content = result.choices[0].message.content;
   ```

## Step 3: Specific Changes Per Route

### Producer Agent (`/src/app/api/producer-agent/route.ts`)
```typescript
// Line 21: Change API key check
const apiKey = process.env.OPENROUTER_API_KEY;

// Line 28: Remove endpointId

// Line 66-89: Replace with OpenRouter call
const url = 'https://openrouter.ai/api/v1/chat/completions';
const payload = {
  model: "anthropic/claude-3.5-sonnet",
  messages: [
    { role: "system", content: PRODUCER_SYSTEM_MESSAGE },
    { role: "user", content: userContent }
  ],
  max_tokens: 15000,
  temperature: 0
};

// Line 92-182: Delete all polling logic

// Line 126-160: Replace with simple response handling
const producerResponse = result.choices[0].message.content;
```

### Director Agent (`/src/app/api/director-agent/route.ts`)
Same pattern as Producer Agent:
- Change API key (line 21)
- Update URL and payload format (line 66-89)
- Remove polling (line 92-182)
- Simplify response handling

### DoP Agent (`/src/app/api/dop-agent/route.ts`)
Same pattern as above

### Prompt Engineer Agent (`/src/app/api/prompt-engineer-agent/route.ts`)
Same pattern, but note:
- Temperature is 0.1 instead of 0 (line 70)

## Step 4: Response Processing (Same for All)

The JSON cleaning logic stays the same:
```typescript
try {
  // Clean the response by removing markdown code blocks
  let cleanedResponse = producerResponse.trim();
  
  if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(7, -3).trim();
  } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(3, -3).trim();
  }
  
  const parsedOutput = JSON.parse(cleanedResponse);
  
  return NextResponse.json({
    success: true,
    [outputKey]: parsedOutput, // cutPoints, directorOutput, dopOutput, or promptsOutput
    rawResponse: producerResponse
  });
} catch (parseError) {
  // Return raw response if parsing fails
  return NextResponse.json({
    success: true,
    rawResponse: producerResponse,
    warning: 'Response could not be parsed as JSON'
  });
}
```

## Step 5: Error Handling

Replace RunPod error handling with OpenRouter:
```typescript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json();
    
    // Handle rate limits
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
  
  // Process successful response...
} catch (error) {
  console.error('Error in agent endpoint:', error);
  return NextResponse.json({
    error: error instanceof Error ? error.message : 'An unexpected error occurred'
  }, { status: 500 });
}
```

## Summary of Changes

1. **Replace API endpoint**: RunPod → OpenRouter
2. **Update headers**: Add OpenRouter auth
3. **Simplify payload**: Remove `input` wrapper, use OpenAI format
4. **Delete polling**: Remove ~90 lines of polling code
5. **Direct response**: Get content from `choices[0].message.content`
6. **Keep JSON cleaning**: The response parsing logic stays the same

## Benefits

- **Simpler code**: Remove ~90 lines of polling logic per route
- **Faster responses**: No more 5-second polling intervals
- **Better reliability**: OpenRouter handles failover automatically
- **More models**: Easy to switch between Claude, GPT-4, etc.

## Testing

After making changes:
1. Test each agent individually
2. Verify JSON responses parse correctly
3. Check error handling with invalid inputs
4. Monitor response times