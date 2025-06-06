# Enhanced Vision Agent Implementation - Context for New Chat

## Project Overview
I need to implement the Enhanced Vision Agent Architecture for VinVideo, a multi-agent AI video generation platform. The architecture plan is already complete and saved in `/ENHANCED_VISION_AGENT_ARCHITECTURE_PLAN.md`.

## Current State
- **Working Branch**: `FIXED-NO-MUSIC` 
- **Backup Created**: `backup_june_6` branch has all current work backed up
- **Project Root**: `/Users/naman/Downloads/Connected_vin_video/VinVideo_Connected`

## What Needs Implementation
Transform the Vision Agent from a simple vision document generator into an intelligent pipeline strategist that provides tailored guidance to each downstream agent in the Vision Mode (Enhanced) pipeline.

## Key Files to Reference

### 1. Architecture Plan (MUST READ FIRST)
- `/ENHANCED_VISION_AGENT_ARCHITECTURE_PLAN.md` - Complete implementation plan with all details

### 2. Vision Agent Files
- `/src/agents/visionUnderstandingWithAudio.ts` - Current vision agent system message
- `/src/app/api/audio-vision-understanding/route.ts` - Current vision understanding endpoint
- `/src/app/api/vision-only/route.ts` - Vision Mode endpoint that test-tts calls

### 3. Agent Routes That Need Enhancement
- `/src/app/api/producer-agent/route.ts` - Needs to receive producer_instructions
- `/src/app/api/director-agent/route.ts` - Needs to receive director_instructions  
- `/src/app/api/dop-agent/route.ts` - Needs to receive dop_instructions
- `/src/app/api/prompt-engineer-agent/route.ts` - Needs to receive prompt_engineer_instructions

### 4. Test-TTS Pipeline
- `/src/app/test-tts/page.tsx` - Vision Mode (Enhanced) implementation, see lines 440-865 for agent calls

## Implementation Tasks

### Phase 1: Update Vision Agent
1. Modify `/src/agents/visionUnderstandingWithAudio.ts` to generate agent-specific instruction blocks
2. Update the output format to include: `producer_instructions`, `director_instructions`, `dop_instructions`, `prompt_engineer_instructions`
3. Implement intelligent analysis of user form data (pacing, visual style, content type, duration) + concept text

### Phase 2: Update Agent Routes
1. **Producer Agent**: Add extraction and use of `producer_instructions` for intelligent pacing guidance
2. **Director Agent**: Add extraction and use of `director_instructions` for creative vision enhancement
3. **DoP Agent**: Add extraction and use of `dop_instructions` for cinematography guidance
4. **Prompt Engineer Agent**: Add extraction and use of `prompt_engineer_instructions` for image generation specs

### Phase 3: Update test-tts Page
1. Pass enhancement blocks from Vision Agent output to each agent
2. Ensure backward compatibility - agents work without enhancements
3. Test with Vision Mode (Enhanced) form inputs

## Important Context

### User Form Data Structure (Vision Mode Enhanced)
```javascript
{
  concept: "User's creative vision text",
  style: "Cinematic/Artistic/etc",  // dropdown
  pacing: "Fast/Moderate/Slow",     // dropdown
  duration: 60,                     // number in seconds
  contentType: "General/Educational/Entertainment/etc" // dropdown
}
```

### Current Agent Inputs (Must Preserve)
- **Producer**: `transcript`, `script`
- **Director**: `producer_output`, `script`, `visionDocument`, `enhancedMode`
- **DoP**: `script`, `producer_output`, `director_output`, `visionDocument`, `enhancedMode`
- **Prompt Engineer**: `script`, `director_output`, `dop_output`, `num_images`, `visionDocument`, `enhancedMode`

### Key Requirements
1. **Additive Enhancement Only** - All existing inputs preserved, new blocks are additional
2. **Dynamic Generation** - No hardcoded content, everything based on user input
3. **Backward Compatible** - Agents must work without enhancement blocks
4. **Vision Mode (Enhanced) Only** - Don't affect other pipelines

## Recent Fixes Applied
- Fixed hardcoded Kung Fu Panda content in agent routes
- Fixed comfyEndpointTest.py to read from temp_prompts.json
- Fixed director agent typo (hevisionDocument → visionDocument)

## Testing Approach
1. Test with: "Create a 1 minute video about car factory assembly" + Fast pacing + Cinematic style
2. Verify each agent receives appropriate enhancement blocks
3. Ensure image generation reflects enhanced guidance

## Start Implementation
Begin by reading `/ENHANCED_VISION_AGENT_ARCHITECTURE_PLAN.md` for the complete plan, then start with Phase 1: updating the Vision Agent system message and output format.