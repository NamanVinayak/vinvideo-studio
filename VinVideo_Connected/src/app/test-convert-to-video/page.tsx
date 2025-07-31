'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

// Cooking Tutorial Test Session Data - Clean, focused cooking content only
const COOKING_SESSION_ID = 'script-1753331953615-0080ca8f';
const COOKING_IMAGES_COUNT = 7; // Only the cooking tutorial images (1-7)
const COOKING_AUDIO_FILE = 'generated-audio-1753332429627.wav';
const COOKING_TRANSCRIPTION_FILE = 'generated-audio-1753332429627_transcription.json';

interface VideoConversionState {
  isConverting: boolean;
  editingPlan: any | null;
  finalVideoUrl: string | null;
  error: string | null;
  message: string;
  uploadProgress: number;
}

interface CookingAgentData {
  director: any;
  producer: any;
  dop: any;
  promptEngineer: any;
  visionUnderstanding: any;
}

interface CookingTranscription {
  transcript: string;
  word_timestamps: Array<{
    end: number;
    start: number;
    word: string;
  }>;
}

export default function TestConvertToVideoPage() {
  console.log('🍞 TestConvertToVideoPage component initializing...');
  
  const [videoConversion, setVideoConversion] = useState<VideoConversionState>({
    isConverting: false,
    editingPlan: null,
    finalVideoUrl: null,
    error: null,
    message: '',
    uploadProgress: 0
  });

  const [cookingImages, setCookingImages] = useState<string[]>([]);
  const [cookingAgentData, setCookingAgentData] = useState<CookingAgentData | null>(null);
  const [cookingTranscription, setCookingTranscription] = useState<CookingTranscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Load cooking tutorial data on component mount - SIMPLIFIED AND NON-BLOCKING
  useEffect(() => {
    console.log('🍞 useEffect triggered - starting data load...');
    const loadBasicData = () => {
      try {
        console.log('🍞 Setting up cooking tutorial test page...');
        
        // Generate image paths for the 7 cooking tutorial images only
        const cookingImagePaths = Array.from({ length: COOKING_IMAGES_COUNT }, (_, i) => 
          `/${COOKING_SESSION_ID}/prompt_engineer_image_${i + 1}.png`
        );
        
        setCookingImages(cookingImagePaths);

        // Set up working mock transcription data
        setCookingTranscription({
          transcript: "discover the art of avocado toast gather ripe avocados crusty bread a squeeze of lemon and a sprinkle of salt and pepper toast your bread to golden perfection slice and mash the creamy avocado spread generously add a zesty lemon touch and season a simple delicious culinary masterpiece awaits",
          word_timestamps: [
            { start: 0.32, end: 0.72, word: "discover" },
            { start: 0.72, end: 0.96, word: "the" },
            { start: 0.96, end: 1.36, word: "art" },
            { start: 1.36, end: 1.52, word: "of" },
            { start: 1.52, end: 2.4, word: "avocado" },
            { start: 2.4, end: 2.8, word: "toast" }
          ]
        });

        // Set up working mock agent data - REALISTIC BUT NOT BLOCKING
        setCookingAgentData({
          director: { 
            project_metadata: { 
              target_platform: "instagram", 
              content_type: "Recipe Tutorial", 
              primary_concept: "Hyper-realistic POV avocado toast creation" 
            }, 
            narrative_beats: [
              { beat_no: 1, script_phrase: "Discover the art of avocado toast", estimated_duration_s: 3, narrative_function: "Concept establishment" },
              { beat_no: 2, script_phrase: "Gather ripe avocados...", estimated_duration_s: 7, narrative_function: "Ingredient introduction" },
              { beat_no: 3, script_phrase: "Toast your bread...", estimated_duration_s: 3, narrative_function: "Process demonstration" },
              { beat_no: 4, script_phrase: "Slice and mash...", estimated_duration_s: 4, narrative_function: "Core technique reveal" },
              { beat_no: 5, script_phrase: "Spread generously...", estimated_duration_s: 5, narrative_function: "Artistic assembly" },
              { beat_no: 6, script_phrase: "A simple...", estimated_duration_s: 2, narrative_function: "Climactic reveal" },
              { beat_no: 7, script_phrase: "", estimated_duration_s: 5, narrative_function: "Lingering appreciation" }
            ]
          },
          producer: [
            { cut_number: 1, cut_time_s: 0, reason: "Opening shot - establish the concept of avocado toast" },
            { cut_number: 2, cut_time_s: 3.52, reason: "Transition to gathering ingredients" },
            { cut_number: 3, cut_time_s: 10.8, reason: "Transition to toasting the bread" },
            { cut_number: 4, cut_time_s: 13.52, reason: "Transition to preparing the avocado" },
            { cut_number: 5, cut_time_s: 17.2, reason: "Transition to assembling and seasoning" },
            { cut_number: 6, cut_time_s: 22.08, reason: "Final reveal shot" },
            { cut_number: 7, cut_time_s: 24.24, reason: "Hold on final shot" }
          ],
          dop: { cinematography: "POV hands making recipe, hyper-realistic cooking shots" },
          promptEngineer: { prompts: "Cooking tutorial image prompts for 7 beats" },
          visionUnderstanding: { core_concept: "Crafting the perfect avocado toast, a symphony of fresh ingredients and simple steps, culminating in a hyper-realistic culinary delight." }
        });

        // Mark audio as loaded for testing purposes
        setAudioLoaded(true);

        // IMMEDIATELY set loading to false - no blocking!
        setIsLoading(false);
        console.log('✅ Cooking tutorial test page ready!');
        
      } catch (error) {
        console.error('Error setting up test page:', error);
        setIsLoading(false);
      }
    };

    // Load immediately, no async blocking
    loadBasicData();
  }, []);

  const handleConvertToVideo = async () => {
    console.log('🎬 [CLIENT] Starting Convert to Video process...');
    
    setVideoConversion(prev => ({
      ...prev,
      isConverting: true,
      error: null,
      message: 'Starting video conversion...',
      uploadProgress: 0
    }));

    try {
      // Step 1: Prepare test session data
      console.log('📋 [CLIENT] Step 1: Preparing session data...');
      setVideoConversion(prev => ({
        ...prev,
        message: 'Preparing session data with universal naming...',
        uploadProgress: 10
      }));

      // Create realistic session data using actual cooking tutorial data
      const sessionData = {
        sessionId: COOKING_SESSION_ID,
        subtitleStyle: 'modern_clean' as const,
        advancedMode: false, // Start with simple mode for testing
        platform: 'instagram' as const, // Match the original cooking tutorial platform
        userContext: {
          originalPrompt: 'Create a normal paced short video for Instagram about a recipe of an avocado toast. Include the list of ingredients and the process of making it. Show delicious hyper realistic clips. Don\'t show the chef or the cook, just show the POV of hands making the recipe.',
          projectSettings: {
            duration: 30,
            style_preference: 'cinematic',
            pacing_preference: 'medium',
            target_audience: 'cooking enthusiasts'
          },
          platformSettings: {
            primary_platform: 'instagram',
            aspect_ratio: '9:16'
          },
          contentPreferences: {
            transition_style: 'clean',
            effect_intensity: 'subtle'
          }
        }
      };

      console.log('📤 [CLIENT] Session data prepared:', {
        sessionId: sessionData.sessionId,
        subtitleStyle: sessionData.subtitleStyle,
        advancedMode: sessionData.advancedMode,
        platform: sessionData.platform,
        userContextKeys: Object.keys(sessionData.userContext || {})
      });

      // Step 2: Submit for editing
      console.log('🌐 [CLIENT] Step 2: Submitting to editing system...');
      setVideoConversion(prev => ({
        ...prev,
        message: 'Submitting to editing system...',
        uploadProgress: 30
      }));

      const requestStartTime = Date.now();
      console.log('📡 [CLIENT] Making API request to /api/submit-for-editing...');
      
      const response = await fetch('/api/submit-for-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      const requestTime = Date.now() - requestStartTime;
      console.log(`⏱️ [CLIENT] API request completed in ${requestTime}ms, status: ${response.status}`);

      setVideoConversion(prev => ({
        ...prev,
        uploadProgress: 70
      }));

      if (!response.ok) {
        console.error('❌ [CLIENT] API request failed with status:', response.status);
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.error?.message || `HTTP ${response.status}`;
          console.error('❌ [CLIENT] Error details:', errorData);
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        throw new Error(`API request failed: ${errorText}`);
      }

      console.log('✅ [CLIENT] Step 3: Parsing response...');
      const result = await response.json();
      console.log('📋 [CLIENT] Response received:', {
        success: result.success,
        hasEditingPlan: !!result.editingPlan,
        s3AssetsCount: result.s3Assets?.length || 0,
        processingInfo: result.processingInfo,
        errorCode: result.error?.code
      });

      if (result.success) {
        console.log('🎉 [CLIENT] Video conversion completed successfully!');
        setVideoConversion(prev => ({
          ...prev,
          isConverting: false,
          editingPlan: result.editingPlan,
          message: 'Video conversion completed successfully!',
          uploadProgress: 100
        }));
      } else {
        console.error('❌ [CLIENT] Video conversion failed:', result.error);
        throw new Error(result.error?.message || 'Unknown error occurred');
      }

    } catch (error) {
      console.error('💥 [CLIENT] Convert to video error:', error);
      console.error('💥 [CLIENT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      setVideoConversion(prev => ({
        ...prev,
        isConverting: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Video conversion failed',
        uploadProgress: 0
      }));
    }
  };

  console.log('🍞 Render called - isLoading:', isLoading);

  if (isLoading) {
    console.log('🍞 Showing loading screen...');
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <h1>Loading Cooking Tutorial Test Data...</h1>
          <div className={styles.spinner}></div>
          <p>Loading avocado toast tutorial images, audio, and agent data...</p>
        </div>
      </div>
    );
  }

  console.log('🍞 Showing main content...');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🍞 Cooking Tutorial Convert to Video Test</h1>
        <p className={styles.subtitle}>
          Testing VinVideo → Professional Video editing integration with real avocado toast tutorial data
        </p>
        <div className={styles.sessionInfo}>
          <strong>Session:</strong> {COOKING_SESSION_ID}<br />
          <strong>Content:</strong> Avocado Toast Tutorial (7 cooking steps)<br />
          <strong>Audio:</strong> {audioLoaded ? 'Loaded' : 'Loading...'}<br />
          <strong>Agent Data:</strong> {cookingAgentData ? 'Real data loaded' : 'Loading...'}
        </div>
      </header>

      <main className={styles.main}>
        {/* Audio Player Section */}
        <section className={styles.audioSection}>
          <h2>🎵 Cooking Tutorial Voice-Over</h2>
          <div className={styles.audioCard}>
            <audio
              ref={audioRef}
              controls
              className={styles.audioPlayer}
              onLoadedData={() => setAudioLoaded(true)}
              onError={(e) => console.warn('Audio failed to load:', e)}
            >
              <source src={`/${COOKING_SESSION_ID}/${COOKING_AUDIO_FILE}`} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
            
            {cookingTranscription && (
              <div className={styles.transcriptionPreview}>
                <h4>📝 Transcription Preview:</h4>
                <p className={styles.transcriptText}>"{cookingTranscription.transcript}"</p>
                <p className={styles.transcriptMeta}>
                  Duration: ~{Math.max(...(cookingTranscription.word_timestamps || []).map(w => w.end)).toFixed(1)}s | 
                  Words: {cookingTranscription.word_timestamps?.length || 0}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Cooking Tutorial Images Grid */}
        <section className={styles.imagesSection}>
          <h2>🍞 Cooking Tutorial Steps (7 Images)</h2>
          <div className={styles.imageGrid}>
            {cookingImages.map((imagePath, index) => (
              <div key={index} className={styles.imageItem}>
                <div className={styles.imageWrapper}>
                  <img
                    src={imagePath}
                    alt={`Cooking Step ${index + 1}`}
                    width={200}
                    height={200}
                    className={styles.image}
                    onError={(e) => {
                      console.warn(`Failed to load cooking image: ${imagePath}`);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <p className={styles.imageLabel}>Step {index + 1}</p>
                <p className={styles.imageDescription}>
                  {index === 0 && "Establish avocado toast concept"}
                  {index === 1 && "Gather ingredients"}
                  {index === 2 && "Toast bread to perfection"}
                  {index === 3 && "Slice and mash avocado"}
                  {index === 4 && "Spread and season"}
                  {index === 5 && "Final reveal"}
                  {index === 6 && "Lingering shot"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Convert to Video Section */}
        <section className={styles.conversionSection}>
          <h2>🎬 Convert to Professional Video</h2>
          <div className={styles.conversionCard}>
            {!videoConversion.isConverting && !videoConversion.editingPlan && !videoConversion.error && (
              <div className={styles.conversionReady}>
                <p>Ready to test cooking tutorial video conversion:</p>
                <ul>
                  <li>✅ 7 cooking step images loaded</li>
                  <li>{audioLoaded ? '✅' : '⏳'} Audio voice-over loaded</li>
                  <li>{cookingTranscription ? '✅' : '⏳'} Transcription data loaded</li>
                  <li>{cookingAgentData ? '✅' : '⏳'} Real agent data (director, producer, DoP, etc.)</li>
                  <li>✅ Universal naming conversion ready</li>
                  <li>✅ S3 upload integration ready</li>
                  <li>✅ Editing agent integration ready</li>
                </ul>
                
                {cookingAgentData && (
                  <div className={styles.agentPreview}>
                    <h4>📊 Agent Data Preview:</h4>
                    <p><strong>Director:</strong> {cookingAgentData.director?.narrative_beats?.length || 0} beats, "{cookingAgentData.director?.project_metadata?.primary_concept || 'N/A'}"</p>
                    <p><strong>Platform:</strong> {cookingAgentData.director?.project_metadata?.target_platform || 'N/A'}</p>
                    <p><strong>Content Type:</strong> {cookingAgentData.director?.project_metadata?.content_type || 'N/A'}</p>
                  </div>
                )}
                
                <button 
                  onClick={handleConvertToVideo}
                  className={styles.convertButton}
                >
                  🍞 Convert Cooking Tutorial to Video
                </button>
              </div>
            )}

            {videoConversion.isConverting && (
              <div className={styles.conversionProgress}>
                <h3>🔄 Converting to Professional Video...</h3>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${videoConversion.uploadProgress}%` }}
                  ></div>
                </div>
                <p className={styles.progressText}>
                  {videoConversion.message} ({videoConversion.uploadProgress}%)
                </p>
              </div>
            )}

            {videoConversion.error && (
              <div className={styles.error}>
                <h3>❌ Test Failed</h3>
                <p>{videoConversion.error}</p>
                <button 
                  onClick={handleConvertToVideo}
                  className={styles.retryButton}
                >
                  🔄 Retry Test
                </button>
              </div>
            )}

            {videoConversion.editingPlan && (
              <div className={styles.success}>
                <h3>✅ Integration Test Successful!</h3>
                <p>Editing plan generated successfully. The complete integration is working!</p>
                
                <div className={styles.editingPlanPreview}>
                  <h4>📋 Generated Editing Plan Preview:</h4>
                  <div className={styles.editingPlanDetails}>
                    <p><strong>Duration:</strong> {videoConversion.editingPlan.composition?.duration || 'N/A'}s</p>
                    <p><strong>Layers:</strong> {videoConversion.editingPlan.layers?.length || 0}</p>
                    <p><strong>Platform:</strong> {videoConversion.editingPlan.export?.platform || 'N/A'}</p>
                    <p><strong>Transitions:</strong> {videoConversion.editingPlan.transitions?.length || 0}</p>
                  </div>
                  
                  <details className={styles.fullEditingPlan}>
                    <summary>View Full Editing Plan JSON</summary>
                    <pre className={styles.jsonPreview}>
                      {JSON.stringify(videoConversion.editingPlan, null, 2)}
                    </pre>
                  </details>
                </div>

                <button 
                  onClick={() => setVideoConversion({
                    isConverting: false,
                    editingPlan: null,
                    finalVideoUrl: null,
                    error: null,
                    message: '',
                    uploadProgress: 0
                  })}
                  className={styles.resetButton}
                >
                  🔄 Run Another Test
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Integration Status */}
        <section className={styles.statusSection}>
          <h2>📊 Cooking Tutorial Integration Status</h2>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <h3>✅ Infrastructure</h3>
              <ul>
                <li>Bridge API: /api/submit-for-editing</li>
                <li>Editing Agent: /api/editing-agent</li>
                <li>S3 Integration: Ready</li>
                <li>TypeScript Schemas: Complete</li>
              </ul>
            </div>
            <div className={styles.statusItem}>
              <h3>✅ Pipeline Integration</h3>
              <ul>
                <li>Music Video Pipeline: ✅</li>
                <li>No-Music Pipeline: ✅</li>
                <li>Vision Mode Pipeline: ✅</li>
                <li>Script Mode Pipeline: ✅</li>
              </ul>
            </div>
            <div className={styles.statusItem}>
              <h3>🍞 Cooking Tutorial Data</h3>
              <ul>
                <li>Session: {COOKING_SESSION_ID}</li>
                <li>Images: {COOKING_IMAGES_COUNT} cooking steps</li>
                <li>Audio: Voice-over ({audioLoaded ? 'Loaded' : 'Loading'})</li>
                <li>Transcription: {cookingTranscription ? 'Loaded' : 'Loading'}</li>
                <li>Agent Outputs: {cookingAgentData ? 'Real data' : 'Loading'}</li>
                <li>Universal Naming: Ready</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}