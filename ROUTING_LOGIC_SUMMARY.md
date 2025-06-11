# VinVideo Conversation Mode Routing Logic

## Video Type Selection → Pipeline Mapping

### 1. **Music Only** → `MUSIC_VIDEO` Pipeline
- **Direct Route**: No additional analysis needed
- **Pipeline**: Music Video Pipeline
- **Features**: Music-driven visuals, beat synchronization, no narration
- **Requirements**: Concept + music preferences

### 2. **Pure Visuals** → `NO_MUSIC_VIDEO` Pipeline  
- **Direct Route**: No additional analysis needed
- **Pipeline**: No-Music Video Pipeline
- **Features**: Visual storytelling, no audio elements
- **Requirements**: Concept + visual preferences

### 3. **Voiceover and Background Music** → Router Analysis Required
- **Requires Analysis**: Must determine script vs concept
- **Two Possible Routes**:

  #### A. `SCRIPT_MODE` (Legacy Script Pipeline)
  - **When**: User provides complete script
  - **Indicators**: 
    - "Here's my script"
    - "I have a script ready"
    - Complete narrative text provided
  - **Features**: Direct script → TTS → Video
  
  #### B. `VISION_ENHANCED` (Vision Mode Enhanced)
  - **When**: User provides concept/idea without complete script
  - **Indicators**:
    - General concept description
    - "I want a video about..."
    - No finalized script text
  - **Features**: Concept → AI-generated narration → TTS → Video

## Implementation Flow

```
User Enters Conversation Mode
          ↓
    Video Type Selector
          ↓
    ┌─────┴─────┬──────────────┐
    │           │              │
Music Only  Pure Visuals  Voiceover+Music
    │           │              │
    ↓           ↓              ↓
MUSIC_VIDEO  NO_MUSIC    Router Analysis
 Pipeline     Pipeline         ↓
                         ┌─────┴─────┐
                         │           │
                    SCRIPT_MODE  VISION_ENHANCED
                     (script)     (concept)
```

## Key Points

1. **Direct Routes** (Music Only, Pure Visuals):
   - Skip router analysis
   - Immediately start pipeline execution
   - Faster processing

2. **Analyzed Route** (Voiceover + Background Music):
   - Requires conversation analysis
   - Distinguishes between script and concept
   - Routes to appropriate narration pipeline

3. **User Experience**:
   - All processing happens in conversation interface
   - No page redirects
   - Real-time progress tracking
   - Seamless pipeline execution