# Script Mode Legacy Enhancement Plan

## Executive Summary

Upgrade Script Mode Legacy to inherit Vision Mode Enhanced's sophisticated analysis and agent instruction capabilities while preserving the fundamental assumption that users provide finished scripts with exact wording intact.

## 1. Architecture Overview

### Current Script Mode Legacy Flow
```
User Script → format-script → TTS → transcription → producer-agent (rapid cuts) → static agents
```

### Target Script Mode Enhanced Flow  
```
User Script + Rich Form → script-vision-understanding → TTS (preserve script) → transcription → enhanced-producer (pacing matrix) → dynamic agents
```

### Vision Mode Enhanced Flow (unchanged)
```
User Concept + Rich Form → audio-vision-understanding → narration generation → TTS → transcription → vision-enhanced-producer → dynamic agents
```

## 2. Backend Implementation Tasks

### 2.1 New Agent: Script Vision Understanding (`scriptVisionUnderstanding.ts`)

**Purpose:** Analyze user-provided scripts (not generate new ones) and create dynamic agent instructions

**Key Differences from Vision Mode:**
- Takes finished script as input instead of generating narration
- Analyzes script content for themes, style, characters, setting
- Preserves exact script wording while extracting creative context
- Generates same agent instruction objects as Vision Mode

**System Message Strategy:**
```typescript
export const SCRIPT_VISION_UNDERSTANDING_SYSTEM_MESSAGE = `
You are the Script Vision Understanding Agent for Script Mode Enhanced.

CRITICAL: You receive a FINISHED script from the user. Your job is to:
1. ANALYZE the script content (never modify the text)
2. Extract creative vision, themes, and context 
3. Generate dynamic agent instructions based on script analysis
4. Format script for optimal TTS delivery (clean but preserve meaning)

NEVER generate new content - only analyze and extract insights.
`;
```

### 2.2 New API Route: `/api/script-vision-understanding/route.ts`

**Input:**
```typescript
{
  userScript: string;
  additionalContext: {
    stylePreferences: {
      pacing: 'contemplative' | 'moderate' | 'dynamic' | 'fast';
      visualStyle: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
      duration: number;
    };
    technicalRequirements: {
      contentType: 'general' | 'educational' | 'storytelling' | 'abstract';
    };
  }
}
```

**Output:**
```typescript
{
  success: boolean;
  stage1_script_analysis: {
    vision_document: StandardVisionDocument;
    formatted_script: string; // Cleaned for TTS but preserving meaning
    agent_instructions: StandardAgentInstructions;
    script_analysis: {
      detected_themes: string[];
      character_analysis: string[];
      setting_analysis: string;
      narrative_structure: string;
      tone_analysis: string;
    };
  };
  // ... validation and metadata
}
```

### 2.3 Enhanced Producer Strategy Pattern

**Create:** `/src/utils/producerPacingMatrix.ts`
```typescript
export interface PacingMatrix {
  contemplative: { avgCutDuration: 8; range: [6, 10]; maxGap: 10 };
  moderate: { avgCutDuration: 4; range: [3, 5]; maxGap: 8 };
  dynamic: { avgCutDuration: 2.5; range: [2, 3]; maxGap: 6 };
  fast: { avgCutDuration: 1.5; range: [1, 2]; maxGap: 4 };
}

export function calculateOptimalCuts(
  duration: number, 
  pacing: keyof PacingMatrix,
  override?: 'engagement-optimized'
): CutStrategy;
```

**Refactor:** `/src/agents/producerStrategy.ts`
```typescript
export abstract class ProducerStrategy {
  abstract generateCuts(input: ProducerInput): ProducerOutput;
}

export class EngagementProducerStrategy extends ProducerStrategy {
  // Legacy rapid-cut logic
}

export class UserRequirementProducerStrategy extends ProducerStrategy {
  // Vision Enhanced pacing matrix logic
}
```

### 2.4 Updated Script Mode Route: `/api/script-understanding-and-audio/route.ts`

**Replace:** `/api/vision-understanding-and-audio/route.ts` Script Mode path

**New Logic:**
1. Detect Script Mode with rich form data
2. Call `/api/script-vision-understanding` instead of format-script
3. Extract agent instructions for downstream use
4. Generate TTS from formatted (but preserved) script
5. Pass vision document and instructions to enhanced producer

## 3. Frontend Implementation Tasks

### 3.1 Enhanced Script Mode Form

**Add to Script Mode UI:**
```typescript
// Extend existing VisionFormData interface
interface ScriptModeFormData extends VisionFormData {
  script: string; // The key difference
  // Inherits: style, pacing, duration, contentType
}

// Add form controls to Script Mode section
{!useVisionMode && (
  <>
    <textarea value={script} onChange={setScript} />
    <FormRow>
      <StyleDropdown />
      <PacingDropdown />
    </FormRow>
    <FormRow>
      <DurationInput />
      <ContentTypeDropdown />
    </FormRow>
    <PacingPresetButtons /> {/* NEW: Quick presets */}
  </>
)}
```

### 3.2 Pacing Preset Buttons

