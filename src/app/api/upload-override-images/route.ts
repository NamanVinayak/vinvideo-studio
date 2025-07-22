import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const folderId = formData.get('folderId') as string;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Missing folderId parameter' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Validate file types
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Only PNG, JPG, and WEBP are allowed.` },
          { status: 400 }
        );
      }
    }

    // Create the directory structure
    const publicDir = path.join(process.cwd(), 'public');
    const projectDir = path.join(publicDir, folderId);
    
    if (!existsSync(projectDir)) {
      await mkdir(projectDir, { recursive: true });
    }

    const uploadedImages: string[] = [];
    const errors: string[] = [];

    // Process each uploaded file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine file extension
        let extension = 'png';
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          extension = 'jpg';
        } else if (file.type === 'image/webp') {
          extension = 'webp';
        }

        // Create filename matching the pattern used by ComfyUI generation
        const filename = `override_image_${i + 1}.${extension}`;
        const filepath = path.join(projectDir, filename);
        
        // Write file to disk
        await writeFile(filepath, buffer);
        
        // Add to successful uploads (using same URL format as generated images)
        const imageUrl = `/${folderId}/${filename}`;
        uploadedImages.push(imageUrl);
        
        console.log(`✅ Uploaded override image: ${imageUrl}`);
        
      } catch (error) {
        const errorMessage = `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error('❌ Upload error:', errorMessage);
      }
    }

    // Return results
    const result = {
      success: uploadedImages.length > 0,
      uploadedImages,
      totalUploaded: uploadedImages.length,
      totalRequested: files.length,
      errors: errors.length > 0 ? errors : undefined
    };

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { ...result, error: 'No images were successfully uploaded' },
        { status: 500 }
      );
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Partial upload success: ${uploadedImages.length}/${files.length} images uploaded`);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Upload API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process image upload', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}