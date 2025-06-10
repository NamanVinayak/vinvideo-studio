# Gemini Voice System Reference

## Current Implementation Status

### What's Currently Working
- **Basic TTS Integration**: Google Gemini TTS via official SDK
- **Single Voice**: Hardcoded to "Enceladus" (breathy/intimate style)
- **Voice Parameter Support**: Recently added `voiceName` parameter to core functions
- **API Integration**: Both main audio endpoints support voice selection

### Core Implementation Files

#### 1. Audio Processing Core (`/src/utils/audioProcessing.ts`)
**Lines 30-66**: Main TTS function with voice configuration
```typescript
// Line 30: Function signature with voice parameter
export async function textToSpeech(text: string, folderName?: string, voiceName?: string)

// Lines 32-33: Voice selection logic
const selectedVoice = voiceName || 'Enceladus';
console.log(`Making TTS API call to Google Gemini using official SDK with voice: ${selectedVoice}...`);

// Lines 59-63: Gemini TTS configuration
speechConfig: {
  voiceConfig: {
    prebuiltVoiceConfig: { voiceName: selectedVoice },
  },
}
```

#### 2. Script-to-Audio Endpoint (`/src/app/api/generate-audio-from-script/route.ts`)
**Lines 13, 17, 67**: Voice parameter handling
```typescript
// Line 13: Input destructuring
const { narrationScript, folderId, voiceName } = body;

// Line 17: Logging
console.log(`🎤 Voice: ${voiceName || 'Enceladus (default)'}`);

// Line 67: TTS call with voice
const audioUrl = await textToSpeech(formattedScript, folderId, voiceName);
```

#### 3. Vision-to-Audio Endpoint (`/src/app/api/vision-understanding-and-audio/route.ts`)
**Lines 32, 37, 192**: Voice parameter integration
```typescript
// Line 32: Input destructuring
voiceName 

// Line 37: Logging
console.log(`🎤 Voice: ${voiceName || 'Enceladus (default)'}`);

// Line 192: TTS call with voice
const audioUrl = await textToSpeech(formattedScript, folderId, voiceName);
```

## Current Voice Intelligence (Unused)

### Vision Agent Voice Recommendations
**File**: `/src/agents/visionUnderstandingWithAudio.ts`
**Lines 179-184**: Audio optimization output structure

The Vision Agent already generates intelligent voice recommendations:
```typescript
"audio_optimization": {
  "concept_speakability": "excellent|good|fair",
  "vocal_performance_potential": "high|medium|low", 
  "tts_friendliness": "optimized|standard|challenging",
  "recommended_voice_characteristics": "string describing ideal voice qualities"
}
```

**Example Output**: "Warm, conversational tone perfect for cooking tutorial with clear pronunciation"

**Current Gap**: This intelligent analysis exists but isn't connected to actual voice selection.

## Gemini TTS Voice Reality

### Known Voices (From Research and Code References)
**Source**: Script formatting prompts in audio generation endpoints and Gemini documentation

1. **Enceladus** - Breathy/intimate style (current default)
2. **Puck** - Upbeat style  
3. **Kore** - Firm authority style
4. **Charon** - Informative clarity style

### Full Voice Library (30+ voices available)
**Research Finding**: Gemini TTS offers 30+ pre-built voices with variations in:
- Gender (male/female/neutral)
- Age ranges (young/adult/mature)  
- Delivery styles (professional/casual/dramatic)
- Emotional tones (energetic/calm/authoritative)
- Regional accents and characteristics

**Current Limitation**: No systematic catalog of voice characteristics exists in our codebase.

## What Needs to Be Built (Option 1: Manual Voice Database)

### 1. Voice Characteristics Database
**New File Needed**: `/src/data/geminiVoices.ts` or similar

**Required Structure**:
```typescript
interface VoiceProfile {
  name: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'adult' | 'mature';
  style: string[];  // ['professional', 'warm', 'energetic']
  tone: string[];   // ['authoritative', 'friendly', 'calm']
  bestFor: string[]; // ['education', 'meditation', 'tutorials']
  characteristics: string; // Detailed description
}
```

**Manual Work Required**:
1. Listen to all 30+ Gemini voices
2. Document characteristics for each voice
3. Create mapping from Vision Agent descriptions to actual voices
4. Test voice quality across different content types

### 2. Intelligent Voice Mapper
**New File Needed**: `/src/utils/voiceMapping.ts`

**Purpose**: Convert Vision Agent recommendations to specific voice names
```typescript
function mapVisionToVoice(recommendations: string): string {
  // Logic to match "warm, conversational" → "Enceladus"
  // Parse Vision Agent characteristics
  // Return best matching Gemini voice name
}
```

