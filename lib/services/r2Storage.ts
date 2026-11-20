// ============================================================
// FORTIA HUB — Stockage Cloudflare R2 (compatible S3)
// ------------------------------------------------------------
// ⚠️ SÉCURITÉ : DEUX buckets distincts
//
//   1. BUCKET PUBLIC  (CLOUDFLARE_BUCKET_NAME)
//      → uniquement des IMAGES destinées à être visibles par tous :
//        `store-images`, `blog-images`, `site-media`, `product-images`
//      → accessible via le domaine public (URL permanente acceptée)
//
//   2. BUCKET PRIVÉ   (CLOUDFLARE_PRIVATE_BUCKET_NAME)
//      → documents d'identité KYC, livrables produits (PDF/ZIP),
//        vidéos et supports de formation, attestations
//      → AUCUN domaine public activé : lecture par URL signée seulement,
//        après vérification des droits dans /api/storage/signed-url
//
// Règle absolue : `getPublicObjectUrl()` ne construit JAMAIS d'URL
// publique pour un dossier privé (elle renvoie une chaîne vide).
// ============================================================

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// --- Configuration R2 ---
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_BUCKET_ACCESS_KEY || "";
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_BUCKET_SECRET_KEY || "";

/**
 * Clés DÉDIÉES au bucket privé (facultatif, recommandé).
 * Si elles sont renseignées, tous les accès au bucket privé (KYC, livrables
 * produits, vidéos) utilisent ce jeton à privilèges limités ; sinon les clés
 * principales servent de repli.
 *
 * Variables : CLOUDFLARE_PRIVATE_BUCKET_ACCESS_KEY / _SECRET_KEY
 */
const R2_PRIVATE_ACCESS_KEY_ID = process.env.CLOUDFLARE_PRIVATE_BUCKET_ACCESS_KEY || "";
const R2_PRIVATE_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_PRIVATE_BUCKET_SECRET_KEY || "";

/** Bucket PUBLIC (images uniquement). */
const R2_PUBLIC_BUCKET = process.env.CLOUDFLARE_BUCKET_NAME || "fortia-hub-storage";

/** Bucket PRIVÉ (KYC, livrables, vidéos). Vide = non configuré. */
const R2_PRIVATE_BUCKET = process.env.CLOUDFLARE_PRIVATE_BUCKET_NAME || "";

