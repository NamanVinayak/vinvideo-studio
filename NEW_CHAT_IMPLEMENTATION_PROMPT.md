# Implementation Prompt for No-Music Pipeline Feature

## 🎯 **CONTEXT & OBJECTIVE**

You are working on a Next.js music video generation application that uses AI agents to create synchronized visual content. The codebase currently has a sophisticated **music video pipeline** that processes user concepts through multiple specialized AI agents to generate images.

**YOUR TASK:** Implement a "No Music" option that creates a completely separate pipeline bypassing all music-related processing.

## 🏗️ **CURRENT CODEBASE STRUCTURE**

### **Project Architecture:**
```
/src
├── agents/                    # AI agent system messages
│   ├── visionUnderstanding.ts
│   ├── musicProducer.tsx  
│   ├── musicDirector.ts
│   ├── musicDoP.ts
│   └── videoPromptEngineer.ts
├── app/
│   ├── music-video-pipeline/
│   │   └── page.tsx          # Main pipeline UI
│   └── api/                  # API routes for each agent
│       ├── vision-understanding/
│       ├── music-analysis/
│       ├── music-director-agent/
│       ├── music-dop-agent/
│       ├── music-prompt-engineer-agent/
│       └── generate-comfy-images-stream/
└── utils/                    # Utilities and ComfyUI integration
```

### **Current Pipeline Flow:**
```
1. Vision Understanding → Creative concept analysis
2. Music Analysis → Audio processing  
3. Producer → Timing blueprint & cut points
4. Director → Visual beats synchronized to music
5. DoP → Cinematography specs with musical rhythm
6. Prompt Engineer → FLUX prompts synthesis
7. ComfyUI FLUX → Image generation
```

## 🎵 **EXISTING AGENT ARCHITECTURE**

### **Agent System Message Pattern:**
Each agent has a specialized system message that defines its creative personality and output structure:

**Example Agent Structure:**
```typescript
export const AGENT_SYSTEM_MESSAGE = `You are **Agent Name** - Role Description.

Your Philosophy: [Creative approach and constraints]

Core Responsibilities:
1. [Specific task 1]
2. [Specific task 2]

Output Structure: [Required JSON format]

Professional Standards: [Never ask questions, always be decisive]`;
```

### **Key Agent Characteristics:**
- **Vision Understanding:** Transforms vague concepts into structured creative vision
- **Music Producer:** Creates timing blueprint based on musical analysis
- **Music Director:** Generates visual beats synchronized to musical rhythm  
- **Music DoP:** Creates cinematography specs that match musical frequencies
- **Prompt Engineer:** Synthesizes all outputs into FLUX generation prompts

### **Critical Agent Design Principles:**
1. **Never ask for clarification** - Always make confident creative decisions
2. **Output only JSON** - No markdown, no explanations
3. **Specialized expertise** - Each agent has narrow, deep domain knowledge
4. **Constraint inheritance** - Later agents must respect earlier agents' decisions

## 🖥️ **FRONTEND ARCHITECTURE**

### **Current UI Structure (`/src/app/music-video-pipeline/page.tsx`):**

**Key State Management:**
```typescript
interface MusicVideoState {
  stage: number;                    # Current pipeline stage (1-8)
  visionDocument: any;              # Stage 1 output
  musicAnalysis: any;               # Stage 2 output  
  directorBeats: any;               # Stage 4 output
  dopSpecs: any;                    # Stage 5 output
  promptEngineerResult: any;        # Stage 6 output
  generatedImages: string[];        # Stage 7 output
  loading: boolean;
  error: string | null;
}
```

**Pipeline Progression Pattern:**
```typescript
// Reactive stage transitions using useEffect
useEffect(() => {
  if (state.stage === 2 && state.visionDocument && !state.loading) {
    runStage2MusicAnalysis();
  }
}, [state.stage, state.visionDocument, state.loading]);
```

