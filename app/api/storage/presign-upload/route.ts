import { NextRequest, NextResponse } from "next/server";
import {
  buildR2Key,
  getPresignedUploadUrl,
  getPublicObjectUrl,
  R2_BUCKETS,
} from "@/lib/services/r2Storage";

export const dynamic = "force-dynamic";

// Vidéos de formation : autorisées jusqu'à 2 Go (upload DIRECT via URL présignée,
// le corps ne transite jamais par le serveur Next.js).
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

const ALLOWED_COURSE_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/ogg",
  "video/3gpp",
  "video/x-msvideo",
]);

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || `video_${Date.now()}`;
}

/**
 * POST /api/storage/presign-upload
 * Body (JSON) : { fileName, contentType, entityId }
 * Réponse : { key, uploadUrl (PUT présigné 15 min), publicUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "").toLowerCase();
    const entityId = String(body.entityId || "");
    const size = Number(body.size || 0);

    if (!fileName || !entityId) {
      return NextResponse.json({ error: "fileName et entityId sont requis" }, { status: 400 });
    }
    if (size <= 0) {
      return NextResponse.json({ error: "Taille du fichier invalide" }, { status: 400 });
    }
    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 2 Go)" }, { status: 413 });
    }
    if (!ALLOWED_COURSE_MIME.has(contentType)) {
      return NextResponse.json(
        {
          error: `Format '${contentType || "inconnu"}' non autorisé. Formats acceptés : MP4, WebM, MOV, MKV, OGG, AVI, 3GP.`,
        },
        { status: 415 }
      );
    }

    // Clé stable = mêmes conventions que l'upload classique (timestamp + nom sûr)
    const safeName = sanitizeFileName(fileName);
    const key = buildR2Key(R2_BUCKETS.COURSE_MEDIA, entityId, `${Date.now()}-${safeName}`);

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900);
    const publicUrl = getPublicObjectUrl(key);

    return NextResponse.json({ success: true, key, uploadUrl, publicUrl, contentType });
  } catch (error: any) {
    console.error("[R2 Presign Upload] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la préparation de l'upload" },
      { status: 500 }
    );
  }
}
