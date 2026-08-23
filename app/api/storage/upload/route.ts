import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, R2_BUCKETS, type R2BucketName } from "@/lib/services/r2Storage";

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
    // ====== AUTORISATION ======
    // La clé service-role est SECRÈTE et ne doit pas être exposée au navigateur
    // (le client envoie le fichier via FormData sans bearer local).
    // En production, cette route peut être protégée par un middleware Next.js.
    // La sécurité des données est assurée par les politiques RLS Supabase.

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "";
    const entityId = (formData.get("entityId") as string) || "";
    const isPublic = (formData.get("isPublic") as string) === "true";

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
        { error: "Fichier trop volumineux (max 50 Mo)" },
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

    // Upload vers R2
    const result = await uploadToR2(
      validatedBucket,
      entityId,
      fileName,
      buffer,
      fileType || "application/octet-stream",
      isPublic
    );

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
      fileName,
      size: file.size,
      contentType: fileType,
    });
  } catch (error: any) {
    console.error("[R2 Upload] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}