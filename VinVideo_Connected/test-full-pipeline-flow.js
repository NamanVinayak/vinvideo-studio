#!/usr/bin/env node

/**
 * Comprehensive test for Vision Enhanced pipeline data flow
 * Tests the complete chain: Vision -> Producer -> Director -> DoP -> Prompt Engineer
 */

const fs = require('fs');
const path = require('path');

// Test case with specific artistic style
const TEST_INPUT = {
  concept: "A mystical journey through Japanese sumi-e water painting landscapes where mountains dissolve into mist",
  style: "artistic",
  pacing: "slow", 
  duration: 30,
  contentType: "general"
};

// Helper to save intermediate results
function saveStepResult(step, data) {
  const dir = path.join(__dirname, 'pipeline-test-results');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(dir, `${step}.json`),
    JSON.stringify(data, null, 2)
  );
}

async function runFullPipelineTest() {
  console.log("🚀 Running Full Vision Enhanced Pipeline Test\n");
  console.log("Test Input:", JSON.stringify(TEST_INPUT, null, 2));
  
  const results = {
    visionData: null,
    agentInstructions: null,
    producerData: null,
    directorData: null,
    dopData: null,
    promptEngineerData: null
  };
  
  try {
    // Step 1: Vision Understanding
    console.log("\n1️⃣ VISION UNDERSTANDING");
    const visionResponse = await fetch('http://localhost:3000/api/vision-only', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_INPUT)
    });
    
    results.visionData = await visionResponse.json();
    saveStepResult('1-vision', results.visionData);
    
    if (!results.visionData.success) {
      throw new Error(`Vision failed: ${results.visionData.error}`);
    }
    
    // Extract key data
    results.agentInstructions = results.visionData.visionAgentData?.stage1_vision_analysis?.agent_instructions;
    const visionDocument = results.visionData.visionDocument;
    const narrationScript = results.visionData.narrationScript;
    
    console.log("✅ Vision Understanding Complete");
    console.log(`- Core Concept: "${visionDocument.core_concept}"`);
    console.log(`- Detected Artistic Style: "${visionDocument.detected_artistic_style}"`);
    console.log(`- Agent Instructions Available: ${!!results.agentInstructions}`);
    
    // Step 2: Generate Audio (mock for test)
    console.log("\n2️⃣ AUDIO GENERATION (Mocked)");
    const mockAudioUrl = "/test-audio.wav";
    const mockTranscript = narrationScript.split(' ').map((word, i) => ({
      word,
      start: i * 0.5,
      end: (i + 1) * 0.5
    }));
    
    // Step 3: Producer Agent
    console.log("\n3️⃣ PRODUCER AGENT");
    console.log(`- Passing producer_instructions: ${!!results.agentInstructions?.producer_instructions}`);
    
    const producerResponse = await fetch('http://localhost:3000/api/vision-enhanced-producer-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: mockTranscript,
        script: narrationScript,
        visionDocument: visionDocument,
        producer_instructions: results.agentInstructions?.producer_instructions,
        enhancedMode: true
      })
    });
    
    results.producerData = await producerResponse.json();
    saveStepResult('3-producer', results.producerData);
    
    if (!results.producerData.success) {
      throw new Error(`Producer failed: ${results.producerData.error}`);
    }
    
    console.log("✅ Producer Complete");
    console.log(`- Cut Points Generated: ${results.producerData.cutPoints?.length || 0}`);
    
    // Step 4: Director Agent
    console.log("\n4️⃣ DIRECTOR AGENT");
    console.log(`- Passing director_instructions: ${!!results.agentInstructions?.director_instructions}`);
    
    const directorResponse = await fetch('http://localhost:3000/api/director-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        producer_output: results.producerData.cutPoints,
        script: narrationScript,
        visionDocument: visionDocument,
        director_instructions: results.agentInstructions?.director_instructions,
        enhancedMode: true
      })
    });
    
    results.directorData = await directorResponse.json();
    saveStepResult('4-director', results.directorData);
    
    console.log("✅ Director Complete");
    console.log(`- Creative Vision Generated: ${!!results.directorData.directorOutput}`);
    
    // Step 5: DoP Agent
    console.log("\n5️⃣ DOP AGENT");
    console.log(`- Passing dop_instructions: ${!!results.agentInstructions?.dop_instructions}`);
    
    const dopResponse = await fetch('http://localhost:3000/api/dop-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: narrationScript,
        producer_output: results.producerData.cutPoints,
        director_output: results.directorData.directorOutput,
        visionDocument: visionDocument,
        dop_instructions: results.agentInstructions?.dop_instructions,
        enhancedMode: true
      })
    });
    
    results.dopData = await dopResponse.json();
    saveStepResult('5-dop', results.dopData);
    
    console.log("✅ DoP Complete");
    console.log(`- Cinematography Directions Generated: ${!!results.dopData.dopOutput}`);
    
    // Step 6: Prompt Engineer Agent
    console.log("\n6️⃣ PROMPT ENGINEER AGENT");
    console.log(`- Passing prompt_engineer_instructions: ${!!results.agentInstructions?.prompt_engineer_instructions}`);
    
    const promptEngineerResponse = await fetch('http://localhost:3000/api/prompt-engineer-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: narrationScript,
        director_output: results.directorData.directorOutput,
        dop_output: results.dopData.dopOutput,
        num_images: results.producerData.cutPoints?.length || 5,
        visionDocument: visionDocument,
        prompt_engineer_instructions: results.agentInstructions?.prompt_engineer_instructions,
        enhancedMode: true
      })
    });
    
    results.promptEngineerData = await promptEngineerResponse.json();
    saveStepResult('6-prompt-engineer', results.promptEngineerData);
    
    console.log("✅ Prompt Engineer Complete");
    console.log(`- Image Prompts Generated: ${results.promptEngineerData.numPrompts || 0}`);
    
    // Final Analysis
    console.log("\n📊 FINAL ANALYSIS");
    console.log("\n🔍 Instruction Flow Verification:");
    console.log(`- Producer received instructions: ${!!results.agentInstructions?.producer_instructions}`);
    console.log(`- Director received instructions: ${!!results.agentInstructions?.director_instructions}`);
    console.log(`- DoP received instructions: ${!!results.agentInstructions?.dop_instructions}`);
    console.log(`- Prompt Engineer received instructions: ${!!results.agentInstructions?.prompt_engineer_instructions}`);
    
    console.log("\n🎨 Artistic Style Consistency:");
    console.log(`- Vision detected: "${visionDocument.detected_artistic_style}"`);
    console.log(`- DoP instructions mention style: ${results.agentInstructions?.dop_instructions?.artistic_style_support?.includes('Japanese') || false}`);
    console.log(`- Prompt Engineer enforcement: ${results.agentInstructions?.prompt_engineer_instructions?.artistic_style_enforcement?.includes('Japanese') || false}`);
    
    // Check if prompts contain the artistic style
    if (results.promptEngineerData.promptsOutput) {
      const prompt = results.promptEngineerData.promptsOutput[0];
      console.log(`\n📝 First Generated Prompt Sample:`);
      console.log(`"${prompt.substring(0, 150)}..."`);
      console.log(`Contains "sumi-e" or "Japanese": ${prompt.toLowerCase().includes('sumi-e') || prompt.toLowerCase().includes('japanese')}`);
    }
    
    console.log("\n✅ Pipeline Test Complete!");
    console.log(`📁 Results saved to: ${path.join(__dirname, 'pipeline-test-results')}`);
    
  } catch (error) {
    console.error("\n❌ Pipeline Test Failed:", error.message);
    console.error("Last successful step:", Object.keys(results).find(key => results[key] !== null));
  }
}

// Run the test
console.log("⚠️  Make sure the Next.js dev server is running on http://localhost:3000\n");
runFullPipelineTest().catch(console.error);