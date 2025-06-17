#!/usr/bin/env node

/**
 * Test script to verify Vision Enhanced pipeline data flow
 * Specifically tests if agent instructions are being passed correctly
 */

const TEST_CASES = [
  {
    name: "Japanese Water Painting Test",
    input: {
      concept: "A serene journey through Japanese water painting style landscapes, where mountains dissolve into mist",
      style: "artistic",
      pacing: "slow",
      duration: 30,
      contentType: "general"
    },
    expectedArtisticStyle: "Japanese water painting"
  },
  {
    name: "Van Gogh Style Test",
    input: {
      concept: "The night sky swirls with van Gogh's Post-Impressionist style, stars dancing in thick brushstrokes",
      style: "artistic",
      pacing: "fast",
      duration: 30,
      contentType: "general"
    },
    expectedArtisticStyle: "van Gogh Post-Impressionist"
  }
];

async function testVisionDataFlow() {
  console.log("🧪 Testing Vision Enhanced Pipeline Data Flow\n");
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Running Test: ${testCase.name}`);
    console.log(`Input concept: "${testCase.input.concept}"`);
    console.log(`Expected artistic style detection: "${testCase.expectedArtisticStyle}"`);
    
    try {
      // Step 1: Call Vision Understanding
      console.log("\n1️⃣ Calling Vision Understanding Agent...");
      const visionResponse = await fetch('http://localhost:3000/api/vision-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.input)
      });
      
      const visionData = await visionResponse.json();
      
      if (!visionData.success) {
        console.error("❌ Vision Understanding failed:", visionData.error);
        continue;
      }
      
      // Check artistic style detection
      const detectedStyle = visionData.visionDocument?.detected_artistic_style;
      console.log(`✅ Detected artistic style: "${detectedStyle}"`);
      
      // Check agent instructions
      const agentInstructions = visionData.visionAgentData?.stage1_vision_analysis?.agent_instructions;
      console.log("\n📊 Agent Instructions Summary:");
      console.log(`- Producer instructions: ${agentInstructions?.producer_instructions ? '✅ Present' : '❌ Missing'}`);
      console.log(`- Director instructions: ${agentInstructions?.director_instructions ? '✅ Present' : '❌ Missing'}`);
      console.log(`- DoP instructions: ${agentInstructions?.dop_instructions ? '✅ Present' : '❌ Missing'}`);
      console.log(`- Prompt Engineer instructions: ${agentInstructions?.prompt_engineer_instructions ? '✅ Present' : '❌ Missing'}`);
      
      // Sample instruction content
      if (agentInstructions?.prompt_engineer_instructions?.artistic_style_enforcement) {
        console.log(`\n🎨 Artistic Style Enforcement for Prompt Engineer:`);
        console.log(`"${agentInstructions.prompt_engineer_instructions.artistic_style_enforcement}"`);
      }
      
      // Check if instructions are specific to the concept
      if (agentInstructions?.director_instructions?.scene_direction_philosophy) {
        console.log(`\n🎬 Director Scene Philosophy:`);
        console.log(`"${agentInstructions.director_instructions.scene_direction_philosophy.substring(0, 200)}..."`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed with error:`, error.message);
    }
  }
  
  console.log("\n\n✨ Test Complete!");
}

// Run the test
testVisionDataFlow().catch(console.error);