**Current Music Preference Options:**
```tsx
<select name="musicPreference" value={formData.musicPreference} onChange={handleInputChange}>
  <option value="auto">Auto-select based on mood</option>
  <option value="database">Choose from database</option>  
  <option value="upload">Upload custom track</option>
  {/* ADD THIS: */}
  <option value="no_music">No Music - Visual Only</option>
</select>
```

**Complete Form Data Structure:**
```typescript
const [formData, setFormData] = useState({
  concept: '',                    // Required user input
  pacing: 'moderate',            // contemplative|moderate|dynamic
  style: 'cinematic',            // cinematic|documentary|artistic  
  duration: 30,                  // seconds (5-300 range)
  musicPreference: 'auto',       // auto|database|upload|no_music
  contentType: 'abstract_thematic' // abstract_thematic|narrative_character
});
```

**Audio File Handling (Skip for No-Music):**
```typescript
const [audioFile, setAudioFile] = useState<File | null>(null);
const [audioFileName, setAudioFileName] = useState<string>('');

// Conditional file upload display
{formData.musicPreference === 'upload' && (
  <div className={styles.formGroup}>
    {/* Audio file upload UI - HIDE FOR NO-MUSIC */}
  </div>
)}
```

## 📋 **IMPLEMENTATION REQUIREMENTS**

### **READ THE DETAILED PLAN:**
First, carefully read the complete implementation plan in: `NO_MUSIC_PIPELINE_IMPLEMENTATION_PLAN.md`

### **CORE REQUIREMENTS:**

1. **Add "No Music" Option:**
   - Add `<option value="no_music">No Music - Visual Only</option>` to musicPreference dropdown
   - This selection should trigger completely different pipeline flow

2. **Create New Agent System Messages:**
   - `/src/agents/visionUnderstandingNoMusic.ts` - Enhanced with timing responsibilities
   - `/src/agents/directorNoMusic.ts` - Pure visual storytelling (no music sync)
   - `/src/agents/dopNoMusic.ts` - Narrative-driven cinematography  
   - `/src/agents/promptEngineerNoMusic.ts` - Non-music synthesis

3. **Create New API Routes:**
   - `/src/app/api/no-music-vision-understanding/route.ts`
   - `/src/app/api/no-music-director-agent/route.ts`
   - `/src/app/api/no-music-dop-agent/route.ts`
   - `/src/app/api/no-music-prompt-engineer-agent/route.ts`

4. **Modify Frontend Logic:**
   - Conditional stage indicators (hide music analysis/producer for no-music)
   - New useEffect chains for no-music pipeline progression
   - Route to different API endpoints based on musicPreference selection

### **NEW PIPELINE FLOW (No Music):**
```
1. Vision Understanding (Enhanced) → Concept + Timing Blueprint
2. Director (No Music) → Visual storytelling without musical sync
3. DoP (No Music) → Cinematography based on narrative flow
4. Prompt Engineer (No Music) → FLUX prompts synthesis  
5. ComfyUI FLUX → Image generation (unchanged)
```

## 🔑 **CRITICAL IMPLEMENTATION DETAILS**

### **Environment Variables Required:**
```bash
OPENROUTER_DEEPSEEK_API_KEY=your_openrouter_api_key_here
RUNPOD_API_KEY=your_runpod_api_key_here  # For ComfyUI image generation
```

### **Exact API Route Pattern:**
**Every new no-music API route MUST follow this pattern:**

