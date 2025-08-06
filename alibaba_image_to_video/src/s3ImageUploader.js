const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Import VinVideo_Connected S3Manager - with fallback for compatibility issues
let S3AssetManager = null;
let useNativeS3 = false;

try {
  S3AssetManager = require('../../VinVideo_Connected/src/utils/s3Manager.ts').S3AssetManager;
  console.log('✅ Using VinVideo_Connected S3AssetManager');
} catch (error) {
  console.warn('⚠️ Failed to import VinVideo_Connected S3Manager:', error.message);
  console.log('🔄 Will attempt to use native AWS SDK fallback');
  useNativeS3 = true;
  
  // Try to use native AWS SDK as fallback
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const { Upload } = require('@aws-sdk/lib-storage');
    
    // Create minimal S3AssetManager-compatible interface
    class SimpleS3Manager {
      constructor(config) {
        this.config = config;
        this.s3Client = new S3Client({
          region: config.region,
          credentials: {
            accessKeyId: config.aws_access_key_id,
            secretAccessKey: config.aws_secret_access_key
          },
          endpoint: config.endpoint_url
        });
      }
      
      async uploadFileWithRetry(localPath, s3Key, progressCallback) {
        const fs = require('fs').promises;
        const fileContent = await fs.readFile(localPath);
        const crypto = require('crypto');
        
        const command = new PutObjectCommand({
          Bucket: this.config.bucket_name,
          Key: s3Key,
          Body: fileContent,
          ContentType: this.getContentType(localPath),
          // Try setting bucket-owner-full-control to work with bucket policy
          Metadata: {
            'public-read': 'true'
          }
        });
        
        await this.s3Client.send(command);
        
        // Return checksum
        const md5Hash = crypto.createHash('md5').update(fileContent).digest('hex');
        const sha256Hash = crypto.createHash('sha256').update(fileContent).digest('hex');
        
        return {
          md5: md5Hash,
          sha256: sha256Hash,
          size: fileContent.length
        };
      }
      
      async listS3Objects(prefix) {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket_name,
          Prefix: prefix,
          MaxKeys: 100
        });
        
        const response = await this.s3Client.send(command);
        return response.Contents || [];
      }
      
      getContentType(filePath) {
        const path = require('path');
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp'
        };
        return contentTypes[ext] || 'application/octet-stream';
      }
    }
    
    S3AssetManager = SimpleS3Manager;
    console.log('✅ Using native AWS SDK fallback');
    
  } catch (awsError) {
    console.error('❌ AWS SDK also unavailable:', awsError.message);
    S3AssetManager = null;
  }
}

/**
 * Enhanced S3 Image Uploader for Alibaba API Integration
 * Adapts VinVideo_Connected S3Manager patterns with validation and monitoring
 */
class S3ImageUploader {
  constructor() {
    this.validateEnvironment();
    this.initializeS3Manager();
    this.stats = {
      uploadsCount: 0,
      totalUploadTime: 0,
      totalUploadSize: 0,
      errors: []
    };
  }

  /**
   * Validate environment variables and S3 configuration
   */
  validateEnvironment() {
    const requiredEnvVars = [
      { key: 'BUCKET_NAME', alt: 'S3_BUCKET_NAME' },
      { key: 'BUCKET_ACCESS_KEY', alt: 'AWS_ACCESS_KEY_ID' },
      { key: 'BUCKET_SECRET_KEY', alt: 'AWS_SECRET_ACCESS_KEY' }
    ];

    this.s3Config = {};
    const missingVars = [];

    for (const { key, alt } of requiredEnvVars) {
      const value = process.env[key] || process.env[alt];
      if (!value) {
        missingVars.push(`${key} (or ${alt})`);
      } else {
        this.s3Config[key.toLowerCase()] = value;
      }
    }

    if (missingVars.length > 0) {
      throw new Error(`❌ Missing required S3 environment variables: ${missingVars.join(', ')}`);
    }

    // Set additional config with defaults
    this.s3Config = {
      bucket_name: this.s3Config.bucket_name,
      aws_access_key_id: this.s3Config.bucket_access_key,
      aws_secret_access_key: this.s3Config.bucket_secret_key,
      region: process.env.BUCKET_REGION || process.env.AWS_REGION || 'us-east-1',
      endpoint_url: process.env.BUCKET_ENDPOINT,
      max_concurrent_uploads: 3,
      multipart_threshold: 10 * 1024 * 1024, // 10MB
      multipart_chunksize: 5 * 1024 * 1024,  // 5MB
      max_retries: 3,
      retry_backoff_base: 2.0,
      retry_backoff_jitter: true
    };

    console.log(`✅ S3 configuration validated for bucket: ${this.s3Config.bucket_name}`);
  }

