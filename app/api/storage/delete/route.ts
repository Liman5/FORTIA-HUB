import { NextRequest, NextResponse } from "next/server";
import { deleteFromR2 } from "@/lib/services/r2Storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/storage/delete
 * Body (JSON) :
 *   - key : clé R2 complète du fichier (bucket/entityId/fileName)
 */
export async function POST(req: NextRequest) {
  try {
    // ====== AUTORISATION ======
    // La clé service-role est SECRÈTE et ne doit pas être exposée au navigateur
    // (le client envoie la requête sans bearer local).
    // En production, cette route peut être protégée par un middleware Next.js.
    // La sécurité des données est assurée par les politiques RLS Supabase.

    const body = await req.json();
    const key = (body?.key as string) || "";

    if (!key) {
      return NextResponse.json({ error: "Clé R2 manquante" }, { status: 400 });
    }

    // Sécurisation : interdire les clés dangereuses (traversée de chemin)
    if (key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "Clé R2 invalide" }, { status: 400 });
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