```typescript
import { NextResponse } from 'next/server';
import { NO_MUSIC_AGENT_SYSTEM_MESSAGE } from '@/agents/agentNoMusic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { /* agent-specific inputs */ } = body;
    
    // CRITICAL: Use exact environment variable name
    const apiKey = process.env.OPENROUTER_DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter DeepSeek API key is not configured' 
      }, { status: 500 });
    }
    
    // EXACT OpenRouter payload structure  
    const payload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system", 
          content: NO_MUSIC_AGENT_SYSTEM_MESSAGE
        },
        {
          role: "user",
          content: userContent  // Agent-specific context
        }
      ],
      max_tokens: 6000,
      temperature: 0.2,           // Low for technical precision
      top_p: 0.4,                 // Focused responses
      frequency_penalty: 0.3,     // Encourage variety
      presence_penalty: 0.1,      // Slight diversity penalty
      stream: false
    };

    // EXACT OpenRouter request structure
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinvideo.ai',
        'X-Title': 'VinVideo Connected - No Music Agent'
      },
      body: JSON.stringify(payload)
    };

    const startTime = Date.now();
    const response = await fetch(url, options);
    const executionTime = Date.now() - startTime;
    
    // CRITICAL: JSON cleaning logic
    const result = await response.json();
    const agentResponse = result.choices[0]?.message?.content;
    
    let cleanedResponse = agentResponse.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(7, -3).trim();
    } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3, -3).trim();
    }
    
    const parsedOutput = JSON.parse(cleanedResponse);
    
    return NextResponse.json({
      success: true,
      [stageOutputKey]: parsedOutput,  // e.g., stage2_director_output
      executionTime,
      rawResponse: agentResponse,
      usage: result.usage
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
```

### **Frontend State Management Pattern:**
```typescript
// Stage Execution Flags (prevent duplicate runs)
const [stageExecutionFlags, setStageExecutionFlags] = useState({
  stage2Running: false,    // Music Analysis (SKIP FOR NO-MUSIC)
  stage4Running: false,    // Director (becomes stage2Running for no-music)
  stage5Running: false,    // DoP (becomes stage3Running for no-music)  
  stage6Running: false,    // Prompt Engineer (becomes stage4Running for no-music)
  stage7Running: false     // Image Generation (becomes stage5Running for no-music)
});

// Project Organization
const [projectFolderId] = useState(() => `music-video-${Date.now()}`);

// Complete Workflow Reset Pattern
const runCompleteWorkflow = async () => {
  // Reset execution flags for new workflow
  setStageExecutionFlags({
    stage2Running: false,
    stage4Running: false,
    stage5Running: false,
    stage6Running: false,
    stage7Running: false
  });
  
  setState(prev => ({ 
    ...prev, 
    loading: true, 
    error: null, 
    currentStep: formData.musicPreference === 'no_music' ? 
      'Starting no-music video pipeline...' : 
      'Starting music video pipeline...',
    stage: 1,
    pipelineType: formData.musicPreference === 'no_music' ? 'no_music' : 'music',
    visionDocument: null,
    musicAnalysis: null,
    directorBeats: null,
    dopSpecs: null,
    promptEngineerResult: null,
    generatedImages: [],
    imageGenerationProgress: {
      currentIndex: 0,
      totalImages: 0,
      percentage: 0,
      isGenerating: false,
      message: ''
    }
  }));
  
  if (formData.musicPreference === 'no_music') {
    await runNoMusicPipeline();
  } else {
    await runMusicPipeline(); // existing logic unchanged
  }
};
```

### **Enhanced Vision Understanding Agent:**
The no-music Vision agent must take on Producer responsibilities:

**Additional Output Structure:**
```json
{
  "timing_blueprint": {
    "total_duration": 60,
    "cut_strategy": "narrative_flow", 
    "optimal_cut_count": 8,
    "cut_points": [
      {
        "cut_number": 1,
        "cut_time": 7.5,
        "narrative_reason": "Concept establishment complete",
        "content_transition": "Introduction to exploration"
      }
    ]
  }
}
```

### **Agent System Message Transformation:**
For each new no-music agent:

**REMOVE these elements:**
- Musical synchronization terminology
- Beat alignment logic
- Frequency-based movement translation  
- Musical rhythm references
- Producer dependencies

**ENHANCE these elements:**
- Pure narrative timing
- Content-driven pacing
- Story-based transitions
- Emotional flow guidance
- Cognitive processing considerations

