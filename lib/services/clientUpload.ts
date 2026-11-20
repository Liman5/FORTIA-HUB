"use client";

import { MB, checkUploadFile, contentTypeFor, formatBytes, isPrivateBucket } from "./uploadLimits";
import { compressImageFile } from "./imageCompression";

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

/** Limite de la voie classique : au-delà, le corps de la requête serait
 *  rejeté (413) par la fonction serverless. */
const LEGACY_MAX_BYTES = 3.5 * MB;

function uploadFailure(file: File, message: string): UploadResult {
  return {
    success: false,
    key: "",
    url: "",
    fileName: file.name,
    size: file.size,
    contentType: file.type,
    error: message,
  };
}

function readAdminToken(): string {
  try {
    return localStorage.getItem("fortia_admin_token") || "";
  } catch {
    return "";
  }
}

/**
 * En-têtes communs des appels au stockage. Le jeton administrateur est
 * envoyé quand il existe : sans lui, les routes de lecture privée
 * (`/api/storage/signed-url`) refusent l'accès — l'admin ne pouvait donc
 * pas visualiser les pièces d'identité KYC.
 */
function storageAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = readAdminToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Téléverse un fichier vers Cloudflare R2.
 *
 * Voie PRINCIPALE : URL PUT **présignée** → le fichier va directement du
 * navigateur vers R2, sans traverser la fonction serverless. Il n'y a donc
 * plus aucune limite de corps de requête : fin des erreurs 413.
 *
 * Repli sur la voie classique (`/api/storage/upload`) uniquement pour les
 * petits fichiers (≤ 3,5 Mo) si la présignature est indisponible.
 *
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
  const initial = checkUploadFile(file, bucket);
  if (!initial.ok) return uploadFailure(file, initial.error || "Fichier non valide.");

  // 1. Photos volumineuses (téléphone) : compression avant l'envoi.
  //    Les documents d'identité doivent rester parfaitement lisibles :
  //    1600 px suffisent très largement (poids ≈ 300-600 Ko).
  const prepared =
    initial.kind === "image"
      ? await compressImageFile(
          file,
          bucket === "kyc-documents"
            ? { maxDimension: 1600, quality: 0.82, skipUnderBytes: 700_000 }
            : { maxDimension: 1920, quality: 0.85, skipUnderBytes: 1_200_000 }
        )
      : file;

  const check = checkUploadFile(prepared, bucket);
  if (!check.ok) return uploadFailure(prepared, check.error || "Fichier non valide.");

  const contentType = contentTypeFor(prepared);

  // 2. Dossiers PRIVÉS (KYC, livrables, vidéos) : on privilégie la voie
  //    classique (serveur → R2), qui ne dépend PAS de la règle CORS du
  //    bucket privé. C'est elle qui faisait défaut sur les documents KYC.
  if (isPrivateBucket(bucket) && prepared.size <= LEGACY_MAX_BYTES) {
    const legacy = await uploadLegacy(prepared, bucket, entityId, isPublic);
    if (legacy.success) return legacy;

    const direct = await uploadPresigned(prepared, bucket, entityId, contentType);
    if (direct.success) return direct;

    return uploadFailure(
      prepared,
      direct.error || legacy.error || "Échec de l'importation du document."
    );
  }

  // 3. Voie directe présignée (aucune limite côté application).
  const direct = await uploadPresigned(prepared, bucket, entityId, contentType);
  if (direct.success) return direct;

  // 4. Repli classique : seulement si le fichier est assez léger.
  if (prepared.size <= LEGACY_MAX_BYTES) {
    const legacy = await uploadLegacy(prepared, bucket, entityId, isPublic);
    if (legacy.success) return legacy;
    return uploadFailure(
      prepared,
      direct.error || legacy.error || "Échec de l'importation."
    );
  }

  return uploadFailure(prepared, direct.error || "Échec du téléversement direct vers R2.");
}

/** PUT direct via URL présignée : aucune limite de taille côté Next.js. */
async function uploadPresigned(
  file: File,
  bucket: ClientBucketName,
  entityId: string,
  contentType: string
): Promise<UploadResult> {
  const token = readAdminToken();
  let res: Response;

  try {
    res = await fetch("/api/storage/presign-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        folder: bucket,
        fileName: file.name,
        contentType,
        entityId,
        size: file.size,
      }),
    });
  } catch {
    return uploadFailure(file, "Connexion au serveur impossible : vérifiez votre réseau puis réessayez.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.uploadUrl) {
    if (res.status === 401 || res.status === 403) {
      return uploadFailure(
        file,
        "Session requise ou expirée : reconnectez-vous (membre, vendeur, formateur ou administration), puis relancez l'importation."
      );
    }
    if (res.status === 413 || res.status === 415) {
      return uploadFailure(
        file,
        data?.error || "Fichier trop volumineux ou format refusé pour cet espace."
      );
    }
    return uploadFailure(
      file,
      data?.error || `Préparation de l'importation impossible (code ${res.status}).`
    );
  }

  try {
    await putFileWithProgress(data.uploadUrl, file, contentType);
  } catch (error: any) {
    const detail = String(error?.message || "");
    if (detail.includes("403")) {
      return uploadFailure(
        file,
        "Le stockage R2 a refusé l'écriture (lien expiré). Relancez l'importation."
      );
    }
    return uploadFailure(
      file,
      "Dépôt vers R2 interrompu (réseau ou autorisation CORS du bucket). Réessayez ; si cela persiste, contactez le support."
    );
  }

  // Dossier privé → aucune URL publique : on conserve la CLÉ (résolue en URL
  // signée à la lecture). Dossier public → URL permanente.
  return {
    success: true,
    key: data.key,
    url: data.publicUrl || data.key,
    fileName: file.name,
    size: file.size,
    contentType,
  };
}

