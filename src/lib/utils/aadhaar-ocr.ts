'use client';

export interface AadhaarDetectionResult {
  detectedNumber: string | null;
  source: 'svg' | 'qr' | 'ocr' | 'none';
}

/** Compress an uploaded ID image into a compact WebP/JPEG data URL (~40-80KB) for storage. */
export async function compressIdImageToDataUrl(file: File): Promise<string> {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
    });
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image'));
      el.src = objectUrl;
    });

    const maxDim = 960;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// UIDAI Aadhaar numbers satisfy the Verhoeff checksum algorithm.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function isValidVerhoeffAadhaar(digits: string): boolean {
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  let c = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(reversed[i])]];
  }
  return c === 0;
}

/** Format 12 raw digits into `XXXX XXXX XXXX`. */
export function formatAadhaarDigits(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Extract the most likely 12-digit Aadhaar number from OCR or XML text. */
export function extractAadhaarNumberFromText(rawText: string): string | null {
  if (!rawText) return null;

  // 1. Aadhaar QR XML attribute (`uid="123456789012"`)
  const xmlUidMatch = rawText.match(/\buid\s*=\s*["']([2-9]\d{11})["']/i);
  if (xmlUidMatch?.[1]) {
    return formatAadhaarDigits(xmlUidMatch[1]);
  }

  // Strip out 16-digit VID sequences (`XXXX XXXX XXXX XXXX`) so 12-digit prefixes aren't misread
  const withoutVid = rawText.replace(/(?<!\d)\d{4}[\s-]+\d{4}[\s-]+\d{4}[\s-]+\d{4}(?!\d)/g, ' ');

  const candidates: Array<{ digits: string; score: number }> = [];

  // 2. Canonical 4-4-4 Aadhaar digit groups (grouped spacing/hyphens)
  const groupedRegex = /(?<!\d)([0-9OoIl|]{4}[\s.-]+[0-9OoIl|]{4}[\s.-]+[0-9OoIl|]{4})(?!\d)/g;
  for (const match of withoutVid.matchAll(groupedRegex)) {
    const normalized = match[1]
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/\D/g, '');
    if (normalized.length === 12) {
      let score = 20;
      if (/^[2-9]/.test(normalized)) score += 30;
      if (isValidVerhoeffAadhaar(normalized)) score += 50;
      candidates.push({ digits: normalized, score });
    }
  }

  // 3. Contiguous 12-digit number (excluding obvious mobile prefixes)
  const contiguousRegex = /(?<!\d)([2-9]\d{11})(?!\d)/g;
  for (const match of withoutVid.matchAll(contiguousRegex)) {
    const digits = match[1];
    let score = 15;
    if (isValidVerhoeffAadhaar(digits)) score += 50;
    candidates.push({ digits, score });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return formatAadhaarDigits(candidates[0].digits);
}

/** Upscale & high-contrast grayscale preprocess image for sharper Tesseract OCR. */
async function preprocessCanvasForOcr(file: File): Promise<HTMLCanvasElement | File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image for OCR'));
      el.src = objectUrl;
    });

    const targetWidth = Math.max(900, Math.min(1600, img.naturalWidth * 1.5));
    const scale = img.naturalWidth > 0 ? targetWidth / img.naturalWidth : 1;
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    if (width <= 0 || height <= 0) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const contrast = 1.35;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const adjusted = Math.max(0, Math.min(255, (lum - 128) * contrast + 128));
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface BarcodeDetectorLike {
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

/**
 * Automatically detect an Aadhaar 12-digit identifier from an uploaded image file:
 * 1) Direct SVG text scan (instant)
 * 2) Native QR BarcodeDetector XML UID scan when available in Chromium
 * 3) Client-side Tesseract.js OCR on enhanced grayscale canvas
 */
export async function detectAadhaarNumberFromFile(file: File): Promise<AadhaarDetectionResult> {
  // 1. Direct text check for SVG ID cards
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    try {
      const text = await file.text();
      const extracted = extractAadhaarNumberFromText(text);
      if (extracted) {
        return { detectedNumber: extracted, source: 'svg' };
      }
    } catch {
      // Ignore SVG text read failure and continue
    }
  }

  // 2. Native QR BarcodeDetector check (Aadhaar cards embed uid inside XML QR payload)
  if (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    typeof createImageBitmap === 'function'
  ) {
    try {
      const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
      const detector = new Detector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      try {
        const codes = await detector.detect(bitmap);
        for (const code of codes) {
          if (code.rawValue) {
            const extracted = extractAadhaarNumberFromText(code.rawValue);
            if (extracted) {
              return { detectedNumber: extracted, source: 'qr' };
            }
          }
        }
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall through to OCR cleanly
    }
  }

  // 3. Tesseract.js WASM OCR pass
  try {
    const processedSource = await preprocessCanvasForOcr(file);
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(processedSource);
      const extracted = extractAadhaarNumberFromText(data.text || '');
      if (extracted) {
        return { detectedNumber: extracted, source: 'ocr' };
      }
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.warn('Aadhaar OCR detection skipped/failed:', err);
  }

  return { detectedNumber: null, source: 'none' };
}
