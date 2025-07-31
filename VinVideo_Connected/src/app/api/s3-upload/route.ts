import { NextRequest, NextResponse } from 'next/server';
import { S3AssetManager, S3Config } from '@/utils/s3Manager';

/**
 * Next.js API Route for S3 File Uploads
 * Handles secure file uploads from React app to S3 bucket
 * Integrated with VinVideo S3 Asset Manager
 */

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Received S3 upload request');
    
    // Validate environment variables
    const requiredEnvVars = ['BUCKET_NAME', 'BUCKET_ACCESS_KEY', 'BUCKET_SECRET_KEY', 'BUCKET_REGION'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return NextResponse.json({
        success: false,
        error: 'Server configuration error: Missing S3 credentials'
      }, { status: 500 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const fileType = formData.get('fileType') as string; // 'video_beat', 'audio', 'metadata'
    const beatIndex = formData.get('beatIndex') as string;

    // Validate required fields
    if (!file || !projectId || !fileType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: file, projectId, and fileType are required'
      }, { status: 400 });
    }

    // Validate file type and size
    const maxSizes = {
      'video_beat': 50 * 1024 * 1024, // 50MB
      'image_beat': 10 * 1024 * 1024, // 10MB for images
      'audio': 10 * 1024 * 1024,      // 10MB
      'metadata': 1 * 1024 * 1024     // 1MB
    };

    const maxSize = maxSizes[fileType as keyof typeof maxSizes] || 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: `File too large. Maximum size for ${fileType}: ${maxSize / (1024 * 1024)}MB`
      }, { status: 400 });
    }

    // Create S3 configuration
    const s3Config: Partial<S3Config> = {
      bucket_name: process.env.BUCKET_NAME!,
      aws_access_key_id: process.env.BUCKET_ACCESS_KEY!,
      aws_secret_access_key: process.env.BUCKET_SECRET_KEY!,
      region: process.env.BUCKET_REGION || 'us-east-1',
      endpoint_url: process.env.BUCKET_ENDPOINT || undefined,
      max_concurrent_uploads: 3
    };

    // Initialize S3 manager
    const s3Manager = new S3AssetManager(s3Config);

    // Determine S3 key based on file type
    let s3Key: string;
    let localFilename: string;

    switch (fileType) {
      case 'image_beat':
        const beatNum = beatIndex ? parseInt(beatIndex) + 1 : 1;
        localFilename = `beat_${beatNum}.png`;
        s3Key = `input/project-${projectId}/${localFilename}`;
        break;
      
      case 'video_beat':
        const videoBeatNum = beatIndex ? parseInt(beatIndex) + 1 : 1;
        localFilename = `beat_${videoBeatNum}.mp4`;
        s3Key = `input/project-${projectId}/${localFilename}`;
        break;
      
      case 'audio':
        localFilename = 'audio.wav';
        s3Key = `input/project-${projectId}/${localFilename}`;
        break;
      
      case 'metadata':
        localFilename = file.name;
        s3Key = `input/project-${projectId}/${localFilename}`;
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: `Invalid file type: ${fileType}`
        }, { status: 400 });
    }

    console.log(`📁 Uploading ${localFilename} to S3: ${s3Key}`);

    // Convert File to temporary local file for S3 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create temporary file
    const tempPath = `/tmp/${projectId}_${localFilename}`;
    await require('fs').promises.writeFile(tempPath, buffer);

    // Upload to S3 with progress tracking
    const uploadStartTime = Date.now();
    
    try {
      const checksum = await s3Manager.uploadFileWithRetry(
        tempPath,
        s3Key,
        (operationId, progress) => {
          // Log progress for debugging
          console.log(`Upload progress for ${localFilename}: ${progress.progress_percent?.toFixed(1) || 0}%`);
        }
      );

      const uploadTime = Date.now() - uploadStartTime;

      // Clean up temporary file
      await require('fs').promises.unlink(tempPath);

      console.log(`✅ Successfully uploaded ${localFilename} to S3 in ${uploadTime}ms`);

      // Return success response
      return NextResponse.json({
        success: true,
        s3Path: s3Key,
        s3Url: `s3://${s3Config.bucket_name}/${s3Key}`,
        fileInfo: {
          originalName: file.name,
          size: file.size,
          type: file.type,
          checksum: {
            md5: checksum.md5,
            sha256: checksum.sha256,
            size: checksum.size
          }
        },
        uploadTime: uploadTime,
        projectId: projectId
      });

    } catch (uploadError) {
      // Clean up temporary file on error
      try {
        await require('fs').promises.unlink(tempPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      
      throw uploadError;
    }

  } catch (error) {
    console.error('❌ S3 upload error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get presigned URLs for direct browser uploads (alternative approach)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const fileType = searchParams.get('fileType');
    const filename = searchParams.get('filename');

    if (!projectId || !fileType || !filename) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: projectId, fileType, filename'
      }, { status: 400 });
    }

    // Create S3 configuration
    const s3Config: S3Config = {
      bucket_name: process.env.BUCKET_NAME!,
      aws_access_key_id: process.env.BUCKET_ACCESS_KEY!,
      aws_secret_access_key: process.env.BUCKET_SECRET_KEY!,
      region: process.env.BUCKET_REGION || 'us-east-1',
      endpoint_url: process.env.BUCKET_ENDPOINT || undefined,
      max_concurrent_downloads: 5,
      max_concurrent_uploads: 3,
      multipart_threshold: 50 * 1024 * 1024, // 50MB
      multipart_chunksize: 10 * 1024 * 1024, // 10MB
      max_retries: 3,
      retry_backoff_base: 2,
      retry_backoff_jitter: true
    };

    // Generate S3 key
    const s3Key = `input/project-${projectId}/${filename}`;

    // This would require adding presigned URL generation to S3AssetManager
    // For now, return the upload endpoint info
    return NextResponse.json({
      success: true,
      uploadUrl: '/api/s3-upload',
      s3Key: s3Key,
      maxFileSize: getMaxFileSize(fileType),
      instructions: 'Use POST request with multipart/form-data to uploadUrl'
    });

  } catch (error) {
    console.error('❌ Presigned URL generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate upload URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getMaxFileSize(fileType: string): number {
  const maxSizes = {
    'video_beat': 50 * 1024 * 1024, // 50MB
    'image_beat': 10 * 1024 * 1024, // 10MB
    'audio': 10 * 1024 * 1024,      // 10MB
    'metadata': 1 * 1024 * 1024     // 1MB
  };
  return maxSizes[fileType as keyof typeof maxSizes] || 50 * 1024 * 1024;
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    // Quick S3 connectivity test
    const s3Config: S3Config = {
      bucket_name: process.env.BUCKET_NAME!,
      aws_access_key_id: process.env.BUCKET_ACCESS_KEY!,
      aws_secret_access_key: process.env.BUCKET_SECRET_KEY!,
      region: process.env.BUCKET_REGION || 'us-east-1',
      endpoint_url: process.env.BUCKET_ENDPOINT || undefined,
      max_concurrent_downloads: 5,
      max_concurrent_uploads: 3,
      multipart_threshold: 50 * 1024 * 1024, // 50MB
      multipart_chunksize: 10 * 1024 * 1024, // 10MB
      max_retries: 3,
      retry_backoff_base: 2,
      retry_backoff_jitter: true
    };

    const s3Manager = new S3AssetManager(s3Config);
    
    // This would require a lightweight connectivity test method
    // For now, just return OK if configuration is present
    const hasCredentials = s3Config.bucket_name && s3Config.aws_access_key_id && s3Config.aws_secret_access_key;
    
    return new NextResponse(null, { 
      status: hasCredentials ? 200 : 503,
      headers: {
        'X-S3-Status': hasCredentials ? 'configured' : 'not-configured'
      }
    });

  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}