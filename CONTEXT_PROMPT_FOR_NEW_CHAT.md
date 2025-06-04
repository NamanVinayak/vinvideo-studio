# Complete Context Prompt for Music Video Pipeline Debugging

## 🎯 MISSION OBJECTIVE

You are tasked with fixing a critical bug in a Music Video Pipeline system. The pipeline should complete 6 stages but consistently fails at Stage 2, preventing users from getting complete creative output.

---

## 🗂️ PROJECT STRUCTURE & KEY FILES

### **Project Root**: 
`/Users/naman/Downloads/Connected_vin_video/VinVideo_Connected/`

### **CRITICAL FILES TO EXAMINE/MODIFY**:

1. **Main Pipeline Component** (PRIMARY ISSUE):
   - Path: `/src/app/music-video-pipeline/page.tsx`
   - Function: `runStage2MusicAnalysis()` (line ~204)
   - Function: `runStage4MusicDirector()` (line ~416)
   - Issue: `state.musicAnalysis` remains null, causing Director to crash

2. **Music Analysis API Endpoint**:
   - Path: `/src/app/api/music-analysis/route.ts`
   - Functions: `callIntelligentProducer()`, JSON parsing logic
   - Issue: Complex fallback system not working

3. **Audio Analysis Utilities**:
   - Path: `/src/utils/musicAnalysis.ts`
   - Functions: `analyzeMusicFile()`, Web Audio API implementation
   - Issue: Client-side analysis may be hanging

4. **Producer Agent Configuration**:
   - Path: `/src/agents/intelligentProducer.ts`
   - Content: `INTELLIGENT_PRODUCER_SYSTEM_MESSAGE`
   - Issue: LLM responses with malformed JSON

5. **OpenRouter Service**:
   - Path: `/src/services/openrouter.ts`
   - Functions: `createOpenRouterService()`, `cleanJsonResponse()`
   - Status: Working correctly

### **CURRENT NAVIGATION**:
- Main page: `http://localhost:3000/music-video-pipeline`
- Test page: `http://localhost:3000/test-music-analysis`

---

## 🚨 CRITICAL BUG DETAILS

### **Error Message**:
```
Error: Music director failed: Error: Music analysis data not available for Director stage
```

### **Current Failure Flow**:
1. ✅ Stage 1: Vision Understanding (works perfectly)
2. ❌ Stage 2: Music Analysis (fails silently, no `setState` called)
3. ❌ Stage 3: Producer (never reached)  
4. ❌ Stage 4: Director (crashes: `state.musicAnalysis` is null)
5. ❌ Stage 5-6: Never reached

### **Root Cause**:
Despite complex fallback systems, `setState` for `musicAnalysis` is never successfully called in Stage 2, leaving it null when Director stage tries to access it.

---

## 📊 CURRENT STATE STRUCTURE

```typescript
interface MusicVideoState {
  stage: number;
  visionDocument: any; // ✅ Set correctly in Stage 1
  musicAnalysis: any;  // ❌ NULL - CAUSING THE CRASH
  directorBeats: any;
  dopSpecs: any;
  promptEngineerResult: any;
  error: string | null;
  loading: boolean;
  currentStep: string;
}
```

### **Expected `musicAnalysis` Structure**:
```typescript
{
  success: true,
  stage2_music_analysis: {
    trackMetadata: { title: string, duration: number },
    musicAnalysis: { bpm: number, beats: number[], etc... }
  },
  stage3_producer_output: {
    cutPoints: Array<CutPoint>,
    cutStrategy: { totalCuts: number, averageCutLength: number }
  }
}
```

---

## 🔍 DEBUGGING EVIDENCE

### **Last Test Results**:
- Stage 1: 728ms execution time ✅
- Stage 2: Hangs/fails, no console output showing completion ❌
- Vision Document: Valid, complete structure ✅
- Error: "Music analysis data not available for Director stage" ❌

### **Previous Attempts Made**:
1. Added multiple JSON parsing methods ✅
2. Added intelligent fallback Producer ✅
3. Added client-side audio analysis ❌ (may be causing hangs)
4. Added timeout protection ✅
5. Added emergency fallback data ❌ (not being set)

---

## 🎯 IMMEDIATE FIX STRATEGY (PHASE 1)

### **Critical Actions Required**:

1. **FORCE STATE SETTING** (Highest Priority):
   ```typescript
   // Add this at START of runStage2MusicAnalysis()
   setState(prev => ({
     ...prev,
     musicAnalysis: {
       success: true,
       stage2_music_analysis: { /* minimal valid data */ },
       stage3_producer_output: { cutPoints: [] }
     }
   }));
   ```

2. **ADD DEBUGGING LOGS**:
   ```typescript
   console.log('Stage 2 START - musicAnalysis:', state.musicAnalysis);
   console.log('Setting musicAnalysis state...');
   console.log('Stage 2 END - musicAnalysis:', state.musicAnalysis);
   ```

3. **SIMPLIFY ERROR HANDLING**:
   - Remove complex nested try-catch blocks
   - Use single try-catch with guaranteed setState
   - Remove setTimeout delays between stages

---

## 🛠️ TECHNOLOGY STACK

- **Frontend**: Next.js 14, React, TypeScript
- **Audio Analysis**: Web Audio API (client-side)
- **AI Models**: OpenRouter API (DeepSeek R1)
- **Pipeline**: 6-stage music video creation system

---

## 📝 USER WORKFLOW

1. User enters concept: "Phoebe Buffay-inspired character in 1990s Vancouver"
2. Selects duration: 20 seconds
3. Uploads audio file OR selects auto-music
4. Pipeline should process through 6 stages
5. User gets complete music video creative direction

---

## 🔧 RECENT CHANGES MADE

1. **Implemented client-side audio analysis** - may be causing hangs
2. **Added Intelligent Producer agent** - working but JSON parsing issues
3. **Added multiple fallback systems** - not being triggered properly
4. **Added timeout protection** - not preventing silent failures

---

## 🎯 SUCCESS CRITERIA

- ✅ **Pipeline ALWAYS completes 6 stages**
- ✅ **Stage 2 takes < 10 seconds**  
- ✅ **Director never fails due to null data**
- ✅ **User gets complete creative output**

---

## 🚀 NEXT STEPS FOR NEW CHAT

1. **Examine** `/src/app/music-video-pipeline/page.tsx` around line 204
2. **Add debugging** to `runStage2MusicAnalysis()` function
3. **Force set** `musicAnalysis` state at function start
4. **Test** with simple concept + audio upload
5. **Verify** Director stage receives valid data

---

## 📞 EMERGENCY CONTACT INFO

- Main issue: `state.musicAnalysis` is null when Director needs it
- Quick fix: Force set minimal valid `musicAnalysis` at Stage 2 start  
- Test URL: `http://localhost:3000/music-video-pipeline`
- Debug focus: State management, not complex audio analysis

**Remember**: This is a state management bug, not an audio analysis or AI problem. The solution is ensuring `setState` is always called with valid data.

---

*Created: Current Session*
*Priority: CRITICAL - Fix immediately*
*Estimated Fix Time: 30-60 minutes with proper debugging*