**Add Quick Presets:**
```typescript
const PACING_PRESETS = {
  'Engagement Max': { pacing: 'fast', duration: 30 },
  'Balanced': { pacing: 'moderate', duration: 45 },
  'Contemplative': { pacing: 'contemplative', duration: 60 },
  'Custom': null
};
```

### 3.3 State Management Updates

**Enhanced State:**
```typescript
const [scriptFormData, setScriptFormData] = useState<ScriptModeFormData>({
  script: '',
  style: 'cinematic',
  pacing: 'moderate', 
  duration: 30,
  contentType: 'general'
});

const [usePacingPreset, setUsePacingPreset] = useState<string>('Balanced');
```

### 3.4 URL Parameter Handling

**Support Script Mode URLs:**
```
/test-tts?useVisionMode=false&script=...&style=cinematic&pacing=moderate&duration=45
```

## 4. Producer Pacing Strategy Implementation

### 4.1 Pacing Matrix Extraction

**From Vision Enhanced Producer Analysis:**

| Pacing | Cut Frequency | Duration Range | Max Gap | Use Case |
|--------|---------------|----------------|---------|----------|
| Contemplative | 1 per 8s | 6-10s | 10s | Meditative, documentary |
| Moderate | 1 per 4s | 3-5s | 8s | Balanced storytelling |
| Dynamic | 1 per 2.5s | 2-3s | 6s | Energetic content |
| Fast | 1 per 1.5s | 1-2s | 4s | High-energy, social media |

### 4.2 Adaptive Override Logic

**Duration Conflict Resolution:**
```typescript
function resolveScriptDurationConflict(
  scriptLength: number,
  requestedDuration: number,
  pacing: PacingTier
): AdaptiveStrategy {
  const variance = Math.abs(scriptLength - requestedDuration) / requestedDuration;
  
  if (variance <= 0.05) return { strategy: 'proceed', adjustments: [] };
  if (variance <= 0.15) return { strategy: 'adjust-pacing', suggestedPacing: ... };
  return { strategy: 'suggest-edit', recommendations: [...] };
}
```

### 4.3 Implementation Architecture

**Shared Pacing Logic:**
```typescript
// /src/utils/pacingMatrix.ts
export class PacingMatrix {
  static calculateCuts(duration: number, pacing: PacingTier): CutPlan;
  static validateDuration(actual: number, target: number): ValidationResult;
  static adaptToConstraints(plan: CutPlan, constraints: Constraint[]): CutPlan;
}

// Both producers use this utility
// Script Mode: enhanced-script-producer-agent 
// Vision Mode: vision-enhanced-producer-agent (unchanged)
```

## 5. API Routing Changes

### 5.1 New Endpoints

| Endpoint | Purpose | Input | Output |
|----------|---------|--------|--------|
| `/api/script-vision-understanding` | Script analysis + agent instructions | script + form data | vision document + instructions |
| `/api/enhanced-script-producer-agent` | Script Mode producer with pacing matrix | script + vision context | cuts with user compliance |

### 5.2 Route Selection Logic

**Frontend Routing:**
```typescript
// Current
const producerEndpoint = useVisionMode ? 
  '/api/vision-enhanced-producer-agent' : 
  '/api/producer-agent';

// New 
const producerEndpoint = useVisionMode ? 
  '/api/vision-enhanced-producer-agent' : 
  (useEnhancedScript ? '/api/enhanced-script-producer-agent' : '/api/producer-agent');
```

### 5.3 Backward Compatibility

**Feature Flag Support:**
```typescript
const useEnhancedScript = 
  searchParams?.get('enhanced') === 'true' || 
  (scriptFormData.pacing !== 'fast' || scriptFormData.duration !== 30);
```

## 6. Schema & Type Updates

### 6.1 New Interfaces

```typescript
// /src/schemas/scriptModeSchemas.ts
export interface ScriptAnalysisOutput {
  formatted_script: string;
  vision_document: StandardVisionDocument;
  agent_instructions: StandardAgentInstructions;
  script_analysis: {
    detected_themes: string[];
    character_analysis: string[];
    setting_analysis: string;
    narrative_structure: string;
    tone_analysis: string;
    estimated_reading_duration: number;
  };
}

export interface EnhancedScriptProducerInput {
  transcript: WordTimestamp[];
  script: string;
  visionDocument: StandardVisionDocument;
  producer_instructions: ProducerInstructions;
  userPreferences: {
    pacing: PacingTier;
    duration: number;
    allowOverride: boolean;
  };
}
```

### 6.2 Migration Strategy

**Field Compatibility:**
- Reuse existing `StandardVisionDocument` interface
- Extend with `script_source: 'user_provided' | 'generated'`
- All existing validation utilities work unchanged

## 7. Testing & QA

### 7.1 Unit Tests

**Critical Test Cases:**
```typescript
describe('Script Vision Understanding', () => {
  test('preserves exact script wording');
  test('extracts themes and characters correctly');
  test('generates appropriate agent instructions');
  test('formats script for TTS without meaning loss');
});

describe('Enhanced Script Producer', () => {
  test('contemplative pacing: ~8s per cut');
  test('duration compliance: ±5% tolerance');
  test('handles script-duration conflicts gracefully');
  test('engagement preset maintains rapid cuts');
});
```

