// ============================================================
// FORTIA HUB — Diagnostic du stockage (buckets R2)
// ------------------------------------------------------------
// GET /api/storage/health
// Réservé aux administrateurs (session admin) ou au job de maintenance
// (en-tête `Authorization: Bearer <CRON_SECRET>`).
//
// Permet de vérifier EN PRODUCTION que chaque dossier pointe vers le bon
// bucket — en particulier que `kyc-documents`, `product-files` et
// `course-media` vont bien dans le bucket PRIVÉ (jamais dans le public).
// Aucune donnée sensible n'est renvoyée (ni clé, ni secret).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  bucketForKey,
  getBucketNames,
  hasDedicatedPrivateKeys,
  isPrivateBucketConfigured,
  isPublicFolder,
} from "@/lib/services/r2Storage";
import { requireAdmin } from "@/lib/server/requireAdmin";

export const dynamic = "force-dynamic";

const FOLDERS = [
  "store-images",
  "product-images",
  "blog-images",
  "site-media",
  "kyc-documents",
  "product-files",
  "course-media",
];

function isCronAuthorized(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const authorization = req.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const provided = bearer || (req.headers.get("x-cron-secret") || "").trim();
  return provided === secret;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin && !isCronAuthorized(req)) {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs ou au job de maintenance." },
      { status: 401 }
    );
  }

  const { publicBucket, privateBucket } = getBucketNames();

  const resolved = Object.fromEntries(
    FOLDERS.map((folder) => [
      folder,
      {
        public: isPublicFolder(folder),
        bucket: bucketForKey(`${folder}/exemple/fichier.bin`),
      },
    ])
  );

  return NextResponse.json({
    success: true,
    publicBucket,
    privateBucket: privateBucket || null,
    privateBucketConfigured: isPrivateBucketConfigured(),
    dedicatedPrivateKeys: hasDedicatedPrivateKeys(),
    resolved,
    warnings: isPrivateBucketConfigured()
      ? []
      : [
          "CLOUDFLARE_PRIVATE_BUCKET_NAME est absent : les documents KYC, livrables et vidéos " +
            "ne peuvent plus être téléversés (échec fermé volontaire pour éviter une fuite publique).",
        ],
  });
}
