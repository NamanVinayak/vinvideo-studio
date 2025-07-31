/**
 * VinVideo S3 Asset Manager - TypeScript Implementation
 * Converted from Python version with parallel downloads, retry logic, and progress tracking
 * Handles S3 download/upload operations integrated with VinVideo Asset Management
 */

import { S3Client, S3ClientConfig, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Configuration interfaces
export interface S3Config {
  bucket_name: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  region: string;
  endpoint_url?: string;
  max_concurrent_downloads: number;
  max_concurrent_uploads: number;
  multipart_threshold: number;
  multipart_chunksize: number;
  max_retries: number;
  retry_backoff_base: number;
  retry_backoff_jitter: boolean;
}

// Progress tracking interface
export interface TransferProgress {
  total_bytes: number;
  transferred_bytes: number;
  start_time: number;
  progress_percent: number;
  transfer_rate_mbps: number;
}

// File checksum interface
export interface FileChecksum {
  md5: string;
  sha256: string;
  size: number;
}

// Project assets container
export interface ProjectAssets {
  project_id: string;
  video_beats: string[]; // List of beat video/image file paths
  audio_file?: string;
  transcription_file?: string;
  agent_outputs: Record<string, string>; // agent_name -> output_file_path
  metadata: Record<string, any>;
  checksums: Record<string, FileChecksum>;
}

// Default S3 configuration
const DEFAULT_S3_CONFIG: Partial<S3Config> = {
  region: 'us-east-1',
  max_concurrent_downloads: 10,
  max_concurrent_uploads: 5,
  multipart_threshold: 100 * 1024 * 1024, // 100MB
  multipart_chunksize: 8 * 1024 * 1024, // 8MB
  max_retries: 5,
  retry_backoff_base: 2.0,
  retry_backoff_jitter: true
};

export class S3AssetManager {
  private config: S3Config;
  private s3Client: S3Client;
  private localTempDir: string;

  constructor(config: Partial<S3Config>, localTempDir: string = '/tmp/vinvideo') {
    this.config = { ...DEFAULT_S3_CONFIG, ...config } as S3Config;
    this.localTempDir = localTempDir;

    // Initialize S3 client
    const s3ClientConfig: S3ClientConfig = {
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      }
    };

    if (this.config.endpoint_url) {
      s3ClientConfig.endpoint = this.config.endpoint_url;
    }

    this.s3Client = new S3Client(s3ClientConfig);

    // Ensure temp directory exists
    this.ensureDirectoryExists(this.localTempDir).catch(console.error);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
    }
  }

  private async calculateFileChecksum(filePath: string): Promise<FileChecksum> {
    const fileBuffer = await fs.readFile(filePath);
    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      md5: md5Hash,
      sha256: sha256Hash,
      size: fileBuffer.length
    };
  }

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.max_retries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain error types
        if (error instanceof Error && 
            (error.name === 'NoSuchKey' || error.name === 'AccessDenied')) {
          throw error;
        }

        if (attempt === retries) {
          console.error(`❌ ${operationName} failed after ${retries + 1} attempts`);
          throw lastError;
        }

        // Calculate backoff delay
        const baseDelay = Math.pow(this.config.retry_backoff_base, attempt) * 1000;
        const jitter = this.config.retry_backoff_jitter 
          ? Math.random() * 0.3 * baseDelay 
          : 0;
        const delay = baseDelay + jitter;

        console.warn(`⚠️ ${operationName} attempt ${attempt + 1} failed: ${lastError?.message}. Retrying in ${delay.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async downloadProjectAssets(
    projectId: string,
    progressCallback?: (operationId: string, progress: TransferProgress) => void
  ): Promise<ProjectAssets> {
    console.log(`📥 Starting parallel download for project: ${projectId}`);

    try {
      // Define S3 paths
      const s3Prefix = `input/project-${projectId}/`;

      // List all objects in project directory
      const objects = await this.listS3Objects(s3Prefix);

      if (objects.length === 0) {
        throw new Error(`No assets found for project ${projectId}`);
      }

      // Create local project directory
      const localProjectDir = path.join(this.localTempDir, `project-${projectId}`);
      await this.ensureDirectoryExists(localProjectDir);

      // Download all files in parallel with controlled concurrency
      const downloadPromises = objects.map(async (obj, index) => {
        const s3Key = obj.Key!;
        const localPath = path.join(localProjectDir, path.basename(s3Key));
        const fileSize = obj.Size || 0;

        return this.downloadFileWithRetry(s3Key, localPath, fileSize, progressCallback);
      });

      console.log(`🚀 Starting ${downloadPromises.length} concurrent downloads`);
      const startTime = Date.now();

      // Execute downloads with controlled concurrency
      const downloadResults = await this.executeConcurrentOperations(
        downloadPromises,
        this.config.max_concurrent_downloads
      );

      const elapsedTime = (Date.now() - startTime) / 1000;
      console.log(`⚡ Completed all downloads in ${elapsedTime.toFixed(2)}s`);

      // Categorize downloaded files
      const projectAssets = await this.categorizeDownloadedFiles(
        projectId,
        objects,
        localProjectDir,
        downloadResults as FileChecksum[]
      );

      console.log(`✅ Successfully downloaded ${projectAssets.video_beats.length} assets`);
      return projectAssets;

    } catch (error) {
      console.error(`❌ Error downloading project assets: ${error}`);
      throw error;
    }
  }

  private async downloadFileWithRetry(
    s3Key: string,
    localPath: string,
    fileSize: number,
    progressCallback?: (operationId: string, progress: TransferProgress) => void
  ): Promise<FileChecksum> {
    const operationId = `download_${s3Key}`;

    return this.retryWithExponentialBackoff(async () => {
      const startTime = Date.now();

      try {
        const command = new GetObjectCommand({
          Bucket: this.config.bucket_name,
          Key: s3Key
        });

        const response = await this.s3Client.send(command);
        
        if (!response.Body) {
          throw new Error(`No body in S3 response for ${s3Key}`);
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const reader = response.Body.transformToWebStream().getReader();

        let transferredBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          transferredBytes += value.length;

          // Report progress
          if (progressCallback) {
            const progress: TransferProgress = {
              total_bytes: fileSize,
              transferred_bytes: transferredBytes,
              start_time: startTime,
              progress_percent: fileSize > 0 ? (transferredBytes / fileSize) * 100 : 0,
              transfer_rate_mbps: this.calculateTransferRate(transferredBytes, startTime)
            };
            progressCallback(operationId, progress);
          }
        }

        // Combine chunks and write to file
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const fileBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          fileBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        await fs.writeFile(localPath, fileBuffer);
        console.log(`📥 Downloaded: ${s3Key} -> ${path.basename(localPath)}`);

        // Calculate and return checksum
        return await this.calculateFileChecksum(localPath);

      } catch (error) {
        console.error(`Error downloading ${s3Key}:`, error);
        throw error;
      }
    }, `Download ${s3Key}`);
  }

  private calculateTransferRate(bytesTransferred: number, startTime: number): number {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds === 0) return 0;
    return (bytesTransferred / elapsedSeconds) / (1024 * 1024); // MB/s
  }

  async uploadFileWithRetry(
    localPath: string,
    s3Key: string,
    progressCallback?: (operationId: string, progress: TransferProgress) => void
  ): Promise<FileChecksum> {
    const operationId = `upload_${s3Key}`;

    return this.retryWithExponentialBackoff(async () => {
      const startTime = Date.now();
      
      try {
        // Get file info
        const stats = await fs.stat(localPath);
        const fileSize = stats.size;

        // Calculate checksum before upload
        const checksum = await this.calculateFileChecksum(localPath);

        // Read file
        const fileContent = await fs.readFile(localPath);

        // Determine content type
        const contentType = this.getContentType(localPath);

        if (fileSize >= this.config.multipart_threshold) {
          // Use multipart upload for large files
          console.log(`🔄 Using multipart upload for ${s3Key} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

          const upload = new Upload({
            client: this.s3Client,
            params: {
              Bucket: this.config.bucket_name,
              Key: s3Key,
              Body: fileContent,
              ContentType: contentType
            },
            partSize: this.config.multipart_chunksize,
            queueSize: 4
          });

          // Track progress
          upload.on('httpUploadProgress', (progress) => {
            if (progressCallback && progress.loaded && progress.total) {
              const transferProgress: TransferProgress = {
                total_bytes: progress.total,
                transferred_bytes: progress.loaded,
                start_time: startTime,
                progress_percent: (progress.loaded / progress.total) * 100,
                transfer_rate_mbps: this.calculateTransferRate(progress.loaded, startTime)
              };
              progressCallback(operationId, transferProgress);
            }
          });

          await upload.done();
        } else {
          // Standard upload for smaller files
          const command = new PutObjectCommand({
            Bucket: this.config.bucket_name,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
          });

          await this.s3Client.send(command);
        }

        console.log(`📤 Uploaded: ${path.basename(localPath)} -> ${s3Key}`);
        return checksum;

      } catch (error) {
        console.error(`Error uploading ${localPath}:`, error);
        throw error;
      }
    }, `Upload ${s3Key}`);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.json': 'application/json',
      '.txt': 'text/plain'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  async listS3Objects(prefix: string): Promise<any[]> {
    return this.retryWithExponentialBackoff(async () => {
      const objects: any[] = [];
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket_name,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken
        });

        const response = await this.s3Client.send(command);
        if (response.Contents) {
          objects.push(...response.Contents);
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return objects;
    }, `List objects with prefix ${prefix}`);
  }

  private async categorizeDownloadedFiles(
    projectId: string,
    objects: any[],
    localProjectDir: string,
    checksums: FileChecksum[]
  ): Promise<ProjectAssets> {
    const videoBeats: string[] = [];
    let audioFile: string | undefined;
    let transcriptionFile: string | undefined;
    const agentOutputs: Record<string, string> = {};
    const fileChecksums: Record<string, FileChecksum> = {};

    for (let i = 0; i < objects.length; i++) {
      const s3Key = objects[i].Key!;
      const filename = path.basename(s3Key);
      const localPath = path.join(localProjectDir, filename);
      
      // Store checksum
      fileChecksums[localPath] = checksums[i];

      // Categorize files
      if (filename.startsWith('beat_') && 
          (filename.endsWith('.mp4') || filename.endsWith('.png') || 
           filename.endsWith('.jpg') || filename.endsWith('.jpeg'))) {
        videoBeats.push(localPath);
      } else if (filename === 'audio.wav') {
        audioFile = localPath;
      } else if (filename === 'transcription.json') {
        transcriptionFile = localPath;
      } else if (filename.endsWith('.json')) {
        const agentName = filename.replace('.json', '');
        agentOutputs[agentName] = localPath;
      }
    }

    // Sort video beats numerically
    videoBeats.sort((a, b) => {
      const aNum = parseInt(path.basename(a).split('_')[1]) || 0;
      const bNum = parseInt(path.basename(b).split('_')[1]) || 0;
      return aNum - bNum;
    });

    const metadata = {
      project_id: projectId,
      downloaded_at: Date.now(),
      total_assets: objects.length,
      total_size_bytes: objects.reduce((sum, obj) => sum + (obj.Size || 0), 0),
      asset_types: {
        video_beats: videoBeats.length,
        has_audio: !!audioFile,
        agent_outputs: Object.keys(agentOutputs).length
      }
    };

    return {
      project_id: projectId,
      video_beats: videoBeats,
      audio_file: audioFile,
      transcription_file: transcriptionFile,
      agent_outputs: agentOutputs,
      metadata,
      checksums: fileChecksums
    };
  }

  private async executeConcurrentOperations<T>(
    operations: Promise<T>[],
    maxConcurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < operations.length; i++) {
      const promise = operations[i].then(result => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency || i === operations.length - 1) {
        await Promise.all(executing);
        executing.length = 0;
      }
    }

    return results;
  }

  async cleanupTempFiles(projectId: string): Promise<void> {
    try {
      const projectDir = path.join(this.localTempDir, `project-${projectId}`);
      
      // Remove directory recursively
      await fs.rm(projectDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up temporary files for project ${projectId}`);
    } catch (error) {
      console.warn(`⚠️ Error cleaning up temp files: ${error}`);
    }
  }

  async uploadFinalVideo(
    projectId: string,
    videoPath: string,
    metadata: Record<string, any>,
    progressCallback?: (operationId: string, progress: TransferProgress) => void
  ): Promise<string> {
    console.log(`📤 Starting upload for project: ${projectId}`);

    try {
      // Define S3 destination
      const s3Key = `output/project-${projectId}/final_video.mp4`;

      // Upload video file
      const checksum = await this.uploadFileWithRetry(videoPath, s3Key, progressCallback);

      // Upload metadata
      const metadataKey = `output/project-${projectId}/metadata.json`;
      const enhancedMetadata = {
        ...metadata,
        uploaded_at: Date.now(),
        video_checksum: checksum
      };

      const metadataPath = path.join(path.dirname(videoPath), 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(enhancedMetadata, null, 2));
      await this.uploadFileWithRetry(metadataPath, metadataKey, progressCallback);

      const s3Url = `s3://${this.config.bucket_name}/${s3Key}`;
      console.log(`✅ Successfully uploaded final video: ${s3Url}`);
      return s3Url;

    } catch (error) {
      console.error(`❌ Error uploading final video: ${error}`);
      throw error;
    }
  }
}

