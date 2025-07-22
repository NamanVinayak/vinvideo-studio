import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

/**
 * Enhanced Concurrent Image Generation API endpoint
 * Automatically chooses between sequential and concurrent processing
 * Based on prompt count and worker availability
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompts, promptsOutput, folderId, mode, negativePrompt } = body;
    
    // Support both prompts and promptsOutput for backward compatibility
    const actualPrompts = prompts || promptsOutput;
    
    // Validate required inputs
    if (!actualPrompts || !Array.isArray(actualPrompts)) {
      return NextResponse.json({ 
        error: 'Prompts array is required' 
      }, { status: 400 });
    }
    
    if (actualPrompts.length === 0) {
      return NextResponse.json({ 
        error: 'At least one prompt is required' 
      }, { status: 400 });
    }
    
    console.log(`🚀 Starting CONCURRENT image generation for ${actualPrompts.length} prompts...`);
    console.log(`📁 Folder ID: ${folderId || 'default'}`);
    console.log(`🎯 Mode: ${mode || 'auto-detect'}`);
    
    // 🚨 CRITICAL DEBUG: Log received prompts
    console.log('🔍 CRITICAL DEBUG - API Received Prompts:', actualPrompts);
    console.log('🔍 CRITICAL DEBUG - First 2 received prompts preview:', actualPrompts.slice(0, 2));
    
    // Create session-specific prompts file
    const utilsDir = path.join(process.cwd(), 'src', 'utils');
    const tempPromptsFile = path.join(utilsDir, `prompts_${folderId || 'default'}.json`);
    
    try {
      // Write prompts to session-specific file
      await fs.writeFile(tempPromptsFile, JSON.stringify(actualPrompts, null, 2));
      console.log(`💾 Saved ${actualPrompts.length} prompts to session file: prompts_${folderId || 'default'}.json`);
      console.log(`✅ Prompts written to ${tempPromptsFile}`);
      
      // Execute the concurrent Python script
      const pythonScript = path.join(utilsDir, 'comfyEndpointConcurrent.py');
      const promptsFileName = path.basename(tempPromptsFile);
      const result = await executeConcurrentPythonScript(
        pythonScript, 
        promptsFileName, 
        folderId, 
        mode, 
        negativePrompt
      );
      
      if (result.success) {
        console.log(`✅ Concurrent image generation completed successfully`);
        console.log(`📊 Generated ${result.generatedImages.length} images in ${result.executionTime}ms`);
        
        // Calculate performance improvement
        const sequentialEstimate = actualPrompts.length * 16750; // 16.75s per image baseline
        const improvementPercent = ((sequentialEstimate - result.executionTime) / sequentialEstimate) * 100;
        
        return NextResponse.json({
          success: true,
          // Frontend compatibility - provide images in expected format
          generatedImages: result.generatedImages,
          totalImages: result.generatedImages.length,
          message: `Successfully generated ${result.generatedImages.length} images using concurrent processing`,
          // Detailed concurrent processing information
          concurrent_image_generation: {
            generated_images: result.generatedImages,
            total_images: result.generatedImages.length,
            generation_time_ms: result.executionTime,
            generation_time_seconds: Math.round(result.executionTime / 1000),
            output_directory: result.outputDirectory,
            processing_mode: result.processingMode,
            performance_improvement_percent: Math.round(improvementPercent),
            worker_utilization: result.workerUtilization
          },
          executionTime: result.executionTime,
          validation: {
            expectedImages: actualPrompts.length,
            actualImages: result.generatedImages.length,
            allImagesGenerated: result.generatedImages.length === actualPrompts.length,
            successRate: (result.generatedImages.length / actualPrompts.length) * 100
          },
          performance: {
            sequentialEstimate: sequentialEstimate,
            actualTime: result.executionTime,
            improvement: `${Math.round(improvementPercent)}% faster`,
            avgTimePerImage: Math.round(result.executionTime / actualPrompts.length)
          },
          generationDetails: result.details
        });
        
      } else {
        console.error('❌ Concurrent Python script execution failed:', result.error);
        return NextResponse.json({
          success: false,
          error: `Concurrent image generation failed: ${result.error}`,
          details: result.details,
          fallback_suggestion: "Try using the sequential endpoint if concurrent processing fails"
        }, { status: 500 });
      }
      
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(tempPromptsFile);
        console.log('🧹 Cleaned up temporary prompts file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
      }
    }
    
  } catch (error: unknown) {
    console.error('Error in concurrent generate-images endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage,
      suggestion: "Try using the sequential endpoint as fallback"
    }, { status: 500 });
  }
}

/**
 * Execute the concurrent ComfyUI Python script and return results
 */
