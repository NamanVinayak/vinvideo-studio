/**
 * Standalone TTS Performance Test
 * Run with: node test-tts-performance.js
 */

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');

async function testTTS(text) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting TTS Performance Test...');
    console.log(`📝 Text length: ${text.length} characters`);
    console.log(`📝 First 100 chars: ${text.substring(0, 100)}...`);
    console.log('─'.repeat(60));
    
    // Get API key from environment
    const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      throw new Error('No Google Cloud API key found. Set GOOGLE_CLOUD_API_KEY or GOOGLE_AI_API_KEY');
    }
    
    console.log(`🔑 Using API key: ${googleApiKey.substring(0, 5)}...`);
    
    // Initialize optimized client
    const client = new TextToSpeechClient({
      apiKey: googleApiKey,
      apiEndpoint: 'us-central1-texttospeech.googleapis.com'
    });
    
    // Optimized request for speed
    const request = {
      input: { text: text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Standard-A', // Fastest voice
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'OGG_OPUS', // Fastest encoding
        sampleRateHertz: 24000,    // Optimal speed/quality
        speakingRate: 1.0,
        volumeGainDb: 0.0
      }
    };
    
    console.log('📡 Sending request to Google Cloud TTS (us-central1)...');
    const requestStart = Date.now();
    
    const [response] = await client.synthesizeSpeech(request);
    
    const requestEnd = Date.now();
    const requestTime = requestEnd - requestStart;
    
    if (!response.audioContent) {
      throw new Error('No audio content received');
    }
    
    console.log('✅ Audio received successfully!');
    console.log(`📊 Audio size: ${response.audioContent.length} bytes`);
    console.log(`⏱️  API call time: ${requestTime}ms (${(requestTime/1000).toFixed(2)}s)`);
    
    // Save audio file for verification
    const timestamp = Date.now();
    const filename = `test-audio-${timestamp}.opus`;
    const outputPath = path.join(__dirname, 'public', filename);
    
    // Create public directory if it doesn't exist
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.audioContent);
    
    const totalTime = Date.now() - startTime;
    
    console.log('─'.repeat(60));
    console.log('🎉 TTS Performance Test Results:');
    console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log(`📁 Audio saved: ${filename}`);
    console.log(`📈 Characters per second: ${Math.round(text.length / (totalTime/1000))}`);
    console.log('─'.repeat(60));
    
    return {
      totalTime,
      requestTime,
      audioSize: response.audioContent.length,
      filename,
      success: true
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ TTS Test Failed:');
    console.error(`⏱️  Failed after: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.error(`🔥 Error: ${error.message}`);
    
    return {
      totalTime,
      error: error.message,
      success: false
    };
  }
}

// Test with your actual script
const testText = `You know that thing you said you'd start 'next week'... three months ago? Yeah, that one. I get it. You've been busy. You've been planning. You've been waiting for the stars to align. But here's what I realized watching successful people for years: They're not smarter than you. They're not more talented. They just stopped waiting for permission. Right now, as you watch this, you're doing one of two things: You're either building the life you want... or you're building excuses for why you can't. Let's be honest about what 'waiting' really looks like in your daily life. It's saying 'I'll start my business when I save more money' while spending money on things that don't matter. It's telling yourself 'I'll apply for that job when I'm more qualified' while watching less qualified people get hired. It's that voice that says, 'Just one more YouTube video about productivity' instead of actually being productive. But here's what nobody tells you about waiting: It's not neutral. While you're standing still, everyone else is moving forward. Every day you don't start is a day someone else gets ahead. And here's the kicker – studies show that 92% of breakthrough ideas never make it out of people's heads because they waited for the 'right moment' that never came. Meanwhile, someone else took that same idea and ran with it. The gap isn't staying the same. It's getting wider. So what do winners do differently? They understand something counterintuitive: Done is better than perfect. Think about the last app you downloaded. Was it flawless? Probably not. But someone built it, shipped it, and improved it based on real feedback. While others were still sketching 'the perfect app' in their notebooks. Winners start before they feel ready. They launch messy first versions. They have awkward conversations. They fail fast and adjust faster. It's not about being fearless. It's about moving despite the fear. Now, I want to share something that changed my life: The 5-Second Reset. When you feel that familiar resistance – you know, that voice that says 'maybe later' – you count: 5... 4... 3... 2... 1... then you move your body before your brain can stop you. Why does this work? Your brain takes about 5 seconds to come up with a convincing reason to quit. But physical movement interrupts that pattern. Think about it like this: You already know what you need to do. Your problem isn't knowledge – it's activation. This gives you the activation. Let me show you how simple this is. Right now, think of one small action you've been putting off. Just one thing. Got it? Don't overthink it. When this video ends, you're going to use those five seconds. Here's what this looks like in the real world: A teacher named Sara cut the feet off her pantyhose because they looked better that way. Instead of keeping it to herself, she started selling them. That became Spanx – now worth billions. A recent college grad couldn't afford a couch, so he put air mattresses in his apartment and charged people to sleep on them. That 'crazy' idea became Airbnb. Notice something? They didn't wait for the perfect business plan. They solved their own problems first, then discovered other people had the same problems. Your next move doesn't have to change the world. It just has to change your Tuesday. Here's the truth that nobody wants to hear: Every moment you're not moving forward, you're choosing to stay where you are. Not deciding is still a decision. Not starting is still a choice. But here's the truth that everyone needs to hear: You're closer than you think. That thing you've been putting off? It's probably easier than the story you've built around it. So here's my challenge: When this video ends, don't scroll to the next one. Don't check your messages. Take those five seconds and move. Because six months from now, you'll either be glad you started today... or you'll be wishing you had. The clock's already running. What are you going to do with your next five seconds?`;

if (require.main === module) {
  console.log('🧪 TTS Performance Test Started');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('');
  
  testTTS(testText).then(result => {
    if (result.success) {
      console.log('');
      console.log('🎯 Test completed successfully!');
      console.log('💡 You can now paste your full script to test with the real content.');
    } else {
      console.log('');
      console.log('💥 Test failed. Check your API key and network connection.');
    }
  }).catch(console.error);
}

module.exports = { testTTS };