### 7.2 Integration Tests

**End-to-End Scenarios:**
1. **Happy Path:** 30s script + moderate pacing → compliant output
2. **Conflict Resolution:** 60s script + 30s duration → adaptive suggestions
3. **Engagement Preset:** Any script + fast pacing → rapid cuts (legacy behavior)
4. **Quality Preservation:** Complex script → preserved meaning + enhanced visuals

### 7.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Duration Compliance | ±5% variance | Actual vs requested duration |
| Pacing Adherence | 95% within tier range | Cut frequency analysis |
| Script Preservation | 100% meaning retention | Semantic similarity testing |
| Latency | <5s overhead | Response time vs current |

## 8. Rollout & Fallback Strategy

### 8.1 Feature Flag Implementation

**Progressive Rollout:**
```typescript
// /src/config/features.ts
export const FEATURES = {
  ENHANCED_SCRIPT_MODE: {
    enabled: process.env.ENABLE_ENHANCED_SCRIPT === 'true',
    rolloutPercentage: parseInt(process.env.SCRIPT_ENHANCEMENT_ROLLOUT) || 0
  }
};
```

**Staged Rollout:**
1. **Week 1:** Internal testing only
2. **Week 2:** 10% user traffic with fallback
3. **Week 3:** 50% traffic if metrics good
4. **Week 4:** 100% with legacy option available

### 8.2 Fallback Mechanisms

**Automatic Fallback Triggers:**
- Response time > 10s → fallback to legacy
- Error rate > 5% → fallback to legacy  
- Duration variance > 20% → fallback to legacy

**Manual Override:**
```
?forceLegacy=true → Always use original Script Mode
?forceEnhanced=true → Always use enhanced Script Mode
```

## 9. Risk Analysis & Mitigations

### 9.1 Performance Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Script analysis latency | +3-5s processing | Medium | Cache common patterns, optimize prompts |
| Token cost increase | +30% costs | High | Use smaller models for analysis, batch requests |
| Memory usage spike | Server instability | Low | Implement request queuing |

### 9.2 UX Complexity Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Form complexity overwhelms users | Reduced adoption | Progressive disclosure, smart defaults |
| Duration conflicts confuse users | Support burden | Clear error messages, auto-suggestions |
| Legacy users lose familiar workflow | User complaints | Maintain legacy option with clear migration path |

### 9.3 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Script meaning loss in formatting | Poor user experience | Semantic similarity validation, user preview |
| Pacing matrix bugs | Wrong cut timing | Comprehensive test suite, gradual rollout |
| API endpoint proliferation | Maintenance burden | Consistent patterns, shared utilities |

## 10. Timeline & Resource Allocation

### 10.1 Sprint Breakdown

**Sprint 1 (2 weeks) - Foundation**
- Create `scriptVisionUnderstanding.ts` agent
- Build `/api/script-vision-understanding` endpoint
- Implement `PacingMatrix` utility class
- Unit tests for core components

**Sprint 2 (2 weeks) - Producer Enhancement**
- Create enhanced script producer strategy
- Build `/api/enhanced-script-producer-agent` endpoint  
- Implement conflict resolution logic
- Integration tests

**Sprint 3 (2 weeks) - Frontend Integration**
- Add rich form controls to Script Mode
- Implement pacing presets
- Update state management and routing
- Frontend testing

**Sprint 4 (1 week) - QA & Rollout**
- End-to-end testing
- Performance optimization
- Feature flag implementation
- Staged rollout

### 10.2 Resource Requirements

- **2 Backend Engineers:** Agent development, API implementation
- **1 Frontend Engineer:** UI/UX implementation  
- **1 QA Engineer:** Testing coordination
- **0.5 DevOps Engineer:** Deployment and monitoring

## 11. Extension Hooks

### 11.1 Custom Pacing Tiers

**Future Extension:**
```typescript
interface CustomPacingTier {
  name: string;
  avgCutDuration: number;
  range: [number, number];
  maxGap: number;
  contentTypeModifiers?: Record<ContentType, number>;
}

// Easy to add new tiers without core changes
```

### 11.2 Content-Type Modifiers

**Planned Enhancement:**
```typescript
const CONTENT_MODIFIERS = {
  educational: { pacingMultiplier: 1.5, maxGap: +2 },
  storytelling: { pacingMultiplier: 1.0, maxGap: 0 },
  abstract: { pacingMultiplier: 0.8, maxGap: +4 }
};
```

## Success Definition

The enhancement is successful when:
1. **Script Mode users can access all Vision Mode controls** while preserving script integrity
2. **Duration compliance matches Vision Mode** (±5% variance) 
3. **Pacing matrix works consistently** across all four tiers
4. **Performance overhead < 5 seconds** vs current Script Mode
5. **Zero regressions** in existing Vision Mode Enhanced functionality

This plan provides a comprehensive roadmap for upgrading Script Mode Legacy to inherit Vision Mode Enhanced's sophisticated capabilities while respecting the fundamental difference in user workflow.