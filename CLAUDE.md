iy# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start the Next.js development server on http://localhost:3000
- `npm run build` - Build the production-ready application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

### Testing
No test commands are currently configured. Consider adding tests to the pipeline validation logic.

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
- Different models for different agents (DeepSeek R1, Gemini 2.5, Claude 3.5)
- Implements retry logic with exponential backoff

### External Service Integrations
- **OpenRouter** - LLM access for all agents
- **ComfyUI** - FLUX image generation
- **Google Cloud** - Text-to-speech and Gemini API
- **NVIDIA Services** - Audio transcription
- **RunPod** - Legacy integration (being phased out)

### Critical Implementation Details
1. **Stage 2 Music Analysis** - Was failing silently; now has robust error handling
2. **Character Consistency** - Maintained across all generated images
3. **Anti-Repetition Engine** - Prevents lazy visual repetition, especially for abstract concepts
4. **Parallel Image Generation** - Images generated in batches for efficiency

### Environment Variables Required
```
OPENROUTER_DEEPSEEK_API_KEY=<your_key>
GOOGLE_GEMINI_API_KEY=<your_key>
GOOGLE_CLOUD_API_KEY=<your_key>
RUNPOD_API_KEY=<your_key>
```

### Development Guidelines
1. **Agent Modifications** - When modifying agents, ensure system messages remain clear and structured output contracts are maintained
2. **Pipeline Changes** - Test both music and no-music pipelines when making core changes
3. **Error Handling** - Always implement proper error boundaries and user-friendly messages
4. **Model Selection** - Refer to `/src/config/llm-models.ts` for recommended models per agent type
5. **API Routes** - Follow Next.js App Router conventions when adding new endpoints