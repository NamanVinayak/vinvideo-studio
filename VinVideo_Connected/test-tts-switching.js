/**
 * Test TTS Provider Switching System
 * Demonstrates switching between Gemini and MiniMax TTS
 */

const { textToSpeech } = require('./dist/utils/audioProcessing.js');

// Sample text for testing
const testText = `Hello! This is a test of our flexible TTS system. We can now switch between Gemini TTS for natural quality and MiniMax for fast natural speech generation.`;

async function testProviderSwitching() {
  console.log('🧪 TTS Provider Switching Test');
  console.log('═'.repeat(50));
  
  try {
    // Test current provider (from env)
    console.log('\n📋 Testing current TTS provider...');
    const provider = process.env.TTS_PROVIDER || 'gemini';
    console.log(`Current provider: ${provider}`);
    
    if (provider === 'minimax') {
      console.log(`MiniMax model: ${process.env.MINIMAX_MODEL || 'speech-02-hd'}`);
    }
    
    const startTime = Date.now();
    const audioUrl = await textToSpeech(testText, 'test-switching');
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ TTS completed successfully!`);
    console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log(`🎵 Audio URL: ${audioUrl}`);
    
    console.log('\n💡 To switch providers:');
    console.log('For Gemini (natural, slow):  TTS_PROVIDER=gemini');
    console.log('For MiniMax HD (natural, fast):  TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-hd');
    console.log('For MiniMax Turbo (fastest):      TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-turbo');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions for manual testing
console.log('🎯 TTS Provider Switching Instructions:');
console.log('');
console.log('1. Test Gemini TTS (natural, slow ~103s):');
console.log('   TTS_PROVIDER=gemini node test-tts-switching.js');
console.log('');
console.log('2. Test MiniMax HD (natural, fast ~5-15s):');
console.log('   TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-hd MINIMAX_API_KEY=your_key node test-tts-switching.js');
console.log('');
console.log('3. Test MiniMax Turbo (fastest ~5-10s):');
console.log('   TTS_PROVIDER=minimax MINIMAX_MODEL=speech-02-turbo MINIMAX_API_KEY=your_key node test-tts-switching.js');
console.log('');

if (require.main === module) {
  testProviderSwitching().catch(console.error);
}