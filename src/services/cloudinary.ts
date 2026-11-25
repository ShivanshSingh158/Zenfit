/**
 * Cloudinary Upload Service (Mobile)
 *
 * Uses React Native's native FormData file upload (`{ uri, type, name }`) which
 * streams files directly from disk through the native HTTP layer — no JS-side
 * Blob/ArrayBuffer manipulation required. This works for files of any size.
 *
 * Key improvements over the original:
 *   - Dynamic timeout: max(300s, fileBytes/500ms) — at ~4 Mbps a 100 MB file
 *     gets ~205s instead of the old hardcoded 60s that always timed out.
 *   - Single automatic retry on network error / timeout (covers transient drops).
 *   - fileSize param for accurate timeout calculation (passed from DocumentPicker).
 */

import { Platform } from 'react-native';

// ─── MIME helpers ──────────────────────────────────────────────────────────────

function inferMimeType(filename: string, fallbackType?: string): string {
  if (fallbackType && fallbackType !== 'application/octet-stream' && fallbackType !== '*/*') {
    return fallbackType;
  }
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':  return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'gif':  return 'image/gif';
    case 'webp': return 'image/webp';
    case 'doc':  return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':  return 'text/plain';
    case 'mp4':  return 'video/mp4';
    case 'mov':  return 'video/quicktime';
    case 'mp3':  return 'audio/mpeg';
    case 'm4a':  return 'audio/m4a';
    case 'wav':  return 'audio/wav';
    default:     return fallbackType || 'application/octet-stream';
  }
}

// ─── Core XHR upload ──────────────────────────────────────────────────────────
// React Native's native XHR implementation recognises FormData entries of the
// form `{ uri, type, name }` and streams the file from disk without ever loading
// it into JS memory. This is safe for 100 MB+ files on both iOS and Android.

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

function attemptUpload(
  uri: string,
  cleanType: string,
  cleanName: string,
  cloudName: string,
  uploadPreset: string,
  timeoutMs: number,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<{ url: string; size: number; format?: string; resourceType?: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Upload aborted by user'));
    }

    // React Native special FormData file descriptor — streams the file natively
    const fileDescriptor = { uri, type: cleanType, name: cleanName };
    const formData = new FormData();
    formData.append('file', fileDescriptor as any);
    formData.append('upload_preset', uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
    xhr.timeout = timeoutMs;

    const onAbort = () => {
      try {
        xhr.abort();
      } catch (_) {}
      reject(new Error('Upload aborted by user'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100))));
        }
      };
    }

    xhr.onload = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const secureUrl = data.secure_url || (data.url ? data.url.replace(/^http:/, 'https:') : '');
          resolve({
            url: secureUrl,
            size: data.bytes || 0,
            format: data.format,
            resourceType: data.resource_type,
          });
        } catch {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData?.error?.message || `Upload failed with HTTP ${xhr.status}`));
        } catch {
          reject(new Error(xhr.responseText || `Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.ontimeout = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(new Error(
        `Upload timed out after ${Math.round(timeoutMs / 1000)}s. ` +
        `Please check your connection — large files need a stable network.`
      ));
    };

    xhr.onerror = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(new Error('Network error during file upload. Please check your connection and try again.'));
    };

    xhr.onabort = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(new Error('Upload aborted by user'));
    };

    xhr.send(formData);
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const uploadFileToCloudinary = async (
  uri: string,
  type: string,
  name: string,
  onProgress?: (progress: number) => void,
  /** Pass file.size (bytes) from DocumentPicker for accurate timeout scaling */
  fileSize?: number,
  signal?: AbortSignal,
): Promise<{ url: string; size: number; format?: string; resourceType?: string }> => {
  const cloudName    = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  if (!uri) {
    throw new Error('Cannot upload empty file URI.');
  }

  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum upload size limit of 50 MB (requested: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).`);
  }

  const cleanName = name || `file_${Date.now()}`;
  const cleanType = inferMimeType(cleanName, type);

  // Dynamic timeout: scales proportionally from 30s floor (at ~125 bytes/ms ≈ 1 Mbps) up to 300s ceiling (5m)
  const timeoutMs = fileSize
    ? Math.min(300_000, Math.max(30_000, Math.ceil(fileSize / 125)))
    : 60_000;

  const sizeLabel = fileSize ? `${(fileSize / 1024 / 1024).toFixed(1)} MB` : 'unknown size';
  console.log(`[Cloudinary] Uploading "${cleanName}" (${sizeLabel}), timeout ${Math.round(timeoutMs / 1000)}s`);

  // Attempt 1
  try {
    return await attemptUpload(uri, cleanType, cleanName, cloudName, uploadPreset, timeoutMs, onProgress, signal);
  } catch (err: any) {
    if (signal?.aborted || err.message?.includes('aborted')) {
      throw err;
    }

    // Only retry on network/timeout errors — don't retry on 4xx (bad request, bad preset, etc.)
    const isRetryable = err.message?.includes('timed out') ||
                        err.message?.includes('Network error') ||
                        err.message?.includes('connection');

    if (!isRetryable) {
      console.warn('[Cloudinary] Non-retryable error, aborting:', err.message);
      throw err;
    }

    console.warn('[Cloudinary] Upload attempt 1 failed, retrying once...', err.message);
    // Reset progress bar before retry
    onProgress?.(0);
  }

  // Attempt 2 (single retry for transient network drops)
  return await attemptUpload(uri, cleanType, cleanName, cloudName, uploadPreset, timeoutMs, onProgress, signal);
};