// Factory function to create S3 manager with environment variables
export function createS3Manager(): S3AssetManager {
  const config: Partial<S3Config> = {
    bucket_name: process.env.BUCKET_NAME || process.env.S3_BUCKET_NAME!,
    aws_access_key_id: process.env.BUCKET_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID!,
    aws_secret_access_key: process.env.BUCKET_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.BUCKET_REGION || process.env.AWS_REGION || 'us-east-1'
  };

  return new S3AssetManager(config);
}

// Utility function for VinVideo integration with standardized naming
export async function uploadVinVideoAssets(
  projectId: string,
  sessionDir: string,
  agentOutputs?: Record<string, any>
): Promise<string[]> {
  const s3Manager = createS3Manager();
  const uploadedPaths: string[] = [];

  try {
    console.log(`📁 Scanning session directory: ${sessionDir}`);
    const sessionFiles = await fs.readdir(sessionDir);
    
    // Upload generated images (now using standardized beat_N.png naming)
    const imageFiles = sessionFiles.filter(file => /^beat_\d+\.png$/.test(file));
    for (const imageFile of imageFiles) {
      const localPath = path.join(sessionDir, imageFile);
      const s3Key = `input/project-${projectId}/${imageFile}`; // Direct copy - no name conversion needed
      
      await s3Manager.uploadFileWithRetry(localPath, s3Key);
      uploadedPaths.push(`s3://${process.env.BUCKET_NAME}/${s3Key}`);
      console.log(`📤 Uploaded image: ${imageFile}`);
    }
    
    // Upload audio file (now using standardized audio.wav naming)
    const audioFile = sessionFiles.find(file => file === 'audio.wav');
    if (audioFile) {
      const localPath = path.join(sessionDir, audioFile);
      const s3Key = `input/project-${projectId}/${audioFile}`; // Direct copy - no name conversion needed
      
      await s3Manager.uploadFileWithRetry(localPath, s3Key);
      uploadedPaths.push(`s3://${process.env.BUCKET_NAME}/${s3Key}`);
      console.log(`📤 Uploaded audio: ${audioFile}`);
    }
    
    // Upload transcription file (now using standardized transcription.json naming)
    const transcriptionFile = sessionFiles.find(file => file === 'transcription.json');
    if (transcriptionFile) {
      const localPath = path.join(sessionDir, transcriptionFile);
      const s3Key = `input/project-${projectId}/${transcriptionFile}`; // Direct copy - no name conversion needed
      
      await s3Manager.uploadFileWithRetry(localPath, s3Key);
      uploadedPaths.push(`s3://${process.env.BUCKET_NAME}/${s3Key}`);
      console.log(`📤 Uploaded transcription: ${transcriptionFile}`);
    }

    // Upload agent outputs if provided (save to session folder first, then upload with standard names)
    if (agentOutputs) {
      const agentNameMapping: Record<string, string> = {
        'producer_agent': 'producer.json',
        'director_agent': 'director.json', 
        'dop_agent': 'dop.json',
        'prompt_engineer_agent': 'prompt_engineer.json',
        'vision_agent': 'vision.json'
      };
      
      for (const [agentName, output] of Object.entries(agentOutputs)) {
        const standardName = agentNameMapping[agentName] || `${agentName}.json`;
        const localPath = path.join(sessionDir, standardName);
        const s3Key = `input/project-${projectId}/${standardName}`;
        
        // Save agent output to session folder with standard name
        await fs.writeFile(localPath, JSON.stringify(output, null, 2));
        
        // Upload to S3
        await s3Manager.uploadFileWithRetry(localPath, s3Key);
        uploadedPaths.push(`s3://${process.env.BUCKET_NAME}/${s3Key}`);
        console.log(`📤 Uploaded agent output: ${standardName}`);
      }
    }

    console.log(`✅ Successfully uploaded ${uploadedPaths.length} assets for project ${projectId}`);
    return uploadedPaths;

  } catch (error) {
    console.error(`❌ Error uploading VinVideo assets: ${error}`);
    throw error;
  }
}