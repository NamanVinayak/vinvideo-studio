import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: Request) {
  try {
    const { prompts, folderId } = await request.json();
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'Valid prompts array is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required. Initialize a project first.' }, { status: 400 });
    }
    
    // Create the directory for this script's images
    const publicDir = path.join(process.cwd(), 'public', folderId);
    
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
      await fs.chmod(publicDir, 0o755);
    }
    
    // Save prompts to a temporary file for the Python script to read
    const promptsFilePath = path.join(process.cwd(), 'src', 'utils', 'temp_prompts.json');
    await fs.writeFile(promptsFilePath, JSON.stringify(prompts));
    
    // Set the output directory for the Python script
    process.env.OUTPUT_DIR = publicDir;
    
    // Ensure API key is available for the Python script
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RunPod API key is not configured' }, { status: 500 });
    }
    
    console.log(`Starting ComfyUI image generation for ${prompts.length} prompts with SSE streaming...`);
    console.log(`Output directory: ${publicDir}`);
    
    // Set up SSE response headers
    const responseHeaders = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const stream = new ReadableStream({
      start(controller) {
        const pythonScript = path.join(process.cwd(), 'src', 'utils', 'comfyEndpointConcurrent.py');
        const python = spawn('python3', [pythonScript, '--prompts-file', promptsFilePath], {
          cwd: path.dirname(pythonScript),
          env: { 
            ...process.env, 
            OUTPUT_DIR: publicDir,
            RUNPOD_API_KEY: apiKey
          }
        });
        
        let output = '';
        let errorOutput = '';
        const generatedImages: (string | undefined)[] = new Array(prompts.length);
        let currentImageIndex = 0;
        
        // Send initial progress event
        const sendEvent = (type: string, data: any) => {
          const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(event));
        };
        
        // Send start event
        sendEvent('start', {
          totalImages: prompts.length,
          message: `Starting generation of ${prompts.length} images...`
        });
        
        python.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          console.log('Python stdout:', text);
          
          // Check for successful image generation (updated for concurrent script format)
          const imageMatch = text.match(/💾 Image saved: (.+\.png)|saved as (.+\.png)/);
          if (imageMatch) {
            const imagePath = imageMatch[1] || imageMatch[2];
            const fileName = path.basename(imagePath);
            const imageUrl = `/${folderId}/${fileName}`;
            
            // Extract the image index from the filename (prompt_engineer_image_X.png)
            const indexMatch = fileName.match(/prompt_engineer_image_(\d+)\.png/);
            const imageIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : currentImageIndex;
            
            // Ensure we don't add duplicates
            if (!generatedImages[imageIndex]) {
              generatedImages[imageIndex] = imageUrl;
              currentImageIndex = Math.max(currentImageIndex, imageIndex + 1);
              
              // Send progress event for each completed image
              sendEvent('image', {
                imageUrl,
                index: imageIndex,
                totalImages: prompts.length,
                progress: Math.round((currentImageIndex / prompts.length) * 100),
                message: `Generated image ${imageIndex + 1}/${prompts.length}`
              });
            }
          }
          
          // Check for processing status (updated for concurrent script)
          if (text.includes('✅ Submitted job')) {
            const submittedMatch = text.match(/✅ Submitted job (\d+)/);
            if (submittedMatch) {
              const jobNumber = parseInt(submittedMatch[1]);
              sendEvent('processing', {
                index: jobNumber - 1,
                totalImages: prompts.length,
                message: `Processing image ${jobNumber}/${prompts.length}...`
              });
            }
          }
          
          // Check for job completion (before image is saved)
          if (text.includes('🎉 Job') && text.includes('completed')) {
            const completedMatch = text.match(/🎉 Job (\d+) completed/);
            if (completedMatch) {
              const jobNumber = parseInt(completedMatch[1]);
              sendEvent('processing', {
                index: jobNumber - 1,
                totalImages: prompts.length,
                message: `Saving image ${jobNumber}/${prompts.length}...`
              });
            }
          }
          
          // Check for generation complete message
          if (text.includes('🎉 GENERATION COMPLETE!')) {
            console.log('Detected generation complete signal from Python script');
          }
        });
        
        python.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          console.error('Python stderr:', text);
          
          // Check if stderr contains success messages (since Python logging goes to stderr by default)
          // Look for the same patterns we check in stdout
          const imageMatch = text.match(/💾 Image saved: (.+\.png)|saved as (.+\.png)/);
          if (imageMatch) {
            const imagePath = imageMatch[1] || imageMatch[2];
            const fileName = path.basename(imagePath);
            const imageUrl = `/${folderId}/${fileName}`;
            
            // Extract the image index from the filename (prompt_engineer_image_X.png)
            const indexMatch = fileName.match(/prompt_engineer_image_(\d+)\.png/);
            const imageIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : currentImageIndex;
            
            // Ensure we don't add duplicates
            if (!generatedImages[imageIndex]) {
              generatedImages[imageIndex] = imageUrl;
              currentImageIndex = Math.max(currentImageIndex, imageIndex + 1);
              
              // Send progress event for each completed image
              sendEvent('image', {
                imageUrl,
                index: imageIndex,
                totalImages: prompts.length,
                progress: Math.round((currentImageIndex / prompts.length) * 100),
                message: `Generated image ${imageIndex + 1}/${prompts.length}`
              });
            }
          }
          
          // Don't send error events for normal logging output
          if (text.includes('ERROR') || text.includes('Failed') || text.includes('❌')) {
            sendEvent('error', {
              message: text,
              timestamp: new Date().toISOString()
            });
          }
        });
        
        python.on('close', async (code) => {
          // Clean up temp file
          try {
            await fs.unlink(promptsFilePath);
          } catch (error) {
            console.warn('Could not clean up temp prompts file:', error);
          }
          
          // Filter out undefined entries and create a clean array
          const cleanGeneratedImages = generatedImages.filter(img => img !== undefined);
          
          if (code === 0 || cleanGeneratedImages.length > 0) {
            console.log(`ComfyUI image generation completed. Generated ${cleanGeneratedImages.length} images.`);
            sendEvent('complete', {
              success: true,
              generatedImages: cleanGeneratedImages,
              totalImages: cleanGeneratedImages.length,
              message: `Successfully generated ${cleanGeneratedImages.length} images`,
              output
            });
          } else {
            console.error(`ComfyUI image generation failed with code ${code}`);
            sendEvent('complete', {
              success: false,
              error: `Image generation failed with exit code ${code}`,
              errorOutput,
              output,
              generatedImages: cleanGeneratedImages // Send whatever images were generated
            });
          }
          
          // Close the stream
          controller.close();
        });
        
        python.on('error', (error) => {
          console.error('Python process error:', error);
          sendEvent('complete', {
            success: false,
            error: `Failed to start Python process: ${error.message}`
          });
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}