### 3. Voice Selection UI Component
**New Component Needed**: For test-tts page and user interfaces

**Features**:
- Voice preview/samples
- Automatic recommendation display
- Manual override capability
- Voice characteristic descriptions

### 4. Integration Points

#### Update Vision Agent Pipeline
**File to Modify**: `/src/agents/visionUnderstandingWithAudio.ts`
- Enhance voice recommendation specificity
- Include multiple voice options ranked by suitability

#### Update API Endpoints
**Files to Modify**: 
- `/src/app/api/generate-audio-from-script/route.ts`
- `/src/app/api/vision-understanding-and-audio/route.ts`

Add voice mapping logic before calling `textToSpeech()`

#### Update Test Interface
**File to Modify**: `/src/app/test-tts/page.tsx`
- Add voice selection dropdown
- Display Vision Agent voice recommendations
- Show selected voice characteristics

## Technical Architecture Plan

### Phase 1: Voice Database Creation
1. **Research Task**: Systematically test all Gemini TTS voices
2. **Documentation**: Create comprehensive voice profiles
3. **Database**: Build structured voice characteristics data

### Phase 2: Mapping Algorithm
1. **Parser**: Extract key characteristics from Vision Agent output
2. **Matcher**: Algorithm to find best voice matches
3. **Fallback**: Default to Enceladus if no good match

### Phase 3: UI Integration
1. **Voice Picker**: User interface for manual selection
2. **Recommendations**: Display AI-suggested voices
3. **Previews**: Voice sample playback capability

### Phase 4: Pipeline Integration
1. **Automatic Selection**: Vision Agent → Voice Mapper → TTS
2. **Override System**: Allow manual voice selection
3. **Quality Assurance**: Test voice selection accuracy

## Current System Gaps

### 1. No Voice Catalog
**Problem**: Only 4 voices documented, 30+ available
**Solution**: Systematic voice profiling needed

### 2. Unused Intelligence  
**Problem**: Vision Agent creates perfect recommendations but they're ignored
**Solution**: Connect vision analysis to voice selection

### 3. No User Control
**Problem**: Users can't experiment with different voices
**Solution**: Add voice selection UI to test-tts page

### 4. No Quality Feedback
**Problem**: No way to know if voice matches content
**Solution**: Add voice/content matching validation

## Implementation Priority

### Immediate (Current Session)
- ✅ Voice parameter support in core functions
- ✅ API endpoint voice parameter handling  
- ✅ Logging for voice selection debugging

### Next Session (High Priority)
1. **Voice Research**: Listen to and catalog all Gemini voices
2. **Database Creation**: Build comprehensive voice profiles
3. **Basic UI**: Add voice dropdown to test-tts page

### Future Sessions (Medium Priority)
1. **Intelligent Mapping**: Build Vision Agent → Voice selection
2. **Advanced UI**: Voice previews and recommendations
3. **Quality System**: Voice/content matching validation

## Key Files for Future Implementation

### Files to Read for Voice Research:
- **Gemini TTS Documentation**: Official voice list and characteristics
- **Current Vision Agent Output**: `/src/agents/visionUnderstandingWithAudio.ts` (lines 179-184)
- **Test Results**: Examples of voice recommendations in `test_results/` folder

### Files to Modify for Implementation:
- **Voice Database**: New file `/src/data/geminiVoices.ts` 
- **Voice Mapper**: New file `/src/utils/voiceMapping.ts`
- **Test Interface**: `/src/app/test-tts/page.tsx` (add voice selection UI)
- **API Integration**: Audio generation endpoints (already updated)

### Files to Reference for Integration:
- **Audio Processing**: `/src/utils/audioProcessing.ts` (voice parameter system)
- **Vision Agent**: `/src/agents/visionUnderstandingWithAudio.ts` (recommendation system)
- **Current Pipeline**: Test-tts page flow for understanding integration points

## Success Metrics

### Technical Goals
- [ ] 30+ voices cataloged with characteristics
- [ ] Intelligent voice mapping >80% accuracy
- [ ] UI allows easy voice experimentation
- [ ] Zero breaking changes to existing functionality

### User Experience Goals  
- [ ] Users get appropriate voice without manual selection
- [ ] Manual override available when needed
- [ ] Voice selection feels intelligent, not random
- [ ] Voice quality matches content expectations

---

**Note**: This document serves as a comprehensive reference for implementing intelligent voice selection. The current system provides the foundation (voice parameter support), but the intelligence layer (voice characteristics database and mapping) requires manual research and development work.