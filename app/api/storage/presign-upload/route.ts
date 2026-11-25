import { NextRequest, NextResponse } from "next/server";
import {
  buildR2Key,
  getPresignedUploadUrl,
  getPublicObjectUrl,
  isPublicFolder,
  isPrivateBucketConfigured,
  isAllowedFolder,
  R2_BUCKETS,
} from "@/lib/services/r2Storage";
import {
  getStorageActor,
  parseStorageKey,
  canWriteKey,
} from "@/lib/server/storageAccess";
import { recordStorageObject } from "@/lib/server/storageInventory";

export const dynamic = "force-dynamic";

/** 1 Mo en octets (référence commune aux limites ci-dessous). */
const MB_SIZE = 1024 * 1024;

/**
 * Plafonds par NATURE de fichier — identiques à `lib/services/uploadLimits.ts`
 * (source unique côté client). L'interface affiche exactement ces valeurs.
 */
const MAX_VIDEO_SIZE = 500 * MB_SIZE; // 500 Mo — vidéos (formation, livrables)
const MAX_ARCHIVE_SIZE = 100 * MB_SIZE; // 100 Mo — ZIP / RAR / 7Z
const MAX_DOCUMENT_SIZE = 50 * MB_SIZE; // 50 Mo — PDF, bureautique, texte
const MAX_IMAGE_SIZE = 10 * MB_SIZE; // 10 Mo — images
const MAX_KYC_SIZE = 10 * MB_SIZE; // 10 Mo — pièces d'identité

/** Plafond correspondant au type MIME réellement envoyé. */
function typeMaxSize(contentType: string): number {
  if (contentType.startsWith("video/")) return MAX_VIDEO_SIZE;
  if (contentType.startsWith("image/")) return MAX_IMAGE_SIZE;
  if (contentType.startsWith("audio/")) return MAX_DOCUMENT_SIZE;
  if (
    [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/vnd.rar",
      "application/x-7z-compressed",
    ].includes(contentType)
  ) {
    return MAX_ARCHIVE_SIZE;
  }
  return MAX_DOCUMENT_SIZE;
}

/** Types MIME autorisés par dossier + plafond absolu du dossier. */
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
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/vnd.rar",
      "application/x-7z-compressed",
      "application/octet-stream",
    ]),
    maxSize: MAX_VIDEO_SIZE,
  },
  [R2_BUCKETS.PRODUCT_FILES]: {
    types: new Set([
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/epub+zip",
      "application/x-rar-compressed",
      "application/vnd.rar",
      "application/x-7z-compressed",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "text/markdown",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "application/octet-stream",
    ]),
    maxSize: MAX_VIDEO_SIZE,
  },
  [R2_BUCKETS.KYC_DOCUMENTS]: {
    types: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ]),
    maxSize: MAX_KYC_SIZE,
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
    types: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "audio/mpeg",
      "audio/wav",
    ]),
    maxSize: MAX_DOCUMENT_SIZE,
  },
};

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || `fichier_${Date.now()}`;
}

/**
 * POST /api/storage/presign-upload
 * Body (JSON) : { folder, fileName, contentType, entityId, size }
 * Réponse : { key, uploadUrl (PUT présigné 1 h), publicUrl ('' si privé) }
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

    // Dossier privé : le bucket privé doit exister, sinon refus (échec fermé).
    if (!isPublicFolder(folder) && !isPrivateBucketConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stockage privé non configuré (CLOUDFLARE_PRIVATE_BUCKET_NAME manquant) : " +
            "importation de documents confidentiels désactivée.",
          code: "PRIVATE_BUCKET_MISSING",
        },
        { status: 503 }
      );
    }

    const rules = ALLOWED_MIME[folder];
    if (!rules) {
      return NextResponse.json({ error: `Dossier '${folder}' non autorisé.` }, { status: 400 });
    }
    if (size <= 0) {
      return NextResponse.json({ error: "Taille du fichier invalide" }, { status: 400 });
    }

    // Plafond effectif = le plus contraignant entre la nature du fichier et
    // le dossier cible (ex. une image reste limitée à 10 Mo, même dans un
    // dossier qui accepte aussi des vidéos).
    const effectiveMax = Math.min(rules.maxSize, typeMaxSize(contentType));
    if (size > effectiveMax) {
      const maxLabel = `${Math.round(effectiveMax / MB_SIZE)} Mo`;
      return NextResponse.json(
        {
          error: `Fichier trop volumineux : ${(size / MB_SIZE).toFixed(1).replace(".", ",")} Mo. Maximum ${maxLabel} pour ce type de fichier.`,
          maxBytes: effectiveMax,
          maxLabel,
        },
        { status: 413 }
      );
    }
    if (!rules.types.has(contentType)) {
      return NextResponse.json(
        { error: `Format '${contentType || "inconnu"}' non autorisé pour ce dossier.` },
        { status: 415 }
      );
    }

    // ⚠️ SÉCURITÉ : le contenu n'est pas visible lors d'un PUT présigné, mais
    // l'extension doit rester cohérente avec le type déclaré (un `.svg` ou un
    // `.html` annoncé en image/png est refusé). Les extensions actives sont
    // bannies des dossiers publics.
    const extension = (fileName.toLowerCase().split(".").pop() || "").trim();
    const CONSISTENT_EXTENSIONS: Record<string, string[]> = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
      "image/gif": ["gif"],
      "image/avif": ["avif"],
      "application/pdf": ["pdf"],
    };
    const expected = CONSISTENT_EXTENSIONS[contentType];
    if (expected && !expected.includes(extension)) {
      return NextResponse.json(
        {
          error: `L'extension '.${extension || "?"}' ne correspond pas au format '${contentType}'.`,
          code: "EXTENSION_MISMATCH",
        },
        { status: 415 }
      );
    }
    const FORBIDDEN_EXTENSIONS = ["svg", "svgz", "html", "htm", "xhtml", "js", "mjs", "php", "exe", "bat", "sh"];
    if (FORBIDDEN_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Ce type de fichier n'est pas autorisé pour des raisons de sécurité.", code: "FORBIDDEN_EXTENSION" },
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

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 3600);
    // Aucune URL publique pour un dossier privé (KYC, livrables, vidéos)
    const publicUrl = isPublicFolder(folder) ? getPublicObjectUrl(key) : "";

    // Inventaire de maintenance : permet de détecter plus tard les fichiers
    // envoyés mais jamais enregistrés en base (suppression après 24 h).
    await recordStorageObject({ key, folder, entityId, size, contentType });

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

