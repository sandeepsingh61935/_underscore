/**
 * @file font-import-store.ts
 * @description IndexedDB storage for user-uploaded .woff2 / .ttf fonts.
 */

import { openDB, type IDBPDatabase } from 'idb';

import type {
  FontRole,
  ImportedFontFace,
  ImportedFontRefs,
  TypePresetSelection,
} from '@/shared/constants/type-presets';
import { validateGoogleFontName } from '@/shared/constants/type-presets';

const DB_NAME = 'underscore-font-imports';
const DB_VERSION = 1;
const FONT_STORE = 'fonts';
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type FontFileFormat = 'woff2' | 'truetype';

export interface StoredFontFile {
  id: string;
  familyName: string;
  format: FontFileFormat;
  bytes: ArrayBuffer;
  uploadedAt: number;
  fileName: string;
}

export type FontImportValidationResult =
  | {
      valid: true;
      format: FontFileFormat;
      familyName: string;
    }
  | {
      valid: false;
      error: string;
    };

let dbPromise: Promise<IDBPDatabase> | null = null;

function ensureDatabase(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(FONT_STORE)) {
          database.createObjectStore(FONT_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function sanitizeFamilyName(fileName: string): string {
  const base = fileName.replace(/\.(woff2?|ttf)$/i, '').trim();
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || 'Imported Font';
}

function detectFormat(bytes: ArrayBuffer, fileName: string): FontFileFormat | null {
  const ext = fileName.toLowerCase();
  if (ext.endsWith('.woff2')) return 'woff2';
  if (ext.endsWith('.ttf')) return 'truetype';

  const view = new DataView(bytes);
  if (bytes.byteLength >= 4) {
    const tag = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (tag === 'wOF2') return 'woff2';
    if (view.getUint32(0) === 0x00010000 || view.getUint32(0) === 0x74727565)
      return 'truetype';
  }
  return null;
}

export function validateFontFile(file: File): Promise<FontImportValidationResult> {
  return new Promise((resolve) => {
    if (file.size > MAX_FILE_BYTES) {
      resolve({ valid: false, error: 'File exceeds 2 MB limit' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (): void => {
      const buffer = reader.result;
      if (!(buffer instanceof ArrayBuffer)) {
        resolve({ valid: false, error: 'Could not read file' });
        return;
      }

      const format = detectFormat(buffer, file.name);
      if (!format) {
        resolve({ valid: false, error: 'Use .woff2 or .ttf only' });
        return;
      }

      const familyName = sanitizeFamilyName(file.name);
      const nameCheck = validateGoogleFontName(familyName);
      if (!nameCheck.valid) {
        resolve({ valid: false, error: nameCheck.error });
        return;
      }

      resolve({ valid: true, format, familyName });
    };
    reader.onerror = (): void => {
      resolve({ valid: false, error: 'Could not read file' });
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function storeFontFile(file: File): Promise<StoredFontFile> {
  const validation = await validateFontFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const buffer = await file.arrayBuffer();
  const stored: StoredFontFile = {
    id: crypto.randomUUID(),
    familyName: validation.familyName,
    format: validation.format,
    bytes: buffer,
    uploadedAt: Date.now(),
    fileName: file.name,
  };

  const db = await ensureDatabase();
  await db.put(FONT_STORE, stored);
  return stored;
}

export async function getFontFile(id: string): Promise<StoredFontFile | undefined> {
  const db = await ensureDatabase();
  return db.get(FONT_STORE, id);
}

export async function deleteFontFile(id: string): Promise<void> {
  const db = await ensureDatabase();
  await db.delete(FONT_STORE, id);
}

export async function loadImportedFontFaces(
  refs?: ImportedFontRefs
): Promise<ImportedFontFace[]> {
  if (!refs) return [];

  const faces: ImportedFontFace[] = [];
  const roles: Array<FontRole> = ['serif', 'sans', 'mono'];

  for (const role of roles) {
    const id = refs[role];
    if (!id) continue;
    const stored = await getFontFile(id);
    if (!stored) continue;
    const blob = new Blob([stored.bytes], {
      type: stored.format === 'woff2' ? 'font/woff2' : 'font/ttf',
    });
    faces.push({
      role,
      familyName: stored.familyName,
      blobUrl: URL.createObjectURL(blob),
      format: stored.format,
    });
  }

  return faces;
}

export async function applyTypePresetWithImports(
  selection: TypePresetSelection,
  apply: (selection: TypePresetSelection, faces?: ImportedFontFace[]) => void
): Promise<void> {
  const importedRefs = selection.kind === 'custom' ? selection.importedFonts : undefined;
  const faces = await loadImportedFontFaces(importedRefs);
  apply(selection, faces);
}
