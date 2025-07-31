import { NextRequest, NextResponse } from 'next/server';
import { uploadVinVideoAssets } from '@/utils/s3Manager';
import fs from 'fs/promises';
import path from 'path';
import type {
  EditingAgentInput,
  DirectorOutput,
  ProducerOutput,
  ImagePromptData,
  VideoPromptData,
  UserContext,
  ProjectMetadata,
  SubtitleStyleName
} from '@/schemas/editing-agent-schemas';

/**
 * Submit for Editing API Route
 * Bridge between VinVideo pipeline completion and professional video editing
 * Handles asset upload and editing agent integration
 */

interface SubmitForEditingRequest {
  sessionId: string;              // VinVideo session/folder ID
  subtitleStyle?: SubtitleStyleName;
  advancedMode?: boolean;
  platform?: 'tiktok' | 'instagram' | 'youtube';
  userContext?: Partial<UserContext>;
}

interface SubmitForEditingResponse {
  success: boolean;
  editingPlan?: any;
  s3Assets?: string[];
  projectId?: string;
  finalVideoUrl?: string;
  runpodJobId?: string;
  processingInfo?: {
    assetsUploaded: number;
    editingPlanGenerated: boolean;
    finalVideoGenerated?: boolean;
    executionTime: number;
    runpodExecutionTime?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('\n🎬 [SERVER] ===== SUBMIT FOR EDITING API STARTED =====');
    console.log('🕐 [SERVER] Start time:', new Date().toISOString());
    
    console.log('📖 [SERVER] Step 1: Parsing request body...');
    const body: SubmitForEditingRequest = await request.json();
    console.log('📋 [SERVER] Raw body received:', JSON.stringify(body, null, 2));
    
    const { 
      sessionId, 
      subtitleStyle = 'simple_caption',
      advancedMode = false,
      platform = 'tiktok',
      userContext
    } = body;
    
    console.log('📊 [SERVER] Parsed parameters:', {
      sessionId,
      subtitleStyle,
      advancedMode,
      platform,
      hasUserContext: !!userContext,
      userContextKeys: userContext ? Object.keys(userContext) : []
    });
    
    if (!sessionId) {
      console.error('❌ [SERVER] Missing session ID!');
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        }
      } as SubmitForEditingResponse, { status: 400 });
    }
    
    console.log(`📁 [SERVER] Processing session: ${sessionId}`);
    console.log(`🎨 [SERVER] Settings: ${subtitleStyle} style, ${advancedMode ? 'advanced' : 'simple'} mode, ${platform} platform`);
    
    // Define paths
    const sessionDir = path.join(process.cwd(), 'public', sessionId);
    const projectId = sessionId.replace(/[^a-zA-Z0-9-]/g, '-');
    
    console.log('📂 [SERVER] Step 2: Checking session directory...');
    console.log('📍 [SERVER] Session directory path:', sessionDir);
    console.log('🏷️ [SERVER] Project ID:', projectId);
    
    // Check if session directory exists
    try {
      await fs.access(sessionDir);
      console.log('✅ [SERVER] Session directory exists');
    } catch (error) {
      console.error('❌ [SERVER] Session directory not found!');
      console.error('❌ [SERVER] Directory access error:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session directory not found: ${sessionId}`
        }
      } as SubmitForEditingResponse, { status: 404 });
    }
    
    // Step 2: Read and parse session data
    console.log('📖 [SERVER] Step 3: Reading session data...');
    
    const sessionFiles = await fs.readdir(sessionDir);
    console.log('📋 [SERVER] All files in session directory:', sessionFiles);
    
    // Step 3: Upload assets to S3 (including agent outputs)
    console.log('📤 [SERVER] Step 4: Uploading assets to S3...');
    
    let uploadedAssets: string[] = [];
    try {
      // Prepare agent outputs for upload
      const agentOutputsForUpload: Record<string, any> = {};
      
      // Find agent files to include in upload
      const allAgentFiles = sessionFiles.filter(file => 
        file.endsWith('.json') && 
        !file.includes('transcription') &&
        !file.includes('metadata')
      );
      
      // Read and prepare agent outputs for S3 upload
      for (const agentFile of allAgentFiles) {
        try {
          const filePath = path.join(sessionDir, agentFile);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          // Determine agent type and add to upload collection
          if (agentFile.includes('director')) {
            agentOutputsForUpload['director_agent'] = data;
          } else if (agentFile.includes('producer')) {
            agentOutputsForUpload['producer_agent'] = data;
          } else if (agentFile.includes('dop')) {
            agentOutputsForUpload['dop_agent'] = data;
          } else if (agentFile.includes('prompt_engineer')) {
            agentOutputsForUpload['prompt_engineer_agent'] = data;
          } else if (agentFile.includes('vision')) {
            agentOutputsForUpload['vision_agent'] = data;
          }
        } catch (parseError) {
          console.warn(`⚠️ [SERVER] Could not parse agent file ${agentFile} for upload:`, parseError);
        }
      }
      
      console.log(`📋 [SERVER] Prepared ${Object.keys(agentOutputsForUpload).length} agent outputs for upload`);
      
      uploadedAssets = await uploadVinVideoAssets(projectId, sessionDir, agentOutputsForUpload);
      console.log(`✅ [SERVER] Uploaded ${uploadedAssets.length} assets to S3:`, uploadedAssets);
    } catch (uploadError) {
      console.warn('⚠️ [SERVER] S3 upload failed, but continuing with existing assets:', uploadError);
    }
    
    // Step 4: Parse session data for editing agent
    console.log('📖 [SERVER] Step 5: Parsing session data for editing agent...');
    
    // Find asset files with universal naming
    const imageFiles = sessionFiles.filter(file => /^beat_\d+\.png$/.test(file));
    const audioFile = sessionFiles.find(file => file === 'audio.wav');
    const transcriptionFile = sessionFiles.find(file => file === 'transcription.json');
    
    // Find agent output files
    const agentFiles = sessionFiles.filter(file => 
      file.endsWith('.json') && 
      !file.includes('transcription') &&
      !file.includes('metadata')
    );
    
    console.log(`🖼️ [SERVER] Found ${imageFiles.length} images:`, imageFiles);
    console.log(`🎵 [SERVER] Found audio: ${!!audioFile} (${audioFile || 'none'})`);
    console.log(`📝 [SERVER] Found transcription: ${!!transcriptionFile} (${transcriptionFile || 'none'})`);
    console.log(`🤖 [SERVER] Found ${agentFiles.length} agent outputs:`, agentFiles);
    
    if (imageFiles.length === 0) {
      console.error('❌ [SERVER] No images found with universal naming pattern!');
      console.error('❌ [SERVER] Looking for pattern: /^beat_\\d+\\.png$/');
      console.error('❌ [SERVER] Available files:', sessionFiles.filter(f => f.endsWith('.png')));
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_IMAGES_FOUND',
          message: 'No generated images found in session directory'
        }
      } as SubmitForEditingResponse, { status: 400 });
    }
    
    // Step 3: Parse agent outputs to extract director output, producer output, and prompts
    console.log('🤖 [SERVER] Step 5: Parsing agent outputs...');
    let directorOutput: DirectorOutput | null = null;
    let producerOutput: ProducerOutput | null = null;
    let imagePrompts: ImagePromptData = {};
    let videoPrompts: VideoPromptData = {};
    
    for (const agentFile of agentFiles) {
      try {
        console.log(`📄 [SERVER] Processing agent file: ${agentFile}`);
        const filePath = path.join(sessionDir, agentFile);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        console.log(`📊 [SERVER] Agent file ${agentFile} structure:`, {
          hasVisualBeats: !!data.visual_beats,
          hasNarrativeBeats: !!data.narrative_beats,
          hasStage2Director: !!data.stage2_director_output,
          hasStage4Director: !!data.stage4_director_output,
          hasResponse: !!data.response,
          hasDirectorOutput: !!(data.response?.directorOutput),
          topLevelKeys: Object.keys(data).slice(0, 10)
        });
        
        // Try to identify director output from various possible structures
        if (agentFile.includes('director') || 
            data.visual_beats || 
            data.narrative_beats ||
            data.stage2_director_output ||
            data.stage4_director_output ||
            data.response?.directorOutput) {
          
          console.log(`🎬 [SERVER] Found director data in ${agentFile}`);
          
          // Extract director output with different possible structures
          let extractedDirector = data;
          if (data.response?.directorOutput) extractedDirector = data.response.directorOutput;
          else if (data.stage2_director_output) extractedDirector = data.stage2_director_output;
          else if (data.stage4_director_output) extractedDirector = data.stage4_director_output;
          
          console.log('🎭 [SERVER] Extracted director structure:', {
            hasProjectMetadata: !!extractedDirector.project_metadata,
            hasNarrativeBeats: !!extractedDirector.narrative_beats,
            narrativeBeatsCount: extractedDirector.narrative_beats?.length || 0,
            contentType: extractedDirector.content_type,
            primaryConcept: extractedDirector.primary_concept,
            coreConcept: extractedDirector.core_concept
          });
          
          // Create compatible director output structure
          directorOutput = {
            project_metadata: {
              target_platform: platform,
              content_type: extractedDirector.content_type || 'entertainment',
              primary_concept: extractedDirector.primary_concept || extractedDirector.core_concept || 'Generated video content',
              duration_target: extractedDirector.duration_target || 30
            },
            narrative_beats: extractedDirector.visual_beats?.map((beat: any, index: number) => ({
              beat_no: index + 1,
              timecode_start: `00:00:${String(index * 5).padStart(2, '0')}.000`,
              est_duration_s: 5,
              script_phrase: beat.script_phrase || beat.description || `Beat ${index + 1}`,
              narrative_function: beat.narrative_function || 'development',
              emotional_tone: beat.emotional_tone || 'excitement',
              creative_vision: beat.creative_vision || beat.visual_concept || `Visual concept for beat ${index + 1}`,
              audience_retention_strategy: beat.audience_retention_strategy || 'engaging visuals',
              turning_point: beat.turning_point || false,
              entities: beat.entities || []
            })) || []
          };
        }
        
        // Extract producer output if available
        if (agentFile.includes('producer') || data.cut_points || data.response?.producerOutput || data.response?.cut_points) {
          console.log(`🎵 [SERVER] Found producer data in ${agentFile}`);
          
          // Extract producer output with different possible structures
          let extractedProducer = data;
          if (data.response?.producerOutput) extractedProducer = data.response.producerOutput;
          else if (data.response?.cut_points) extractedProducer = data.response;
          
          console.log('🎭 [SERVER] Extracted producer structure:', {
            hasCutPoints: !!extractedProducer.cut_points,
            cutPointsCount: extractedProducer.cut_points?.length || 0,
            totalDuration: extractedProducer.total_duration_s || extractedProducer.target_duration_s,
            cutCount: extractedProducer.cut_count
          });
          
          // Create compatible producer output structure
          if (extractedProducer.cut_points && Array.isArray(extractedProducer.cut_points)) {
            producerOutput = {
              cut_points: extractedProducer.cut_points.map((cut: any) => ({
                cut_number: cut.cut_number || 0,
                cut_time_s: cut.cut_time_s || 0,
                reason: cut.reason || 'Producer cut'
              })),
              total_duration_s: extractedProducer.total_duration_s || extractedProducer.target_duration_s || 30,
              target_duration_s: extractedProducer.target_duration_s || extractedProducer.total_duration_s || 30,
              duration_variance: extractedProducer.duration_variance || 0,
              pacing_compliance: extractedProducer.pacing_compliance || true,
              cut_count: extractedProducer.cut_count || extractedProducer.cut_points.length,
              average_shot_duration_s: extractedProducer.average_shot_duration_s || 3,
              user_requirements_met: extractedProducer.user_requirements_met || []
            };
          }
        }
        
        // Extract prompt data if available
        if (agentFile.includes('prompt_engineer') || data.prompts_output || data.flux_prompts) {
          const prompts = data.prompts_output || data.flux_prompts || data.stage6_prompt_engineer_output?.prompts_output || [];
          
          prompts.forEach((prompt: string, index: number) => {
            const beatId = `beat_${index + 1}`;
            imagePrompts[beatId] = {
              image_prompt: prompt,
              final_image_prompt: prompt
            };
            videoPrompts[beatId] = {
              video_prompt: `Convert to dynamic video: ${prompt}`
            };
          });
        }
        
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse agent file ${agentFile}:`, parseError);
      }
    }
    
    // Fallback director output if none found
    if (!directorOutput) {
      console.log('⚠️ No director output found, creating fallback');
      directorOutput = {
        project_metadata: {
          target_platform: platform,
          content_type: 'entertainment',
          primary_concept: 'Generated video content',
          duration_target: imageFiles.length * 3
        },
        narrative_beats: imageFiles.map((_, index) => ({
          beat_no: index + 1,
          timecode_start: `00:00:${String(index * 3).padStart(2, '0')}.000`,
          est_duration_s: 3,
          script_phrase: `Beat ${index + 1}`,
          narrative_function: 'development',
          emotional_tone: 'excitement',
          creative_vision: `Visual concept for beat ${index + 1}`,
          audience_retention_strategy: 'engaging visuals',
          turning_point: false,
          entities: []
        }))
      };
    }
    
    // Fallback image prompts if none found
    if (Object.keys(imagePrompts).length === 0) {
      console.log('⚠️ No image prompts found, creating fallbacks');
      imageFiles.forEach((_, index) => {
        const beatId = `beat_${index + 1}`;
        imagePrompts[beatId] = {
          image_prompt: `Generated image ${index + 1}`,
          final_image_prompt: `Generated image ${index + 1}`
        };
        videoPrompts[beatId] = {
          video_prompt: `Convert to dynamic video: Generated image ${index + 1}`
        };
      });
    }
    
    // Step 4: Prepare editing agent input
    const s3VideoFiles = imageFiles.map((imageFile, index) => {
      // For now, we're using images as video files - in the future this could be actual video files
      return `s3://${process.env.BUCKET_NAME}/input/project-${projectId}/${imageFile}`;
    });
    
    const projectMetadata: ProjectMetadata = {
      project_id: projectId,
      total_duration: imageFiles.length * 3, // 3 seconds per beat
      target_platform: platform,
      aspect_ratio: '3:2',  // HARDCODED FOR TESTING - Will be dynamic in production
      fps: 30,
      created_at: new Date().toISOString()
    };
    
    const defaultUserContext: UserContext = {
      originalPrompt: userContext?.originalPrompt || 'Generate engaging video content',
      projectSettings: {
        duration: projectMetadata.total_duration,
        style_preference: 'dynamic',
        pacing_preference: 'medium',
        target_audience: 'general'
      },
      platformSettings: {
        primary_platform: platform,
        aspect_ratio: '3:2',  // HARDCODED FOR TESTING - Will be dynamic in production  
        quality_preference: 'high'
      },
      contentPreferences: {
        subtitle_timing: 'auto',
        transition_style: advancedMode ? 'creative' : 'minimal',
        effect_intensity: advancedMode ? 'moderate' : 'none'
      }
    };
    
    console.log('🎬 [SERVER] Step 6: Preparing editing agent input...');
    
    const editingAgentInput: EditingAgentInput = {
      s3VideoFiles,
      directorOutput,
      producerOutput,
      imagePrompts,
      videoPrompts,
      userContextDocument: { ...defaultUserContext, ...userContext },
      subtitleStyle,
      advancedMode,
      projectMetadata
    };
    
    console.log('📋 [SERVER] Editing agent input prepared:', {
      s3VideoFilesCount: s3VideoFiles.length,
      hasDirectorOutput: !!directorOutput,
      hasProducerOutput: !!producerOutput,
      producerCutPointsCount: producerOutput?.cut_points?.length || 0,
      imagePromptsCount: Object.keys(imagePrompts).length,
      videoPromptsCount: Object.keys(videoPrompts).length,
      subtitleStyle,
      advancedMode,
      projectId: projectMetadata.project_id,
      totalDuration: projectMetadata.total_duration
    });
    
    console.log('🎬 [SERVER] S3 video files:', s3VideoFiles);
    console.log('📝 [SERVER] Director output preview:', {
      primaryConcept: directorOutput?.project_metadata?.primary_concept,
      beatsCount: directorOutput?.narrative_beats?.length,
      targetPlatform: directorOutput?.project_metadata?.target_platform
    });
    
    console.log('🤖 [SERVER] Step 7: Calling editing agent...');
    const editingStartTime = Date.now();
    
    // Step 5: Call editing agent - use relative URL for internal API calls
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.SITE_URL || 'https://your-domain.com'
      : `http://localhost:${process.env.PORT || 3002}`;
    
    console.log('🌐 [SERVER] Calling editing agent at:', `${baseUrl}/api/editing-agent`);
    
    const editingResponse = await fetch(`${baseUrl}/api/editing-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingAgentInput)
    });
    
    const editingTime = Date.now() - editingStartTime;
    console.log(`⏱️ [SERVER] Editing agent request completed in ${editingTime}ms, status: ${editingResponse.status}`);
    
    if (!editingResponse.ok) {
      const errorText = await editingResponse.text();
      console.error('❌ [SERVER] Editing agent failed:', errorText);
      return NextResponse.json({
        success: false,
        error: {
          code: 'EDITING_AGENT_FAILED',
          message: 'Editing agent call failed',
          details: errorText
        }
      } as SubmitForEditingResponse, { status: 500 });
    }
    
    const editingResult = await editingResponse.json();
    console.log('📋 [SERVER] Editing agent response:', {
      success: editingResult.success,
      hasEditingPlan: !!editingResult.editing_plan,
      processingInfo: editingResult.processing_info,
      errorCode: editingResult.error?.code
    });
    
    if (!editingResult.success) {
      console.error('❌ [SERVER] Editing agent returned error:', editingResult.error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'EDITING_AGENT_ERROR',
          message: 'Editing agent returned error',
          details: editingResult.error
        }
      } as SubmitForEditingResponse, { status: 500 });
    }
    
    const executionTime = Date.now() - startTime;
    
    // Step 6: Save editing plan to S3 for RunPod to fetch (user's architecture)
    console.log('📋 [SERVER] Step 7.5: Saving editing plan to S3...');
    try {
      const editingPlanKey = `input/project-${projectId}/editing_plan.json`;
      const editingPlanContent = JSON.stringify(editingResult.editing_plan, null, 2);
      
      // Save to S3 using our S3 manager
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      });
      
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: editingPlanKey,
        Body: editingPlanContent,
        ContentType: 'application/json'
      }));
      
      console.log(`✅ [SERVER] Editing plan saved to S3: ${editingPlanKey}`);
    } catch (error) {
      console.error('❌ [SERVER] Failed to save editing plan to S3:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'S3_SAVE_FAILED',
          message: 'Failed to save editing plan to S3',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as SubmitForEditingResponse, { status: 500 });
    }
    
    // Step 7: Call RunPod to generate final video (S3-based approach)
    console.log('🚀 [SERVER] Step 8: Calling RunPod for video generation...');
    const runpodStartTime = Date.now();
    
    const runpodResponse = await fetch(`${baseUrl}/api/process-with-runpod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        // editingPlan is now in S3 at: input/project-${projectId}/editing_plan.json
        // RunPod will fetch it directly from S3
        s3Assets: uploadedAssets,
        processingMode: advancedMode ? 'advanced' : 'simple'
      })
    });
    
    const runpodTime = Date.now() - runpodStartTime;
    console.log(`⏱️ [SERVER] RunPod request completed in ${runpodTime}ms, status: ${runpodResponse.status}`);
    
    let finalVideoUrl = null;
    let runpodJobId = null;
    
    if (runpodResponse.ok) {
      const runpodResult = await runpodResponse.json();
      console.log('📋 [SERVER] RunPod response:', {
        success: runpodResult.success,
        hasVideoUrl: !!runpodResult.videoUrl,
        runpodJobId: runpodResult.runpodJobId,
        processingStatus: runpodResult.processingInfo?.status
      });
      
      if (runpodResult.success) {
        finalVideoUrl = runpodResult.videoUrl;
        runpodJobId = runpodResult.runpodJobId;
        console.log('🎥 [SERVER] Final video generated:', finalVideoUrl);
      } else {
        console.warn('⚠️ [SERVER] RunPod processing failed, but continuing with editing plan:', runpodResult.error);
      }
    } else {
      const errorText = await runpodResponse.text();
      console.warn('⚠️ [SERVER] RunPod call failed, but continuing with editing plan:', errorText);
    }
    
    const totalExecutionTime = Date.now() - startTime;
    
    console.log(`✅ [SERVER] Submit-for-editing completed successfully in ${totalExecutionTime}ms`);
    console.log(`📊 [SERVER] Final summary:`);
    console.log(`   - Assets uploaded: ${uploadedAssets.length}`);
    console.log(`   - Images processed: ${imageFiles.length}`);
    console.log(`   - Audio file: ${!!audioFile}`);
    console.log(`   - Transcription: ${!!transcriptionFile}`);
    console.log(`   - Agent files processed: ${agentFiles.length}`);
    console.log(`   - Editing plan generated: ${!!editingResult.editing_plan}`);
    console.log(`   - Final video generated: ${!!finalVideoUrl}`);
    console.log(`   - RunPod job ID: ${runpodJobId || 'N/A'}`);
    console.log(`   - Total execution time: ${totalExecutionTime}ms`);
    console.log('🎉 [SERVER] ===== SUBMIT FOR EDITING COMPLETED =====\n');
    
    // Return success response
    return NextResponse.json({
      success: true,
      editingPlan: editingResult.editing_plan,
      s3Assets: uploadedAssets,
      projectId,
      finalVideoUrl,
      runpodJobId,
      processingInfo: {
        assetsUploaded: uploadedAssets.length,
        editingPlanGenerated: !!editingResult.editing_plan,
        finalVideoGenerated: !!finalVideoUrl,
        executionTime: totalExecutionTime,
        runpodExecutionTime: runpodTime
      }
    } as SubmitForEditingResponse);
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Submit-for-editing error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during submit-for-editing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      processingInfo: {
        assetsUploaded: 0,
        editingPlanGenerated: false,
        executionTime
      }
    } as SubmitForEditingResponse, { status: 500 });
  }
}

/**
 * GET endpoint for testing the submit-for-editing service
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      service: 'Submit for Editing Bridge',
      status: 'Ready',
      description: 'Bridges VinVideo pipeline completion with professional video editing',
      capabilities: {
        assetUpload: 'S3 integration',
        editingAgent: 'AI-powered editing plan generation',
        universalNaming: 'Standardized asset naming',
        multiPlatform: 'TikTok, Instagram, YouTube optimization'
      },
      supportedPlatforms: ['tiktok', 'instagram', 'youtube'],
      supportedSubtitleStyles: [
        'simple_caption', 'background_caption', 'karaoke_style', 
        'glow_caption', 'highlight_caption', 'deep_diver', 
        'popling_caption', 'greengoblin', 'sgone_caption'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}