### **Complete useEffect Pattern for No-Music Pipeline:**
```typescript
// EXISTING: Stage 1 → Stage 2 (Music Analysis) - Add pipelineType check
useEffect(() => {
  if (state.pipelineType === 'music' && 
      state.stage === 2 && 
      state.visionDocument && 
      !state.loading) {
    console.log('🔄 Auto-triggering Stage 2: Music Analysis');
    runStage2MusicAnalysis();
  }
}, [state.stage, state.visionDocument, state.loading, state.pipelineType]);

// NEW: Stage 1 → Stage 2 (No-Music Director)
useEffect(() => {
  if (state.pipelineType === 'no_music' && 
      state.stage === 2 && 
      state.visionDocument && 
      !state.loading) {
    console.log('🔄 Auto-triggering Stage 2: No-Music Director');
    runNoMusicDirector();
  }
}, [state.stage, state.visionDocument, state.loading, state.pipelineType]);

// NEW: Stage 2 → Stage 3 (No-Music DoP)
useEffect(() => {
  if (state.pipelineType === 'no_music' && 
      state.stage === 3 && 
      state.directorBeats && 
      !state.loading) {
    console.log('🔄 Auto-triggering Stage 3: No-Music DoP');
    runNoMusicDoP();
  }
}, [state.stage, state.directorBeats, state.loading, state.pipelineType]);

// NEW: Stage 3 → Stage 4 (No-Music Prompt Engineer)
useEffect(() => {
  if (state.pipelineType === 'no_music' && 
      state.stage === 4 && 
      state.dopSpecs && 
      !state.loading) {
    console.log('🔄 Auto-triggering Stage 4: No-Music Prompt Engineer');
    runNoMusicPromptEngineer();
  }
}, [state.stage, state.dopSpecs, state.loading, state.pipelineType]);

// NEW: Stage 4 → Stage 5 (Image Generation) - Reuse existing
useEffect(() => {
  if (state.pipelineType === 'no_music' && 
      state.stage === 5 && 
      state.promptEngineerResult && 
      !state.loading) {
    console.log('🔄 Auto-triggering Stage 5: Image Generation');
    runStage7ImageGeneration(); // Reuse existing image generation
  }
}, [state.stage, state.promptEngineerResult, state.loading, state.pipelineType]);
```

### **Conditional Stage Indicators:**
```tsx
<div className={styles.stageIndicator}>
  {state.pipelineType === 'no_music' ? (
    // NO-MUSIC PIPELINE STAGES (1-6)
    <>
      <div className={`${styles.stage} ${state.stage >= 1 ? styles.active : ''}`}>
        1. Concept Analysis
      </div>
      <div className={`${styles.stage} ${state.stage >= 2 ? styles.active : ''}`}>
        2. Visual Storytelling
      </div>
      <div className={`${styles.stage} ${state.stage >= 3 ? styles.active : ''}`}>
        3. Cinematography
      </div>
      <div className={`${styles.stage} ${state.stage >= 4 ? styles.active : ''}`}>
        4. Prompt Engineering
      </div>
      <div className={`${styles.stage} ${state.stage >= 5 ? styles.active : ''}`}>
        5. Image Generation
      </div>
      <div className={`${styles.stage} ${state.stage >= 6 ? styles.active : ''}`}>
        6. Complete!
      </div>
    </>
  ) : (
    // EXISTING MUSIC PIPELINE STAGES (1-8) - unchanged
    <>
      <div className={`${styles.stage} ${state.stage >= 1 ? styles.active : ''}`}>
        1. Concept Analysis
      </div>
      <div className={`${styles.stage} ${state.stage >= 2 ? styles.active : ''}`}>
        2. Music Analysis
      </div>
      {/* ... rest of existing stages unchanged ... */}
    </>
  )}
</div>

{/* Conditional Audio Upload - HIDE FOR NO-MUSIC */}
{formData.musicPreference === 'upload' && state.pipelineType !== 'no_music' && (
  <div className={styles.formGroup}>
    <label htmlFor="audioFile">Upload Audio File:</label>
    {/* Audio file upload UI */}
  </div>
)}

{/* Conditional Result Display */}
{state.directorBeats && (
  <div className={styles.result}>
    <h2>✅ Stage {state.pipelineType === 'no_music' ? '2' : '4'} Complete: 
      {state.pipelineType === 'no_music' ? 'Visual Storytelling' : 'Music Director'}
    </h2>
    {/* Results display */}
  </div>
)}
```

