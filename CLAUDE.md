# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start the Next.js development server on http://localhost:3000
- `npm run build` - Build the production-ready application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

### Testing
No test commands are currently configured. However, manual testing is done through:
- `test-tts` page for Vision Mode Enhanced and Enhanced Script Mode Legacy pipeline testing
- `music-video-pipeline` page for full music-aware pipeline
- `no-music-video-pipeline` page for visual-only content

### System Analysis & Debugging
- Read `COMPREHENSIVE_PIPELINE_OPTIMIZATION_PLAN.md` for detailed analysis of all pipelines
- Read `BOOTSTRAP_CLAUDE_FOR_SYSTEM_IMPROVEMENT.md` for systematic onboarding of new Claude sessions
- Use the test pages (`test-tts`, `music-video-pipeline`, `no-music-video-pipeline`) for manual testing
- Check `test_results/` folder for validated test cases and baseline performance measurements

## High-Level Architecture

### Multi-Agent Video Generation System
This project implements a sophisticated AI-powered video generation platform using a multi-agent architecture. The system orchestrates specialized AI agents to transform text descriptions into fully-edited music videos or visual-only videos.

### Core Pipelines

#### Music Video Pipeline (7 stages)
1. **Vision Understanding** - Extracts creative concept from user input
2. **Music Analysis** - Analyzes audio for BPM, beats, harmony, structure
3. **Music Producer** - Makes intelligent cut decisions based on music
4. **Music Director** - Creates beat-aligned creative vision
5. **Music DoP** - Develops rhythm-aware cinematography
6. **Music Prompt Engineer** - Generates music-synchronized FLUX prompts
7. **Image Generation** - Creates images via ComfyUI/FLUX

#### No-Music Video Pipeline (5 stages)
1. **Vision Understanding** - Extracts creative concept
2. **Director** - Creates story-driven beats
3. **DoP** - Develops visual cinematography
4. **Prompt Engineer** - Generates standard FLUX prompts
5. **Image Generation** - Creates images via ComfyUI/FLUX

#### Enhanced Script Mode Legacy Pipeline (7 stages)
1. **Script Formatting** - Cleans and optimizes user script for TTS
2. **TTS Generation** - Converts script to audio with duration calculation
3. **Enhanced Script Producer** - Creates cut points based on script content and user preferences
4. **Enhanced Script Director** - Develops visual beats with anti-repetition logic
5. **Enhanced Script DoP** - Professional cinematography with advanced technical specifications
6. **Enhanced Script Prompt Engineer** - Generates FLUX prompts with dynamic character consistency
7. **Image Generation** - Creates images via ComfyUI/FLUX with session isolation

### Agent System Architecture
- Each agent has a specialized role defined in `/src/agents/`
- Agents communicate via structured JSON contracts
- Each agent is exposed as an API endpoint in `/src/app/api/`
- Pipeline Router agent determines which pipeline to use

### Complete Agent File Organization by Pipeline

#### Music Video Pipeline (7 stages)
**Agents and Files:**
- `/src/agents/visionUnderstanding.ts` - Stage 1: Vision Understanding Agent
- `/src/utils/musicAnalysis.ts` - Stage 2: Music Analysis utilities  
- `/src/agents/musicProducer.tsx` - Stage 3: Music-Aware Producer Agent
- `/src/agents/musicDirector.ts` - Stage 4: Music Director Agent
- `/src/agents/musicDoP.ts` - Stage 5: Music DoP Agent
- `/src/agents/promptEngineer.tsx` - Stage 6: Prompt Engineer Agent (shared)

**API Endpoints:**
- `/src/app/api/vision-understanding/route.ts`
- `/src/app/api/music-analysis/route.ts`
- `/src/app/api/music-producer-agent/route.ts`
- `/src/app/api/music-director-agent/route.ts`
- `/src/app/api/music-dop-agent/route.ts`
- `/src/app/api/music-prompt-engineer-agent/route.ts`
- `/src/app/api/music-video-orchestrator/route.ts`

#### No-Music Video Pipeline (5 stages)
**Agents and Files:**
- `/src/agents/visionUnderstandingNoMusic.ts` - Stage 1: Vision Understanding (No Music)
- `/src/agents/directorNoMusic.ts` - Stage 2: No-Music Director Agent
- `/src/agents/dopNoMusic.ts` - Stage 3: No-Music DoP Agent
- `/src/agents/promptEngineerNoMusic.ts` - Stage 4: No-Music Prompt Engineer
- `/src/agents/mergedVisionDirectorNoMusic.ts` - Combined Vision+Director Agent
- `/src/agents/visionDirectorNoMusic.ts` - Vision Director Agent

