/**
 * Audio processing utilities including TTS and audio segment analysis
 */

import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import wav from 'wav';

/**
 * Fallback to sample audio if TTS fails
 * @param reason The reason for falling back
 * @param folderName Optional folder name to copy fallback audio to
 * @returns URL to the fallback audio file
 */
function getFallbackAudio(reason: string): string {
  console.warn(`Using fallback audio. Reason: ${reason}`);
  
  // Return a simple path to the fallback audio without parameters
  // URL parameters can cause path issues when constructing file paths
  return `/sample-audio.mp3`;
}

/**
 * Convert text to speech using configurable TTS providers (Gemini or MiniMax)
 * @param text The script text to convert to speech
 * @param folderName Optional folder name to save the audio in (should be a folder in public directory)
 * @param voiceName Optional voice name (Enceladus, Puck, Kore, Charon). Defaults to Enceladus
 * @returns URL to the generated audio file
 */
export async function textToSpeech(text: string, folderName?: string, voiceName?: string): Promise<string> {
  const provider = process.env.TTS_PROVIDER || 'gemini';
  
  console.log(`🎙️ Using TTS provider: ${provider}`);
  
  switch(provider.toLowerCase()) {
    case 'gemini':
      return await geminiTTS(text, folderName, voiceName);
    case 'minimax':
      return await minimaxTTS(text, folderName, voiceName);
    default:
      console.error(`Unknown TTS provider: ${provider}, falling back to Gemini`);
      return await geminiTTS(text, folderName, voiceName);
  }
}

/**
 * Gemini TTS implementation (natural voice, slower processing ~103s)
 */
