'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import { saveAgentResponse } from '@/utils/client-agent-response-saver';

interface NoMusicVideoState {
  stage: number;
  mergedVisionDirectorResult: any; // Combined vision + director output
  dopSpecs: any;
  promptEngineerResult: any;
  generatedImages: string[];
  imageGenerationProgress: {
    currentIndex: number;
    totalImages: number;
    percentage: number;
    isGenerating: boolean;
    message: string;
  };
  error: string | null;
  loading: boolean;
  currentStep: string;
  pipelineType: 'no_music';
  timer: {
    startTime: number | null;
    elapsedTime: number;
    isRunning: boolean;
  };
}

export default function NoMusicVideoPipelinePage() {
  const searchParams = useSearchParams();
  const conversationMode = searchParams?.get('conversationMode') === 'true';
  const urlConcept = searchParams?.get('concept');
  const urlStyle = searchParams?.get('style');
  const urlPacing = searchParams?.get('pacing');
  const urlDuration = searchParams?.get('duration');
  const urlContentType = searchParams?.get('contentType');
  
  // Execution flags to prevent infinite loops (4-stage pipeline)
  const [stageExecutionFlags, setStageExecutionFlags] = useState({
    stage2Running: false, // DoP
    stage3Running: false, // Prompt Engineer  
    stage4Running: false  // Image Generation
  });

  const [state, setState] = useState<NoMusicVideoState>({
    stage: 1,
    mergedVisionDirectorResult: null,
    dopSpecs: null,
    promptEngineerResult: null,
    generatedImages: [],
    imageGenerationProgress: {
      currentIndex: 0,
      totalImages: 0,
      percentage: 0,
      isGenerating: false,
      message: ''
    },
    error: null,
    loading: false,
    currentStep: '',
    pipelineType: 'no_music',
    timer: {
      startTime: null,
      elapsedTime: 0,
      isRunning: false
    }
  });

  // NO-MUSIC PIPELINE VALIDATION (4-stage pipeline)
  const validateStageInputs = (targetStage: number, currentState: NoMusicVideoState): { isValid: boolean; missingInputs: string[] } => {
    const missingInputs: string[] = [];
    
    console.log(`🔍 Validating inputs for No-Music Stage ${targetStage}...`);
    
    switch (targetStage) {
      case 2: // DoP needs Merged Vision+Director Result
        if (!currentState.mergedVisionDirectorResult) missingInputs.push('mergedVisionDirectorResult');
        break;
        
      case 3: // Prompt Engineer needs Merged Result + DoP Specs
        if (!currentState.mergedVisionDirectorResult) missingInputs.push('mergedVisionDirectorResult');
        if (!currentState.dopSpecs) missingInputs.push('dopSpecs');
        break;
        
      case 4: // Image Generation needs prompts
        if (!currentState.promptEngineerResult) missingInputs.push('promptEngineerResult');
        break;
    }
    
    const isValid = missingInputs.length === 0;
    console.log(`✅ Stage ${targetStage} validation:`, { isValid, missingInputs });
    return { isValid, missingInputs };
  };

  // STAGE 1: MERGED VISION+DIRECTOR
  const runStage1MergedVisionDirector = async (formData: any) => {
    console.log('🚀 Starting No-Music Pipeline Stage 1: Merged Vision+Director');
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      currentStep: 'Stage 1: Creating vision + narrative beats (merged)...',
      timer: { ...prev.timer, startTime: Date.now(), isRunning: true }
    }));
    
    try {
      const noMusicUserContext = {
        stylePreferences: {
          pacing: formData.pacing,
          visualStyle: formData.style,
          duration: formData.duration
        },
        technicalRequirements: {
          contentType: formData.contentType
        }
      };

      const response = await fetch('/api/no-music-merged-vision-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: formData.concept,
          noMusicUserContext
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          stage: 2,
          mergedVisionDirectorResult: {
            ...result,
            _executionTime: result.executionTime || Date.now() - (prev.timer.startTime || Date.now())
          },
          loading: false,
          currentStep: 'Stage 1 complete! Vision + Director merged.'
        }));
        console.log('✅ Stage 1 Complete: Merged Vision+Director', result);
        
        // Save agent response for debugging
        await saveAgentResponse({
          agentName: 'merged_vision_director',
          response: result,
          pipelineType: 'NO_MUSIC_VIDEO_MERGED',
          sessionId: `no_music_video_merged_${Date.now()}`,
          projectFolder: `no_music_video_merged_${Date.now()}`,
          input: {
            userInput: formData.concept,
            noMusicUserContext
          },
          rawResponse: result.rawResponse,
          executionTime: result.executionTime
        });
      } else {
        throw new Error(result.error || 'Merged vision+director failed');
      }
    } catch (error) {
      console.error('❌ Stage 1 Error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Merged vision+director failed',
        loading: false 
      }));
    }
  };

  // STAGE 2: NO-MUSIC DOP (Updated for merged input)
  const runStage2NoMusicDoP = async () => {
    console.log('🚀 Starting No-Music Pipeline Stage 2: DoP');
    setState(prev => ({ ...prev, loading: true, error: null, currentStep: 'Stage 2: Creating cinematography...' }));
    
    try {
      const mergedResult = state.mergedVisionDirectorResult?.merged_vision_director_output;
      const directorVisualBeats = mergedResult?.director_output?.visual_beats || [];
      const visionDocument = mergedResult?.vision_document;
      const agentInstructions = mergedResult?.agent_instructions;
      
      const response = await fetch('/api/no-music-dop-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directorVisualBeats,
          visionDocument: visionDocument,
          contentClassification: { type: 'narrative_visual' },
          noMusicUserContext: null, // Will be added when user context is available
          agent_instructions: agentInstructions
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          stage: 3,
          dopSpecs: {
            ...result,
            _executionTime: result.executionTime
          },
          loading: false,
          currentStep: 'Stage 2 complete!'
        }));
        console.log('✅ Stage 2 Complete: No-Music DoP', result);
        
        // Save agent response for debugging
        await saveAgentResponse({
          agentName: 'no_music_dop',
          response: result,
          pipelineType: 'NO_MUSIC_VIDEO_MERGED',
          sessionId: `no_music_video_merged_${Date.now()}`,
          projectFolder: `no_music_video_merged_${Date.now()}`,
          input: {
            directorVisualBeats,
            visionDocument: visionDocument,
            contentClassification: { type: 'narrative_visual' },
            agent_instructions: agentInstructions
          },
          rawResponse: result.rawResponse,
          executionTime: result.executionTime
        });
      } else {
        throw new Error(result.error || 'DoP failed');
      }
    } catch (error) {
      console.error('❌ Stage 2 Error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'DoP failed',
        loading: false 
      }));
    }
  };

  // STAGE 3: NO-MUSIC PROMPT ENGINEER (Updated for merged input)
  const runStage3NoMusicPromptEngineer = async () => {
    console.log('🚀 Starting No-Music Pipeline Stage 3: Prompt Engineer');
    setState(prev => ({ ...prev, loading: true, error: null, currentStep: 'Stage 3: Creating FLUX prompts...' }));
    
    try {
      const mergedResult = state.mergedVisionDirectorResult?.merged_vision_director_output;
      const directorBeats = mergedResult?.director_output?.visual_beats || [];
      const dopSpecs = state.dopSpecs?.stage5_dop_output?.cinematographic_shots || [];
      const visionDocument = mergedResult?.vision_document;
      const agentInstructions = mergedResult?.agent_instructions;
      
      console.log('🔍 No-Music Stage 3 Data:');
      console.log('directorBeats:', directorBeats.length);
      console.log('dopSpecs:', dopSpecs.length);
      console.log('visionDocument:', !!visionDocument);
      console.log('agentInstructions:', !!agentInstructions);
      
      const response = await fetch('/api/no-music-prompt-engineer-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userVisionDocument: visionDocument,
          directorBeats,
          dopSpecs,
          contentClassification: { type: 'narrative_visual' },
          noMusicUserContext: null, // Will be added when user context is available
          agent_instructions: agentInstructions
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          stage: 4,
          promptEngineerResult: {
            ...result,
            _executionTime: result.executionTime
          },
          loading: false,
          currentStep: 'Stage 3 complete!'
        }));
        console.log('✅ Stage 3 Complete: No-Music Prompt Engineer', result);
        
        // Save agent response for debugging
        await saveAgentResponse({
          agentName: 'no_music_prompt_engineer',
          response: result,
          pipelineType: 'NO_MUSIC_VIDEO_MERGED',
          sessionId: `no_music_video_merged_${Date.now()}`,
          projectFolder: `no_music_video_merged_${Date.now()}`,
          input: {
            userVisionDocument: visionDocument,
            directorBeats,
            dopSpecs,
            contentClassification: { type: 'narrative_visual' },
            agent_instructions: agentInstructions
          },
          rawResponse: result.rawResponse,
          executionTime: result.executionTime
        });
      } else {
        throw new Error(result.error || 'Prompt Engineer failed');
      }
    } catch (error) {
      console.error('❌ Stage 3 Error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Prompt Engineer failed',
        loading: false 
      }));
    }
  };

  // STAGE 4: NO-MUSIC IMAGE GENERATION
  const runStage4NoMusicImageGeneration = async () => {
    console.log('🚀 Starting No-Music Pipeline Stage 4: Image Generation');
    setState(prev => ({ ...prev, loading: true, error: null, currentStep: 'Stage 4: Generating images...' }));
    
    try {
      // Extract prompts from prompt engineer output
      const promptsToGenerate = state.promptEngineerResult?.stage4_prompt_engineer_output?.flux_prompts || [];
      
      // 🚨 CRITICAL DEBUG: Log the entire prompt engineer result structure
      console.log('🔍 CRITICAL DEBUG - Full Prompt Engineer Result:', state.promptEngineerResult);
      console.log('🔍 CRITICAL DEBUG - Stage4 Output:', state.promptEngineerResult?.stage4_prompt_engineer_output);
      console.log('🔍 CRITICAL DEBUG - FLUX Prompts Array:', promptsToGenerate);
      console.log('🔍 CRITICAL DEBUG - First 2 prompts preview:', promptsToGenerate.slice(0, 2));
      
      if (promptsToGenerate.length === 0) {
        throw new Error('No FLUX prompts found in Prompt Engineer output for image generation');
      }
      
      console.log(`Generating ${promptsToGenerate.length} images using ComfyUI...`);
      
      // Initialize progress state
      setState(prev => ({
        ...prev,
        imageGenerationProgress: {
          currentIndex: 0,
          totalImages: promptsToGenerate.length,
          percentage: 0,
          isGenerating: true,
          message: `Starting generation of ${promptsToGenerate.length} images...`
        }
      }));
      
      // Convert prompts to simple string array
      const promptStrings = promptsToGenerate.map((prompt: any) => prompt.prompt_text || prompt);
      
      // 🚨 CRITICAL DEBUG: Log what prompts are actually being sent to the API
      console.log('🔍 CRITICAL DEBUG - Final Prompt Strings Being Sent to API:', promptStrings);
      console.log('🔍 CRITICAL DEBUG - First 2 final prompts preview:', promptStrings.slice(0, 2));
      
      // Generate a folder ID for this run
      const folderId = `music-video-${Date.now()}`;
      
      // Use streaming image generation with fallback to concurrent
      let response;
      let isStreaming = true;
      
      try {
        response = await fetch('/api/generate-comfy-images-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompts: promptStrings,
            folderId: folderId
          })
        });
      } catch (streamError) {
        console.warn('Streaming API failed, falling back to concurrent API:', streamError);
        isStreaming = false;
        response = await fetch('/api/generate-comfy-images-concurrent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompts: promptStrings,
            folderId: folderId
          })
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (isStreaming) {
        // Handle streaming response (SSE)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body');
        }
        
        let buffer = '';
        const allGeneratedImages: string[] = new Array(promptStrings.length).fill('');
        setState(prev => ({
          ...prev,
          generatedImages: allGeneratedImages
        }));
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              const eventType = line.substring(6).trim();
              
              const dataLineIndex = lines.indexOf(line) + 1;
              if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data:')) {
                const dataLine = lines[dataLineIndex];
                const data = JSON.parse(dataLine.substring(5).trim());
                
                switch (eventType) {
                  case 'start':
                    console.log('Generation started:', data);
                    setState(prev => ({
                      ...prev,
                      imageGenerationProgress: {
                        ...prev.imageGenerationProgress,
                        message: data.message
                      }
                    }));
                    break;
                    
                  case 'processing':
                    console.log('Processing image:', data);
                    setState(prev => ({
                      ...prev,
                      imageGenerationProgress: {
                        ...prev.imageGenerationProgress,
                        currentIndex: data.index,
                        message: data.message
                      }
                    }));
                    break;
                    
                  case 'image':
                    console.log('Image generated:', data);
                    
                    allGeneratedImages[data.index] = data.imageUrl;
                    setState(prev => ({
                      ...prev,
                      generatedImages: [...allGeneratedImages],
                      imageGenerationProgress: {
                        ...prev.imageGenerationProgress,
                        currentIndex: data.index + 1,
                        percentage: data.progress,
                        message: data.message
                      }
                    }));
                    break;
                    
                  case 'error':
                    console.error('Generation error:', data);
                    break;
                    
                  case 'complete':
                    console.log('Generation complete:', data);
                    
                    if (data.success) {
                      setState(prev => ({
                        ...prev,
                        generatedImages: data.generatedImages && data.generatedImages.length > 0 ? data.generatedImages : prev.generatedImages,
                        imageGenerationProgress: {
                          ...prev.imageGenerationProgress,
                          percentage: 100,
                          isGenerating: false,
                          message: 'Image generation complete!'
                        },
                        loading: false,
                        currentStep: 'Pipeline complete! Images generated successfully.',
                        timer: {
                          ...prev.timer,
                          isRunning: false
                        }
                      }));
                      
                      console.log('✅ Stage 4 Complete: No-Music Image Generation');
                      return;
                    } else {
                      throw new Error(data.error || 'Failed to generate images with ComfyUI');
                    }
                    break;
                }
              }
            }
          }
        }
      } else {
        // Handle concurrent API response (non-streaming)
        const result = await response.json();
        
        if (result.success) {
          setState(prev => ({
            ...prev,
            generatedImages: result.generatedImages || [],
            imageGenerationProgress: {
              ...prev.imageGenerationProgress,
              percentage: 100,
              isGenerating: false,
              message: 'Image generation complete!'
            },
            loading: false,
            currentStep: 'Pipeline complete! Images generated successfully.',
            timer: {
              ...prev.timer,
              isRunning: false
            }
          }));
          
          console.log('✅ Stage 4 Complete: No-Music Image Generation');
          return;
        } else {
          throw new Error(result.error || 'Failed to generate images with ComfyUI');
        }
      }
      
    } catch (error) {
      console.error('❌ Stage 5 Error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Image generation failed',
        loading: false,
        imageGenerationProgress: {
          ...prev.imageGenerationProgress,
          isGenerating: false,
          message: 'Image generation failed'
        },
        timer: {
          ...prev.timer,
          isRunning: false
        }
      }));
    }
  };

  // NO-MUSIC PIPELINE: Stage 1 → Stage 2 (Merged Vision+Director → DoP)
  useEffect(() => {
    if (state.stage === 2 && state.mergedVisionDirectorResult && !state.loading && state.pipelineType === 'no_music' && !stageExecutionFlags.stage2Running) {
      console.log('🔄 Auto-triggering No-Music Stage 2: DoP');
      setStageExecutionFlags(prev => ({ ...prev, stage2Running: true }));
      runStage2NoMusicDoP();
    }
  }, [state.stage, state.mergedVisionDirectorResult, state.loading, state.pipelineType, stageExecutionFlags.stage2Running]);

  // NO-MUSIC PIPELINE: Stage 2 → Stage 3 (DoP → Prompt Engineer)
  useEffect(() => {
    console.log('🔍 No-Music Stage 2→3 useEffect check:', {
      stage: state.stage,
      hasDopSpecs: !!state.dopSpecs,
      loading: state.loading,
      pipelineType: state.pipelineType,
      shouldTrigger: state.stage === 3 && state.dopSpecs && !state.loading && state.pipelineType === 'no_music'
    });
    
    if (state.stage === 3 && state.dopSpecs && !state.loading && state.pipelineType === 'no_music' && !stageExecutionFlags.stage3Running) {
      console.log('🔄 Auto-triggering No-Music Stage 3: Prompt Engineer');
      setStageExecutionFlags(prev => ({ ...prev, stage3Running: true }));
      runStage3NoMusicPromptEngineer();
    }
  }, [state.stage, state.dopSpecs, state.loading, state.pipelineType, stageExecutionFlags.stage3Running]);

  // NO-MUSIC PIPELINE: Stage 3 → Stage 4 (Prompt Engineer → Image Generation)
  useEffect(() => {
    console.log('🔍 No-Music Stage 3→4 useEffect check:', {
      stage: state.stage,
      hasPromptEngineerResult: !!state.promptEngineerResult,
      loading: state.loading,
      pipelineType: state.pipelineType,
      shouldTrigger: state.stage === 4 && state.promptEngineerResult && !state.loading && state.pipelineType === 'no_music'
    });
    
    if (state.stage === 4 && state.promptEngineerResult && !state.loading && state.pipelineType === 'no_music' && !stageExecutionFlags.stage4Running) {
      console.log('🔄 Auto-triggering No-Music Stage 4: Image Generation');
      setStageExecutionFlags(prev => ({ ...prev, stage4Running: true }));
      runStage4NoMusicImageGeneration();
    }
  }, [state.stage, state.promptEngineerResult, state.loading, state.pipelineType, stageExecutionFlags.stage4Running]);

  // TIMER UPDATE
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (state.timer.isRunning && state.timer.startTime) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          timer: {
            ...prev.timer,
            elapsedTime: Date.now() - (prev.timer.startTime || 0)
          }
        }));
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.timer.isRunning, state.timer.startTime]);

  // FORM SUBMISSION
  const [formData, setFormData] = useState({
    concept: urlConcept || '',
    style: urlStyle || 'cinematic',
    pacing: urlPacing || 'fast',
    duration: urlDuration ? parseInt(urlDuration) : 30,
    contentType: urlContentType || 'general'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Debug form submission:');
    console.log('formData.concept:', `"${formData.concept}"`);
    console.log('formData.concept.length:', formData.concept.length);
    console.log('formData.concept.trim():', `"${formData.concept.trim()}"`);
    console.log('formData.concept.trim().length:', formData.concept.trim().length);
    console.log('Full formData:', formData);
    
    if (!formData.concept.trim()) {
      console.log('❌ Validation failed: concept is empty');
      setState(prev => ({ ...prev, error: 'Please enter a concept' }));
      return;
    }
    
    console.log('✅ Validation passed, starting pipeline');
    console.log('🚀 Starting No-Music Video Pipeline');
    
    // Reset stage execution flags for fresh run
    setStageExecutionFlags({
      stage2Running: false,
      stage3Running: false,
      stage4Running: false
    });
    
    await runStage1MergedVisionDirector(formData);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>No-Music Video Pipeline</h1>
              <p className={styles.subtitle}>Pure Visual Storytelling</p>
            </div>
            
            {state.timer.isRunning && (
              <div className={styles.timer}>
                ⏱️ {formatTime(state.timer.elapsedTime)}
              </div>
            )}
          </div>
        </div>

        {/* ALWAYS show the input form/summary */}
        {state.stage === 1 ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="concept">Video Concept</label>
              <textarea
                id="concept"
                value={formData.concept}
                onChange={(e) => {
                  setFormData({...formData, concept: e.target.value});
                  // Clear error when user starts typing
                  if (state.error) {
                    setState(prev => ({ ...prev, error: null }));
                  }
                }}
                placeholder="Describe your video concept (narrative-driven, no music)..."
                className={styles.textarea}
                rows={4}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="style">Visual Style</label>
                <select
                  id="style"
                  value={formData.style}
                  onChange={(e) => setFormData({...formData, style: e.target.value})}
                  className={styles.select}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="artistic">Artistic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="pacing">Pacing</label>
                <select
                  id="pacing"
                  value={formData.pacing}
                  onChange={(e) => setFormData({...formData, pacing: e.target.value})}
                  className={styles.select}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="duration">Duration (seconds)</label>
                <input
                  type="number"
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  min="10"
                  max="300"
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="contentType">Content Type</label>
                <select
                  id="contentType"
                  value={formData.contentType}
                  onChange={(e) => setFormData({...formData, contentType: e.target.value})}
                  className={styles.select}
                >
                  <option value="general">General</option>
                  <option value="educational">Educational</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="abstract">Abstract</option>
                </select>
              </div>
            </div>

            <button type="submit" className={styles.submitButton} disabled={state.loading}>
              {state.loading ? 'Processing...' : 'Generate No-Music Video'}
            </button>
          </form>
        ) : (
          // Show input summary when pipeline is running
          <div className={styles.inputSummary}>
            <h3>Your Input:</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <strong>Concept:</strong>
                <p>{formData.concept}</p>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryItem}>
                  <strong>Style:</strong>
                  <span className={styles.summaryValue}>{formData.style}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Pacing:</strong>
                  <span className={styles.summaryValue}>{formData.pacing}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Duration:</strong>
                  <span className={styles.summaryValue}>{formData.duration}s</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>Type:</strong>
                  <span className={styles.summaryValue}>{formData.contentType}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.currentStep && (
          <div className={styles.status}>
            <div className={styles.currentStep}>{state.currentStep}</div>
            {state.loading && <div className={styles.spinner}></div>}
          </div>
        )}

        {/* DEBUG INFO */}
        <div className={styles.debugInfo}>
          <h4>Debug Info (4-Stage Merged Pipeline):</h4>
          <p>Current Stage: {state.stage}</p>
          <p>Loading: {state.loading ? 'true' : 'false'}</p>
          <p>Has Merged Vision+Director Result: {state.mergedVisionDirectorResult ? 'true' : 'false'}</p>
          <p>Has DoP Specs: {state.dopSpecs ? 'true' : 'false'}</p>
          <p>Has Prompt Result: {state.promptEngineerResult ? 'true' : 'false'}</p>
        </div>

        {state.error && (
          <div className={styles.error}>
            ❌ {state.error}
          </div>
        )}

        {/* STAGE PROGRESS INDICATORS */}
        <div className={styles.stageIndicators}>
          {[
            { stage: 1, name: 'Merged Vision+Director', data: state.mergedVisionDirectorResult },
            { stage: 2, name: 'DoP (Cinematography)', data: state.dopSpecs },
            { stage: 3, name: 'Prompt Engineer', data: state.promptEngineerResult },
            { stage: 4, name: 'Image Generation', data: state.generatedImages.length > 0 }
          ].map(({ stage, name, data }) => (
            <div 
              key={stage}
              className={`${styles.stageIndicator} ${
                state.stage > stage ? styles.completed : 
                state.stage === stage ? styles.current : 
                styles.pending
              }`}
            >
              <div className={styles.stageNumber}>{stage}</div>
              <div className={styles.stageName}>{name}</div>
              {data && <div className={styles.stageCheck}>✓</div>}
            </div>
          ))}
        </div>

        {/* RESULTS DISPLAY */}
        {state.mergedVisionDirectorResult && (
          <div className={styles.resultSection}>
            <h3>✅ Stage 1 Complete: Merged Vision+Director</h3>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>Pipeline Ready: ✓ Yes</span>
              </div>
              <div className={styles.metric}>
                <span>Execution Time: {state.mergedVisionDirectorResult._executionTime}ms</span>
              </div>
              <div className={styles.metric}>
                <span>Visual Beats: {state.mergedVisionDirectorResult.merged_vision_director_output?.director_output?.visual_beats?.length || 0}</span>
              </div>
              <div className={styles.metric}>
                <span>Quality Score: {Math.round((state.mergedVisionDirectorResult.validation?.concept_specificity_score || 0) * 100)}%</span>
              </div>
            </div>
            
            <div className={styles.resultGrid}>
              <div className={styles.resultItem}>
                <strong>Core Concept:</strong>
                <p>{state.mergedVisionDirectorResult.merged_vision_director_output?.vision_document?.core_concept}</p>
              </div>
              <div className={styles.resultItem}>
                <strong>Emotion Arc:</strong>
                <p>{state.mergedVisionDirectorResult.merged_vision_director_output?.vision_document?.emotion_arc?.join(' → ')}</p>
              </div>
              <div className={styles.resultItem}>
                <strong>Visual Style:</strong>
                <p>{state.mergedVisionDirectorResult.merged_vision_director_output?.vision_document?.visual_style}</p>
              </div>
              <div className={styles.resultItem}>
                <strong>Pacing:</strong>
                <p>{state.mergedVisionDirectorResult.merged_vision_director_output?.vision_document?.pacing}</p>
              </div>
            </div>

            <div className={styles.beatsPreview}>
              <h4>Visual Beats Preview:</h4>
              {state.mergedVisionDirectorResult.merged_vision_director_output?.director_output?.visual_beats?.slice(0, 3).map((beat: any, index: number) => (
                <div key={index} className={styles.beatItem}>
                  <strong>Beat {beat.beat_no}</strong>
                  <p>{beat.content_type_treatment}</p>
                  <span>Duration: {beat.estimated_duration_s}s | Cognitive Weight: {beat.cognitive_weight}</span>
                </div>
              ))}
              {(state.mergedVisionDirectorResult.merged_vision_director_output?.director_output?.visual_beats?.length || 0) > 3 && (
                <p>...and {(state.mergedVisionDirectorResult.merged_vision_director_output?.director_output?.visual_beats?.length || 0) - 3} more beats</p>
              )}
            </div>

            <div className={styles.rawResponse}>
              <h4>Raw AI Response (Stage 1 - Merged):</h4>
              <pre className={styles.responseCode}>
                {JSON.stringify(state.mergedVisionDirectorResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {state.dopSpecs && (
          <div className={styles.resultSection}>
            <h3>✅ Stage 2 Complete: DoP Cinematography</h3>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>Total Shots: {state.dopSpecs.stage5_dop_output?.cinematographic_shots?.length || 0}</span>
              </div>
              <div className={styles.metric}>
                <span>Pipeline Type: No-Music</span>
              </div>
              <div className={styles.metric}>
                <span>Execution Time: {state.dopSpecs._executionTime}ms</span>
              </div>
              <div className={styles.metric}>
                <span>Shot Variety Score: {state.dopSpecs.validation?.shotCountMatch ? '✓' : '❌'}</span>
              </div>
            </div>
            
            <div className={styles.shotsPreview}>
              <h4>Cinematography Shots Preview:</h4>
              {state.dopSpecs.stage5_dop_output?.cinematographic_shots?.slice(0, 3).map((shot: any, index: number) => (
                <div key={index} className={styles.shotItem}>
                  <strong>Shot {shot.shot_id}</strong>
                  <p>{shot.cinematography?.shot_size} | {shot.cinematography?.camera_angle} | {shot.cinematography?.camera_movement}</p>
                  <span>Narrative Sync: {shot.narrative_sync?.story_motivation || 'Standard progression'}</span>
                </div>
              ))}
              {(state.dopSpecs.stage5_dop_output?.cinematographic_shots?.length || 0) > 3 && (
                <p>...and {(state.dopSpecs.stage5_dop_output?.cinematographic_shots?.length || 0) - 3} more shots</p>
              )}
            </div>

            <div className={styles.rawResponse}>
              <h4>Raw AI Response (Stage 2):</h4>
              <pre className={styles.responseCode}>
                {JSON.stringify(state.dopSpecs, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {state.promptEngineerResult && (
          <div className={styles.resultSection}>
            <h3>✅ Stage 3 Complete: Prompt Engineer</h3>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>FLUX Prompts: {state.promptEngineerResult.stage4_prompt_engineer_output?.flux_prompts?.length || 0}</span>
              </div>
              <div className={styles.metric}>
                <span>Narrative Optimized: ✓</span>
              </div>
              <div className={styles.metric}>
                <span>Execution Time: {state.promptEngineerResult._executionTime}ms</span>
              </div>
              <div className={styles.metric}>
                <span>Prompt Count Match: {state.promptEngineerResult.validation?.promptCountMatch ? '✓' : '❌'}</span>
              </div>
            </div>
            
            <div className={styles.promptsPreview}>
              <h4>FLUX Prompts Preview:</h4>
              {state.promptEngineerResult.stage4_prompt_engineer_output?.flux_prompts?.slice(0, 3).map((prompt: any, index: number) => (
                <div key={index} className={styles.promptItem}>
                  <strong>Prompt {index + 1}</strong>
                  <p>{prompt.prompt_text}</p>
                </div>
              ))}
              {(state.promptEngineerResult.stage4_prompt_engineer_output?.flux_prompts?.length || 0) > 3 && (
                <p>...and {(state.promptEngineerResult.stage4_prompt_engineer_output?.flux_prompts?.length || 0) - 3} more prompts</p>
              )}
            </div>

            <div className={styles.rawResponse}>
              <h4>Raw AI Response (Stage 3):</h4>
              <pre className={styles.responseCode}>
                {JSON.stringify(state.promptEngineerResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* STAGE 4: GENERATED IMAGES DISPLAY */}
        {(state.generatedImages && state.generatedImages.length > 0) || state.imageGenerationProgress.isGenerating ? (
          <div className={styles.resultSection}>
            <h3>✅ Stage 4: Generated Images (ComfyUI)</h3>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>Progress: {state.imageGenerationProgress.currentIndex}/{state.imageGenerationProgress.totalImages} ({state.imageGenerationProgress.percentage}%)</span>
              </div>
              {state.imageGenerationProgress.message && (
                <div className={styles.metric}>
                  <span>Status: {state.imageGenerationProgress.message}</span>
                </div>
              )}
            </div>
            
            {state.imageGenerationProgress.isGenerating && (
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${state.imageGenerationProgress.percentage}%` }}
                />
              </div>
            )}

            <div className={styles.imagesGrid}>
              {state.generatedImages.map((imageUrl, index) => (
                <div key={index} className={styles.imageContainer}>
                  {imageUrl ? (
                    <>
                      <Image 
                        src={imageUrl} 
                        alt={`Generated image ${index + 1}`}
                        className={styles.generatedImage}
                        width={500}
                        height={300}
                        onError={(e) => {
                          console.error(`Failed to load image ${index + 1}:`, imageUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className={styles.imageActions}>
                        <a 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.viewFullButton}
                        >
                          View Full Size
                        </a>
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = imageUrl;
                            link.download = `generated-image-${index + 1}.png`;
                            link.click();
                          }}
                          className={styles.downloadButton}
                        >
                          Download
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <div className={styles.placeholderContent}>
                        {index < state.imageGenerationProgress.currentIndex ? (
                          <>
                            <div className={styles.spinner}></div>
                            <p>Processing image {index + 1}...</p>
                          </>
                        ) : (
                          <p>Waiting for image {index + 1}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </main>
    </div>
  );
}