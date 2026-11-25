import { logger } from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { getSignedDownloadUrl, existsInR2, isPrivateKey } from "@/lib/services/r2Storage";
import {
  getStorageActor,
  parseStorageKey,
  canReadPrivateKey,
  isFreePublicDeliverable,
} from "@/lib/server/storageAccess";

export const dynamic = "force-dynamic";

/** Durée maximale d'une URL signée pour un fichier PRIVÉ (6 h). */
const MAX_PRIVATE_TTL = 6 * 60 * 60;
/** Durée maximale pour une image publique (24 h). */
const MAX_PUBLIC_TTL = 24 * 60 * 60;

/**
 * POST /api/storage/signed-url
 * Body (JSON) : { key, expiresInSeconds? }
 *
 * • Dossier PUBLIC (images) → URL signée accordée à tous.
 * • Dossier PRIVÉ (KYC, livrables produits, vidéos) → session obligatoire
 *   ET vérification des droits en base (acheteur, formateur, propriétaire,
 *   administrateur). Aucune donnée personnelle n'est servie sans contrôle.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = String(body?.key || "");
    const isPrivate = isPrivateKey(key);

    if (!key) {
      return NextResponse.json({ error: "Clé R2 manquante" }, { status: 400 });
    }

    // Sécurisation : interdire les clés dangereuses (traversée de chemin)
    if (key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "Clé R2 invalide" }, { status: 400 });
    }

    const parsed = parseStorageKey(key);
    if (!parsed) {
      return NextResponse.json({ error: "Clé R2 invalide" }, { status: 400 });
    }

    // ====== AUTORISATION ======
    if (isPrivate) {
      const actor = await getStorageActor(req);
      if (!actor) {
        // Contenu GRATUIT : le livrable d'un produit publié à 0 est ouvert.
        const openToEveryone = await isFreePublicDeliverable(key, parsed);
        if (!openToEveryone) {
          return NextResponse.json(
            { error: "Authentification requise pour ce fichier." },
            { status: 401 }
          );
        }
      } else {
        const allowed = await canReadPrivateKey(actor, parsed);
        if (!allowed) {
          return NextResponse.json(
            { error: "Vous n'avez pas accès à ce fichier." },
            { status: 403 }
          );
        }
      }
    }

    const maxTtl = isPrivate ? MAX_PRIVATE_TTL : MAX_PUBLIC_TTL;
    const expiresIn = Math.min(
      Math.max(Number(body?.expiresInSeconds) || (isPrivate ? 3600 : 7200), 60),
      maxTtl
    );

    // Vérifier que le fichier existe
    const exists = await existsInR2(key);
    if (!exists) {
      return NextResponse.json(
        { error: "Fichier introuvable dans le stockage" },
        { status: 404 }
      );
    }

    const signedUrl = await getSignedDownloadUrl(
      key,
      expiresIn,
      /\.pdf$/i.test(key) ? { contentType: "application/pdf", disposition: "inline" } : undefined
    );

    return NextResponse.json({
      success: true,
      key,
      url: signedUrl,
      expiresIn,
      private: isPrivate,
    });
  } catch (error: any) {
    logger.error("storage_signed_url_failed", { message: (error as Error)?.message });
    console.error("[R2 Signed URL] Erreur:", error);
    return NextResponse.json(
      { error: "Impossible de générer le lien de téléchargement. Réessayez." },
      { status: 500 }
    );
  }
}
