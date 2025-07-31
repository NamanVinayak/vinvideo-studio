#!/usr/bin/env node

// Quick debug script to test our S3 integration changes
// Run with: node debug_s3_integration.js

async function testS3Integration() {
  console.log('🔍 Testing S3-based integration changes...');
  
  try {
    // Test the submit-for-editing endpoint directly
    const response = await fetch('http://localhost:3003/api/submit-for-editing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: `test-s3-${Date.now()}`,
        subtitleStyle: 'simple_caption'
      })
    });
    
    const result = await response.json();
    
    console.log('\n📋 Response Status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    // Check if our S3 changes are working
    if (result.success) {
      console.log('\n✅ SUCCESS: Integration completed');
      if (result.editingPlanGenerated) {
        console.log('✅ Editing plan generated successfully');
      }
      if (result.finalVideoGenerated) {
        console.log('✅ Final video generated successfully');
      } else {
        console.log('❓ Video generation status unclear - check server logs for S3 steps');
      }
    } else {
      console.log('\n❌ FAILED:', result.error);
    }
    
    console.log('\n🔍 IMPORTANT: Check your terminal running "npm run dev" for these logs:');
    console.log('   📋 [SERVER] Step 7.5: Saving editing plan to S3...');
    console.log('   ✅ [SERVER] Editing plan saved to S3: input/project-xxx/editing_plan.json');
    console.log('   📦 [RUNPOD] Payload prepared (S3-based): { action: "process_video_with_s3_plan" }');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
  }
}

// Check if server is running first
fetch('http://localhost:3003/api/health')
  .then(() => {
    console.log('✅ Server detected, running S3 integration test...');
    testS3Integration();
  })
  .catch(() => {
    console.log('❌ Server not running on port 3003');
    console.log('Please start with: npm run dev');
    console.log('Then run: node debug_s3_integration.js');
  });