async function executeConcurrentPythonScript(
  scriptPath: string, 
  promptsFile: string, 
  folderId?: string,
  mode?: string,
  negativePrompt?: string
): Promise<{
  success: boolean;
  generatedImages: string[];
  executionTime: number;
  outputDirectory: string;
  processingMode: string;
  workerUtilization: number;
  error?: string;
  details: any;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let processingMode = 'unknown';
    let workerUtilization = 0;
    
    console.log(`🐍 Executing CONCURRENT Python script: ${scriptPath}`);
    console.log(`📄 Prompts file: ${promptsFile}`);
    
    // Set environment variables for the Python script
    const outputDir = folderId 
      ? path.join(process.cwd(), 'public', folderId)
      : path.join(process.cwd(), 'public');
    
    const env = {
      ...process.env,
      RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
      OUTPUT_DIR: outputDir,
      RUNPOD_MAX_CONCURRENT_JOBS: process.env.RUNPOD_MAX_CONCURRENT_JOBS || '6',
      RUNPOD_FALLBACK_MODE: process.env.RUNPOD_FALLBACK_MODE || 'sequential'
    };
    
    // Build Python arguments
    const pythonArgs = [
      scriptPath,
      '--prompts-file',
      promptsFile
    ];
    
    if (mode) {
      pythonArgs.push('--mode', mode);
    }
    
    if (negativePrompt) {
      pythonArgs.push('--negative-prompt', negativePrompt);
    }
    
    // Execute Python script with prompts file argument
    const pythonProcess = spawn('python3', pythonArgs, {
      env,
      cwd: path.dirname(scriptPath)
    });
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('🐍 Python stdout:', output.trim());
      
      // Extract processing mode from output
      const modeMatch = output.match(/Processing mode selected: (\w+)/i);
      if (modeMatch) {
        processingMode = modeMatch[1].toLowerCase();
      }
      
      // Extract worker utilization if available
      const utilizationMatch = output.match(/Worker Utilization: ([\d.]+)%/);
      if (utilizationMatch) {
        workerUtilization = parseFloat(utilizationMatch[1]);
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error('🐍 Python stderr:', output.trim());
    });
    
    pythonProcess.on('close', async (code) => {
      const executionTime = Date.now() - startTime;
      console.log(`🐍 Concurrent Python script completed with code: ${code} (${executionTime}ms)`);
      
      if (code === 0) {
        // Script completed successfully - scan for generated images
        try {
          const generatedImages = await scanForGeneratedImages(outputDir, folderId);
          
          resolve({
            success: true,
            generatedImages,
            executionTime,
            outputDirectory: outputDir,
            processingMode,
            workerUtilization,
            details: {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code,
              concurrentProcessing: true
            }
          });
          
        } catch (scanError) {
          console.error('❌ Failed to scan for generated images:', scanError);
          resolve({
            success: false,
            generatedImages: [],
            executionTime,
            outputDirectory: outputDir,
            processingMode,
            workerUtilization,
            error: `Failed to scan generated images: ${scanError}`,
            details: {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code,
              scanError: scanError instanceof Error ? scanError.message : String(scanError)
            }
          });
        }
        
      } else {
        // Script failed
        resolve({
          success: false,
          generatedImages: [],
          executionTime,
          outputDirectory: outputDir,
          processingMode,
          workerUtilization,
          error: `Concurrent Python script failed with exit code ${code}`,
          details: {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            concurrentProcessing: true
          }
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      const executionTime = Date.now() - startTime;
      console.error('❌ Python process error:', error);
      
      resolve({
        success: false,
        generatedImages: [],
        executionTime,
        outputDirectory: outputDir,
        processingMode,
        workerUtilization,
        error: `Failed to execute concurrent Python script: ${error.message}`,
        details: {
          processError: error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          concurrentProcessing: true
        }
      });
    });
  });
}