/** Voie classique (le fichier traverse l'API Next.js) : petits fichiers seulement. */
async function uploadLegacy(
  file: File,
  bucket: ClientBucketName,
  entityId: string,
  isPublic: boolean
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  formData.append("entityId", entityId);
  formData.append("isPublic", String(isPublic));

  try {
    const token = readAdminToken();
    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    // Réponse pas toujours JSON (413 / HTML / texte) → parsing sûr
    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!res.ok || !data) {
      if (res.status === 413) {
        return uploadFailure(
          file,
          `Fichier trop volumineux pour la voie classique (${formatBytes(file.size)}). Le dépôt direct vers R2 a échoué : réduisez la taille ou réessayez.`
        );
      }
      const authIssue =
        res.status === 401 || res.status === 403
          ? "Session requise ou expirée : reconnectez-vous puis relancez l'importation."
          : "";
      const detail =
        authIssue ||
        data?.error ||
        (rawText && rawText.length < 300 ? rawText : "Erreur lors de l'upload");
      return uploadFailure(file, detail);
    }

    return {
      success: true,
      key: data.key,
      // Un dossier privé n'expose aucune URL : la clé sert de référence.
      url: data.url || data.key,
      fileName: data.fileName || file.name,
      size: data.size ?? file.size,
      contentType: data.contentType || file.type,
    };
  } catch (error: any) {
    return uploadFailure(file, error?.message || "Erreur réseau lors de l'upload");
  }
}

/**
 * Extrait la clé R2 d'une valeur pouvant être :
 *   • une clé directe           → « course-media/xxx/video.mp4 »
 *   • une URL publique/ancienne → « https://pub-xxxx.r2.dev/course-media/xxx/video.mp4 »
 *   • une URL signée            → on retire la query string
 */
export function storageUrlToKey(value: string): string {
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return value.split("?")[0];
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return value;
  }
}

/**
 * Résout une référence de fichier en URL réellement utilisable :
 *   • URL http(s) → renvoyée telle quelle ;
 *   • clé R2 privée → **URL signée temporaire** demandée au serveur, qui
 *     vérifie les droits de l'utilisateur (401/403 possibles).
 */
export async function resolveStorageUrl(value: string): Promise<string> {
  const key = storageUrlToKey(value);
  if (!key) return "";
  if (/^https?:\/\//i.test(value) && !value.includes("X-Amz-Signature")) {
    // URL publique/ancienne déjà exploitable
    return value;
  }

  try {
    const res = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: storageAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ key }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && json?.url ? json.url : "";
  } catch {
    return "";
  }
}

/**
 * Supprime un fichier de Cloudflare R2 via l'API Next.js.
 * Accepte une clé **ou** une URL (publique/signée) : la clé est extraite
 * automatiquement, ce qui rend l'opération compatible avec les anciennes
 * valeurs stockées en base.
 */
export async function deleteFileFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  const normalizedKey = storageUrlToKey(key);

  try {
    const res = await fetch("/api/storage/delete", {
      method: "POST",
      headers: storageAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ key: normalizedKey }),
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
      headers: storageAuthHeaders({ "Content-Type": "application/json" }),
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
    const adminToken = readAdminToken();
    presignRes = await fetch("/api/storage/presign-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Session membre (cookie) + éventuel jeton admin : la route exige un
        // acteur authentifié pour délivrer une autorisation d'upload.
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
      body: JSON.stringify({
        // Dossier explicite : les vidéos de formation vont dans le bucket PRIVÉ
        folder: "course-media",
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
      // Le bucket est PRIVÉ : le serveur ne renvoie aucune URL publique.
      // On conserve donc la CLÉ du fichier (elle sera résolue en URL signée
      // au moment de la lecture) ; repli sur l'URL publique si elle existe.
      return {
        success: true,
        url: presignData.publicUrl || presignData.key || "",
        key: presignData.key,
        mode: "direct",
      };
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
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload direct (connexion coupée ou CORS du bucket R2)."));
    xhr.ontimeout = () => reject(new Error("Délai dépassé pendant l'upload direct (connexion interrompue)."));
    xhr.onabort = () => reject(new Error("Upload interrompu par le navigateur."));
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
