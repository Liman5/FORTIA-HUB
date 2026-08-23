"use client";

// ============================================================
// FORTIA HUB — Utilitaires client d'upload vers Cloudflare R2
// Description : Envoie les fichiers du navigateur vers l'API Next.js
// qui les transmet à Cloudflare R2 (compatible S3).
// ============================================================

export type ClientBucketName =
  | "product-files"
  | "course-media"
  | "kyc-documents"
  | "store-images"
  | "site-media"
  | "blog-images";

export interface UploadResult {
  success: boolean;
  key: string;
  url: string;
  fileName: string;
  size: number;
  contentType: string;
  error?: string;
}

/**
 * Upload un fichier vers Cloudflare R2 via l'API Next.js.
 * @param file     Le fichier à uploader (File object)
 * @param bucket   Bucket R2 cible
 * @param entityId ID de l'entité (produit, boutique, cours, soumission KYC, article)
 * @param isPublic true pour les buckets publics (store-images, blog-images, site-media)
 */
export async function uploadFileToR2(
  file: File,
  bucket: ClientBucketName,
  entityId: string,
  isPublic = false
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  formData.append("entityId", entityId);
  formData.append("isPublic", String(isPublic));

  try {
    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        key: "",
        url: "",
        fileName: file.name,
        size: file.size,
        contentType: file.type,
        error: data.error || "Erreur lors de l'upload",
      };
    }

    return {
      success: true,
      key: data.key,
      url: data.url,
      fileName: data.fileName,
      size: data.size,
      contentType: data.contentType,
    };
  } catch (error: any) {
    return {
      success: false,
      key: "",
      url: "",
      fileName: file.name,
      size: file.size,
      contentType: file.type,
      error: error?.message || "Erreur réseau lors de l'upload",
    };
  }
}

/**
 * Supprime un fichier de Cloudflare R2 via l'API Next.js.
 */
export async function deleteFileFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || "Erreur lors de la suppression" };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erreur réseau lors de la suppression",
    };
  }
}

/**
 * Génère une URL signée pour un fichier privé.
 */
export async function getSignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, expiresInSeconds }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || "Erreur lors de la génération de l'URL" };
    }

    return { success: true, url: data.url };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erreur réseau lors de la génération de l'URL",
    };
  }
}

/**
 * Vérifie si une URL pointe vers un storefront R2 (pour distinguer URL signée vs publique).
 */
export function isR2Url(url: string): boolean {
  return (
    url.includes("r2.cloudflarestorage.com") ||
    url.includes("storage.fortia-hub.com") ||
    url.includes("pub-") ||
    url.includes("r2.dev")
  );
}