**API Endpoints:**
- `/src/app/api/no-music-vision-understanding/route.ts`
- `/src/app/api/no-music-director-agent/route.ts`
- `/src/app/api/no-music-dop-agent/route.ts`
- `/src/app/api/no-music-prompt-engineer-agent/route.ts`
- `/src/app/api/merged-vision-director-agent/route.ts`

#### Enhanced Script Mode Legacy Pipeline (7 stages)
**Agents and Files:**
- `/src/agents/scriptFormattingAgent.ts` - Stage 1: Script Formatting
- `/src/agents/enhancedScriptProducer.ts` - Stage 3: Enhanced Script Producer
- `/src/agents/enhancedScriptDirector.ts` - Stage 4: Enhanced Script Director
- `/src/agents/enhancedScriptDop.ts` - Stage 5: Enhanced Script DoP
- `/src/agents/enhancedScriptPromptEngineer.ts` - Stage 6: Enhanced Script Prompt Engineer

**API Endpoints:**
- `/src/app/api/script-formatting/route.ts`
- `/src/app/api/enhanced-script-producer-agent/route.ts`
- `/src/app/api/enhanced-script-director-agent/route.ts`
- `/src/app/api/enhanced-script-dop-agent/route.ts`
- `/src/app/api/enhanced-script-prompt-engineer-agent/route.ts`

#### Shared/Common Agents and Files
**Core Agents:**
- `/src/agents/producer.tsx` - Legacy Producer Agent
- `/src/agents/director.tsx` - Standard Director Agent
- `/src/agents/dop.tsx` - Standard DoP Agent
- `/src/agents/promptEngineer.tsx` - Standard Prompt Engineer
- `/src/agents/visionEnhancedProducer.ts` - Vision Enhanced Producer
- `/src/agents/intelligentProducer.ts` - Intelligent Producer
- `/src/agents/videoPromptEngineer.ts` - Video Prompt Engineer

**Pipeline Infrastructure:**
- `/src/agents/pipelineRouter.ts` - Main Pipeline Router
- `/src/agents/enhancedPipelineRouter.ts` - Enhanced Pipeline Router
- `/src/agents/qwenVL.tsx` - Vision Language Model Agent
- `/src/agents/visionUnderstandingWithAudio.ts` - Vision+Audio Agent

**Shared API Endpoints:**
- `/src/app/api/producer-agent/route.ts`
- `/src/app/api/director-agent/route.ts`
- `/src/app/api/dop-agent/route.ts`
- `/src/app/api/prompt-engineer-agent/route.ts`
- `/src/app/api/vision-enhanced-producer-agent/route.ts`
- `/src/app/api/pipeline-router/route.ts`
- `/src/app/api/pipeline-router-enhanced/route.ts`

#### Pipeline-Specific Test Pages
- `/src/app/music-video-pipeline/page.tsx` - Music Video Pipeline testing
- `/src/app/no-music-video-pipeline/page.tsx` - No-Music Pipeline testing  
- `/src/app/test-tts/page.tsx` - Enhanced Script Mode testing

#### Supporting Infrastructure
- `/src/schemas/unified-agent-schemas.ts` - Agent schema definitions
- `/src/types/userContext.ts` - User context types
- `/src/types/scriptModeUserContext.ts` - Script mode context types
- `/src/config/llm-models.ts` - LLM configuration
- `/src/services/openrouter.ts` - OpenRouter integration

### Key Architectural Patterns
1. **Cognitive Diversity Rules** - Director enforces subject variety across beats to prevent repetition
2. **Anti-Repetition Logic** - Sliding window analysis (3-beat diversity checking) with scoring targets >0.8
3. **Character Consistency Protocols** - Dynamic character extraction with full appearance restatement in every prompt
4. **Music Synchronization** - Specialized agents understand tempo, harmony, and structure
5. **Progressive Enhancement** - Each agent builds upon previous agent outputs
6. **Error Boundaries** - Multi-level validation with graceful degradation
7. **Session Isolation** - Each script generation uses unique file identifiers to prevent cross-contamination

### LLM Integration
- Uses OpenRouter as the primary LLM gateway
- Model selection is configured in `/src/config/llm-models.ts`
- **Performance Optimized**: Using `deepseek/deepseek-r1-distill-llama-8b` for faster responses
- Different models for different agents (DeepSeek R1 Distill, Gemini 2.5, Claude 3.5)
- Implements retry logic with exponential backoff

