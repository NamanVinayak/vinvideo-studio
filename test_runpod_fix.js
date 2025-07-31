#!/usr/bin/env node

// Test script to verify RunPod payload fix
// Run with: node test_runpod_fix.js

const testPayload = {
  projectId: `test-runpod-fix-${Date.now()}`,
  editingPlan: {
    composition: {
      format: "9:16",
      duration: 10.0,
      fps: 30
    },
    layers: [
      {
        type: "image",
        source: "s3://vinvideo/input/project-test/beat_1.png",
        start_time: 0.0,
        end_time: 5.0,
        position: [540, 960],
        scale: 1.0
      }
    ],
    audio: {
      narration: {
        source: "s3://vinvideo/input/project-test/audio.wav",
        level: 0.0
      }
    }
  },
  s3Assets: ["beat_1.png", "audio.wav"]
};

async function testRunPodFix() {
  console.log('🧪 Testing RunPod payload fix...');
  console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch('http://localhost:3003/api/process-with-runpod', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    console.log('\n📋 RunPod Response:');
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.processingInfo) {
      console.log(`\n⏱️ Processing time: ${result.processingInfo.executionTime}ms`);
      
      if (result.processingInfo.executionTime > 1000) {
        console.log('✅ SUCCESS: Processing took longer than 1 second (likely working!)');
      } else {
        console.log('❌ STILL BROKEN: Processing too fast (<1s), probably not actually processing');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if server is available
fetch('http://localhost:3003/api/process-with-runpod', { method: 'GET' })
  .then(() => {
    console.log('✅ Server detected, running test...');
    testRunPodFix();
  })
  .catch(() => {
    console.log('❌ Server not running. Please start with: npm run dev');
    console.log('Then run: node test_runpod_fix.js');
  });