async function geminiTTS(text: string, folderName?: string, voiceName?: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    const selectedVoice = voiceName || 'Enceladus';
    console.log(`🚀 Making TTS API call to Google Gemini using official SDK with voice: ${selectedVoice}...`);
    
    // Get the Google AI API key
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      console.error('Google AI API key is not configured');
      return getFallbackAudio('No API key configured');
    }
    
    console.log(`🔑 Using Google AI API key: ${googleApiKey.substring(0, 5)}...`);
    
    // Create a direct prompt for natural speech
    const prompt = text;
    
    console.log('📡 Sending text to Gemini TTS...');
    console.log('🎯 Selected voice:', selectedVoice);
    console.log('📝 Text length:', text.length);
    console.log('📄 First 100 chars of text:', text.substring(0, 100));
    
    try {
      // Use the official Google GenAI SDK
      const ai = new GoogleGenAI({ apiKey: googleApiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      console.log('✅ Gemini TTS response received');
      console.log('📊 Response structure:', {
        candidates: response.candidates?.length || 0,
        hasContent: !!response.candidates?.[0]?.content,
        hasParts: !!response.candidates?.[0]?.content?.parts,
        partsCount: response.candidates?.[0]?.content?.parts?.length || 0
      });
      
      // Extract audio data using the correct path from documentation
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        console.error('❌ No audio data found in response:', JSON.stringify(response, null, 2));
        return getFallbackAudio('No audio data in response');
      }
      
      console.log(`📊 Audio data found: ${audioData.length} characters`);
      
      // Convert the audio data to a buffer (it's already PCM data)
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `generated-audio-${timestamp}.wav`;
      
      // Determine the output directory based on whether a folderName was provided
      let outputDir;
      let urlPath;
      
      if (folderName) {
        outputDir = path.join(process.cwd(), 'public', folderName);
        urlPath = `/${folderName}/${filename}`;
      } else {
        outputDir = path.join(process.cwd(), 'public');
        urlPath = `/${filename}`;
      }
      
      // Create the directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });
      
      // Save the audio file using proper WAV format
      const outputPath = path.join(outputDir, filename);
      
      // Use the WAV library to properly format the audio file
      await saveWaveFile(outputPath, audioBuffer);
      
      const totalTime = Date.now() - startTime;
      console.log(`💾 Audio saved to ${outputPath}`);
      console.log(`⏱️ Gemini TTS completed in ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
      
      // Return the URL to the generated audio file (relative to public dir)
      return urlPath;
    } catch (fetchError: unknown) {
      console.error('❌ Error during Gemini API call:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return getFallbackAudio(`Gemini API error: ${errorMessage}`);
    }
  } catch (error: unknown) {
    const totalTime = Date.now() - startTime;
    console.error('💥 Unexpected error in Gemini TTS:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return getFallbackAudio(`Unexpected error: ${errorMessage}`);
  }
}

/**
 * MiniMax TTS implementation (natural voice, fast processing ~5-15s)
 */
async function minimaxTTS(text: string, folderName?: string, voiceName?: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Making TTS API call to MiniMax...`);
    
    // Get MiniMax configuration
    const apiKey = process.env.MINIMAX_API_KEY;
    const apiHost = process.env.MINIMAX_API_HOST || 'https://api.minimaxi.chat';
    const model = process.env.MINIMAX_MODEL || 'speech-02-hd';
    
    if (!apiKey) {
      console.error('❌ MiniMax API key is not configured (MINIMAX_API_KEY)');
      return getFallbackAudio('No MiniMax API key configured');
    }
    
    console.log(`🔑 Using MiniMax API key: ${apiKey.substring(0, 5)}...`);
    console.log(`🏠 API Host: ${apiHost}`);
    console.log(`🤖 Model: ${model}`);
    
    // Map voice names to MiniMax preset voices
    const voiceMapping: Record<string, string> = {
      'Enceladus': 'female-en-us-01',
      'Puck': 'male-en-us-01', 
      'Kore': 'female-en-us-02',
      'Charon': 'male-en-us-02'
    };
    
    const selectedVoice = voiceMapping[voiceName || 'Enceladus'] || 'female-en-us-01';
    
    console.log('🎯 Selected voice:', selectedVoice);
    console.log('📝 Text length:', text.length);
    console.log('📄 First 100 chars of text:', text.substring(0, 100));
    
    // MiniMax API request
    const requestBody = {
      model: model,
      text: text,
      voice_id: selectedVoice,
      format: process.env.MINIMAX_FORMAT || 'mp3',
      sample_rate: parseInt(process.env.MINIMAX_SAMPLE_RATE || '32000'),
      emotion: process.env.MINIMAX_EMOTION || 'neutral',
      speed: parseFloat(process.env.MINIMAX_SPEED || '1.0')
    };
    
    console.log('📡 Sending request to MiniMax API...');
    
    const response = await fetch(`${apiHost}/v1/text_to_speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`MiniMax API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.audio_url && !result.audio_data) {
      throw new Error('No audio data received from MiniMax API');
    }
    
    let audioBuffer: Buffer;
    
    if (result.audio_url) {
      // Download audio from URL
      const audioResponse = await fetch(result.audio_url);
      audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    } else if (result.audio_data) {
      // Direct base64 audio data
      audioBuffer = Buffer.from(result.audio_data, 'base64');
    } else {
      throw new Error('No valid audio data format received');
    }
    
    console.log(`📊 Audio data received: ${audioBuffer.length} bytes`);
    
    // Generate a unique filename with timestamp
    const timestamp = new Date().getTime();
    const format = process.env.MINIMAX_FORMAT || 'mp3';
    const filename = `minimax-audio-${timestamp}.${format}`;
    
    // Determine the output directory
    let outputDir;
    let urlPath;
    
    if (folderName) {
      outputDir = path.join(process.cwd(), 'public', folderName);
      urlPath = `/${folderName}/${filename}`;
    } else {
      outputDir = path.join(process.cwd(), 'public');
      urlPath = `/${filename}`;
    }
    
    // Create the directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save the audio file
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, audioBuffer);
    
    const totalTime = Date.now() - startTime;
    console.log(`💾 Audio saved to ${outputPath}`);
    console.log(`⏱️ MiniMax TTS completed in ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    
    return urlPath;
    
  } catch (error: unknown) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 MiniMax TTS failed after ${totalTime}ms:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return getFallbackAudio(`MiniMax TTS error: ${errorMessage}`);
  }
}

/**
 * Save PCM data as a WAV file using the wav library
 * @param filename Path to save the WAV file
 * @param pcmData PCM audio data buffer
 * @param channels Number of audio channels (default: 1)
 * @param rate Sample rate (default: 24000)
 * @param sampleWidth Sample width in bytes (default: 2)
 */
async function saveWaveFile(
  filename: string,
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    writer.on('finish', resolve);
    writer.on('error', reject);

    writer.write(pcmData);
    writer.end();
  });
}

/**
 * Analyze the audio file to get timing information for each segment
 * @param audioUrl URL to the audio file
 * @param script Original script text
 * @returns Array of segments with timing information
 */
export async function analyzeAudioSegments(_audioUrl: string, formattedScript: string) {
  try {
    // In a real implementation, we would:
    // 1. Split the text into logical segments (sentences or paragraphs)
    // 2. Use audio analysis to determine the timing of each segment
    
    // For now, we'll create mock segments by splitting on periods, question marks, and exclamation points
    const segments = formattedScript.split(/(?<=[.!?])\s+/).map((text, index) => {
      // Create segments of 5-10 seconds each with a random duration
      const duration = 5 + Math.random() * 5;
      const startTime = index === 0 ? 0 : (index * duration);
      const endTime = startTime + duration;
      
      return {
        text,
        startTime: parseFloat(startTime.toFixed(2)),
        endTime: parseFloat(endTime.toFixed(2))
      };
    }).filter(segment => segment.text.trim().length > 0);
    
    console.log(`Created ${segments.length} audio segments for analysis`);
    return segments;
  } catch (error) {
    console.error('Error in analyzeAudioSegments:', error);
    throw new Error('Failed to analyze audio segments');
  }
}

/**
 * Downloads an audio file and stores it for processing
 * @param url URL of the audio to download
 * @returns Promise resolving to the local file path
 */
export async function downloadAudio(url: string): Promise<string> {
  // In a real implementation, this would download the file
  // and save it to a temporary location
  
  // For demo purposes, return the same URL
  return url;
} 