  /**
   * Initialize S3 manager with validated configuration
   */
  initializeS3Manager() {
    if (!S3AssetManager) {
      console.warn('⚠️ S3AssetManager not available - S3 uploads will be disabled');
      this.s3Manager = null;
      return;
    }
    
    try {
      if (useNativeS3) {
        this.s3Manager = new S3AssetManager(this.s3Config);
      } else {
        this.s3Manager = new S3AssetManager(this.s3Config, '/tmp/alibaba_uploads');
      }
      console.log('✅ S3AssetManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize S3AssetManager:', error.message);
      console.warn('⚠️ S3 uploads will be disabled');
      this.s3Manager = null;
    }
  }

  /**
   * Validate image file before upload
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<object>} Validation result with file info
   */
  async validateImage(imagePath) {
    try {
      // Check if file exists
      const stats = await fs.stat(imagePath);
      const fileSize = stats.size;
      
      // Check file size (Alibaba API limit: ~10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB (max: 10MB)`);
      }

      // Check file extension
      const ext = path.extname(imagePath).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!allowedExts.includes(ext)) {
        throw new Error(`Unsupported format: ${ext} (allowed: ${allowedExts.join(', ')})`);
      }

      // Basic aspect ratio validation (optional - commented out as it requires image processing)
      // const { width, height } = await this.getImageDimensions(imagePath);
      // const aspectRatio = width / height;
      // const target169 = 16 / 9;
      // if (Math.abs(aspectRatio - target169) > 0.1) {
      //   console.warn(`⚠️ Aspect ratio ${aspectRatio.toFixed(2)} may not be optimal for 16:9 (${target169.toFixed(2)})`);
      // }

