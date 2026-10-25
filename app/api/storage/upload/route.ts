import { NextRequest, NextResponse } from "next/server";
import {
  uploadToR2,
  isPublicFolder,
  R2_BUCKETS,
  type R2BucketName,
} from "@/lib/services/r2Storage";
import { getStorageActor, parseStorageKey, canWriteKey } from "@/lib/server/storageAccess";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { recordStorageObject } from "@/lib/server/storageInventory";

export const dynamic = "force-dynamic";

// Taille maximale acceptée : 50 Mo (limite Cloudflare Workers)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_BUCKETS = new Set(Object.values(R2_BUCKETS));

// Types MIME autorisés par bucket
const BUCKET_MIME_TYPES: Record<string, string[]> = {
  [R2_BUCKETS.PRODUCT_FILES]: [
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
    "application/rar",
    "application/x-rar-compressed",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "text/plain",
    "text/markdown",
    "application/octet-stream",
  ],
  [R2_BUCKETS.COURSE_MEDIA]: [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "application/pdf",
    "audio/mpeg",
    "audio/wav",
    "application/octet-stream",
  ],
  [R2_BUCKETS.KYC_DOCUMENTS]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
  ],
  [R2_BUCKETS.STORE_IMAGES]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ],
  [R2_BUCKETS.SITE_MEDIA]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
    "audio/mpeg",
    "audio/wav",
    "video/mp4",
    "video/webm",
  ],
  [R2_BUCKETS.PRODUCT_IMAGES]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ],
  [R2_BUCKETS.BLOG_IMAGES]: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ],
};

function sanitizeFileName(fileName: string): string {
  // Supprime les caractères dangereux et les chemins
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Évite les noms vides ou réservés
  return sanitized || `fichier_${Date.now()}`;
}

/**
 * POST /api/storage/upload
 * Body (FormData) :
 *   - file     : le fichier à uploader
 *   - bucket   : 'product-files' | 'course-media' | 'kyc-documents' | 'store-images' | 'site-media' | 'blog-images'
 *   - entityId : ID de l'entité (produit, boutique, cours, soumission KYC, article)
 *   - isPublic : 'true' pour un bucket public (défaut false)
 */
export async function POST(req: NextRequest) {
  try {
    // ====== AUTHENTIFICATION ======
    // Aucun téléversement anonyme : la session serveur est obligatoire.
    const actor = await getStorageActor(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Authentification requise pour téléverser un fichier." },
        { status: 401 }
      );
    }

    // Superviseur = LECTURE SEULE : aucun téléversement autorisé.
    const adminContext = await requireAdmin(req).catch(() => null);
    if (adminContext && isReadOnlyAdmin(adminContext.role)) {
      return NextResponse.json(
        {
          error:
            "Votre profil est en lecture seule (superviseur) : le téléversement de fichiers est interdit.",
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "";
    const entityId = (formData.get("entityId") as string) || "";
    // Le caractère public est déterminé par le DOSSIER, jamais par le client.
    const requestedPublic = (formData.get("isPublic") as string) === "true";

    // Validations
    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (!ALLOWED_BUCKETS.has(bucket as R2BucketName)) {
      return NextResponse.json(
        { error: `Bucket invalide. Autorisés : ${Array.from(ALLOWED_BUCKETS).join(", ")}` },
        { status: 400 }
      );
    }
    const validatedBucket = bucket as R2BucketName;
    if (!entityId) {
      return NextResponse.json({ error: "entityId manquant" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} Mo). Maximum 50 Mo par la voie classique : utilisez l'import direct.`,
          maxBytes: MAX_FILE_SIZE,
          maxLabel: "50 Mo",
        },
        { status: 413 }
      );
    }

    // Vérification du type MIME autorisé pour le bucket
    const allowedMime = BUCKET_MIME_TYPES[bucket];
    const fileType = file.type || "application/octet-stream";
    if (allowedMime && !allowedMime.includes(fileType)) {
      return NextResponse.json(
        {
          error: `Type de fichier '${fileType}' non autorisé pour le bucket '${bucket}'`,
          allowed: allowedMime,
        },
        { status: 415 }
      );
    }

    // Lecture du contenu
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Nom de fichier sécurisé avec timestamp pour éviter les collisions
    const safeName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${safeName}`;

    // ====== AUTORISATION (droits sur la ressource ciblée) ======
    const parsed = parseStorageKey(`${validatedBucket}/${entityId}/${fileName}`);
    if (!parsed) {
      return NextResponse.json({ error: "Chemin de stockage invalide" }, { status: 400 });
    }
    const allowed = await canWriteKey(actor, parsed);
    if (!allowed) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à téléverser dans cet espace." },
        { status: 403 }
      );
    }

    // Le DOSSIER est la seule source de vérité : les dossiers publics
    // (store-images, product-images, blog-images, site-media) renvoient une URL
    // permanente, les dossiers privés n'en renvoient JAMAIS. Le drapeau envoyé
    // par le navigateur est donc ignoré (il ne peut pas élargir un droit).
    const isPublic = isPublicFolder(validatedBucket);
    void requestedPublic;

    // Upload vers R2
    const result = await uploadToR2(
      validatedBucket,
      entityId,
      fileName,
      buffer,
      fileType || "application/octet-stream",
      isPublic
    );

    // Inventaire de maintenance (fichiers envoyés mais jamais enregistrés).
    await recordStorageObject({
      key: result.key,
      folder: validatedBucket,
      entityId,
      size: file.size,
      contentType: fileType || "application/octet-stream",
    });

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
      fileName,
      size: file.size,
      contentType: fileType,
      private: !isPublicFolder(validatedBucket),
    });
  } catch (error: any) {
    console.error("[R2 Upload] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}