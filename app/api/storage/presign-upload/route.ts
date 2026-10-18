import { NextRequest, NextResponse } from "next/server";
import {
  buildR2Key,
  getPresignedUploadUrl,
  getPublicObjectUrl,
  isPublicFolder,
  isAllowedFolder,
  R2_BUCKETS,
} from "@/lib/services/r2Storage";
import {
  getStorageActor,
  parseStorageKey,
  canWriteKey,
} from "@/lib/server/storageAccess";

export const dynamic = "force-dynamic";

/** Taille maximale par type de dossier. */
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2 Go (vidéos de formation)
const MAX_DOCUMENT_SIZE = 200 * 1024 * 1024; // 200 Mo (livrables produits)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 Mo (images)

/** Types MIME autorisés par dossier. */
const ALLOWED_MIME: Record<string, { types: Set<string>; maxSize: number }> = {
  [R2_BUCKETS.COURSE_MEDIA]: {
    types: new Set([
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
      "video/ogg",
      "video/3gpp",
      "video/x-msvideo",
      "application/pdf",
      "application/zip",
    ]),
    maxSize: MAX_VIDEO_SIZE,
  },
  [R2_BUCKETS.PRODUCT_FILES]: {
    types: new Set([
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/epub+zip",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "application/octet-stream",
    ]),
    maxSize: MAX_DOCUMENT_SIZE,
  },
  [R2_BUCKETS.KYC_DOCUMENTS]: {
    types: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ]),
    maxSize: MAX_DOCUMENT_SIZE,
  },
  [R2_BUCKETS.STORE_IMAGES]: {
    types: new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]),
    maxSize: MAX_IMAGE_SIZE,
  },
  [R2_BUCKETS.PRODUCT_IMAGES]: {
    types: new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]),
    maxSize: MAX_IMAGE_SIZE,
  },
  [R2_BUCKETS.BLOG_IMAGES]: {
    types: new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]),
    maxSize: MAX_IMAGE_SIZE,
  },
  [R2_BUCKETS.SITE_MEDIA]: {
    types: new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]),
    maxSize: MAX_IMAGE_SIZE,
  },
};

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || `fichier_${Date.now()}`;
}

/**
 * POST /api/storage/presign-upload
 * Body (JSON) : { folder, fileName, contentType, entityId, size }
 * Réponse : { key, uploadUrl (PUT présigné 15 min), publicUrl ('' si privé) }
 *
 * ⚠️ SESSION OBLIGATOIRE : seuls le propriétaire de la ressource ou un
 * administrateur peuvent obtenir une autorisation de téléversement.
 * Les livrables produits, médias de cours et documents KYC partent dans le
 * BUCKET PRIVÉ et ne renvoient jamais d'URL publique.
 */
export async function POST(req: NextRequest) {
  try {
    // ====== AUTHENTIFICATION ======
    const actor = await getStorageActor(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Authentification requise pour téléverser un fichier." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const folder = String(body.folder || R2_BUCKETS.COURSE_MEDIA);
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "").toLowerCase();
    const entityId = String(body.entityId || "");
    const size = Number(body.size || 0);

    if (!fileName || !entityId) {
      return NextResponse.json({ error: "fileName et entityId sont requis" }, { status: 400 });
    }
    if (!isAllowedFolder(folder)) {
      return NextResponse.json({ error: `Dossier '${folder}' non autorisé.` }, { status: 400 });
    }

    const rules = ALLOWED_MIME[folder];
    if (!rules) {
      return NextResponse.json({ error: `Dossier '${folder}' non autorisé.` }, { status: 400 });
    }
    if (size <= 0) {
      return NextResponse.json({ error: "Taille du fichier invalide" }, { status: 400 });
    }
    if (size > rules.maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${Math.round(rules.maxSize / 1024 / 1024)} Mo).` },
        { status: 413 }
      );
    }
    if (!rules.types.has(contentType)) {
      return NextResponse.json(
        { error: `Format '${contentType || "inconnu"}' non autorisé pour ce dossier.` },
        { status: 415 }
      );
    }

    // Clé stable = mêmes conventions que l'upload classique (timestamp + nom sûr)
    const safeName = sanitizeFileName(fileName);
    const key = buildR2Key(folder, entityId, `${Date.now()}-${safeName}`);

    // ====== AUTORISATION (droits sur la ressource ciblée) ======
    const parsed = parseStorageKey(key);
    if (!parsed) {
      return NextResponse.json({ error: "Clé R2 invalide" }, { status: 400 });
    }
    const allowed = await canWriteKey(actor, parsed);
    if (!allowed) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à téléverser dans cet espace." },
        { status: 403 }
      );
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900);
    // Aucune URL publique pour un dossier privé (KYC, livrables, vidéos)
    const publicUrl = isPublicFolder(folder) ? getPublicObjectUrl(key) : "";

    return NextResponse.json({
      success: true,
      key,
      uploadUrl,
      publicUrl,
      private: !isPublicFolder(folder),
      contentType,
    });
  } catch (error: any) {
    console.error("[R2 Presign Upload] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la préparation de l'upload" },
      { status: 500 }
    );
  }
}

