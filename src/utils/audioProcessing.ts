/**
 * Audio processing utilities including TTS and audio segment analysis
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Fallback to sample audio if TTS fails
 * @param reason The reason for falling back
 * @returns URL to the fallback audio file
 */
function getFallbackAudio(reason: string): string {
  console.warn(`Using fallback audio. Reason: ${reason}`);
  
  // For testing purposes, create a timestamp to avoid caching issues
  const timestamp = new Date().getTime();
  const fallbackUrl = `/sample-audio.mp3?t=${timestamp}&reason=${encodeURIComponent(reason)}`;
  
  return fallbackUrl;
}

/**
 * Convert text to speech using Hume AI's TTS service
 * @param text The script text to convert to speech
 * @param folderName Optional folder name to save the audio in (should be a folder in public directory)
 * @returns URL to the generated audio file
 */
export async function textToSpeech(text: string, folderName?: string): Promise<string> {
  try {
    console.log('Making real TTS API call to Hume AI...');
    
    // Get the Hume AI API key
    const humeApiKey = process.env.HUME_API_KEY;
    if (!humeApiKey) {
      console.error('Hume AI API key is not configured');
      return getFallbackAudio('No API key configured');
    }
    
    console.log(`Using Hume AI API key: ${humeApiKey.substring(0, 5)}...`);
    
    // Prepare the request payload
    const payload = {
      utterances: [{
        text: text,
        description: "Clear, professional narrator voice with natural pacing and emphasis."
      }],
      format: {
        type: "mp3"
      }
    };
    
    console.log('Sending payload to Hume AI:', JSON.stringify(payload, null, 2));
    
    try {
      // Make the actual API call
      // Correct API endpoint - using Octave API for TTS
      const response = await fetch('https://api.hume.ai/v0/tts/octave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hume-Api-Key': humeApiKey
        },
        body: JSON.stringify(payload)
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hume AI API error:', response.status, response.statusText);
        console.error('Error details:', errorText);
        
        // Try to parse error response if it's JSON
        let errorDetails = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch {
          errorDetails = errorText.substring(0, 200); // Trim long error messages
        }
        
        return getFallbackAudio(`API error: ${response.status} ${response.statusText} - ${errorDetails}`);
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Hume AI response received with status:', response.status);
      
      // Extract audio data from the response
      if (!data.generations || data.generations.length === 0) {
        console.error('No generations in Hume AI response:', JSON.stringify(data, null, 2));
        return getFallbackAudio('No generations in API response');
      }
      
      if (!data.generations[0].audio) {
        console.error('No audio data in generation:', JSON.stringify(data.generations[0], null, 2));
        return getFallbackAudio('No audio data in generation');
      }
      
      // Convert base64 audio data to buffer
      const audioBase64 = data.generations[0].audio;
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `generated-audio-${timestamp}.mp3`;
      
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
      
      // Save the audio file to the appropriate directory
      const outputPath = path.join(outputDir, filename);
      
      await fs.writeFile(outputPath, audioBuffer);
      console.log(`Audio saved to ${outputPath}`);
      
      // Return the URL to the generated audio file (relative to public dir)
      return urlPath;
    } catch (fetchError: unknown) {
      console.error('Fetch error during API call:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return getFallbackAudio(`Fetch error: ${errorMessage}`);
    }
  } catch (error: unknown) {
    console.error('Unexpected error in textToSpeech:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return getFallbackAudio(`Unexpected error: ${errorMessage}`);
  }
}

/**
 * Analyze the audio file to get timing information for each segment
 * @param audioUrl URL to the audio file
 * @param script Original script text
 * @returns Array of segments with timing information
 */
export async function analyzeAudioSegments(audioUrl: string, formattedScript: string) {
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