const R2_ENDPOINT =
  process.env.CLOUDFLARE_BUCKET_ENDPOINT ||
  `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const R2_PUBLIC_URL =
  process.env.CLOUDFLARE_BUCKET_PUBLIC_URL || "https://storage.fortia-hub.com";

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn(
    "[R2] Configuration incomplète : CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_BUCKET_ACCESS_KEY, CLOUDFLARE_BUCKET_SECRET_KEY sont requis."
  );
}

if (!R2_PRIVATE_BUCKET) {
  console.warn(
    "[R2] ⚠️ CLOUDFLARE_PRIVATE_BUCKET_NAME n'est pas défini : les documents KYC, " +
      "livrables produits et vidéos de formation restent dans le bucket public. " +
      "Créez un bucket privé (sans domaine public) et renseignez la variable."
  );
}

// --- Client S3 compatible R2 (bucket PUBLIC : images) ---
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// --- Client S3 dédié au bucket PRIVÉ (clés dédiées, sinon repli) ---
const r2PrivateClient = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_PRIVATE_ACCESS_KEY_ID || R2_ACCESS_KEY_ID,
    secretAccessKey: R2_PRIVATE_SECRET_ACCESS_KEY || R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Sélectionne le client à utiliser selon le bucket cible : jeton dédié au
 * bucket privé s'il est configuré, sinon jeton principal.
 */
function clientForBucket(bucket: string): S3Client {
  const hasDedicatedKeys = !!R2_PRIVATE_ACCESS_KEY_ID && !!R2_PRIVATE_SECRET_ACCESS_KEY;
  if (bucket === R2_PRIVATE_BUCKET && hasDedicatedKeys) return r2PrivateClient;
  return r2Client;
}

/** Les clés dédiées au bucket privé sont-elles configurées ? */
export function hasDedicatedPrivateKeys(): boolean {
  return !!R2_PRIVATE_ACCESS_KEY_ID && !!R2_PRIVATE_SECRET_ACCESS_KEY;
}

// --- Dossiers publics / privés ---
/** Dossiers dont les fichiers peuvent être exposés publiquement (images). */
export const PUBLIC_FOLDER_NAMES = [
  "store-images",
  "blog-images",
  "site-media",
  "product-images",
] as const;

/** Indique si un dossier (1er segment de la clé) est public. */
export function isPublicFolder(folder: string): boolean {
  return (PUBLIC_FOLDER_NAMES as readonly string[]).includes(folder);
}

/** Indique si la clé correspond à un objet privé. */
export function isPrivateKey(key: string): boolean {
  const [folder] = String(key || "").split("/");
  return !!folder && !isPublicFolder(folder);
}

/**
 * Détermine le bucket cible à partir de la clé.
 * Les dossiers privés sont écrits dans le bucket privé.
 */
export function bucketForKey(key: string): string {
  if (isPublicFolder(String(key || "").split("/")[0])) return R2_PUBLIC_BUCKET;
  return R2_PRIVATE_BUCKET || R2_PUBLIC_BUCKET;
}

/**
 * Le bucket privé est-il configuré ?
 */
export function isPrivateBucketConfigured(): boolean {
  return !!R2_PRIVATE_BUCKET;
}

/**
 * Écriture dans un dossier privé alors que le bucket privé n'est pas
 * configuré : on REFUSE (échec fermé) au lieu d'écrire silencieusement les
 * pièces d'identité / livrables dans le bucket PUBLIC.
 *
 * Avant, `bucketForKey()` retombait sur le bucket public : les documents KYC
 * se retrouvaient lisibles par n'importe qui via l'URL publique.
 */
export function assertPrivateBucketConfigured(): void {
  if (!R2_PRIVATE_BUCKET) {
    throw new Error(
      "Stockage privé non configuré : renseignez CLOUDFLARE_PRIVATE_BUCKET_NAME " +
        "(et de préférence CLOUDFLARE_PRIVATE_BUCKET_ACCESS_KEY / _SECRET_KEY). " +
        "Aucun document confidentiel ne sera écrit dans le bucket public."
    );
  }
}

export function getBucketNames(): { publicBucket: string; privateBucket: string } {
  return { publicBucket: R2_PUBLIC_BUCKET, privateBucket: R2_PRIVATE_BUCKET };
}

// --- Utilitaires de chemin ---
export interface R2KeyParts {
  bucket: string;   // ex: 'product-files'
  folder: string;   // ex: 'product-id'
  fileName: string; // ex: 'mon-produit.pdf'
}

/**
 * Construit une clé R2 à partir des segments.
 * Format : {bucket}/{entityId}/{fileName}
 */
export function buildR2Key(bucket: string, entityId: string, fileName: string): string {
  const safeBucket = bucket.replace(/^\/+|\/+$/g, "");
  const safeEntity = entityId.replace(/^\/+|\/+$/g, "");
  const safeName = fileName.replace(/^\/+|\/+$/g, "");
  return `${safeBucket}/${safeEntity}/${safeName}`;
}

/** Décompose une clé R2 en segments. */
export function parseR2Key(key: string): R2KeyParts {
  const parts = key.split("/");
  return {
    bucket: parts[0] || "",
    folder: parts[1] || "",
    fileName: parts.slice(2).join("/"),
  };
}

/** Extrait uniquement le nom de fichier (sans chemin). */
/**
 * Extrait la clé R2 d'une valeur stockée en base : soit déjà une clé
 * (`dossier/entite/fichier.ext`), soit une URL publique R2.
 */
export function r2KeyFromValue(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^\/+/, "");
  try {
    const url = new URL(raw);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

export function getFileNameFromKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

// --- Opérations de base ---

/**
 * Téléverse un fichier vers R2 dans le bucket approprié (public ou privé
 * selon le 1er segment de la clé).
 *
 * @param bucket      Dossier logique (ex: 'product-files', 'store-images'…)
 * @param entityId    ID de l'entité (produit, boutique, cours, dossier KYC…)
 * @param fileName    Nom de fichier avec extension
 * @param body        Contenu
 * @param contentType Type MIME
 * @param isPublic    Accepté pour compatibilité : la destination réelle est
 *                    décidée par le dossier (jamais par ce paramètre).
 */
export async function uploadToR2(
  bucket: string,
  entityId: string,
  fileName: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  isPublic = false
): Promise<{ key: string; url: string; bucket: string }> {
  const key = buildR2Key(bucket, entityId, fileName);
  const targetBucket = bucketForKey(key);
  const publiclyReadable = isPublicFolder(bucket) && isPublic;

  // Écriture d'un fichier confidentiel (KYC, livrables, vidéos) : le bucket
  // privé est OBLIGATOIRE. Sinon on refuse (protection des données).
  if (!isPublicFolder(bucket)) assertPrivateBucketConfigured();

  await clientForBucket(targetBucket).send(
    new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    key,
    // Aucune URL publique n'est jamais construite pour un objet privé.
    url: publiclyReadable ? getPublicObjectUrl(key) : "",
    bucket: targetBucket,
  };
}

/** Supprime un fichier de R2 (dans le bucket approprié). */
export async function deleteFromR2(key: string): Promise<void> {
  const bucket = bucketForKey(key);
  await clientForBucket(bucket).send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * URL signée de LECTURE (accès temporaire) — seule voie d'accès aux
 * fichiers privés. L'autorisation est vérifiée par l'appelant
 * (`/api/storage/signed-url`).
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
  response?: { contentType?: string; disposition?: string }
): Promise<string> {
  const bucket = bucketForKey(key);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    // Un support PDF de formation doit s'afficher DANS le navigateur
    // (visionneuse intégrée) plutôt que d'être téléchargé.
    ...(response?.contentType ? { ResponseContentType: response.contentType } : {}),
    ...(response?.disposition ? { ResponseContentDisposition: response.disposition } : {}),
  });
  return getSignedUrl(clientForBucket(bucket), command, { expiresIn: expiresInSeconds });
}

/**
 * URL publique permanente d'un objet.
 * ⚠️ Renvoie une chaîne vide pour tout fichier privé (KYC, livrables,
 * vidéos de formation) : ces fichiers ne doivent jamais être exposés.
 */
export function getPublicObjectUrl(key: string): string {
  if (isPrivateKey(key)) {
    console.warn(
      `[R2] Refus de générer une URL publique pour un objet privé : ${key}. ` +
        "Utilisez une URL signée (/api/storage/signed-url)."
    );
    return "";
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * URL signée PUT pour un upload DIRECT depuis le navigateur (vidéos volumineuses).
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<string> {
  // Une URL PUT présignée pour un dossier privé exige le bucket privé.
  if (isPrivateKey(key)) assertPrivateBucketConfigured();

  const bucket = bucketForKey(key);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(clientForBucket(bucket), command, { expiresIn: expiresInSeconds });
}

/** Vérifie si un objet existe dans R2. */
export async function existsInR2(key: string): Promise<boolean> {
  const bucket = bucketForKey(key);
  try {
    await clientForBucket(bucket).send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/** Liste les fichiers d'un dossier (préfixe) dans R2. */
export async function listR2Objects(prefix = ""): Promise<string[]> {
  const bucket = bucketForKey(prefix);
  const result = await clientForBucket(bucket).send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
  );
  return (result.Contents || []).map((obj) => obj.Key || "");
}

export interface R2ObjectInfo {
  key: string;
  size: number;
  lastModified: Date | null;
}

/**
 * Liste détaillée (clé + taille + date) des objets d'un dossier, avec
 * pagination complète. Utilisée par le job de maintenance pour ne supprimer
 * que des fichiers réellement anciens.
 */
export async function listR2ObjectsDetailed(prefix = ""): Promise<R2ObjectInfo[]> {
  const bucket = bucketForKey(prefix);
  const objects: R2ObjectInfo[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await clientForBucket(bucket).send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of result.Contents || []) {
      if (!obj.Key) continue;
      objects.push({
        key: obj.Key,
        size: obj.Size || 0,
        lastModified: obj.LastModified || null,
      });
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

// ============================================================
// DOSSIERS FORTIA HUB
// ============================================================
export const R2_BUCKETS = {
  // --- Dossiers PRIVÉS (bucket privé, URL signées uniquement) ---
  /** Livrables produits téléchargeables (PDF, ZIP…) */
  PRODUCT_FILES: "product-files",
  /** Vidéos et supports de formation */
  COURSE_MEDIA: "course-media",
  /** Pièces d'identité et documents KYC */
  KYC_DOCUMENTS: "kyc-documents",
  // --- Dossiers PUBLICS (bucket public, images visibles) ---
  /** Logos et bannières de boutiques */
  STORE_IMAGES: "store-images",
  /** Images de produits */
  PRODUCT_IMAGES: "product-images",
  /** Images du site (CMS) */
  SITE_MEDIA: "site-media",
  /** Images d'articles de blog */
  BLOG_IMAGES: "blog-images",
} as const;

export type R2BucketName = (typeof R2_BUCKETS)[keyof typeof R2_BUCKETS];

/**
 * Vérifie qu'un dossier est autorisé pour un usage donné.
 * Empêche l'écriture dans un dossier inconnu (protection contre les abus).
 */
export function isAllowedFolder(folder: string): boolean {
  return (Object.values(R2_BUCKETS) as readonly string[]).includes(folder);
}

/** Téléverse une image de boutique (logo/bannière) — dossier PUBLIC. */
export function uploadStoreImage(
  storeId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  return uploadToR2(R2_BUCKETS.STORE_IMAGES, storeId, fileName, body, contentType, true);
}

/** Téléverse une image de produit — dossier PUBLIC. */
export function uploadProductImage(
  productId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  return uploadToR2(R2_BUCKETS.PRODUCT_IMAGES, productId, fileName, body, contentType, true);
}

/** Téléverse un fichier livrable produit — dossier PRIVÉ. */
export function uploadProductFile(
  productId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  return uploadToR2(R2_BUCKETS.PRODUCT_FILES, productId, fileName, body, contentType, false);
}

/** Téléverse un média de cours (vidéo/PDF) — dossier PRIVÉ. */
export function uploadCourseMedia(
  courseId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  return uploadToR2(R2_BUCKETS.COURSE_MEDIA, courseId, fileName, body, contentType, false);
}

/** Téléverse un document KYC — dossier PRIVÉ. */
export function uploadKycDocument(
  submissionId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  return uploadToR2(R2_BUCKETS.KYC_DOCUMENTS, submissionId, fileName, body, contentType, false);
}

/** Téléverse une image de blog — dossier PUBLIC. */
export function uploadBlogImage(
  postId: string,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  return uploadToR2(R2_BUCKETS.BLOG_IMAGES, postId, fileName, body, contentType, true);
}


