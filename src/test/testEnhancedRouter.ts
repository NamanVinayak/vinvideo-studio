/**
 * Test function for Enhanced Pipeline Router
 * Run this to validate router behavior with different conversation types
 */

export const testScenarios = [
  {
    name: "Clear Music Video Request",
    conversation: [
      { role: "assistant", content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?" },
      { role: "user", content: "I want to create a music video" },
      { role: "assistant", content: "Great! Tell me more about your music video concept." },
      { role: "user", content: "I have a techno track that's 90 seconds long" },
      { role: "assistant", content: "Techno music can create amazing visuals! What kind of visual style are you thinking?" },
      { role: "user", content: "I want fast cuts and neon visuals" }
    ],
    expectedPipeline: "MUSIC_VIDEO",
    expectedParams: { has_music: true, has_narration: false, duration: 90 }
  },
  {
    name: "Educational Content",
    conversation: [
      { role: "assistant", content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?" },
      { role: "user", content: "I need a video about climate change" },
      { role: "assistant", content: "Climate change is an important topic. What angle would you like to take?" },
      { role: "user", content: "It should be educational and serious" },
      { role: "assistant", content: "How long should this educational video be?" },
      { role: "user", content: "30 seconds with narration explaining the facts" }
    ],
    expectedPipeline: "VISION_ENHANCED",
    expectedParams: { has_music: false, has_narration: true, duration: 30 }
  },
  {
    name: "Abstract Visual Art",
    conversation: [
      { role: "assistant", content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?" },
      { role: "user", content: "I want abstract visuals of colors morphing" },
      { role: "assistant", content: "Abstract visual art can be mesmerizing. Tell me more about your vision." },
      { role: "user", content: "No music, no words, just pure visual art" },
      { role: "assistant", content: "A silent visual experience. How long should it be?" },
      { role: "user", content: "15 seconds of contemplative visuals" }
    ],
    expectedPipeline: "NO_MUSIC_VIDEO",
    expectedParams: { has_music: false, has_narration: false, duration: 15 }
  },
  {
    name: "Complete Script Provided",
    conversation: [
      { role: "assistant", content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?" },
      { role: "user", content: "I have a script ready for my video" },
      { role: "assistant", content: "Great! Please share your script with me." },
      { role: "user", content: "Here's my script: 'In the beginning, there was darkness. Then, a single spark ignited the cosmos. Stars were born, planets formed, and life began its incredible journey.'" }
    ],
    expectedPipeline: "SCRIPT_MODE",
    expectedParams: { has_complete_script: true }
  },
  {
    name: "Ambiguous - Needs Clarification",
    conversation: [
      { role: "assistant", content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?" },
      { role: "user", content: "I want a video with music" },
      { role: "assistant", content: "Interesting! What kind of video are you envisioning?" },
      { role: "user", content: "It should tell a story about hope" }
    ],
    expectedPipeline: null, // Should ask for clarification
    needsClarification: ["Do you want narration over the music?"]
  }
];

export async function testEnhancedRouter() {
  console.log('🧪 Testing Enhanced Pipeline Router\n');
  
  const results = [];
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log('Conversation:', scenario.conversation.length, 'messages');
    
    try {
      const response = await fetch('http://localhost:3000/api/pipeline-router-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: scenario.conversation
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        console.error('❌ Error:', result.error);
        results.push({ scenario: scenario.name, success: false, error: result.error });
        continue;
      }
      
      const pipeline = result.routing_decision?.pipeline;
      const confidence = result.analysis?.confidence;
      
      console.log(`Pipeline: ${pipeline} (confidence: ${confidence})`);
      console.log('Reasoning:', result.analysis?.reasoning);
      
      // Check if result matches expected
      const success = scenario.expectedPipeline ? 
        pipeline === scenario.expectedPipeline : 
        result.analysis?.clarification_needed?.length > 0;
      
      console.log(success ? '✅ PASS' : '❌ FAIL');
      
      results.push({
        scenario: scenario.name,
        success,
        pipeline,
        confidence,
        expected: scenario.expectedPipeline
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      results.push({ scenario: scenario.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success).length;
  console.log(`Passed: ${passed}/${results.length}`);
  
  return results;
}

// Export for use in API test endpoint
export default testEnhancedRouter;