import { NextRequest, NextResponse } from 'next/server';

/**
 * Process with RunPod API Route
 * Takes editing plan and calls RunPod worker to generate final video
 */

interface ProcessWithRunPodRequest {
  projectId: string;
  // editingPlan is now fetched from S3 at: input/project-{projectId}/editing_plan.json
  s3Assets: string[];
  processingMode?: 'simple' | 'advanced';
}

interface ProcessWithRunPodResponse {
  success: boolean;
  runpodJobId?: string;
  videoUrl?: string;
  processingInfo?: {
    startTime: number;
    executionTime?: number;
    status: string;
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
    console.log('\n🎬 [RUNPOD] ===== PROCESS WITH RUNPOD API STARTED =====');
    console.log('🕐 [RUNPOD] Start time:', new Date().toISOString());
    
    const body: ProcessWithRunPodRequest = await request.json();
    console.log('📋 [RUNPOD] Request body received:', {
      projectId: body.projectId,
      hasEditingPlan: !!body.editingPlan,
      s3AssetsCount: body.s3Assets?.length || 0,
      processingMode: body.processingMode || 'simple'
    });
    
    const { projectId, s3Assets, processingMode = 'simple' } = body;
    
    if (!projectId) {
      console.error('❌ [RUNPOD] Missing required fields');
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Project ID is required (editing plan will be fetched from S3)'
        }
      } as ProcessWithRunPodResponse, { status: 400 });
    }
    
    // Get RunPod configuration
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    const runpodEndpoint = process.env.RUNPOD_ENDPOINT_ID || '24rtmo4glx3bun'; // Default endpoint
    
    if (!runpodApiKey) {
      console.error('❌ [RUNPOD] Missing RunPod API key');
      return NextResponse.json({
        success: false,
        error: {
          code: 'RUNPOD_CONFIG_ERROR',
          message: 'RunPod API key is not configured'
        }
      } as ProcessWithRunPodResponse, { status: 500 });
    }
    
    console.log('🔑 [RUNPOD] API key configured:', runpodApiKey.substring(0, 10) + '...');
    console.log('🚀 [RUNPOD] Endpoint ID:', runpodEndpoint);
    
    // Fetch editing plan from S3 to include directly in payload (working prototype pattern)
    console.log('📥 [RUNPOD] Fetching editing plan from S3...');
    let editingPlan;
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      });
      
      const editingPlanKey = `input/project-${projectId}/editing_plan.json`;
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: editingPlanKey
      }));
      
      const editingPlanContent = await response.Body?.transformToString();
      if (!editingPlanContent) {
        throw new Error('Empty editing plan content');
      }
      
      editingPlan = JSON.parse(editingPlanContent);
      console.log('✅ [RUNPOD] Editing plan fetched successfully');
    } catch (error) {
      console.error('❌ [RUNPOD] Failed to fetch editing plan from S3:', error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'EDITING_PLAN_FETCH_FAILED',
          message: 'Failed to fetch editing plan from S3',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ProcessWithRunPodResponse, { status: 500 });
    }

    // Prepare RunPod payload with editing plan directly included (working prototype pattern)
    const runpodPayload = {
      input: {
        action: "process_video", // ASYNC: Working action from successful tests
        project_id: projectId,
        editing_plan: editingPlan, // Direct editing plan (working prototype pattern)
        aspect_ratio: "3:2" // Match editing plan format for testing
      }
    };
    
    console.log('📦 [RUNPOD] Payload prepared (direct editing plan):', {
      action: runpodPayload.input.action,
      projectId,
      aspectRatio: runpodPayload.input.aspect_ratio,
      hasEditingPlan: !!editingPlan,
      editingPlanLayers: editingPlan?.layers?.length || 0,
      editingPlanDuration: editingPlan?.composition?.duration || 0
    });
    
    console.log('🚀 [RUNPOD] Calling RunPod endpoint...');
    const runpodUrl = `https://api.runpod.ai/v2/${runpodEndpoint}/run`;
    
    // Step 1: Submit job asynchronously
    const response = await fetch(runpodUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runpodApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(runpodPayload)
    });
    
    const submissionTime = Date.now() - startTime;
    console.log(`⏱️ [RUNPOD] Job submission completed in ${submissionTime}ms, status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [RUNPOD] RunPod API error:', errorData);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RUNPOD_API_ERROR',
          message: `RunPod API request failed: ${response.status}`,
          details: errorData
        },
        processingInfo: {
          startTime,
          executionTime: submissionTime,
          status: 'failed'
        }
      } as ProcessWithRunPodResponse, { status: 500 });
    }
    
    const jobResponse = await response.json();
    const jobId = jobResponse.id;
    
    if (!jobId) {
      console.error('❌ [RUNPOD] No job ID returned:', jobResponse);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RUNPOD_NO_JOB_ID',
          message: 'RunPod did not return a job ID',
          details: jobResponse
        },
        processingInfo: {
          startTime,
          executionTime: submissionTime,
          status: 'failed'
        }
      } as ProcessWithRunPodResponse, { status: 500 });
    }
    
    console.log(`✅ [RUNPOD] Job submitted successfully: ${jobId}`);
    
    // Step 2: Poll for completion (similar to working prototype)
    console.log('⏳ [RUNPOD] Starting polling for completion...');
    const maxWaitTime = 300; // 5 minutes max wait time
    const pollInterval = 5; // 5 seconds between polls
    let attempts = 0;
    let finalResult = null;
    
    while ((Date.now() - startTime) / 1000 < maxWaitTime) {
      attempts++;
      console.log(`📊 [RUNPOD] Polling attempt ${attempts} for job ${jobId}...`);
      
      try {
        const statusUrl = `https://api.runpod.ai/v2/${runpodEndpoint}/status/${jobId}`;
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${runpodApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          const status = statusResult.status;
          
          console.log(`📊 [RUNPOD] Job ${jobId} status: ${status}`);
          
          if (status === 'COMPLETED') {
            finalResult = statusResult;
            break;
          } else if (status === 'FAILED') {
            finalResult = statusResult;
            break;
          } else if (status === 'IN_PROGRESS' || status === 'IN_QUEUE') {
            // Show progress if available
            const output = statusResult.output || {};
            if (output.progress) {
              console.log(`   Progress: ${output.progress}%`);
            }
          }
        } else {
          console.warn(`⚠️ [RUNPOD] Status check failed: ${statusResponse.status}`);
        }
        
      } catch (pollError) {
        console.warn(`⚠️ [RUNPOD] Polling error: ${pollError}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
    }
    
    const totalExecutionTime = Date.now() - startTime;
    
    // Step 3: Handle final result
    if (!finalResult) {
      console.error(`❌ [RUNPOD] Job ${jobId} timed out after ${maxWaitTime} seconds`);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RUNPOD_TIMEOUT',
          message: `Job did not complete within ${maxWaitTime} seconds`,
          details: { jobId, attempts }
        },
        processingInfo: {
          startTime,
          executionTime: totalExecutionTime,
          status: 'timeout'
        }
      } as ProcessWithRunPodResponse, { status: 408 });
    }
    
    if (finalResult.status === 'COMPLETED') {
      const output = finalResult.output || {};
      const videoUrl = output.output_url || output.video_url || output.final_video_url || null;
      
      console.log(`✅ [RUNPOD] Job ${jobId} completed successfully`);
      console.log(`📊 [RUNPOD] Total execution time: ${totalExecutionTime}ms`);
      console.log(`🎥 [RUNPOD] Video URL: ${videoUrl || 'No video URL provided'}`);
      console.log(`📊 [RUNPOD] Polling attempts: ${attempts}`);
      
      if (videoUrl) {
        console.log('🎉 [RUNPOD] ===== VIDEO GENERATION COMPLETED =====\n');
        return NextResponse.json({
          success: true,
          runpodJobId: jobId,
          videoUrl,
          processingInfo: {
            startTime,
            executionTime: totalExecutionTime,
            status: 'completed'
          }
        } as ProcessWithRunPodResponse);
      } else {
        console.log('⚠️ [RUNPOD] Job completed but no video URL provided\n');
        return NextResponse.json({
          success: true,
          runpodJobId: jobId,
          videoUrl: null,
          processingInfo: {
            startTime,
            executionTime: totalExecutionTime,
            status: 'completed_no_video'
          }
        } as ProcessWithRunPodResponse);
      }
    } else {
      const errorMessage = finalResult.error || `Job failed with status: ${finalResult.status}`;
      console.error(`❌ [RUNPOD] Job ${jobId} failed:`, errorMessage);
      return NextResponse.json({
        success: false,
        error: {
          code: 'RUNPOD_PROCESSING_FAILED',
          message: errorMessage,
          details: finalResult
        },
        processingInfo: {
          startTime,
          executionTime: totalExecutionTime,
          status: 'failed'
        }
      } as ProcessWithRunPodResponse, { status: 500 });
    }
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [RUNPOD] Process with RunPod error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during RunPod processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      processingInfo: {
        startTime,
        executionTime,
        status: 'error'
      }
    } as ProcessWithRunPodResponse, { status: 500 });
  }
}

/**
 * GET endpoint for testing the RunPod service
 */
export async function GET() {
  try {
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    const runpodEndpoint = process.env.RUNPOD_ENDPOINT_ID || 'kd0fqbvh60tgdp';
    
    return NextResponse.json({
      success: true,
      service: 'Process with RunPod',
      status: 'Ready',
      description: 'Processes editing plans into final videos using RunPod workers',
      configuration: {
        hasApiKey: !!runpodApiKey,
        endpointId: runpodEndpoint,
        apiKeyPreview: runpodApiKey ? runpodApiKey.substring(0, 10) + '...' : 'Not configured'
      },
      supportedModes: ['simple', 'advanced'],
      inputRequirements: {
        projectId: 'string',
        editingPlan: 'object (from editing-agent)',
        s3Assets: 'array of S3 URLs',
        processingMode: 'optional: simple|advanced'
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}