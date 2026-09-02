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

    // Réponse serveur pas toujours JSON (413 / HTML / texte) → parsing sûr
    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!res.ok || !data) {
      const detail =
        data?.error ||
        (rawText && rawText.length < 300 ? rawText : "Erreur lors de l'upload");
      return {
        success: false,
        key: "",
        url: "",
        fileName: file.name,
        size: file.size,
        contentType: file.type,
        error: detail,
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

// ============================================================
// Upload DIRECT des vidéos de formation vers R2
// (URL PUT présignée → aucune limite de corps de requête Next.js)
// ============================================================

const VIDEO_EXT_TO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".3gp": "video/3gpp",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
};

function detectVideoContentType(file: File): string {
  if (file.type && file.type.startsWith("video/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (ext ? VIDEO_EXT_TO_MIME[`.${ext}`] : "") || "video/mp4";
}

export interface DirectUploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
  mode: "direct" | "legacy";
}

/**
 * Upload d'une vidéo de formation :
 * 1. Essaie l'upload DIRECT vers R2 via URL PUT présignée (supporte les gros fichiers).
 * 2. En cas d'échec (ex: CORS non configuré), retombe sur l'upload classique via API.
 */
export async function uploadCourseVideoDirect(
  file: File,
  entityId: string,
  onProgress?: (percent: number) => void
): Promise<DirectUploadResult> {
  const contentType = detectVideoContentType(file);

  // ---- Phase 1 : préparer l'URL présignée ----
  let presignRes: Response;
  try {
    presignRes = await fetch("/api/storage/presign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType,
        entityId,
        size: file.size,
      }),
    });
  } catch {
    // Serveur injoignable → repli immédiat sur la voie classique
    return legacyFallback(file, entityId);
  }

  const presignData = await presignRes.json().catch(() => null);
  if (!presignRes.ok || !presignData?.uploadUrl) {
    // Présignature impossible (serveur, quota…) → repli sur la voie classique
    if (file.size <= 50 * 1024 * 1024) return legacyFallback(file, entityId);
    return {
      success: false,
      url: "",
      key: "",
      mode: "direct",
      error:
        presignData?.error ||
        "Upload direct indisponible et fichier trop volumineux pour la voie classique (max 50 Mo).",
    };
  }

  // ---- Phase 2 : PUT direct vers R2 (avec progression) ----
  try {
    const uploaded = await putFileWithProgress(
      presignData.uploadUrl,
      file,
      contentType,
      onProgress
    );
    if (uploaded) {
      return { success: true, url: presignData.publicUrl, key: presignData.key, mode: "direct" };
    }
  } catch {
    // CORS / réseau R2 direct → repli classique pour les petits fichiers
    if (file.size <= 50 * 1024 * 1024) return legacyFallback(file, entityId);
    return {
      success: false,
      url: "",
      key: "",
      mode: "direct",
      error:
        "L'upload direct a échoué (CORS/R2) et la vidéo dépasse 50 Mo (limite de l'upload classique).",
    };
  }

  return {
    success: false,
    url: "",
    key: "",
    mode: "direct",
    error: "Échec de l'upload direct de la vidéo.",
  };
}

function putFileWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload direct"));
    xhr.send(file);
  });
}

async function legacyFallback(file: File, entityId: string): Promise<DirectUploadResult> {
  const result = await uploadFileToR2(file, "course-media", entityId, false);
  if (result.success) {
    return { success: true, url: result.url, key: result.key, mode: "legacy" };
  }
  return {
    success: false,
    url: "",
    key: "",
    mode: "legacy",
    error: result.error || "Erreur lors de l'upload de la vidéo.",
  };
}