/**
 * Scan directory for newly generated images
 */
async function scanForGeneratedImages(outputDir: string, folderId?: string): Promise<string[]> {
  const generatedImages: string[] = [];
  
  try {
    const files = await fs.readdir(outputDir);
    
    // Look for images generated by the ComfyUI script
    const imageFiles = files.filter(file => {
      const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file);
      const isGenerated = file.includes('prompt_engineer_image_') || 
                         file.includes('generated_image') ||
                         file.includes('ComfyUI');
      return isImage && isGenerated;
    });
    
    // Sort by filename to maintain order
    imageFiles.sort((a, b) => {
      const aMatch = a.match(/prompt_engineer_image_(\d+)/);
      const bMatch = b.match(/prompt_engineer_image_(\d+)/);
      
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      }
      
      return a.localeCompare(b);
    });
    
    for (const file of imageFiles) {
      // Return relative path for web access
      const relativePath = folderId ? `/${folderId}/${file}` : `/${file}`;
      generatedImages.push(relativePath);
    }
    
    console.log(`📸 Found ${generatedImages.length} generated images:`, generatedImages);
    return generatedImages;
    
  } catch (error) {
    console.error('❌ Error scanning for generated images:', error);
    throw error;
  }
}

/**
 * GET endpoint for testing the concurrent image generation service
 */
export async function GET() {
  try {
    // Check if Python scripts exist
    const utilsDir = path.join(process.cwd(), 'src', 'utils');
    const concurrentScript = path.join(utilsDir, 'comfyEndpointConcurrent.py');
    const sequentialScript = path.join(utilsDir, 'comfyEndpointTest.py');
    const utilsScript = path.join(utilsDir, 'concurrency_utils.py');
    
    const scripts = {
      concurrent: { path: concurrentScript, exists: false },
      sequential: { path: sequentialScript, exists: false },
      utils: { path: utilsScript, exists: false }
    };
    
    for (const [name, script] of Object.entries(scripts)) {
      try {
        await fs.access(script.path);
        script.exists = true;
      } catch {
        script.exists = false;
      }
    }
    
    // Check if RunPod API key is configured
    const hasApiKey = !!process.env.RUNPOD_API_KEY;
    
    // Check dependencies
    const dependencies = {
      aiohttp: 'Required for async processing',
      asyncio: 'Built into Python 3.7+',
      concurrent_futures: 'Built into Python 3.2+',
      requests: 'Required for HTTP requests'
    };
    
    return NextResponse.json({
      success: true,
      service: 'Concurrent ComfyUI Image Generation',
      status: scripts.concurrent.exists && scripts.utils.exists ? 'Ready' : 'Missing files',
      scripts,
      configuration: {
        runpodApiConfigured: hasApiKey,
        maxConcurrentJobs: process.env.RUNPOD_MAX_CONCURRENT_JOBS || '6',
        fallbackMode: process.env.RUNPOD_FALLBACK_MODE || 'sequential',
        outputDirectory: path.join(process.cwd(), 'public')
      },
      capabilities: {
        concurrentProcessing: scripts.concurrent.exists && scripts.utils.exists,
        sequentialFallback: scripts.sequential.exists,
        autoModeSelection: true,
        workerCapacityDetection: true,
        adaptivePolling: true
      },
      supportedModes: ['auto', 'sequential', 'threadpool', 'async'],
      supportedFormats: ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'],
      workflow: 'FLUX Dev (fp8)',
      dependencies,
      performanceExpectations: {
        '2_prompts': 'Expected ~60-80% faster than sequential',
        '4_prompts': 'Expected ~75-85% faster than sequential',
        '8_prompts': 'Expected ~80-90% faster than sequential'
      }
    });
    
  } catch (error: unknown) {
    console.error('Error in concurrent generate-images GET endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}