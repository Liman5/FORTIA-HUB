import { NextRequest, NextResponse } from "next/server";
import { deleteFromR2 } from "@/lib/services/r2Storage";
import { getStorageActor, parseStorageKey, canWriteKey } from "@/lib/server/storageAccess";

export const dynamic = "force-dynamic";

/**
 * POST /api/storage/delete
 * Body (JSON) : { key }
 *
 * ⚠️ SESSION ET DROITS OBLIGATOIRES : seuls le propriétaire légitime de la
 * ressource (vendeur de la boutique, propriétaire du produit/cours, déposant
 * du dossier KYC) ou un administrateur peuvent supprimer un fichier.
 */
export async function POST(req: NextRequest) {
  try {
    // ====== AUTHENTIFICATION ======
    const actor = await getStorageActor(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Authentification requise pour supprimer un fichier." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const key = String(body?.key || "");

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

    // ====== AUTORISATION (droits sur la ressource ciblée) ======
    const allowed = await canWriteKey(actor, parsed);
    if (!allowed) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer ce fichier." },
        { status: 403 }
      );
    }

    await deleteFromR2(key);

    return NextResponse.json({
      success: true,
      key,
      message: "Fichier supprimé",
    });
  } catch (error: any) {
    console.error("[R2 Delete] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
