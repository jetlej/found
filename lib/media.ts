import { Image, Video } from "react-native-compressor";
import { File } from "expo-file-system";

// Size limits (in bytes)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_VIDEO_DURATION = 60; // 60 seconds

// Max dimensions
const MAX_IMAGE_DIMENSION = 1440;
const IMAGE_QUALITY = 0.75;

/**
 * Get file size in bytes
 */
export async function getFileSize(uri: string): Promise<number> {
  try {
    const file = new File(uri);
    const size = await file.size();
    return size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Compress an image - resize to max dimension (preserving aspect ratio) and compress quality
 */
export async function compressImage(uri: string): Promise<string> {
  // Use react-native-compressor for images too - it preserves aspect ratio
  const result = await Image.compress(uri, {
    maxWidth: MAX_IMAGE_DIMENSION,
    maxHeight: MAX_IMAGE_DIMENSION,
    quality: IMAGE_QUALITY,
  });

  return result;
}

/**
 * Compress a video with optional progress callback
 */
export async function compressVideo(
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await Video.compress(
    uri,
    {
      compressionMethod: "auto",
      maxSize: 1080, // Max 1080p
      minimumFileSizeForCompress: 0, // Always compress
    },
    (progress) => {
      onProgress?.(progress);
    }
  );

  return result;
}

/**
 * Validate media size is within limits
 * Returns { valid: true } or { valid: false, error: string }
 */
export async function validateMediaSize(
  uri: string,
  type: "image" | "video"
): Promise<{ valid: boolean; error?: string; size?: number }> {
  const size = await getFileSize(uri);
  const maxSize = type === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  const maxSizeMB = maxSize / (1024 * 1024);

  if (size > maxSize) {
    const sizeMB = (size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB.`,
      size,
    };
  }

  return { valid: true, size };
}

/**
 * Process media item - compress and validate
 * Returns the processed URI or throws an error
 */
export async function processMediaItem(
  uri: string,
  type: "image" | "video",
  onProgress?: (progress: number) => void
): Promise<string> {
  let processedUri: string;

  if (type === "image") {
    processedUri = await compressImage(uri);
  } else {
    processedUri = await compressVideo(uri, onProgress);
  }

  // Validate the compressed file
  const validation = await validateMediaSize(processedUri, type);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return processedUri;
}

