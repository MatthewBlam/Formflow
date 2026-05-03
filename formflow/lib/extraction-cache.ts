import type { FormSchema, UploadKind } from '@/types';

const CACHE_KEY = 'bridgeform-extraction-cache-v1';
const MAX_CACHE_ENTRIES = 6;

export interface PdfReadResult {
  arrayBuffer: ArrayBuffer;
  base64: string;
  documentHash: string;
}

export interface CachedExtraction {
  documentHash: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  cachedAt: string;
  schema: FormSchema;
  uploadKind: UploadKind;
  uploadKindConfidence: number;
}

interface CacheStore {
  entries: CachedExtraction[];
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(buffer: ArrayBuffer) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return `metadata-${buffer.byteLength}`;
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return toHex(digest);
}

function readStore(): CacheStore {
  if (typeof window === 'undefined') return { entries: [] };
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as Partial<CacheStore>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function writeStore(store: CacheStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // localStorage can be unavailable or full; cache misses are acceptable.
  }
}

export async function readPdfFile(file: File): Promise<PdfReadResult> {
  const arrayBuffer = await file.arrayBuffer();
  return {
    arrayBuffer,
    base64: arrayBufferToBase64(arrayBuffer),
    documentHash: await sha256(arrayBuffer),
  };
}

export function getCachedExtraction(documentHash: string) {
  return readStore().entries.find((entry) => entry.documentHash === documentHash) ?? null;
}

export function saveCachedExtraction(entry: CachedExtraction) {
  const existing = readStore().entries.filter(
    (candidate) => candidate.documentHash !== entry.documentHash
  );
  const entries = [entry, ...existing]
    .sort((a, b) => Date.parse(b.cachedAt) - Date.parse(a.cachedAt))
    .slice(0, MAX_CACHE_ENTRIES);
  writeStore({ entries });
}

export function clearExtractionCache() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CACHE_KEY);
  }
}
