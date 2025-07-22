'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageUploadOverride.module.css';

interface ImageUploadOverrideProps {
  expectedImageCount: number;
  onImagesUploaded: (images: File[]) => void;
  onImageRemoved: (index: number) => void;
  uploadedImages: (File | null)[];
  isUploading: boolean;
  uploadProgress: {
    uploaded: number;
    total: number;
  };
}

export default function ImageUploadOverride({
  expectedImageCount,
  onImagesUploaded,
  onImageRemoved,
  uploadedImages,
  isUploading,
  uploadProgress
}: ImageUploadOverrideProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return `Invalid file type: ${file.type}. Please use PNG, JPG, or WEBP.`;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 10MB.`;
    }

    return null;
  };

  const handleFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      alert(`Upload errors:\n${errors.join('\n')}`);
    }

    // Process valid files (up to expected count)
    if (validFiles.length > 0) {
      const filesToProcess = validFiles.slice(0, expectedImageCount);
      onImagesUploaded(filesToProcess);
    }
  }, [expectedImageCount, onImagesUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const getImagePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Upload Images</h3>
        <p>Upload {expectedImageCount} images to override AI generation</p>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className={styles.uploadProgress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            Uploading {uploadProgress.uploaded}/{uploadProgress.total} images...
          </span>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleInputChange}
          className={styles.hiddenInput}
        />
        
        <div className={styles.dropContent}>
          <div className={styles.uploadIcon}>📁</div>
          <p className={styles.dropText}>
            Drag and drop images here, or{' '}
            <button 
              type="button" 
              onClick={handleButtonClick}
              className={styles.browseButton}
              disabled={isUploading}
            >
              browse files
            </button>
          </p>
          <p className={styles.dropSubtext}>
            PNG, JPG, WEBP (max 10MB each)
          </p>
        </div>
      </div>

      {/* Image Grid */}
      <div className={styles.imagesGrid}>
        {Array.from({ length: expectedImageCount }, (_, index) => {
          const uploadedFile = uploadedImages[index];
          
          return (
            <div key={index} className={styles.imageSlot}>
              <div className={styles.slotHeader}>
                <span className={styles.slotNumber}>Image {index + 1}</span>
                {uploadedFile && (
                  <button
                    type="button"
                    onClick={() => onImageRemoved(index)}
                    className={styles.removeButton}
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className={styles.imageContainer}>
                {uploadedFile ? (
                  <>
                    <Image
                      src={getImagePreview(uploadedFile)}
                      alt={`Upload preview ${index + 1}`}
                      className={styles.previewImage}
                      width={300}
                      height={200}
                      style={{ objectFit: 'cover' }}
                    />
                    <div className={styles.imageInfo}>
                      <span className={styles.fileName}>{uploadedFile.name}</span>
                      <span className={styles.fileSize}>
                        {(uploadedFile.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptySlot}>
                    <div className={styles.emptyIcon}>🖼️</div>
                    <p className={styles.emptyText}>No image uploaded</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Summary */}
      <div className={styles.uploadSummary}>
        <span className={styles.summaryText}>
          {uploadedImages.filter(img => img !== null).length} of {expectedImageCount} images uploaded
        </span>
        {uploadedImages.filter(img => img !== null).length === expectedImageCount && (
          <span className={styles.completeBadge}>✅ Ready</span>
        )}
      </div>
    </div>
  );
}