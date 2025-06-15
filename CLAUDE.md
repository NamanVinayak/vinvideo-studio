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
- `test-tts` page for Vision Mode Enhanced pipeline testing
- `music-video-pipeline` page for full music-aware pipeline
- `no-music-video-pipeline` page for visual-only content

### System Analysis & Debugging
- Read `COMPREHENSIVE_PIPELINE_OPTIMIZATION_PLAN.md` for detailed analysis of all 4 pipelines
- Read `BOOTSTRAP_CLAUDE_FOR_SYSTEM_IMPROVEMENT.md` for systematic onboarding of new Claude sessions
- Use the test pages (`test-tts`, `music-video-pipeline`, `no-music-video-pipeline`) for manual testing

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

### Agent System Architecture
- Each agent has a specialized role defined in `/src/agents/`
- Agents communicate via structured JSON contracts
- Each agent is exposed as an API endpoint in `/src/app/api/`
- Pipeline Router agent determines which pipeline to use

### Key Architectural Patterns
1. **Cognitive Diversity Rules** - Director enforces subject variety across beats to prevent repetition
2. **Music Synchronization** - Specialized agents understand tempo, harmony, and structure
3. **Progressive Enhancement** - Each agent builds upon previous agent outputs
4. **Error Boundaries** - Multi-level validation with graceful degradation

### LLM Integration
- Uses OpenRouter as the primary LLM gateway
- Model selection is configured in `/src/config/llm-models.ts`
- **Performance Optimized**: Using `deepseek/deepseek-r1-distill-llama-8b` for faster responses
- Different models for different agents (DeepSeek R1 Distill, Gemini 2.5, Claude 3.5)
- Implements retry logic with exponential backoff

### External Service Integrations
- **OpenRouter** - LLM access for all agents
- **ComfyUI** - FLUX image generation
- **Google Cloud** - Text-to-speech and Gemini API
- **NVIDIA Services** - Audio transcription
- **RunPod** - Legacy integration (being phased out)

### Critical System Issues (URGENT)
1. **Producer Agent Architectural Mismatch** - Vision Mode Enhanced uses legacy rapid-cut producer instead of user-requirement-aware producers
2. **Duration Requirement Violations** - 100% failure rate across all test cases (users request 15s, get 27s+ videos)  
3. **Pacing Logic Completely Broken** - "Contemplative" pacing produces rapid cuts instead of slow cuts
4. **Director Agent JSON Failures** - 60% failure rate due to token limit conflicts
5. **User Requirement Blindness** - Agents prioritize internal logic over explicit user specifications

### Producer Agent Routing (KEY ARCHITECTURAL ISSUE)
- **Vision Mode Enhanced** → Currently uses `/api/producer-agent` (Legacy, hardcoded rapid cuts) ❌
- **Music Video Pipeline** → Uses `/api/music-producer-agent` (Musical intelligence) ✅  
- **Intelligent Pipeline** → Uses `/api/music-analysis` (Creative intelligence) ✅
- **SOLUTION NEEDED**: Create Vision Enhanced Producer Agent for test-tts pipeline

### Agent Input/Output Structure Differences
```typescript
// Legacy Producer (current Vision Mode Enhanced):
Input: { transcript, script, producer_instructions }
System: "IDEAL: Aim for cuts every 2-4 seconds" (hardcoded)

// Music Producer (what music pipeline uses):
Input: { vision_document, music_analysis, user_duration_override }
System: Musical synchronization + duration intelligence

// Intelligent Producer (what intelligent pipeline uses):
Input: { visionDocument, musicPreference, audioFile, preAnalyzedMusic }
System: Creative decision-making + narrative context
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
2. **Agent System Messages** - When modifying agents, ensure system messages include user requirement validation logic
3. **Pipeline Routing** - Ensure correct producer agent is used for each pipeline (see Producer Agent Routing section)
4. **JSON Error Handling** - Pass raw responses to downstream agents instead of blocking on syntax errors
5. **Model Selection** - Refer to `/src/config/llm-models.ts` for recommended models per agent type
6. **Testing Protocol** - Test with same 5 test cases in `test_results/` folder to measure improvement
7. **Duration Logic** - Ensure all duration calculations respect user input exactly (no creative interpretation)

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.