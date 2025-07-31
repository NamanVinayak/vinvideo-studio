import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

/**
 * Image Generation API endpoint using ComfyUI Python script
 * Integrates with the ComfyUI workflow for FLUX image generation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { promptsOutput, folderId } = body;
    
    // Validate required inputs
    if (!promptsOutput || !Array.isArray(promptsOutput)) {
      return NextResponse.json({ 
        error: 'Prompts output array is required' 
      }, { status: 400 });
    }
    
    if (promptsOutput.length === 0) {
      return NextResponse.json({ 
        error: 'At least one prompt is required' 
      }, { status: 400 });
    }
    
    console.log(`🎨 Starting image generation for ${promptsOutput.length} prompts...`);
    console.log(`📁 Folder ID: ${folderId || 'default'}`);
    
    // Create temporary prompts file
    const utilsDir = path.join(process.cwd(), 'src', 'utils');
    const tempPromptsFile = path.join(utilsDir, 'temp_prompts.json');
    
    try {
      // Write prompts to temporary file
      await fs.writeFile(tempPromptsFile, JSON.stringify(promptsOutput, null, 2));
      console.log(`✅ Prompts written to ${tempPromptsFile}`);
      
      // Execute the Python script
      const pythonScript = path.join(utilsDir, 'comfyEndpointTest.py');
      const result = await executePythonScript(pythonScript, tempPromptsFile);
      
      if (result.success) {
        console.log(`✅ Image generation completed successfully`);
        console.log(`📊 Generated ${result.generatedImages.length} images`);
        
        return NextResponse.json({
          success: true,
          stage7_image_generation: {
            generated_images: result.generatedImages,
            total_images: result.generatedImages.length,
            generation_time: result.executionTime,
            output_directory: result.outputDirectory
          },
          executionTime: result.executionTime,
          validation: {
            expectedImages: promptsOutput.length,
            actualImages: result.generatedImages.length,
            allImagesGenerated: result.generatedImages.length === promptsOutput.length
          },
          generationDetails: result.details
        });
        
      } else {
        console.error('❌ Python script execution failed:', result.error);
        return NextResponse.json({
          success: false,
          error: `Image generation failed: ${result.error}`,
          details: result.details
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
    console.error('Error in generate-images endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Execute the ComfyUI Python script and return results
 */
async function executePythonScript(scriptPath: string, promptsFile: string): Promise<{
  success: boolean;
  generatedImages: string[];
  executionTime: number;
  outputDirectory: string;
  error?: string;
  details: any;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    
    console.log(`🐍 Executing Python script: ${scriptPath}`);
    console.log(`📄 Prompts file: ${promptsFile}`);
    
    // Set environment variables for the Python script
    const env = {
      ...process.env,
      RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
      OUTPUT_DIR: path.join(process.cwd(), 'public')
    };
    
    // Execute Python script with prompts file argument
    const pythonProcess = spawn('python3', [
      scriptPath,
      '--prompts-file',
      promptsFile
    ], {
      env,
      cwd: path.dirname(scriptPath)
    });
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('🐍 Python stdout:', output.trim());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error('🐍 Python stderr:', output.trim());
    });
    
    pythonProcess.on('close', async (code) => {
      const executionTime = Date.now() - startTime;
      console.log(`🐍 Python script completed with code: ${code} (${executionTime}ms)`);
      
      if (code === 0) {
        // Script completed successfully - scan for generated images
        try {
          const generatedImages = await scanForGeneratedImages();
          
          resolve({
            success: true,
            generatedImages,
            executionTime,
            outputDirectory: path.join(process.cwd(), 'public'),
            details: {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code
            }
          });
          
        } catch (scanError) {
          console.error('❌ Failed to scan for generated images:', scanError);
          resolve({
            success: false,
            generatedImages: [],
            executionTime,
            outputDirectory: path.join(process.cwd(), 'public'),
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
          outputDirectory: path.join(process.cwd(), 'public'),
          error: `Python script failed with exit code ${code}`,
          details: {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code
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
        outputDirectory: path.join(process.cwd(), 'public'),
        error: `Failed to execute Python script: ${error.message}`,
        details: {
          processError: error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }
      });
    });
  });
}

/**
 * Scan the public directory for newly generated images
 */
async function scanForGeneratedImages(): Promise<string[]> {
  const publicDir = path.join(process.cwd(), 'public');
  const generatedImages: string[] = [];
  
  try {
    const files = await fs.readdir(publicDir);
    
    // Look for images generated by the ComfyUI script
    const imageFiles = files.filter(file => {
      const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file);
      const isGenerated = file.includes('beat_') || 
                         file.includes('generated_image') ||
                         file.includes('ComfyUI');
      return isImage && isGenerated;
    });
    
    // Sort by filename to maintain order
    imageFiles.sort((a, b) => {
      const aMatch = a.match(/beat_(\d+)/);
      const bMatch = b.match(/beat_(\d+)/);
      
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      }
      
      return a.localeCompare(b);
    });
    
    for (const file of imageFiles) {
      // Return relative path for web access
      generatedImages.push(`/${file}`);
    }
    
    console.log(`📸 Found ${generatedImages.length} generated images:`, generatedImages);
    return generatedImages;
    
  } catch (error) {
    console.error('❌ Error scanning for generated images:', error);
    throw error;
  }
}

/**
 * GET endpoint for testing the image generation service
 */
export async function GET() {
  try {
    // Check if Python script exists
    const utilsDir = path.join(process.cwd(), 'src', 'utils');
    const pythonScript = path.join(utilsDir, 'comfyEndpointTest.py');
    
    try {
      await fs.access(pythonScript);
    } catch {
      return NextResponse.json({
        error: 'ComfyUI Python script not found',
        expectedPath: pythonScript
      }, { status: 500 });
    }
    
    // Check if RunPod API key is configured
    const hasApiKey = !!process.env.RUNPOD_API_KEY;
    
    return NextResponse.json({
      success: true,
      service: 'ComfyUI Image Generation',
      status: 'Ready',
      pythonScriptPath: pythonScript,
      runpodApiConfigured: hasApiKey,
      outputDirectory: path.join(process.cwd(), 'public'),
      supportedFormats: ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'],
      workflow: 'FLUX Dev (fp8)'
    });
    
  } catch (error: unknown) {
    console.error('Error in generate-images GET endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}