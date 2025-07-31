# RunPod Architecture Investigation - Context Handoff

## Current Problem Status: QUEUE HANGING ISSUE

**Jobs are stuck in IN_QUEUE status on RunPod worker despite multiple fixes attempted.**

## Investigation Timeline & Findings

### ✅ Fixes Already Attempted
1. **Audio URL Structure** - Fixed relative paths to full S3 URLs ✅
2. **Audio Format Structure** - Changed from `background_music` to `narration` format ✅  
3. **Producer Timing Integration** - Integrated producer cut points into editing plan ✅
4. **RunPod Action & Aspect Ratio** - Correct `process_video` action and `3:2` aspect ratio ✅

### ❌ Current Status
- All above fixes implemented correctly
- Jobs still hanging in IN_QUEUE status  
- Audio structure now correct: `"narration": { "source": "s3://...", "level": 0 }`
- Producer timing working: Cut points at 0s, 3.52s, 10.8s, 13.52s, 17.2s, 22.08s, 24.24s

## 🔍 Critical Architecture Discovery

### Working Prototype vs Current System

**Working Prototype (`test_runpod_fix.js`):**
```js
{
  projectId: "test-runpod-fix-...",
  editingPlan: {
    composition: { format: "9:16", duration: 10.0, fps: 30 },
    layers: [{
      type: "image",
      source: "s3://vinvideo/input/project-test/beat_1.png", 
      start_time: 0.0,        // Simple timing
      end_time: 5.0,          // Basic 5-second layer
      position: [540, 960],
      scale: 1.0              // No animations, minimal structure
    }],
    audio: {
      narration: { source: "s3://...", level: 0.0 }
    }
  },
  s3Assets: ["beat_1.png", "audio.wav"]  // NOTE: No producer.json!
}
```

**Current System (Failing):**
```json
{
  "composition": { "format": "3:2", "duration": 30, "fps": 30 },
  "layers": [
    {
      "type": "image",
      "name": "Beat 1",                    // Extra field
      "source": "s3://...",
      "start_time": 0,                     // Producer timing applied
      "end_time": 3.52,                    // Producer timing applied
      "position": [540, 360],
      "scale": 1,                          // Integer vs 1.0
      "rotation": 0,                       // Extra field  
      "opacity": 1,                        // Extra field
      "animations": { "opacity": {...} }   // Complex animations
    },
    // ... 6 more layers with precise producer timing
  ],
  "audio": { "narration": { "source": "s3://...", "level": 0 } }
}
```

**S3 Assets Uploaded:**
- 7 beat images ✅
- audio.wav ✅  
- editing_plan.json ✅
- **producer.json** ❓ (Not in working prototype's s3Assets!)

## 🚨 Critical Questions for Investigation

### Architecture Uncertainty
**Two possible original architectures:**

**A) Separate Architecture:**
- Editing agent generates simple, generic timing
- Producer.json uploaded separately to S3
- RunPod worker reads both and applies producer timing during processing

**B) Integrated Architecture:**  
- Editing agent takes producer output and embeds precise timing
- Only editing_plan.json sent to RunPod
- RunPod worker processes the already-timed plan

**Evidence for Architecture B:**
- `test_runpod_fix.js` only lists `["beat_1.png", "audio.wav"]` in s3Assets (no producer.json)
- Working prototype has simple structure but fixed timing

**Evidence for Architecture A:**
- Our system uploads producer.json to S3
- Complex timing conflicts could explain hanging

### Data Type & Structure Issues
**Type Mismatches Found:**
- Working: `duration: 10.0` (float) vs Current: `"duration": 30` (integer)
- Working: `level: 0.0` (float) vs Current: `"level": 0` (integer)  
- Working: `scale: 1.0` (float) vs Current: `"scale": 1` (integer)

**Structure Complexity:**
- Working: Minimal layer structure, no animations
- Current: Complex layers with animations, extra metadata fields

## 📁 Critical Files for New Chat

### Primary Implementation Files
- `/VinVideo_Connected/src/app/api/process-with-runpod/route.ts` - RunPod integration logic
- `/VinVideo_Connected/src/app/api/editing-agent/route.ts` - Editing plan generation
- `/VinVideo_Connected/src/app/api/submit-for-editing/route.ts` - S3 upload orchestration

### Recent Test Results  
- `/VinVideo_Connected/temp_files/test_results/Test_69/editing-agent_output.json` - Latest editing plan
- Previous tests: Test_67, Test_68 showing progression of fixes

### Reference Files
- `/test_runpod_fix.js` - Working prototype payload structure
- `/RUNPOD_QUEUE_INVESTIGATION_STATUS.md` - Previous investigation
- `/RUNPOD_FIX_TEST_GUIDE.md` - Previous fix attempts

### Schema & Configuration
- `/VinVideo_Connected/src/schemas/editing-agent-schemas.ts` - Updated audio schema
- `/VinVideo_Connected/.env.local` - Environment configuration

## 🎯 Immediate Next Steps for New Chat

### 1. Determine Original Architecture
- Investigate if RunPod worker expects simple or complex editing plans
- Confirm whether producer.json should be uploaded to S3 or not
- Check if timing should be embedded or applied by worker

### 2. Structure Alignment Investigation  
- Test minimal payload matching `test_runpod_fix.js` exactly
- Fix data type mismatches (integers → floats)
- Remove complex animations if worker doesn't support them

### 3. Systematic Testing
- Start with exact working prototype structure
- Gradually add complexity to find breaking point
- Verify which files RunPod worker actually reads from S3

## 🔄 Producer Timing Integration Status

**Current Implementation:**
- Producer agent generates cut points: [0, 3.52, 10.8, 13.52, 17.2, 22.08, 24.24] seconds
- Editing agent receives producer output and applies timing to layers ✅
- Each layer gets precise start_time/end_time from producer cuts ✅
- Audio source converted to full S3 URL ✅
- Audio format changed to `narration` structure ✅

**But jobs still hang in queue, suggesting architectural mismatch.**

## 🚀 Latest Test Evidence

**Job ID:** `b4bf2bdc-8797-4fb9-80e3-f8fa75116a9f-u2`
**Status:** Stuck in IN_QUEUE after 20+ polling attempts
**Logs Show:**
- S3 upload successful (14 assets)
- Editing plan generation successful  
- Audio source fix applied: `🎵 [EDITING] Fixed narration source`
- RunPod job submission successful
- But processing never progresses beyond IN_QUEUE

This confirms the issue is **payload content/structure**, not API connectivity.