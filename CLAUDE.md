# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start the Next.js development server on http://localhost:3000
- `npm run build` - Build the production-ready application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

### Testing & Quality Assurance
- Manual testing through dedicated pages: `/test-tts`, `/music-video-pipeline`, `/no-music-video-pipeline`
- Response tracking in `temp_files/test_results/` with incremental Test_X numbering
- Agent performance validation using existing test cases for regression prevention
- Duration compliance testing (±5% tolerance requirement)

### Debugging & Monitoring
- All agent responses auto-saved to `temp_files/test_results/` for quality tracking
- Response saver utility tracks execution times, token usage, and model performance
- PassThroughRawJson utility preserves content flow even with JSON parsing failures
- Multi-strategy JSON extraction (4 fallback methods) for robust error recovery

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

### System Status & Approved Implementation Strategy
1. ✅ **Production System** - 4 pipelines operational with sophisticated error recovery
2. ✅ **Phase 1 Approved** - Prompt Refactoring (44 agents, 8-10 weeks) for maintainability
3. ✅ **Phase 2 Approved** - Parallel Execution (Music Video Pipeline, 4-6 weeks) for 30-40% performance gain
4. ❌ **Event-Driven Architecture CANCELLED** - Incompatible with Next.js, security risks
5. 📊 **Quality Metrics** - 95%+ duration compliance, 90%+ JSON parsing success with fallbacks

### Producer Agent Routing (CORRECTLY IMPLEMENTED)
- **Vision Mode Enhanced** → Uses `/api/vision-enhanced-producer-agent` (User-requirement-first, dynamic pacing) ✅
- **Music Video Pipeline** → Uses `/api/music-producer-agent` (Musical intelligence) ✅  
- **No-Music Pipeline** → Uses built-in producer logic (Narrative-driven timing) ✅
- **Legacy Script Mode** → Uses `/api/producer-agent` (Engagement-optimized rapid cuts) ✅

### Agent Input/Output Structure Differences
```typescript
// Vision Enhanced Producer (Vision Mode Enhanced):
Input: { transcript, script, visionDocument, producer_instructions, userContext }
System: "USER REQUIREMENTS FIRST while maintaining technical excellence"
Pacing: Dynamic (slow: 8-10s, medium: 5-7s, fast: 2-4s)

// Legacy Producer (Script Mode):
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

### Development Guidelines & Architecture Patterns

#### Core Development Principles
1. **User Requirements First** - All agents must prioritize exact user requirement compliance (duration ±5%, style, pacing)
2. **Error Recovery Preservation** - Maintain sophisticated JSON parsing strategies and PassThroughRawJson utility
3. **Agent System Messages** - Use standardized schemas from `/src/schemas/unified-agent-schemas.ts`
4. **Pipeline Integrity** - Each pipeline has specialized agents; maintain correct routing patterns
5. **Response Quality** - All agents auto-save responses; validate against existing test cases

#### Critical Architecture Patterns
- **Sequential Pipeline Execution** - `/src/app/api/execute-pipeline/route.ts` orchestrates 4-8 stage workflows
- **Multi-Strategy Error Recovery** - Vision Enhanced Producer implements 4-tier JSON extraction
- **Agent Communication** - Structured JSON contracts with progressive enhancement between stages
- **Session Management** - Request-scoped execution with automatic test folder allocation
- **Model Optimization** - Agent-specific model selection in `/src/config/llm-models.ts`

#### Implementation Requirements (Approved Strategy)
- **Phase 1**: Externalize 44 agent prompts to template system with versioning
- **Phase 2**: Implement Promise.all() parallel execution for Vision+Music Analysis
- **Phase 3**: Evidence-based progression only; avoid major architectural changes
- **Preserve**: User requirement tracking, error recovery systems, response quality infrastructure

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.