      return {
        valid: true,
        size: fileSize,
        extension: ext,
        sizeFormatted: `${(fileSize / 1024 / 1024).toFixed(2)}MB`
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate unique S3 key for image upload
   * @param {string} imageId - Unique identifier for the image
   * @param {string} originalPath - Original file path
   * @returns {string} S3 key
   */
  generateS3Key(imageId, originalPath) {
    const timestamp = Date.now();
    const ext = path.extname(originalPath);
    return `alibaba-images/${imageId}_${timestamp}${ext}`;
  }

  /**
   * Generate public S3 URL from key
   * Falls back to signed URL if public access fails
   * @param {string} s3Key - S3 object key
   * @returns {string} Public or signed URL
   */
  generatePublicUrl(s3Key) {
    if (this.s3Config.endpoint_url) {
      // Custom endpoint (like DigitalOcean Spaces)
      return `${this.s3Config.endpoint_url}/${this.s3Config.bucket_name}/${s3Key}`;
    } else {
      // Standard AWS S3
      return `https://${this.s3Config.bucket_name}.s3.${this.s3Config.region}.amazonaws.com/${s3Key}`;
    }
  }

  /**
   * Generate signed URL for private bucket access
   * @param {string} s3Key - S3 object key
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async generateSignedUrl(s3Key, expiresIn = 3600) {
    try {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new GetObjectCommand({
        Bucket: this.s3Config.bucket_name,
        Key: s3Key
      });

      const signedUrl = await getSignedUrl(this.s3Manager.s3Client, command, { 
        expiresIn: expiresIn 
      });
      
      return signedUrl;
    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error.message);
      // Fallback to public URL
      return this.generatePublicUrl(s3Key);
    }
  }

  /**
   * Test if S3 URL is publicly accessible
   * @param {string} url - URL to test
   * @returns {Promise<boolean>} True if accessible
   */
  async testUrlAccessibility(url) {
    try {
      const response = await axios.head(url, { 
        timeout: 10000,
        validateStatus: (status) => status === 200
      });
      return response.status === 200;
    } catch (error) {
      console.warn(`⚠️ URL accessibility test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Upload single image to S3 with comprehensive validation and monitoring
   * @param {string} localImagePath - Path to local image file
   * @param {string} imageId - Unique identifier for the image
   * @returns {Promise<object>} Upload result with URL and metadata
   */
  async uploadImage(localImagePath, imageId) {
    const uploadStartTime = Date.now();
    
    try {
      console.log(`📤 Starting S3 upload for ${imageId}: ${path.basename(localImagePath)}`);

      // Check if S3 is available
      if (!this.s3Manager) {
        throw new Error('S3 manager not available - uploads disabled');
      }

      // Phase 1: Image validation
      const validation = await this.validateImage(localImagePath);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.error}`);
      }
      
      console.log(`   ✅ Image validated: ${validation.sizeFormatted}, ${validation.extension}`);

      // Phase 2: Generate S3 key and upload
      const s3Key = this.generateS3Key(imageId, localImagePath);
      
      console.log(`   📁 Uploading to S3: ${s3Key}`);
      
      const checksum = await this.s3Manager.uploadFileWithRetry(
        localImagePath,
        s3Key,
        (operationId, progress) => {
          if (progress && progress.progress_percent && progress.progress_percent % 25 < 1) {
            console.log(`   📊 Upload progress: ${progress.progress_percent.toFixed(1)}% (${progress.transfer_rate_mbps.toFixed(2)} MB/s)`);
          }
        }
      );

      // Phase 3: Generate and test URL access
      let finalUrl = this.generatePublicUrl(s3Key);
      let urlType = 'public';
      
      console.log(`   🌐 Testing public URL: ${finalUrl.substring(0, 60)}...`);
      
      // Test URL accessibility (with timeout)
      const isAccessible = await this.testUrlAccessibility(finalUrl);
      
      if (!isAccessible) {
        console.warn(`   🔒 Public URL not accessible (403 Forbidden)`);
        console.log(`   🔑 Generating signed URL for private bucket access...`);
        
        try {
          finalUrl = await this.generateSignedUrl(s3Key, 7200); // 2 hours expiration
          urlType = 'signed';
          console.log(`   ✅ Signed URL generated: ${finalUrl.substring(0, 60)}...`);
          
          // Test signed URL accessibility
          const signedAccessible = await this.testUrlAccessibility(finalUrl);
          if (signedAccessible) {
            console.log(`   🎯 Signed URL is accessible by external services`);
          } else {
            console.warn(`   ⚠️ Signed URL may have access restrictions`);
          }
        } catch (error) {
          console.error(`   ❌ Failed to generate signed URL: ${error.message}`);
          console.log(`   🔄 Using public URL anyway (may work for Alibaba)`);
        }
      } else {
        console.log(`   ✅ Public URL is accessible`);
      }

      // Phase 4: Update statistics
      const uploadTime = Date.now() - uploadStartTime;
      this.updateStats(validation.size, uploadTime, null);

      console.log(`   🏁 Upload completed in ${uploadTime}ms`);
      console.log(`   📋 MD5: ${checksum.md5.substring(0, 8)}...`);
      console.log(`   🔗 URL Type: ${urlType}`);

      return {
        success: true,
        imageId: imageId,
        s3Key: s3Key,
        publicUrl: finalUrl,
        urlType: urlType,
        uploadTime: uploadTime,
        fileSize: validation.size,
        checksum: checksum,
        accessible: isAccessible || urlType === 'signed'
      };

    } catch (error) {
      const uploadTime = Date.now() - uploadStartTime;
      this.updateStats(0, uploadTime, error.message);
      
      console.error(`   ❌ Upload failed after ${uploadTime}ms: ${error.message}`);
      
      return {
        success: false,
        imageId: imageId,
        error: error.message,
        uploadTime: uploadTime
      };
    }
  }

  /**
   * Upload multiple images in parallel with comprehensive monitoring
   * @param {Array} imageList - Array of {path, id} objects
   * @returns {Promise<object>} Batch upload results with statistics
   */
  async uploadImageBatch(imageList) {
    console.log(`🚀 Starting batch upload of ${imageList.length} images`);
    const batchStartTime = Date.now();
    
    const uploadPromises = imageList.map(image => this.uploadImage(image.path, image.id));
    const results = await Promise.all(uploadPromises);
    
    const batchTime = Date.now() - batchStartTime;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`📊 Batch upload completed in ${batchTime}ms:`);
    console.log(`   ✅ Successful: ${successful.length}/${imageList.length}`);
    console.log(`   ❌ Failed: ${failed.length}/${imageList.length}`);
    
