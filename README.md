# VinVideo_Connected - Multi-Agent AI Video Generation System

**A sophisticated AI-powered video generation platform that transforms text descriptions into fully-edited videos using specialized AI agents.**

## 🎬 System Overview

VinVideo_Connected implements a multi-agent architecture where specialized AI "agents" work together to create different types of video content:

- **Vision Agent**: Analyzes user concepts and creates creative vision documents
- **Producer Agent**: Generates intelligent cut points based on content flow and user preferences  
- **Director Agent**: Creates narrative beats with cognitive diversity for viewer retention
- **DoP Agent**: Develops cinematography specifications and camera movements
- **Prompt Engineer**: Generates FLUX-compatible image generation prompts
- **Image Generator**: Creates visuals via ComfyUI integration

## 🚀 Pipeline Architecture

### 4 Specialized Pipelines

1. **Vision Enhanced Pipeline** (6 stages) - User-requirement-first approach with TTS and narration
2. **Music Video Pipeline** (7 stages) - Musical intelligence with beat synchronization
3. **No-Music Pipeline** (5 stages) - Visual-only content with narrative-driven timing  
4. **Legacy Script Mode** (6 stages) - Engagement-optimized cuts for script content

### Current Performance
- **Sequential execution**: 5-7 agents per pipeline
- **Total pipeline time**: 45-90 seconds depending on complexity
- **User requirement compliance**: 95%+ exact duration matching
- **Error recovery**: 4-tier JSON extraction with sophisticated fallbacks

## 📋 Current Implementation Status

### ✅ Production Ready Features
- **Multi-pipeline routing** with intelligent pipeline selection
- **Sophisticated error handling** with multiple JSON parsing strategies
- **User requirement tracking** ensuring exact duration and style compliance
- **Comprehensive response logging** for quality assurance and debugging
- **Advanced LLM integration** via OpenRouter with retry logic and fallbacks

### 🔄 Planned Improvements (Approved Strategy)

See `APPROVED_IMPLEMENTATION_PLAN.md` for detailed implementation strategy.

#### **Phase 1: Prompt Refactoring** ✅ APPROVED
- **Goal**: Externalize AI agent instructions for improved maintainability
- **Timeline**: 8-10 weeks
- **Benefits**: Easier prompt updates, A/B testing, version control

#### **Phase 2: Parallel Execution** ✅ APPROVED  
- **Goal**: 30-40% performance improvement via controlled parallelization
- **Timeline**: 4-6 weeks
- **Target**: Music Video Pipeline (Vision + Music Analysis agents)

#### **Phase 3: Architectural Discipline** ✅ APPROVED
- **Goal**: Risk aversion and evidence-based progression
- **Approach**: No major architectural changes without proven need

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- Required API keys (see Environment Setup)

### Installation
```bash
# Clone and install
npm install

# Start development server
npm run dev

# Visit http://localhost:3000
```

### Environment Setup
Create `.env.local` file:
```env
# Core LLM Integration
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_DEEPSEEK_API_KEY=your_deepseek_key

# Google Services  
GOOGLE_GEMINI_API_KEY=your_gemini_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_key

# Image Generation
RUNPOD_API_KEY=your_runpod_key (legacy)
```

## 🧪 Testing

### Manual Testing Pages
- `/test-tts` - Vision Mode Enhanced pipeline testing
- `/music-video-pipeline` - Full music-aware pipeline testing  
- `/no-music-video-pipeline` - Visual-only content testing

### Quality Assurance
- **Automated response saving** in `temp_files/test_results/`
- **Incremental test numbering** (Test_1, Test_2, etc.)
- **Agent response comparison** across test runs
- **Performance metrics tracking**

## 🏗️ Architecture Principles

### User-Requirement-First Philosophy
- Vision Enhanced Producer achieves exact duration targets with ±5% tolerance
- UserContext propagation ensures all agents respect original user intent
- Dynamic pacing system adapts to user preferences

### Sophisticated Error Recovery
- **4-strategy JSON extraction**: markdown blocks, bracket matching, multiple objects
- **PassThroughRawJson utility**: preserves content flow even with parsing errors
- **Raw response fallback**: downstream agents can process malformed JSON

### Agent System Design
- **Pipeline-specific agents** with specialized knowledge
- **Progressive enhancement**: each agent builds upon previous outputs  
- **Cognitive diversity rules**: prevent repetitive content that kills retention

## 🔧 Development Guidelines

### Agent Development
1. **User Requirements First**: All agents must prioritize user requirement compliance
2. **JSON Error Handling**: Use PassThroughRawJson for robust parsing
3. **Response Saving**: All agents auto-save responses for debugging
4. **Agent Instructions**: Generate guidance for downstream agents

### Performance Optimization
- **Model Selection**: Optimized per agent type in `/src/config/llm-models.ts`
- **Temperature Settings**: Tuned for each agent's creative vs. precision needs
- **Token Limits**: Balanced for quality vs. latency

### Quality Assurance
- **Test with existing cases**: Use test results in `temp_files/test_results/`
- **Measure compliance**: Track duration accuracy and user requirement adherence
- **Monitor error rates**: Ensure changes don't break error recovery

## 📁 Key Directories

```
src/
├── agents/           # AI agent implementations by pipeline
├── app/api/          # Next.js API routes for each agent  
├── config/           # LLM model configurations
├── schemas/          # Data contracts between agents
├── services/         # External service integrations
└── utils/            # Error handling and response saving utilities

temp_files/
└── test_results/     # Systematic test result storage
    ├── Test_1/       # Individual test sessions
    ├── Test_2/       
    └── ...
```

## 🚨 Important Notes

### Rejected Approaches
- **Event-driven architecture**: Incompatible with Next.js serverless patterns
- **Major architectural overhauls**: Current system sophistication requires preservation
- **Premature optimization**: Evidence-based progression only

### System Strengths to Preserve
- **Sophisticated error recovery systems**
- **User requirement compliance architecture** 
- **Quality assurance and debugging infrastructure**
- **Multi-model LLM integration with fallbacks**

## 📚 Documentation

- `CLAUDE.md` - Comprehensive system documentation and development guidelines
- `APPROVED_IMPLEMENTATION_PLAN.md` - Current strategic direction and implementation phases
- `COMPREHENSIVE_PIPELINE_OPTIMIZATION_PLAN_ENHANCED.md` - Detailed technical analysis

## 🤝 Contributing

1. Read `CLAUDE.md` for comprehensive system understanding
2. Follow approved implementation phases
3. Maintain response quality and error recovery systems
4. Test with existing test cases for regression prevention

## 📊 Performance Metrics

### Current Baselines
- **Vision Enhanced Pipeline**: ~45-60 seconds end-to-end
- **Music Video Pipeline**: ~60-90 seconds end-to-end  
- **Duration Compliance**: 95%+ within ±5% tolerance
- **JSON Parsing Success**: 90%+ with fallback recovery

### Target Improvements (Phase 2)
- **Music Video Pipeline**: 30-40% improvement in first two stages
- **Vision + Music Analysis**: 13-23s → 8-15s (parallel execution)

---

**Built with**: Next.js, TypeScript, OpenRouter, Google Cloud, ComfyUI

**License**: MIT

*VinVideo_Connected represents a mature, production-ready AI video generation system with sophisticated error handling, user requirement compliance, and systematic quality assurance.*