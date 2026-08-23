import { NextRequest, NextResponse } from "next/server";
import { getSignedDownloadUrl, existsInR2 } from "@/lib/services/r2Storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/storage/signed-url
 * Body (JSON) :
 *   - key    : clé R2 complète du fichier (bucket/entityId/fileName)
 *   - expiresInSeconds : durée de validité en secondes (défaut 3600, max 86400)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = (body?.key as string) || "";
    const expiresIn = Math.min(
      Math.max(Number(body?.expiresInSeconds) || 3600, 60),
      86400
    );

    if (!key) {
      return NextResponse.json({ error: "Clé R2 manquante" }, { status: 400 });
    }

    // Sécurisation : interdire les clés dangereuses (traversée de chemin)
    if (key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "Clé R2 invalide" }, { status: 400 });
    }

    // Vérifier que le fichier existe
    const exists = await existsInR2(key);
    if (!exists) {
      return NextResponse.json(
        { error: "Fichier introuvable dans le stockage" },
        { status: 404 }
      );
    }

    // Générer l'URL signée
    const signedUrl = await getSignedDownloadUrl(key, expiresIn);

    return NextResponse.json({
      success: true,
      key,
      url: signedUrl,
      expiresIn,
    });
  } catch (error: any) {
    console.error("[R2 Signed URL] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la génération de l'URL signée" },
      { status: 500 }
    );
  }
}