    if (successful.length > 0) {
      console.log(`\n🎯 Successfully uploaded images:`);
      successful.forEach(result => {
        console.log(`   ${result.imageId}: ${result.publicUrl}`);
      });
    }
    
    if (failed.length > 0) {
      console.log(`\n💥 Failed uploads:`);
      failed.forEach(result => {
        console.log(`   ${result.imageId}: ${result.error}`);
      });
    }

    return {
      success: successful.length > 0,
      total: imageList.length,
      successful: successful.length,
      failed: failed.length,
      results: results,
      batchTime: batchTime,
      statistics: this.getStatistics()
    };
  }

  /**
   * Update internal statistics
   * @param {number} fileSize - Size of uploaded file
   * @param {number} uploadTime - Time taken for upload
   * @param {string} error - Error message if failed
   */
  updateStats(fileSize, uploadTime, error) {
    this.stats.uploadsCount++;
    this.stats.totalUploadTime += uploadTime;
    
    if (!error) {
      this.stats.totalUploadSize += fileSize;
    } else {
      this.stats.errors.push({
        timestamp: new Date().toISOString(),
        error: error,
        uploadTime: uploadTime
      });
    }
  }

  /**
   * Get upload statistics and performance metrics
   * @returns {object} Statistics object
   */
  getStatistics() {
    const avgUploadTime = this.stats.uploadsCount > 0 
      ? (this.stats.totalUploadTime / this.stats.uploadsCount).toFixed(2)
      : 0;
    
    const avgUploadSize = this.stats.uploadsCount > 0
      ? (this.stats.totalUploadSize / this.stats.uploadsCount / 1024 / 1024).toFixed(2)
      : 0;

    return {
      totalUploads: this.stats.uploadsCount,
      totalSize: `${(this.stats.totalUploadSize / 1024 / 1024).toFixed(2)}MB`,
      totalTime: `${(this.stats.totalUploadTime / 1000).toFixed(2)}s`,
      averageUploadTime: `${avgUploadTime}ms`,
      averageFileSize: `${avgUploadSize}MB`,
      errorCount: this.stats.errors.length,
      successRate: this.stats.uploadsCount > 0 
        ? `${(((this.stats.uploadsCount - this.stats.errors.length) / this.stats.uploadsCount) * 100).toFixed(1)}%`
        : '0%'
    };
  }

  /**
   * Test S3 connectivity
   * @returns {Promise<boolean>} True if S3 is accessible
   */
  async testConnectivity() {
    if (!this.s3Manager) {
      console.warn('⚠️ S3 manager not available');
      return false;
    }
    
    try {
      await this.s3Manager.listS3Objects('alibaba-images/');
      console.log('✅ S3 connectivity test passed');
      return true;
    } catch (error) {
      console.error('❌ S3 connectivity test failed:', error.message);
      return false;
    }
  }

  /**
   * Clean up old images from S3 (utility method)
   * @param {number} maxAgeHours - Delete images older than this many hours
   */
  async cleanupOldImages(maxAgeHours = 24) {
    if (!this.s3Manager) {
      console.warn('⚠️ S3 manager not available for cleanup');
      return 0;
    }
    
    try {
      console.log(`🧹 Starting cleanup of images older than ${maxAgeHours} hours`);
      const objects = await this.s3Manager.listS3Objects('alibaba-images/');
      
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let deletedCount = 0;
      
      for (const obj of objects) {
        if (obj.LastModified && obj.LastModified.getTime() < cutoffTime) {
          // Note: Would need to implement delete functionality in S3Manager
          // For now, just count what would be deleted
          deletedCount++;
        }
      }
      
      console.log(`📊 Found ${deletedCount} images eligible for cleanup (implementation needed)`);
      return deletedCount;
      
    } catch (error) {
      console.warn(`⚠️ Cleanup scan failed:`, error.message);
      return 0;
    }
  }
}

module.exports = S3ImageUploader;