## 🚨 **CRITICAL CONSTRAINTS**

### **Backwards Compatibility:**
- **NEVER modify existing agent files** - Create completely new files
- **NEVER modify existing API routes** - Create new routes  
- **Original pipeline must remain 100% unchanged** for other music options
- Only "no_music" selection should trigger new pipeline

### **Agent Design Constraints:**
- **Maintain agent personality and confidence** from original agents
- **Never ask for clarification** - Always make decisive creative choices
- **Output only valid JSON** - No markdown, no explanations
- **Preserve creative quality** - No-music pipeline should be equally sophisticated

### **Technical Constraints:**
- **Follow existing API route patterns** exactly
- **Use same OpenRouter/DeepSeek integration** as existing agents
- **Maintain same error handling patterns**
- **ComfyUI integration remains unchanged**

## 🎯 **IMPLEMENTATION SUCCESS CRITERIA**

### **Functionality:**
- [ ] "No Music" option appears in dropdown
- [ ] Selecting it bypasses all music-related stages
- [ ] Vision agent generates timing blueprint successfully  
- [ ] Director creates narrative-driven visual beats
- [ ] DoP produces complete cinematography specs
- [ ] Prompt Engineer synthesizes non-music elements
- [ ] Generated images maintain quality and coherence
- [ ] Original music pipeline completely unaffected

### **User Experience:**
- [ ] Different stage indicators for no-music pipeline
- [ ] Smooth progression through 5 stages (instead of 8)
- [ ] Clear visual feedback about pipeline type
- [ ] Error handling covers no-music scenarios
- [ ] Performance matches existing pipeline

## 📚 **REFERENCE MATERIALS**

### **Study These Files First:**
1. **Agent System Messages:** `/src/agents/musicDirector.ts` - Study the personality and output structure
2. **API Route Pattern:** `/src/app/api/music-director-agent/route.ts` - Follow this exact pattern
3. **Frontend Integration:** `/src/app/music-video-pipeline/page.tsx` - Lines 144-204 (useEffect chains)
4. **Agent Output Parsing:** Look at `parseCinematographyFromResponse` function patterns

### **System Message Examples:**
Look at how existing agents handle:
- Creative decisiveness: "You never hesitate, never ask for clarification"
- JSON-only output: "Return ONLY a JSON object with this exact structure"
- Professional constraints: "ALWAYS make confident creative decisions"
- Domain expertise: Each agent's specialized vocabulary and approach

## 🚀 **IMPLEMENTATION ORDER**

1. **Create new agent system messages** (study existing patterns first)
2. **Create new API routes** (copy existing route structure)  
3. **Add frontend dropdown option** and conditional logic
4. **Implement new useEffect chains** for no-music progression
5. **Add conditional stage indicators**
6. **Test thoroughly** - both pipelines should work independently
7. **Verify backwards compatibility** - existing functionality unchanged

## ⚠️ **FINAL NOTES**

- **Read the detailed plan first:** `NO_MUSIC_PIPELINE_IMPLEMENTATION_PLAN.md`
- **Study existing code patterns** before creating new files
- **Test both pipelines** to ensure no interference
- **Maintain code quality standards** of the existing codebase
- **Ask clarifying questions** if implementation details are unclear

The goal is a seamless user experience where selecting "No Music" provides an equally sophisticated creative pipeline optimized for pure visual storytelling without any musical dependencies.