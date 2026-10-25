// ============================================================
// FORTIA HUB — Inventaire des fichiers envoyés sur Cloudflare R2
// ------------------------------------------------------------
// Chaque présignature (ou upload classique) enregistre la clé dans
// `storage_objects`. Le job de maintenance s'appuie sur cet inventaire
// pour repérer les fichiers envoyés mais jamais référencés en base.
//
// ⚠️ Ces écritures ne doivent JAMAIS faire échouer un téléversement :
//    toutes les erreurs sont donc absorbées silencieusement.
// ============================================================

import { prisma } from "@/lib/prisma";

export interface StorageObjectInput {
  key: string;
  folder: string;
  entityId: string;
  size: number;
  contentType: string;
}

/** Enregistre (ou met à jour) un fichier dans l'inventaire de stockage. */
export async function recordStorageObject(input: StorageObjectInput): Promise<void> {
  if (!input?.key) return;
  try {
    await prisma.storageObject.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        folder: input.folder || input.key.split("/")[0] || "",
        entityId: input.entityId || "",
        // Int : nos limites plafonnent à 500 Mo, largement sous 2 Go.
        size: Math.min(Math.max(0, Math.round(input.size || 0)), 2_000_000_000),
        contentType: input.contentType || "",
      },
      update: {
        size: Math.min(Math.max(0, Math.round(input.size || 0)), 2_000_000_000),
        contentType: input.contentType || "",
      },
    });
  } catch {
    // Inventaire indisponible (table absente, base saturée…) : ignoré.
  }
}

/** Marque un fichier comme supprimé (conservé pour l'historique). */
export async function markStorageObjectDeleted(key: string): Promise<void> {
  if (!key) return;
  try {
    await prisma.storageObject.update({
      where: { key },
      data: { status: "deleted", deletedAt: new Date() },
    });
  } catch {
    // Ligne absente ou base indisponible : sans conséquence.
  }
}
