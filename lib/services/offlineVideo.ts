"use client";

// FORTIA HUB — Vidéos de formation hors-ligne CHIFFRÉES
// Fichier stocké dans IndexedDB chiffré AES-GCM. Si le formateur a protégé la
// leçon (videoProtected), la clé dérive du CODE SECRET divulgué (hash vérifié) ;
// sinon la clé dérive du compte apprenant. Jamais de vidéo en clair sur disque.

const DB_NAME = "fortia-offline-videos";
const DB_VERSION = 1;
const STORE_NAME = "lessons";

export interface OfflineVideoRecord {
  key: string;
  userId: string;
  courseId: string;
  lessonId: string;
  videoUrl: string;
  contentType: string;
  videoProtected: boolean;
  salt: string; // base64
  iv: string; // base64
  data: ArrayBuffer; // ciphertext AES-GCM
  size: number;
  savedAt: number;
}

export interface OfflineVideoInput {
  userId: string;
  courseId: string;
  lessonId: string;
  videoUrl: string;
  videoProtected: boolean;
  videoCodeHash?: string;
  /** Code secret saisi par l'apprenant (obligatoire si videoProtected). */
  code?: string;
  onProgress?: (percent: number) => void;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB indisponible"));
  });
  return dbPromise;
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Erreur IndexedDB"));
  });
}

function buildKey(userId: string, courseId: string, lessonId: string): string {
  return `fh_${userId}_${courseId}_${lessonId}`;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Hachage SHA-256 hexadécimal (vérifie le code secret sans le stocker). */
export async function hashSecret(value: string): Promise<string> {
  if (!crypto?.subtle) return "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function accountSecret(userId: string): string {
  return `fortia::offline::${userId}`;
}

async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Télécharge la vidéo, la chiffre en local et l'enregistre dans IndexedDB.
 * Jette une Error si le code secret (vidéo protégée) est incorrect.
 */
export async function saveLessonOffline(input: OfflineVideoInput): Promise<boolean> {
  if (typeof indexedDB === "undefined") throw new Error("Stockage local indisponible");
  if (!crypto?.subtle) throw new Error("Chiffrement non supporté par ce navigateur");
  if (!input.videoUrl) throw new Error("Vidéo introuvable");

  if (input.videoProtected) {
    if (!input.code || input.code.trim().length < 4) {
      throw new Error("Cette vidéo est protégée : saisissez le code secret fourni par le formateur.");
    }
    if (input.videoCodeHash) {
      const hash = await hashSecret(input.code.trim());
      if (hash.toLowerCase() !== input.videoCodeHash.toLowerCase()) {
        throw new Error(
          "Code secret incorrect. Vérifiez auprès du formateur (il peut le divulguer dans la description)."
        );
      }
    }
  }

  const secret = input.videoProtected ? input.code!.trim() : accountSecret(input.userId);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const res = await fetch(input.videoUrl);
  if (!res.ok) throw new Error("Impossible de télécharger la vidéo (réseau ou droits).");
  const blob = await res.blob();
  const raw = new Uint8Array(await blob.arrayBuffer());

  const key = await deriveKey(secret, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw);

  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const record: OfflineVideoRecord = {
    key: buildKey(input.userId, input.courseId, input.lessonId),
    userId: input.userId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    videoUrl: input.videoUrl,
    contentType: blob.type || "video/mp4",
    videoProtected: input.videoProtected,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    data: ciphertext,
    size: blob.size,
    savedAt: Date.now(),
  };
  await idbRequest(tx.objectStore(STORE_NAME).put(record));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Erreur IndexedDB"));
  });
  if (input.onProgress) input.onProgress(100);
  return true;
}

export async function isLessonOffline(userId: string, courseId: string, lessonId: string): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  const db = await openDatabase().catch(() => null);
  if (!db) return false;
  const rec = await idbRequest(
    db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(buildKey(userId, courseId, lessonId))
  ).catch(() => null);
  return !!rec;
}

export interface LoadedOfflineVideo {
  url: string;
  revoke: () => void;
}

/**
 * Charge une vidéo hors-ligne : déchiffre en mémoire et retourne une URL blob locale.
 * @param code Code secret à fournir si la vidéo est protégée par le formateur.
 */
export async function loadOfflineVideoUrl(
  userId: string,
  courseId: string,
  lessonId: string,
  code?: string
): Promise<LoadedOfflineVideo | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDatabase().catch(() => null);
  if (!db) return null;
  const rec = (await idbRequest(
    db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(buildKey(userId, courseId, lessonId))
  ).catch(() => null)) as OfflineVideoRecord | null;
  if (!rec) return null;

  const secret = rec.videoProtected ? code || "" : accountSecret(rec.userId);
  const key = await deriveKey(secret, b64ToBytes(rec.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(rec.iv) }, key, rec.data);
  } catch {
    throw new Error("Impossible de déchiffrer : code secret incorrect ou vidéo corrompue.");
  }

  const blob = new Blob([plain], { type: rec.contentType || "video/mp4" });
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

export async function deleteLessonOffline(userId: string, courseId: string, lessonId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase().catch(() => null);
  if (!db) return;
  const tx = db.transaction(STORE_NAME, "readwrite");
  await idbRequest(tx.objectStore(STORE_NAME).delete(buildKey(userId, courseId, lessonId)));
}

