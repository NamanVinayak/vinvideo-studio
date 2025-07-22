import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

/**
 * Test endpoint to verify RunPod connection with mock data
 */
export async function POST(request: Request) {
  try {
    const { testPrompt = "A beautiful sunset over mountains, cinematic lighting, 8K resolution" } = await request.json();
    
    // Create test folder
    const testFolderId = `test-runpod-${Date.now()}`;
    const publicDir = path.join(process.cwd(), 'public', testFolderId);
    
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
      await fs.chmod(publicDir, 0o755);
    }
    
    // Create mock prompts array with single test prompt
    const testPrompts = [testPrompt];
    
    // Save prompts to temp file
    const promptsFilePath = path.join(process.cwd(), 'src', 'utils', 'temp_prompts.json');
    await fs.writeFile(promptsFilePath, JSON.stringify(testPrompts));
    
    // Check API key
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RUNPOD_API_KEY is not configured' }, { status: 500 });
    }
    
    console.log('🧪 Testing RunPod connection...');
    console.log('📁 Test folder:', testFolderId);
    console.log('🎨 Test prompt:', testPrompt);
    console.log('🔑 API key configured:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NO');
    
    return new Promise<Response>((resolve) => {
      const pythonScript = path.join(process.cwd(), 'src', 'utils', 'comfyEndpointTest.py');
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
      const generatedImages: string[] = [];
      
      python.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('🐍 Python stdout:', text);
        
        // Check for successful image generation
        const imageMatch = text.match(/saved as (.+\.png)/);
        if (imageMatch) {
          const imagePath = imageMatch[1];
          const fileName = path.basename(imagePath);
          generatedImages.push(`/${testFolderId}/${fileName}`);
          console.log('✅ Image generated:', fileName);
        }
      });
      
      python.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error('🐍 Python stderr:', text);
      });
      
      python.on('close', async (code) => {
        // Clean up temp file
        try {
          await fs.unlink(promptsFilePath);
        } catch (error) {
          console.warn('Could not clean up temp prompts file:', error);
        }
        
        if (code === 0) {
          console.log('🎉 RunPod test completed successfully!');
          resolve(NextResponse.json({
            success: true,
            testFolderId,
            generatedImages,
            totalImages: generatedImages.length,
            message: `RunPod test successful! Generated ${generatedImages.length} image(s)`,
            testPrompt,
            output,
            apiKeyConfigured: !!apiKey
          }));
        } else {
          console.error(`❌ RunPod test failed with code ${code}`);
          resolve(NextResponse.json({
            success: false,
            testFolderId,
            error: `RunPod test failed with exit code ${code}`,
            errorOutput,
            output,
            testPrompt,
            apiKeyConfigured: !!apiKey
          }, { status: 500 }));
        }
      });
      
      python.on('error', (error) => {
        console.error('🐍 Python process error:', error);
        resolve(NextResponse.json({
          success: false,
          testFolderId,
          error: `Failed to start Python process: ${error.message}`,
          testPrompt,
          apiKeyConfigured: !!apiKey
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('🔥 Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}