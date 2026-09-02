// ============================================================
// FORTIA HUB — Service de stockage Cloudflare R2 (compatible S3)
// Description : Upload, suppression et génération d'URL signées
// Utilise @aws-sdk/client-s3 avec l'endpoint R2 Cloudflare.
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
const R2_BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || "fortia-hub-storage";
const R2_ENDPOINT =
  process.env.CLOUDFLARE_BUCKET_ENDPOINT ||
  `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_PUBLIC_URL =
  process.env.CLOUDFLARE_BUCKET_PUBLIC_URL ||
  `https://storage.fortia-hub.com`;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn(
    "[R2] Configuration incomplète : CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_BUCKET_ACCESS_KEY, CLOUDFLARE_BUCKET_SECRET_KEY sont requis."
  );
}

// --- Client S3 compatible R2 ---
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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

/**
 * Décompose une clé R2 en segments.
 */
export function parseR2Key(key: string): R2KeyParts {
  const parts = key.split("/");
  return {
    bucket: parts[0] || "",
    folder: parts[1] || "",
    fileName: parts.slice(2).join("/"),
  };
}

/**
 * Extrait uniquement le nom de fichier (sans chemin).
 */
export function getFileNameFromKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

// --- Opérations de base ---

/**
 * Uploade un fichier (Buffer, Uint8Array ou string) vers R2.
 * @param bucket   Bucket R2 (ex: 'product-files', 'store-images', 'course-media', 'kyc-documents', 'blog-images', 'site-media')
 * @param entityId ID de l'entité (produit, boutique, cours, soumission KYC, article)
 * @param fileName Nom du fichier avec extension
 * @param body     Contenu du fichier
 * @param contentType Type MIME
 * @param isPublic Rendre l'objet public (lecture via URL publique)
 */
export async function uploadToR2(
  bucket: string,
  entityId: string,
  fileName: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  isPublic = false
): Promise<{ key: string; url: string }> {
  const key = buildR2Key(bucket, entityId, fileName);

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(isPublic
        ? {}
        : {
            // Pour les buckets privés, le bucket R2 doit être configuré
            // avec une règle de durée de vie ou les fichiers seront
            // accessibles via URL signée uniquement.
          }),
    })
  );

  return {
    key,
    url: `${R2_PUBLIC_URL}/${key}`,
  };
}

/**
 * Supprime un fichier de R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Génère une URL signée (accès temporaire) pour un fichier privé.
 * @param key     Clé R2 complète (bucket/entity/file)
 * @param expiresInSeconds Durée de validité en secondes (défaut 1h)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * URL publique lisible d'un objet R2 (domaine public configuré).
 */
export function getPublicObjectUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Génère une URL signée PUT permettant un upload DIRECT depuis le navigateur
 * vers R2 (sans transiter par le serveur Next.js → pas de limite de taille
 * du corps de requête, indispensable pour les vidéos de formation).
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Vérifie si un objet existe dans R2.
 */
export async function existsInR2(key: string): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Liste les fichiers d'un dossier (préfixe) dans R2.
 */
export async function listR2Objects(prefix = ""): Promise<string[]> {
  const result = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
    })
  );
  return (result.Contents || []).map((obj) => obj.Key || "");
}

// --- Helpers pour les buckets FORTIA HUB ---

export const R2_BUCKETS = {
  PRODUCT_FILES: "product-files",
  COURSE_MEDIA: "course-media",
  KYC_DOCUMENTS: "kyc-documents",
  STORE_IMAGES: "store-images",
  SITE_MEDIA: "site-media",
  BLOG_IMAGES: "blog-images",
} as const;

export type R2BucketName = (typeof R2_BUCKETS)[keyof typeof R2_BUCKETS];

/**
 * Uploade une image de boutique (logo/bannière) — bucket public store-images.
 */
export function uploadStoreImage(storeId: string, fileName: string, body: Buffer | Uint8Array, contentType: string) {
  return uploadToR2(R2_BUCKETS.STORE_IMAGES, storeId, fileName, body, contentType, true);
}

/**
 * Uploade un fichier livrable produit — bucket privé product-files.
 */
export function uploadProductFile(productId: string, fileName: string, body: Buffer | Uint8Array, contentType: string) {
  return uploadToR2(R2_BUCKETS.PRODUCT_FILES, productId, fileName, body, contentType);
}

/**
 * Uploade un média de cours (vidéo/PDF) — bucket privé course-media.
 */
export function uploadCourseMedia(courseId: string, fileName: string, body: Buffer | Uint8Array, contentType: string) {
  return uploadToR2(R2_BUCKETS.COURSE_MEDIA, courseId, fileName, body, contentType);
}

/**
 * Uploade un document KYC — bucket privé kyc-documents.
 */
export function uploadKycDocument(submissionId: string, fileName: string, body: Buffer | Uint8Array, contentType: string) {
  return uploadToR2(R2_BUCKETS.KYC_DOCUMENTS, submissionId, fileName, body, contentType);
}

/**
 * Uploade une image de blog — bucket public blog-images.
 */
export function uploadBlogImage(postId: string, fileName: string, body: Buffer | Uint8Array, contentType: string) {
  return uploadToR2(R2_BUCKETS.BLOG_IMAGES, postId, fileName, body, contentType);
}