### External Service Integrations
- **OpenRouter** - LLM access for all agents
- **ComfyUI** - FLUX image generation with concurrent processing (4 parallel jobs)
- **Google Cloud** - Text-to-speech and Gemini API
- **NVIDIA Services** - Audio transcription with word-level timestamps
- **RunPod** - Concurrent image generation with SSL compatibility fixes

### System Status (CURRENT STATE)
1. ✅ **Enhanced Script Mode Legacy** - Now at Vision Mode Enhanced quality level with professional standards
2. ✅ **Producer Agent Architecture** - All pipelines use specialized producer agents appropriately
3. ✅ **User-Requirement-First Design** - Dynamic pacing with ±5% duration tolerance across all modes
4. ✅ **Session Isolation** - Fixed concurrent user prompts overwriting issues
5. ✅ **Character Consistency** - Dynamic character extraction working across all Enhanced Script agents
6. ✅ **SSL Compatibility** - RunPod connectivity issues resolved with proper SSL context
7. 📊 **Performance Monitoring** - Real-time tracking of user requirement compliance and system quality

### Producer Agent Routing (CORRECTLY IMPLEMENTED)
- **Vision Mode Enhanced** → Uses `/api/vision-enhanced-producer-agent` (User-requirement-first, dynamic pacing) ✅
- **Enhanced Script Mode Legacy** → Uses `/api/enhanced-script-producer-agent` (Script-aware, user-requirement-first) ✅
- **Music Video Pipeline** → Uses `/api/music-producer-agent` (Musical intelligence) ✅  
- **No-Music Pipeline** → Uses built-in producer logic (Narrative-driven timing) ✅
- **Legacy Script Mode** → Uses `/api/producer-agent` (Engagement-optimized rapid cuts) ✅

### Agent Input/Output Structure Differences
```typescript
// Vision Enhanced Producer (Vision Mode Enhanced):
Input: { transcript, script, visionDocument, producer_instructions, userContext }
System: "USER REQUIREMENTS FIRST while maintaining technical excellence"
Pacing: Dynamic (slow: 8-10s, medium: 5-7s, fast: 2-4s)

// Enhanced Script Producer (Enhanced Script Mode Legacy):
Input: { transcript, formatted_script, scriptModeUserContext }
System: "USER REQUIREMENTS FIRST - Script content drives cut decisions"
Pacing: Dynamic (slow: 8-10s, medium: 5-7s, fast: 1-4s)
Features: Anti-repetition logic, character consistency, quality validation

// Legacy Producer (Legacy Script Mode):
Input: { transcript, script, producer_instructions }
System: "IDEAL: Aim for cuts every 2-4 seconds" (hardcoded engagement focus)

// Music Producer (Music Video Pipeline):
Input: { vision_document, music_analysis, user_duration_override }
System: Musical synchronization + duration intelligence
```

### Environment Variables Required
```
OPENROUTER_API_KEY=<your_key>
OPENROUTER_DEEPSEEK_API_KEY=<your_key>
GOOGLE_GEMINI_API_KEY=<your_key>
GOOGLE_CLOUD_API_KEY=<your_key>
RUNPOD_API_KEY=<your_key>
```

### Development Guidelines
1. **User Requirements First** - All agent modifications must prioritize user requirement compliance over creative preferences
2. **Dynamic Solutions** - Never hardcode beat counts, durations, or script-specific content - always extract dynamically
3. **Character Consistency** - Enhanced Script agents must maintain identical character descriptions across all prompts
4. **Anti-Repetition Logic** - Implement sliding window analysis for visual diversity (3-beat minimum check)
5. **Agent System Messages** - Include user requirement validation logic and quality scoring systems
6. **Pipeline Routing** - Ensure correct producer agent is used for each pipeline (see Producer Agent Routing section)
7. **JSON Error Handling** - Use `passThroughRawJson` utility to handle malformed LLM responses gracefully
8. **Session Isolation** - Use unique file identifiers (`prompts_${folderId}.json`) for concurrent user support
9. **Model Selection** - Refer to `/src/config/llm-models.ts` for recommended models per agent type
10. **Testing Protocol** - Test with validated test cases in `test_results/` folder to measure improvement
11. **Interface Upgrades** - Update TypeScript interfaces to match enhanced architecture, don't downgrade systems

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.