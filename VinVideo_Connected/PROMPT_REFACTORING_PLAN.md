# ✅ APPROVED: Prompt Refactoring Plan (Enhanced)

**Status: APPROVED for Phase 1 implementation**

**Enhanced Strategy**: After expert technical review, this plan has been enhanced with versioning and dynamic content support to address all identified concerns.

## Phase 1: Prompt Refactoring (Immediate Implementation)

This plan refactors hardcoded agent system messages into an external, manageable configuration system with versioning and template support.

### Enhanced Features (Added Based on Review)

1. **Versioning System**: Support for prompt versions (e.g., `director.v1.md`, `director.v2.md`)
2. **Dynamic Content**: Template literals for user data injection (e.g., `${userName}`, `${duration}`)
3. **Template Inheritance**: Base templates with specializations for common patterns
4. **Performance Optimization**: In-memory caching with hot-reload for development

### Implementation Scope
- **44 agent system messages** across all pipelines
- **Total prompt codebase**: ~220KB of content to externalize
- **Complex agents**: Merged Vision Director (289 lines), Enhanced Prompt Engineers
- **Estimated effort**: 8-10 weeks for complete migration

## Enhanced Template System Architecture

```typescript
// Enhanced PromptLoader with versioning and templating
interface TemplateContext {
  userContext?: UserContext;
  visionDocument?: VisionDocument;
  musicAnalysis?: MusicAnalysis;
  stylePreferences?: StylePreferences;
}

// Template with versioning
await loadPrompt('music-pipeline', 'director', { 
  version: 'v2',
  context: templateContext 
});
```

### **The Goal**

To move the large system message strings currently inside the agent TypeScript files (e.g., `ENHANCED_SCRIPT_DIRECTOR_SYSTEM_MESSAGE`) into separate files that can be loaded at runtime.

### **Step 1: Create a New Directory for Prompts**

We need a dedicated place to store all our prompt configurations.

1.  Create a new directory at the root of the project: `/prompts`.
2.  Inside `/prompts`, create subdirectories for each pipeline to keep things organized:
    *   `/prompts/music-video/`
    *   `/prompts/vision-enhanced/`
    *   `/prompts/no-music/`
    *   `/prompts/script-mode/`
    *   `/prompts/shared/` (for prompts used by multiple pipelines)

### **Step 2: Externalize the Prompts**

For each agent, we will move its system message into a new file. We'll use `.md` (Markdown) files, as this is a good format for long text blocks and allows for nice formatting if we ever want to view them outside the app.

**Example: Refactoring the `EnhancedScriptDirector`**

1.  **Create the prompt file:**
    *   **File Path:** `/prompts/script-mode/enhanced-script-director.md`
    *   **Content:** Copy the entire string from the `ENHANCED_SCRIPT_DIRECTOR_SYSTEM_MESSAGE` constant and paste it into this new file.

2.  **The file `enhanced-script-director.md` would look like this:**
    ```markdown
    You are the **Enhanced Script Director** - Master of script-aware visual storytelling...
    ...
    (The entire, long prompt string goes here)
    ...
    Remember: You're creating visuals for the USER'S EXACT SCRIPT...
    ```

### **Step 3: Create a Prompt Loader Service**

We need a simple, efficient way to load these prompt files from our code. We'll create a utility that can read a prompt file and cache it in memory so we don't have to read from the disk on every single API request.

**File:** `src/services/PromptLoader.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

// A simple in-memory cache to store prompts after they're read once.
const promptCache = new Map<string, string>();

/**
 * Loads a prompt from the /prompts directory.
 * Caches the prompt in memory to avoid repeated file reads.
 * 
 * @param pipeline - The name of the pipeline (e.g., 'script-mode').
 * @param agentName - The name of the agent (e.g., 'enhanced-script-director').
 * @returns The prompt content as a string.
 */
export async function loadPrompt(pipeline: string, agentName: string): Promise<string> {
  const cacheKey = `${pipeline}:${agentName}`;

  // 1. Check if the prompt is already in our cache
  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  // 2. If not, build the file path
  const promptPath = path.join(process.cwd(), 'prompts', pipeline, `${agentName}.md`);

  try {
    // 3. Read the file from the disk
    const promptContent = await fs.readFile(promptPath, 'utf-8');

    // 4. Store it in the cache for next time
    promptCache.set(cacheKey, promptContent);

    return promptContent;
  } catch (error) {
    console.error(`Failed to load prompt for ${agentName} in ${pipeline} pipeline.`, error);
    // Fallback to a generic error message to prevent crashes
    return 'Error: Could not load system prompt.';
  }
}
```

### **Step 4: Update the Agents to Use the Loader**

Now, we'll go back to our agent files and replace the giant hardcoded strings with a call to our new `loadPrompt` service.

**Example: Updating `/src/agents/enhanced-script-pipeline/enhanced-script-director.ts`**

**Before (Current Way):**
```typescript
export const ENHANCED_SCRIPT_DIRECTOR_SYSTEM_MESSAGE = `You are the **Enhanced Script Director**...`;

// ... later in the code ...
const response = await callOpenAI({
  model: '...',
  messages: [
    { role: 'system', content: ENHANCED_SCRIPT_DIRECTOR_SYSTEM_MESSAGE },
    // ...
  ]
});
```

**After (New Way):**
```typescript
import { loadPrompt } from '@/services/PromptLoader';

// ... later in the code ...

// Load the prompt dynamically
const systemMessage = await loadPrompt('script-mode', 'enhanced-script-director');

const response = await callOpenAI({
  model: '...',
  messages: [
    { role: 'system', content: systemMessage },
    // ...
  ]
});
```

### **Benefits of This Refactoring**

1.  **Separation of Concerns:** The agent's *logic* (the TypeScript code) is now cleanly separated from its *configuration* (the Markdown prompt file).
2.  **Easy Maintenance:** To update a prompt, you just edit a `.md` file. No need to touch the application code, which is safer and faster.
3.  **Improved Collaboration:** Non-programmers can now easily review and suggest changes to the prompts. This is huge for improving the creative output of our agents.
4.  **Cleaner Code:** Our agent files will become much smaller and easier to read, focusing only on the logic of handling requests and calling the AI.
5.  **Versioning:** We can use Git to track changes to our prompts just like we track changes to our code, giving us a clear history of how our agents' personalities have evolved.
