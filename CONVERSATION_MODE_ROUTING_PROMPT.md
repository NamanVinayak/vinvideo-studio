# Prompt for Implementing VinVideo Conversation Mode Routing System

You are tasked with implementing a conversation mode routing system for the VinVideo platform. Your implementation plan is located at: `/Users/naman/Downloads/Connected_vin_video/VinVideo_Connected/CONVERSATION_MODE_ROUTING_IMPLEMENTATION_PLAN.md`

## Your Working Method

You will work in an iterative loop following this pattern:
1. **Implement** a small, focused part of the system
2. **Create tests** to verify the implementation
3. **Run tests** and show results
4. **Get approval** from the user before proceeding
5. **Iterate** based on feedback until the user is satisfied

## Implementation Phases

### Phase 1: Backend Foundation (Get Approval First)
**Task 1.1**: Create Enhanced Pipeline Router Agent
- Read the implementation plan first
- Create `/src/agents/enhancedPipelineRouter.ts`
- Implement the `ENHANCED_PIPELINE_ROUTER_SYSTEM_MESSAGE`
- Show me the complete file
- **TEST**: Create a test function that validates the system message format
- **APPROVAL GATE**: "Does this router agent system message correctly handle all 4 pipelines?"

**Task 1.2**: Create Router API Endpoint
- Create `/src/app/api/pipeline-router-enhanced/route.ts`
- Implement conversation analysis logic
- Show the complete implementation
- **TEST**: Create mock conversations and test routing decisions
- **APPROVAL GATE**: "Are the routing decisions accurate for these test cases?"

### Phase 2: Frontend Integration (Get Approval First)
**Task 2.1**: Update Conversation Mode UI
- Add "Ready to Proceed" button to `/src/app/conversation-mode/page.tsx`
- Add state management for routing analysis
- Show the UI changes
- **TEST**: Demonstrate button appears after 2 messages
- **APPROVAL GATE**: "Is the UI flow intuitive and clear?"

**Task 2.2**: Implement Pipeline Routing Logic
- Add routing logic to handle all 4 pipelines
- Create parameter builders for each pipeline
- Show the routing implementation
- **TEST**: Test routing to each pipeline with sample data
- **APPROVAL GATE**: "Does each pipeline receive the correct parameters?"

### Phase 3: Pipeline Page Updates (Get Approval First)
**Task 3.1**: Update test-tts Page
- Modify to accept pre-filled parameters from conversation mode
- Handle both Script Mode and Vision Enhanced parameters
- **TEST**: Show form pre-population works
- **APPROVAL GATE**: "Does test-tts correctly handle conversation mode params?"

**Task 3.2**: Update Music & No-Music Pipeline Pages
- Modify both pipeline pages to accept parameters
- Ensure concept and style are pre-filled
- **TEST**: Verify parameter passing
- **APPROVAL GATE**: "Do both pipelines handle params correctly?"

### Phase 4: Integration Testing (Get Approval First)
**Task 4.1**: Create Comprehensive Test Suite
- Test all conversation types
- Test ambiguous conversations
- Test edge cases
- **APPROVAL GATE**: "Are all test cases passing?"

**Task 4.2**: End-to-End Flow Testing
- Test complete flow from conversation to video generation
- Test each pipeline route
- **APPROVAL GATE**: "Does the complete flow work smoothly?"

## Test Cases You Must Implement

```typescript
// Test these conversation scenarios:
const testScenarios = [
  {
    name: "Clear Music Video Request",
    conversation: [
      "I want to create a music video",
      "I have a techno track that's 90 seconds long",
      "I want fast cuts and neon visuals"
    ],
    expectedPipeline: "MUSIC_VIDEO",
    expectedParams: { hasMusic: true, hasNarration: false, duration: 90 }
  },
  {
    name: "Educational Content",
    conversation: [
      "I need a video about climate change",
      "It should be educational and serious",
      "30 seconds with narration explaining the facts"
    ],
    expectedPipeline: "VISION_ENHANCED",
    expectedParams: { hasMusic: false, hasNarration: true, duration: 30 }
  },
  {
    name: "Abstract Visual Art",
    conversation: [
      "I want abstract visuals of colors morphing",
      "No music, no words, just pure visual art",
      "15 seconds of contemplative visuals"
    ],
    expectedPipeline: "NO_MUSIC_VIDEO",
    expectedParams: { hasMusic: false, hasNarration: false, duration: 15 }
  },
  {
    name: "Complete Script Provided",
    conversation: [
      "I have a script ready for my video",
      "Here's my script: 'In the beginning, there was darkness...'"
    ],
    expectedPipeline: "SCRIPT_MODE",
    expectedParams: { hasCompleteScript: true }
  },
  {
    name: "Ambiguous - Needs Clarification",
    conversation: [
      "I want a video with music",
      "It should tell a story about hope"
    ],
    expectedPipeline: null, // Should ask for clarification
    needsClarification: ["Do you want narration over the music?"]
  }
];
```

## Implementation Rules

1. **Always show your work** - Display complete file contents after changes
2. **Test immediately** - Create and run tests for each component
3. **Get approval** - Wait for user confirmation before proceeding
4. **Handle feedback** - If output isn't good, revise until approved
5. **Document changes** - Explain what you did and why

## Starting Instructions

1. First, read the implementation plan at the provided path
2. Analyze the current codebase structure
3. Present your understanding and proposed approach
4. Wait for approval before starting implementation
5. Begin with Phase 1, Task 1.1

## Error Handling

If at any point:
- Tests fail: Debug and fix before proceeding
- User disapproves: Revise based on feedback
- Something is unclear: Ask for clarification
- Integration breaks: Revert and try alternative approach

## Success Criteria

Each phase is complete when:
1. All tests pass
2. User approves the implementation
3. Integration works smoothly
4. No regressions in existing functionality

Remember: Work in small, testable increments. Get approval at each gate. Iterate based on feedback until the user is satisfied with the output.

## Initial Action

Start by:
1. Reading the implementation plan
2. Examining the current conversation mode implementation
3. Presenting your implementation strategy
4. Awaiting user approval to begin

Say: "I've read the implementation plan and I'm ready to begin. Here's my understanding and approach: [your summary]. Shall I proceed with Phase 1, Task 1.1?"